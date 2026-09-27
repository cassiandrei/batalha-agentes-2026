"""Abertura proativa (S2): gatilho → diagnóstico por tools → redator → sessão pré-montada.

O push na tela bloqueada é neutro e fixo em código. O diagnóstico não usa LLM:
uma etapa determinística lê as tools e grava o payload no estado da sessão. Só o
redator usa o modelo, para escrever a mensagem de abertura a partir desse payload,
e a resposta dele só chega ao cliente se passar no schema de ações. Se não passar,
entra um texto calculado — nunca um texto livre do modelo fora do contrato.
"""

from __future__ import annotations

import json
import logging
import re
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from google.adk.agents import Agent, BaseAgent, SequentialAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions
from google.adk.sessions.base_session_service import BaseSessionService
from google.adk.sessions.session import Session
from google.genai import types
from pydantic import BaseModel, Field, ValidationError

from app.datasources.base import DataSource
from app.datasources.factory import get_data_source
from app.prompts import load_prompt
from app.tools.vita import fatura_rotativo

logger = logging.getLogger(__name__)

# CA-02: sem valor, sem produto, sem "juros". O detalhe só aparece após autenticar.
PUSH_NEUTRO = "O Vita tem uma análise nova para você"

TRIGGER = "dreno_rotativo"
MESES_SEGUIDOS_GATILHO = 3

CATALOGO_ACOES: dict[str, str] = {
    "abrir_visao_financeira": "Ver visão financeira",
    "abrir_fatura": "Ver a fatura",
    "abrir_simulacao_t01": "Simular usar a reserva",
    "abrir_simulacao_t02": "Simular parcelar a fatura",
    "falar_com_pessoa": "Falar com uma pessoa",
}
PRECISA_SIMULACAO = {"abrir_simulacao_t01", "abrir_simulacao_t02"}
ACOES_PADRAO = ("abrir_fatura", "abrir_visao_financeira", "falar_com_pessoa")

TipoAcao = Literal[
    "abrir_visao_financeira",
    "abrir_fatura",
    "abrir_simulacao_t01",
    "abrir_simulacao_t02",
    "falar_com_pessoa",
]


class Acao(BaseModel):
    tipo: TipoAcao
    rotulo: str = Field(min_length=1, max_length=60)
    simulacao_id: str | None = None


class RespostaEstruturada(BaseModel):
    """Contrato entre o agente e a tela: texto + botões do catálogo."""

    texto: str = Field(min_length=1)
    acoes: list[Acao] = Field(default_factory=list)


_CERCA_JSON = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def validar_resposta(texto_json: str, simulacoes: dict) -> RespostaEstruturada:
    """CA-13: toda resposta passa no schema; ação de simulação referencia um
    simulacao_id existente e dentro da validade. Levanta ValueError se não."""
    try:
        dados = json.loads(_CERCA_JSON.sub("", texto_json.strip()))
    except json.JSONDecodeError as erro:
        raise ValueError(f"resposta não é JSON: {erro}") from erro
    try:
        resposta = RespostaEstruturada.model_validate(dados)
    except ValidationError as erro:
        raise ValueError(f"resposta fora do schema: {erro}") from erro
    agora = datetime.now(UTC)
    for acao in resposta.acoes:
        if acao.tipo not in PRECISA_SIMULACAO:
            continue
        sim = simulacoes.get(acao.simulacao_id or "")
        if sim is None:
            raise ValueError(f"simulacao_id inexistente para {acao.tipo}")
        expira = datetime.fromisoformat(
            str(sim.get("expira_em", "1970-01-01T00:00:00+00:00"))
        )
        if expira.tzinfo is None:
            expira = expira.replace(tzinfo=UTC)
        if expira <= agora:
            raise ValueError(f"simulacao {acao.simulacao_id} expirada")
    return resposta


# ------------------------------------------------------------------ CA-01 gatilho


def publico_gatilho(
    ds: DataSource, mes_referencia: int, minimo: int = MESES_SEGUIDOS_GATILHO
) -> list[str]:
    """Clientes com `minimo` faturas seguidas sem pagamento integral, terminando
    no mês de referência. Regra pura sobre vw_fatura_mensal; sem LLM."""
    publico = []
    for cid in ds.customer_ids():
        meses = [
            m for m in ds.get_fatura_rotativo(cid) if m["anomes"] <= mes_referencia
        ]
        if not meses or meses[-1]["anomes"] != mes_referencia:
            continue
        seguidos = 0
        for m in reversed(meses):
            if m["modo"] == "integral":
                break
            seguidos += 1
        if seguidos >= minimo:
            publico.append(cid)
    return publico


# --------------------------------------------- pipeline: diagnóstico → redator


def session_id_abertura(customer_id: str) -> str:
    return f"abertura-{customer_id}"


def _brl(v: float | None) -> str:
    if v is None:
        return "—"
    return "R$ " + f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


_MESES = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
]


def _rotulo_mes(anomes: int | None) -> str:
    if not anomes:
        return "no último mês"
    return f"{_MESES[anomes % 100 - 1]}/{anomes // 100}"


def montar_payload(customer_id: str) -> dict:
    """O que o redator pode citar. Tudo vem das tools; nada é estimado."""
    ds = get_data_source()
    fatura = fatura_rotativo(customer_id)
    meses = fatura["meses"]
    ref = meses[-1] if meses else {}
    seguidos = 0
    for m in reversed(meses):
        if m["modo"] == "integral":
            break
        seguidos += 1
    perfil = ds.get_perfil_risco(customer_id) or {}
    diag = ds.get_diagnostico(customer_id) or {}
    return {
        "mes_referencia": fatura["mes_referencia"],
        "modo_pagamento": ref.get("modo"),
        "pago": ref.get("pago"),
        "fatura_total": ref.get("fatura_total_reconstruida"),
        "saldo_rotativo": ref.get("saldo_rotativo_reconstruido"),
        "juros_mes": ref.get("juros_rotativo"),
        "meses_seguidos_sem_integral": seguidos,
        "juros_rotativo_ano": diag.get("juros_encargos_ano"),
        "faixa_risco": perfil.get("faixa_risco"),
    }


def texto_fallback(payload: dict) -> str:
    """Abertura calculada, usada quando o redator sai do contrato."""
    return (
        "Olá. Sou o Vita, um assistente com IA. "
        f"Em {_rotulo_mes(payload.get('mes_referencia'))} você pagou {_brl(payload.get('pago'))} "
        f"da fatura, ficaram {_brl(payload.get('saldo_rotativo'))} no rotativo e isso custou "
        f"{_brl(payload.get('juros_mes'))} de juros. Quer ver os detalhes?"
    )


def acoes_padrao() -> list[dict]:
    return [
        {"tipo": t, "rotulo": CATALOGO_ACOES[t], "simulacao_id": None}
        for t in ACOES_PADRAO
    ]


class DiagnosticoAgent(BaseAgent):
    """Etapa determinística: lê as tools e grava o payload no estado. Sem LLM."""

    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        cid = ctx.session.state.get("customer_id")
        payload = montar_payload(cid) if cid else {}
        yield Event(
            invocation_id=ctx.invocation_id,
            author=self.name,
            actions=EventActions(
                state_delta={
                    "abertura_payload": payload,
                    # Texto que o redator recebe pela instrução ({diagnostico_json}).
                    "diagnostico_json": json.dumps(payload, ensure_ascii=False),
                }
            ),
        )


def _model():
    from app.agent import _model as modelo_padrao
    from app.config import load_config

    # S7: o redator roda no seu próprio modelo (papéis distribuídos).
    return modelo_padrao(load_config().model_name_redator)


redator = Agent(
    name="redator",
    model=_model(),
    instruction=load_prompt("redator"),
    # Só o payload da instrução: o histórico não interessa e não pode vazar.
    include_contents="none",
    output_schema=RespostaEstruturada,
    output_key="abertura_json",
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
)

pipeline_abertura = SequentialAgent(
    name="abertura",
    sub_agents=[DiagnosticoAgent(name="diagnostico"), redator],
)


async def executar_abertura(
    runner, app_name: str, customer_id: str, mes_referencia: int | None
) -> dict:
    """Roda o pipeline numa sessão fixa por cliente e grava a abertura validada."""
    servico = runner.session_service
    sid = session_id_abertura(customer_id)
    if await servico.get_session(
        app_name=app_name, user_id=customer_id, session_id=sid
    ):
        await servico.delete_session(
            app_name=app_name, user_id=customer_id, session_id=sid
        )
    await servico.create_session(
        app_name=app_name,
        user_id=customer_id,
        session_id=sid,
        state={
            "customer_id": customer_id,
            "trigger": TRIGGER,
            "mes_referencia": mes_referencia,
        },
    )
    texto_modelo = ""
    try:
        async for ev in runner.run_async(
            user_id=customer_id,
            session_id=sid,
            new_message=types.Content(
                role="user",
                parts=[types.Part(text="Escreva a abertura a partir do diagnóstico.")],
            ),
        ):
            if ev.author == redator.name and ev.content and ev.content.parts:
                texto_modelo = (
                    " ".join(p.text for p in ev.content.parts if p.text) or texto_modelo
                )
    except Exception as erro:
        # O ADK valida o output_schema e levanta quando o modelo sai do contrato;
        # cota estourada ou rede também caem aqui. Em todos os casos o cliente
        # recebe a abertura calculada, nunca um erro nem texto fora do contrato.
        logger.warning("redator indisponível ou fora do schema (%s)", erro)
        texto_modelo = ""

    sessao = await servico.get_session(
        app_name=app_name, user_id=customer_id, session_id=sid
    )
    payload = sessao.state.get("abertura_payload") or {}
    try:
        resposta = validar_resposta(texto_modelo, sessao.state.get("simulacoes") or {})
        abertura = {
            "texto": resposta.texto,
            "acoes": [a.model_dump() for a in resposta.acoes],
            "fallback": False,
        }
    except ValueError as erro:
        logger.warning("redator fora do contrato (%s); usando abertura calculada", erro)
        abertura = {
            "texto": texto_fallback(payload),
            "acoes": acoes_padrao(),
            "fallback": True,
        }

    await servico.append_event(
        sessao,
        Event(author="vita", actions=EventActions(state_delta={"abertura": abertura})),
    )
    return {"session_id": sid, "push": PUSH_NEUTRO, "abertura": abertura}


def montar_abertura(sessao: Session | None) -> dict | None:
    """CA-03: a abertura sai do estado da sessão; nenhuma chamada ao modelo."""
    if sessao is None:
        return None
    abertura = sessao.state.get("abertura")
    if not abertura:
        return None
    return {"push": PUSH_NEUTRO, **abertura}


# ------------------------------------------------------ semente (sobrevive a reinício)


def salvar_semente(caminho: Path, sessoes: list[dict]) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(
        json.dumps(sessoes, ensure_ascii=False, indent=2), encoding="utf-8"
    )


async def carregar_semente(
    servico: BaseSessionService, app_name: str, caminho: Path
) -> int:
    """Recria no boot as sessões pré-montadas. Sem arquivo, não faz nada."""
    if not caminho.exists():
        return 0
    quantas = 0
    for item in json.loads(caminho.read_text(encoding="utf-8")):
        if await servico.get_session(
            app_name=app_name, user_id=item["user_id"], session_id=item["session_id"]
        ):
            continue
        sessao = await servico.create_session(
            app_name=app_name,
            user_id=item["user_id"],
            session_id=item["session_id"],
            state={**item.get("state", {}), "abertura": item["abertura"]},
        )
        # A abertura também entra no histórico: quando o cliente responder, o
        # orquestrador precisa ver o que o Vita disse, não só o estado.
        await servico.append_event(
            sessao,
            Event(
                author=redator.name,
                content=types.Content(
                    role="model", parts=[types.Part(text=item["abertura"]["texto"])]
                ),
            ),
        )
        quantas += 1
    logger.info(
        "semente de abertura: %d sessão(ões) recriada(s) de %s", quantas, caminho
    )
    return quantas
