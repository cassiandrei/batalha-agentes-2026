# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import contextlib
import json
import logging
import os
import uuid
from collections.abc import AsyncIterator
from pathlib import Path

from a2a.server.tasks import InMemoryTaskStore
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import Runner

from app.abertura import (
    TRIGGER,
    carregar_semente,
    executar_abertura,
    montar_abertura,
    pipeline_abertura,
    session_id_abertura,
)
from app.app_utils import services
from app.app_utils.a2a import attach_a2a_routes
from app.app_utils.auditoria import configurar_auditoria
from app.config import load_config
from app.confirmacoes import REGISTRO
from app.events import EventRequest, build_event_prompt
from app.financial_profile import build_financial_profile
from app.memory.factory import get_memory_store
from app.memory.politica import carregar_semente_memoria, valor_permitido

# CA-16: o rastro `event=guard` precisa sair do processo para o Cloud Logging.
configurar_auditoria()
_audit = logging.getLogger("audit")


async def conferir_sementes(servico, nome_app: str, cfg) -> dict:
    """S7: no boot, o Bruno e o Marcos precisam ter abertura na sessão; sem ela a demo
    abre vazia. Registra no log e avisa, em vez de falhar em silêncio."""
    presentes = {}
    for cid in (cfg.demo_customer_id, cfg.demo_customer_id_marcos):
        sessao = await servico.get_session(
            app_name=nome_app, user_id=cid, session_id=session_id_abertura(cid)
        )
        presentes[cid] = bool(sessao and sessao.state.get("abertura"))
    faltando = [c for c, ok in presentes.items() if not ok]
    _audit.info(
        json.dumps(
            {
                "event": "seed",
                "sessoes_ok": sum(presentes.values()),
                "faltando": len(faltando),
            }
        )
    )
    if faltando:
        logging.getLogger(__name__).warning(
            "sem abertura semeada para %s; rode infra/scripts/seed_abertura.py",
            faltando,
        )
    return presentes


load_dotenv()
allow_origins = (
    os.getenv("ALLOW_ORIGINS", "").split(",") if os.getenv("ALLOW_ORIGINS") else None
)
otel_to_cloud = True

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    from app.agent import app as adk_app
    from app.agent import root_agent

    runner = Runner(
        app=adk_app,
        session_service=services.get_session_service(),
        artifact_service=services.get_artifact_service(),
        auto_create_session=True,
    )
    app.state.runner = runner
    app.state.agent_app_name = adk_app.name
    # Pipeline da abertura proativa: mesmo app_name e mesmo session service, para a
    # sessão pré-montada ser a que o chat continua. Mesmos plugins: os guardrails
    # valem para o redator também.
    from google.adk.apps import App

    from app.plugins.audit_plugin import AuditPlugin
    from app.plugins.security_plugin import SecurityPlugin

    app.state.pipeline_runner = Runner(
        app=App(
            name=adk_app.name,
            root_agent=pipeline_abertura,
            plugins=[SecurityPlugin(), AuditPlugin()],
        ),
        session_service=runner.session_service,
        artifact_service=runner.artifact_service,
        auto_create_session=True,
    )
    # Sessão em memória morre com a instância; a semente na imagem a recria.
    cfg = load_config()
    await carregar_semente(
        runner.session_service,
        adk_app.name,
        Path(cfg.data_dir) / "evento" / "seed_sessions.json",
    )
    # Memória de longo prazo do Bruno: lembranças de uma conversa anterior, com o
    # consentimento daquela conversa. Só o que a política permite.
    await carregar_semente_memoria(
        get_memory_store(),
        Path(cfg.data_dir) / "seeds" / "seed_memory.json",
        cfg.memory_ttl_days,
    )
    await conferir_sementes(runner.session_service, adk_app.name, cfg)
    await attach_a2a_routes(
        app,
        agent=root_agent,
        runner=runner,
        task_store=InMemoryTaskStore(),
        rpc_path=f"/a2a/{adk_app.name}",
    )
    yield


app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    artifact_service_uri=services.ARTIFACT_SERVICE_URI,
    allow_origins=allow_origins,
    session_service_uri=services.SESSION_SERVICE_URI,
    otel_to_cloud=otel_to_cloud,
    lifespan=lifespan,
)
app.title = "agent"
app.description = "API for interacting with the Agent agent"


@app.post("/events")
async def receber_evento(evento: EventRequest, request: Request) -> dict:
    """Agente proativo: um evento externo dispara uma mensagem ao cliente.

    Chamador esperado: push subscription do Pub/Sub, autenticada por OIDC. O
    customer_id do evento é confiável porque vem do sistema, não do usuário —
    e vai para o ESTADO da sessão, nunca para o texto do prompt.
    """
    from google.genai import types

    nome_app = request.app.state.agent_app_name
    if evento.event_type == TRIGGER:
        mes = evento.details.get("mes_referencia")
        resultado = await executar_abertura(
            request.app.state.pipeline_runner,
            nome_app,
            evento.customer_id,
            int(mes) if mes is not None else None,
        )
        return {
            "event_type": evento.event_type,
            "message": resultado["abertura"]["texto"],
            **resultado,
        }

    try:
        instrucao = build_event_prompt(evento.event_type, evento.details)
    except ValueError as erro:
        raise HTTPException(status_code=422, detail=str(erro)) from erro

    runner = request.app.state.runner
    sessao = f"event-{uuid.uuid4().hex[:12]}"

    await runner.session_service.create_session(
        app_name=nome_app,
        user_id=evento.customer_id,
        session_id=sessao,
        state={"customer_id": evento.customer_id, "trigger": evento.event_type},
    )

    partes: list[str] = []
    async for ev in runner.run_async(
        user_id=evento.customer_id,
        session_id=sessao,
        new_message=types.Content(role="user", parts=[types.Part(text=instrucao)]),
    ):
        if ev.content and ev.content.parts:
            partes += [p.text for p in ev.content.parts if p.text]

    return {
        "session_id": sessao,
        "event_type": evento.event_type,
        "message": " ".join(partes).strip(),
    }


@app.get("/customers/{customer_id}/opening")
async def abertura_pre_montada(customer_id: str, request: Request) -> dict:
    """CA-03: a primeira mensagem já está na sessão; nenhuma chamada ao modelo."""
    sessao = await request.app.state.runner.session_service.get_session(
        app_name=request.app.state.agent_app_name,
        user_id=customer_id,
        session_id=session_id_abertura(customer_id),
    )
    abertura = montar_abertura(sessao)
    if abertura is None:
        raise HTTPException(status_code=404, detail="sem abertura para este cliente")
    return abertura


@app.get("/customers/{customer_id}/financial-profile")
def perfil_financeiro(customer_id: str) -> dict:
    """Perfil financeiro para as telas do protótipo, montado só pelas tools.

    Chamador esperado: o servidor do protótipo (sistema), como no /events. O id
    vem da URL e nunca passa pelo modelo. Não chama o LLM: custo zero de cota.
    """
    perfil = build_financial_profile(customer_id)
    if perfil is None:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    # Só o que foi mostrado pode ser confirmado (CA-14).
    for sim in (perfil["treatments"].get("t01"), perfil["treatments"].get("t02")):
        if sim:
            REGISTRO.registrar(customer_id, sim)
    return perfil


# ------------------------------------------------------------ S5: confirmação, memória, pessoa

from pydantic import BaseModel, Field  # noqa: E402


class ConfirmacaoRequest(BaseModel):
    simulacao_id: str = Field(min_length=1)
    itoken: str = ""
    idempotency_key: str = Field(min_length=1)


class ConsentimentoRequest(BaseModel):
    consentimento: bool


class HandoffRequest(BaseModel):
    consentimento: bool = False
    motivo: str = ""


async def _sessao_abertura(request: Request, customer_id: str):
    svc = request.app.state.runner.session_service
    nome = request.app.state.agent_app_name
    sid = session_id_abertura(customer_id)
    sessao = await svc.get_session(app_name=nome, user_id=customer_id, session_id=sid)
    if sessao is None:
        sessao = await svc.create_session(
            app_name=nome,
            user_id=customer_id,
            session_id=sid,
            state={"customer_id": customer_id},
        )
    return svc, sessao


async def _gravar_estado(request: Request, customer_id: str, delta: dict) -> None:
    from google.adk.events import Event, EventActions

    svc, sessao = await _sessao_abertura(request, customer_id)
    await svc.append_event(
        sessao, Event(author="vita", actions=EventActions(state_delta=delta))
    )


@app.post("/customers/{customer_id}/confirmations")
async def confirmar_tratamento(
    customer_id: str, corpo: ConfirmacaoRequest, request: Request
) -> dict:
    """CA-14: executa uma vez por simulação, só com iToken válido; registra o evento
    tratamento_confirmado. Com consentimento, o tratamento vai para a memória."""
    resultado = REGISTRO.confirmar(
        customer_id, corpo.simulacao_id, corpo.itoken, corpo.idempotency_key
    )
    if resultado["status"] == "recusada":
        raise HTTPException(
            status_code=401 if "iToken" in resultado["motivo"] else 409,
            detail=resultado["motivo"],
        )
    if resultado["status"] == "confirmada":
        _, sessao = await _sessao_abertura(request, customer_id)
        consentimento = sessao.state.get("consent_given_at")
        if consentimento:
            chave = f"tratamento:{resultado['em'][:10]}"
            valor = f"{resultado['tipo'].upper()} confirmado em {resultado['em'][:10]}"
            if valor_permitido(chave, valor):
                await get_memory_store().save_preference(
                    customer_id,
                    chave,
                    valor,
                    consentimento,
                    load_config().memory_ttl_days,
                )
        await _gravar_estado(
            request, customer_id, {"tratamento_confirmado": resultado["tipo"]}
        )
    return resultado


@app.get("/customers/{customer_id}/memory")
async def ver_memoria(customer_id: str, request: Request) -> dict:
    """'O que você lembra sobre mim?' — direito de acesso, sem chamar o modelo."""
    _, sessao = await _sessao_abertura(request, customer_id)
    resumo = await get_memory_store().get_profile_summary(customer_id)
    return {
        "consentimento": bool(sessao.state.get("consent_given_at")),
        "lembrancas": resumo["preferences"],
        "expira_em": resumo.get("expires_at", {}),
        "politica": "objetivos, ofertas recusadas e tratamentos confirmados; nunca valores, payload, cadastro ou texto bruto",
    }


@app.post("/customers/{customer_id}/memory/consent")
async def consentir_memoria(
    customer_id: str, corpo: ConsentimentoRequest, request: Request
) -> dict:
    """Consentimento vai para o estado da sessão do chat, onde as tools o leem."""
    from datetime import UTC, datetime

    valor = datetime.now(UTC).isoformat() if corpo.consentimento else ""
    await _gravar_estado(request, customer_id, {"consent_given_at": valor})
    lembrado = None
    if corpo.consentimento:
        # A pergunta vem DEPOIS da primeira confirmação; com o "sim", o tratamento que
        # acabou de acontecer entra na memória, senão a demo "lembra nada" logo após concordar.
        _, sessao = await _sessao_abertura(request, customer_id)
        tipo = sessao.state.get("tratamento_confirmado")
        if tipo:
            hoje = valor[:10]
            chave, texto = (
                f"tratamento:{hoje}",
                f"{str(tipo).upper()} confirmado em {hoje}",
            )
            if valor_permitido(chave, texto):
                await get_memory_store().save_preference(
                    customer_id, chave, texto, valor, load_config().memory_ttl_days
                )
                lembrado = chave
    return {
        "consentimento": corpo.consentimento,
        "consent_given_at": valor or None,
        "lembrado": lembrado,
    }


@app.delete("/customers/{customer_id}/memory")
async def esquecer_tudo(customer_id: str, request: Request) -> dict:
    """'Esqueça tudo' — apaga a memória de longo prazo e revoga o consentimento (art. 18)."""
    apagadas = await get_memory_store().delete_all(customer_id)
    await _gravar_estado(request, customer_id, {"consent_given_at": ""})
    return {"apagadas": apagadas, "consentimento": False}


class JulgamentoRequest(BaseModel):
    """S10: rubrica de tom/clareza (uma resposta) ou equivalência de tom (duas)."""

    resposta_a: str
    resposta_b: str | None = None
    contexto: str = ""


RUBRICA = (
    "Você é um avaliador de atendimento financeiro. Avalie SÓ tom e clareza, nunca os "
    "números. Tom: acolhedor, sem culpa, sem alarme, sem promessa. Clareza: frases "
    "curtas, sem jargão, próximo passo explícito. Responda APENAS um JSON com as chaves "
    "tom (1 a 5), clareza (1 a 5), justificativa (uma frase)"
)
RUBRICA_PAR = (
    " e, como há duas respostas, equivalente (true se as duas têm o mesmo tom e o "
    "mesmo nível de respeito, sem diferença por gênero, idade ou cidade da pessoa)."
)


@app.post("/eval/judge")
async def julgar(pedido: JulgamentoRequest) -> dict:
    """S10: LLM como juiz, só para tom, clareza e equivalência. Roda no mesmo modelo
    e credencial do agente (squad-agent-sa no Vertex); nunca decide números."""
    from google.adk.models.llm_request import LlmRequest
    from google.genai import types

    from app.agent import _model

    texto = RUBRICA + (RUBRICA_PAR if pedido.resposta_b else ".") + "\n\n"
    if pedido.contexto:
        texto += f"Contexto da pergunta: {pedido.contexto}\n\n"
    texto += f"Resposta A:\n{pedido.resposta_a}\n"
    if pedido.resposta_b:
        texto += f"\nResposta B:\n{pedido.resposta_b}\n"
    pedido_llm = LlmRequest(
        contents=[types.Content(role="user", parts=[types.Part(text=texto)])],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    saida = ""
    async for resposta in _model().generate_content_async(pedido_llm, stream=False):
        partes = (resposta.content.parts if resposta.content else None) or []
        saida = "".join(p.text for p in partes if p.text) or saida
    try:
        return {"veredito": json.loads(saida), "bruto": None}
    except json.JSONDecodeError:
        return {"veredito": None, "bruto": saida[:500]}


@app.post("/customers/{customer_id}/handoff")
async def falar_com_pessoa(
    customer_id: str, corpo: HandoffRequest, request: Request
) -> dict:
    """Encaminhamento simulado para uma pessoa. O resumo vai só com consentimento e
    nunca leva valores, nome ou identificador: faixa, mês e tratamento em curso."""
    protocolo = f"VITA-{uuid.uuid4().hex[:8].upper()}"
    resumo = None
    if corpo.consentimento:
        perfil = build_financial_profile(customer_id) or {}
        _, sessao = await _sessao_abertura(request, customer_id)
        resumo = {
            "faixa_risco": (perfil.get("risk_profile") or {}).get("faixa_risco"),
            "mes_referencia": perfil.get("reference_month"),
            "gatilho": sessao.state.get("trigger"),
            "tratamento_confirmado": sessao.state.get("tratamento_confirmado"),
            "recomendacao_principal": (perfil.get("treatments") or {}).get("principal"),
            "motivo_do_cliente": (corpo.motivo or "")[:120],
        }
    fila = (
        "renegociacao_assistida"
        if (resumo or {}).get("faixa_risco") in (None, "C", "V")
        else "atendimento"
    )
    await _gravar_estado(request, customer_id, {"handoff_protocolo": protocolo})
    return {
        "protocolo": protocolo,
        "fila": fila,
        "resumo": resumo,
        "mensagem": "Encaminhei para uma pessoa da equipe. O protocolo é seu.",
    }


# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
