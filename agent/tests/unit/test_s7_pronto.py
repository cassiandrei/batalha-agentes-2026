"""S7 — pronto para a banca.

Modo de ensaio com LLM simulado (sem rede), papéis em modelos diferentes, uma
regeneração por resposta (CA-09), latência e chamadas por conversa nos logs, sementes
conferidas no boot e min-instances no deploy.
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator
from pathlib import Path
from types import SimpleNamespace

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models.base_llm import BaseLlm
from google.adk.models.llm_response import LlmResponse
from google.adk.runners import InMemoryRunner
from google.genai import types

RAIZ = Path(__file__).resolve().parents[3]


async def _conversa(runner, sid, texto):
    await runner.session_service.create_session(
        app_name="t", user_id="u", session_id=sid
    )
    saida = []
    async for ev in runner.run_async(
        user_id="u",
        session_id=sid,
        new_message=types.Content(role="user", parts=[types.Part(text=texto)]),
    ):
        if ev.content and ev.content.parts:
            saida += [p.text for p in ev.content.parts if p.text]
    return " ".join(saida)


def test_modo_de_ensaio_usa_llm_simulado_em_todos_os_papeis(monkeypatch):
    import importlib

    monkeypatch.setenv("LLM_MODE", "simulado")
    import app.agent as agent_mod

    importlib.reload(agent_mod)
    from app.llm_simulado import LlmSimulado

    for a in (agent_mod.root_agent, agent_mod.analyst, agent_mod.especialista_normas):
        assert isinstance(a.model, LlmSimulado), a.name
    monkeypatch.setenv("LLM_MODE", "real")
    importlib.reload(agent_mod)
    assert not isinstance(agent_mod.root_agent.model, LlmSimulado)


def test_llm_simulado_responde_sem_rede_e_conta_chamadas():
    from app.llm_simulado import TEXTO_ENSAIO, LlmSimulado
    from app.plugins.security_plugin import SecurityPlugin

    llm = LlmSimulado()
    agente = Agent(name="t", model=llm, instruction="ensaio")
    runner = InMemoryRunner(
        app=App(name="t", root_agent=agente, plugins=[SecurityPlugin()])
    )
    resposta = asyncio.run(_conversa(runner, "e1", "quanto paguei de juros?"))
    assert TEXTO_ENSAIO in resposta and llm.chamadas == 1


def test_papeis_em_modelos_diferentes():
    from app.abertura import redator
    from app.agent import especialista_normas, root_agent

    nomes = {
        root_agent.model.model,
        especialista_normas.model.model,
        redator.model.model,
    }
    assert len(nomes) == 3, nomes


class LlmRuimDepoisBom(BaseLlm):
    """Primeira resposta cita número inventado; a regeneração vem limpa."""

    model: str = "fake"
    chamadas: int = 0

    async def generate_content_async(
        self, llm_request, stream=False
    ) -> AsyncGenerator[LlmResponse, None]:
        self.chamadas += 1
        texto = "Você deve R$ 1.200,00" if self.chamadas == 1 else "Você deve R$ 725,07"
        yield LlmResponse(
            content=types.Content(role="model", parts=[types.Part(text=texto)])
        )


class LlmSempreRuim(BaseLlm):
    model: str = "fake"
    chamadas: int = 0

    async def generate_content_async(
        self, llm_request, stream=False
    ) -> AsyncGenerator[LlmResponse, None]:
        self.chamadas += 1
        yield LlmResponse(
            content=types.Content(
                role="model",
                parts=[types.Part(text="Parcelamento garantido e aprovado!")],
            )
        )


def _app_com(llm):
    from app.plugins.security_plugin import SecurityPlugin

    def registra(tool_context) -> dict:
        """Devolve o saldo do rotativo."""
        return {"saldo": 725.07}

    agente = Agent(name="t", model=llm, instruction="teste", tools=[registra])
    return InMemoryRunner(
        app=App(name="t", root_agent=agente, plugins=[SecurityPlugin()])
    )


def test_ca09_numero_inventado_e_regenerado_uma_vez(monkeypatch, caplog):
    monkeypatch.setenv("REGENERACOES_MAX", "1")
    llm = LlmRuimDepoisBom()
    runner = _app_com(llm)

    # semeia o payload das tools no estado da sessão, como uma tool faria
    async def conversa():
        await runner.session_service.create_session(
            app_name="t",
            user_id="u",
            session_id="r1",
            state={"numeros_tools": [725.07]},
        )
        saida = []
        async for ev in runner.run_async(
            user_id="u",
            session_id="r1",
            new_message=types.Content(
                role="user", parts=[types.Part(text="quanto devo?")]
            ),
        ):
            if ev.content and ev.content.parts:
                saida += [p.text for p in ev.content.parts if p.text]
        return " ".join(saida)

    with caplog.at_level("INFO", logger="audit"):
        resposta = asyncio.run(conversa())
    assert "R$ 725,07" in resposta and "1.200" not in resposta
    assert llm.chamadas == 2
    assert "regenerado" in caplog.text


def test_ca09_se_a_regeneracao_falha_vem_a_resposta_segura(monkeypatch):
    from app.plugins.security_plugin import RECUSA_SAIDA

    monkeypatch.setenv("REGENERACOES_MAX", "1")
    llm = LlmSempreRuim()
    runner = _app_com(llm)
    resposta = asyncio.run(_conversa(runner, "r2", "posso parcelar?"))
    assert resposta.strip() == RECUSA_SAIDA
    assert llm.chamadas == 2, "uma regeneração, não mais"


def test_sem_regeneracao_configurada_vai_direto_para_a_resposta_segura(monkeypatch):
    from app.plugins.security_plugin import RECUSA_SAIDA

    monkeypatch.setenv("REGENERACOES_MAX", "0")
    llm = LlmSempreRuim()
    resposta = asyncio.run(_conversa(_app_com(llm), "r3", "posso parcelar?"))
    assert resposta.strip() == RECUSA_SAIDA and llm.chamadas == 1


def test_latencia_por_turno_e_chamadas_por_conversa_no_log(caplog):
    from app.llm_simulado import LlmSimulado
    from app.plugins.audit_plugin import AuditPlugin

    agente = Agent(name="t", model=LlmSimulado(), instruction="ensaio")
    runner = InMemoryRunner(
        app=App(name="t", root_agent=agente, plugins=[AuditPlugin()])
    )
    with caplog.at_level("INFO", logger="audit"):
        asyncio.run(_conversa(runner, "l1", "oi"))

        # segundo turno na mesma sessão
        async def segundo():
            async for _ in runner.run_async(
                user_id="u",
                session_id="l1",
                new_message=types.Content(
                    role="user", parts=[types.Part(text="e a fatura?")]
                ),
            ):
                pass

        asyncio.run(segundo())
    turnos = [
        json.loads(r.getMessage())
        for r in caplog.records
        if r.name == "audit" and '"turn"' in r.getMessage()
    ]
    assert len(turnos) == 2
    assert all(t["latency_ms"] is not None and t["model_calls"] == 1 for t in turnos)
    assert turnos[-1]["model_calls_conversa"] == 2
    assert "oi" not in json.dumps(turnos) and "fatura" not in json.dumps(turnos)


def test_sementes_conferidas_no_boot(caplog):
    from google.adk.sessions.in_memory_session_service import InMemorySessionService

    from app.abertura import session_id_abertura
    from app.fast_api_app import conferir_sementes

    cfg = SimpleNamespace(demo_customer_id="bruno", demo_customer_id_marcos="marcos")
    svc = InMemorySessionService()

    async def cenario():
        await svc.create_session(
            app_name="app",
            user_id="bruno",
            session_id=session_id_abertura("bruno"),
            state={"abertura": {"texto": "x"}},
        )
        return await conferir_sementes(svc, "app", cfg)

    with caplog.at_level("INFO"):
        presentes = asyncio.run(cenario())
    assert presentes == {"bruno": True, "marcos": False}
    assert "marcos" in caplog.text and "seed_abertura" in caplog.text


def test_deploy_aceita_min_instances_e_modo_de_ensaio():
    fonte = (RAIZ / "infra/scripts/deploy.sh").read_text(encoding="utf-8")
    assert 'MIN_INSTANCES="${MIN_INSTANCES:-0}"' in fonte
    assert (
        "--min-instances=0" not in fonte and '--min-instances="$MIN_INSTANCES"' in fonte
    )
    assert (
        "LLM_MODE" in fonte
        and "MODEL_NAME_REDATOR" in fonte
        and "DEMO_CUSTOMER_ID_MARCOS" in fonte
    )
    mk = (RAIZ / "Makefile").read_text(encoding="utf-8")
    assert "MIN_INSTANCES=$(MIN_INSTANCES)" in mk and "roteiro:" in mk


def test_front_sem_html_do_modelo_e_com_regiao_viva():
    chat = (RAIZ / "web/src/components/ChatArea.tsx").read_text(encoding="utf-8")
    assert "dangerouslySetInnerHTML" not in chat
    assert 'aria-live="polite"' in chat and 'role="log"' in chat
    for f in (
        "ChatArea",
        "Header",
        "PrescriptionFooter",
        "FlowAdjustmentModal",
        "InstallmentModal",
    ):
        assert (
            "garantid"
            not in (RAIZ / f"web/src/components/{f}.tsx")
            .read_text(encoding="utf-8")
            .lower()
        )
