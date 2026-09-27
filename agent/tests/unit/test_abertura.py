"""S2 — abertura proativa: gatilho, push neutro, pipeline diagnóstico → redator,
schema das ações e sessão pré-montada que sobrevive a reinício.

CA-01 gatilho · CA-02 push neutro · CA-03 abertura sem nova chamada ao modelo ·
CA-13 schema das ações. LLM simulado em tudo.
"""

from __future__ import annotations

import csv
import json
import re
from collections.abc import AsyncGenerator

import pytest

from app.datasources.evento import EventoDataSource
from tests.unit.test_vita_datasource import BIO, BRUNO, EXTRATO, OUTRO, PERFIL

# Bruno real: out parcial, nov mínimo, dez mínimo = 3 seguidas sem integral.
FATURA_S2 = [
    dict(id_usuario=BRUNO, anomes="202509", mes="9", modo="integral", pago="586.56",
         juros_rotativo="0.0", fatura_total_reconstruida="", saldo_rotativo_reconstruido=""),
    dict(id_usuario=BRUNO, anomes="202510", mes="10", modo="parcial", pago="294.84",
         juros_rotativo="14.77", fatura_total_reconstruida="", saldo_rotativo_reconstruido="105.5"),
    dict(id_usuario=BRUNO, anomes="202511", mes="11", modo="minimo", pago="177.05",
         juros_rotativo="140.46", fatura_total_reconstruida="1180.33", saldo_rotativo_reconstruido="1003.29"),
    dict(id_usuario=BRUNO, anomes="202512", mes="12", modo="minimo", pago="127.96",
         juros_rotativo="101.51", fatura_total_reconstruida="853.07", saldo_rotativo_reconstruido="725.07"),
    # OUTRO: dezembro integral — não entra no gatilho, mesmo com meses ruins antes.
    dict(id_usuario=OUTRO, anomes="202510", mes="10", modo="minimo", pago="50.0",
         juros_rotativo="39.6", fatura_total_reconstruida="333.33", saldo_rotativo_reconstruido="282.86"),
    dict(id_usuario=OUTRO, anomes="202511", mes="11", modo="minimo", pago="50.0",
         juros_rotativo="39.6", fatura_total_reconstruida="333.33", saldo_rotativo_reconstruido="282.86"),
    dict(id_usuario=OUTRO, anomes="202512", mes="12", modo="integral", pago="900.0",
         juros_rotativo="0.0", fatura_total_reconstruida="", saldo_rotativo_reconstruido=""),
]
TABELAS_S2 = {"vw_fatura_mensal": FATURA_S2, "perfil_risco": PERFIL, "vw_bioimpedancia": BIO}

RESPOSTA_DO_REDATOR = {
    "texto": (
        "Olá, Bruno. Sou o Vita, um assistente com IA. Em dezembro você pagou R$ 127,96 "
        "da fatura, ficaram R$ 725,07 no rotativo e isso custou R$ 101,51 de juros."
    ),
    "acoes": [
        {"tipo": "abrir_fatura", "rotulo": "Ver a fatura"},
        {"tipo": "abrir_visao_financeira", "rotulo": "Ver visão financeira"},
        {"tipo": "falar_com_pessoa", "rotulo": "Falar com uma pessoa"},
    ],
}


@pytest.fixture
def ds():
    return EventoDataSource(EXTRATO, tabelas=TABELAS_S2)


# ---------------------------------------------------------------- CA-01 gatilho


def test_ca01_bruno_entra_no_publico_do_gatilho_e_outro_nao(ds):
    from app.abertura import publico_gatilho

    publico = publico_gatilho(ds, mes_referencia=202512)
    assert BRUNO in publico
    assert OUTRO not in publico  # dezembro integral quebra a sequência


def test_ca01_gatilho_exige_tres_seguidas_terminando_no_mes_de_referencia(ds):
    from app.abertura import publico_gatilho

    # Em novembro o Bruno tinha só 2 seguidas (out, nov): ainda não dispara.
    assert BRUNO not in publico_gatilho(ds, mes_referencia=202511)


def test_ca01_evento_de_gatilho_e_aceito_pelo_events():
    from app.events import EVENT_TYPES, EventRequest

    assert "dreno_rotativo" in EVENT_TYPES
    ev = EventRequest(event_type="dreno_rotativo", customer_id=BRUNO, details={"mes_referencia": 202512})
    assert ev.customer_id == BRUNO


# ------------------------------------------------------------- CA-02 push neutro


def test_ca02_push_e_neutro():
    from app.abertura import PUSH_NEUTRO

    assert PUSH_NEUTRO == "O Vita tem uma análise nova para você"
    assert not re.search(r"\d", PUSH_NEUTRO)
    assert "juros" not in PUSH_NEUTRO.lower()
    for produto in ("cartão", "cdb", "parcel", "rotativo", "crédito"):
        assert produto not in PUSH_NEUTRO.lower()


# --------------------------------------------------------- CA-13 schema das ações


def test_ca13_resposta_valida_passa_no_schema():
    from app.abertura import CATALOGO_ACOES, validar_resposta

    r = validar_resposta(json.dumps(RESPOSTA_DO_REDATOR), simulacoes={})
    assert r.texto.startswith("Olá, Bruno")
    assert [a.tipo for a in r.acoes] == ["abrir_fatura", "abrir_visao_financeira", "falar_com_pessoa"]
    assert set(CATALOGO_ACOES) == {
        "abrir_visao_financeira", "abrir_fatura", "abrir_simulacao_t01",
        "abrir_simulacao_t02", "falar_com_pessoa",
    }


def test_ca13_acao_fora_do_catalogo_e_rejeitada():
    from app.abertura import validar_resposta

    ruim = {"texto": "oi", "acoes": [{"tipo": "contratar_emprestimo", "rotulo": "x"}]}
    with pytest.raises(ValueError):
        validar_resposta(json.dumps(ruim), simulacoes={})


def test_ca13_simulacao_precisa_existir_e_estar_na_validade():
    from app.abertura import validar_resposta

    com_sim = {"texto": "oi", "acoes": [{"tipo": "abrir_simulacao_t01", "rotulo": "x", "simulacao_id": "sim-1"}]}
    with pytest.raises(ValueError, match="simulacao"):
        validar_resposta(json.dumps(com_sim), simulacoes={})  # não existe
    with pytest.raises(ValueError, match="simulacao"):
        validar_resposta(json.dumps(com_sim), simulacoes={"sim-1": {"expira_em": "2000-01-01T00:00:00+00:00"}})
    ok = validar_resposta(json.dumps(com_sim), simulacoes={"sim-1": {"expira_em": "2999-01-01T00:00:00+00:00"}})
    assert ok.acoes[0].simulacao_id == "sim-1"
    sem_id = {"texto": "oi", "acoes": [{"tipo": "abrir_simulacao_t02", "rotulo": "x"}]}
    with pytest.raises(ValueError, match="simulacao"):
        validar_resposta(json.dumps(sem_id), simulacoes={})


def test_ca13_texto_nao_estruturado_e_rejeitado():
    from app.abertura import validar_resposta

    with pytest.raises(ValueError):
        validar_resposta("Olá! Vi que você pagou o mínimo.", simulacoes={})


# --------------------------------------- pipeline: diagnóstico (tools) → redator (LLM)


def _escreve(caminho, linhas):
    with open(caminho, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(linhas[0]))
        w.writeheader()
        w.writerows(linhas)


@pytest.fixture
def snapshot(monkeypatch, tmp_path):
    from app.datasources import evento as mod

    (tmp_path / "evento").mkdir()
    _escreve(tmp_path / "evento" / "extrato.csv", EXTRATO)
    _escreve(tmp_path / "evento" / "vw_fatura_mensal.csv", FATURA_S2)
    _escreve(tmp_path / "evento" / "perfil_risco.csv", PERFIL)
    _escreve(tmp_path / "evento" / "vw_bioimpedancia.csv", BIO)
    mod._carregar_snapshot.cache_clear()
    monkeypatch.setenv("DATA_SOURCE", "evento")
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setenv("DEMO_CUSTOMER_ID", BRUNO)
    return tmp_path


def _fake_llm(resposta: dict | str):
    from google.adk.models.base_llm import BaseLlm
    from google.adk.models.llm_response import LlmResponse
    from google.genai import types

    capturados: list = []
    texto = resposta if isinstance(resposta, str) else json.dumps(resposta, ensure_ascii=False)

    class FakeLlm(BaseLlm):
        model: str = "fake-model"

        async def generate_content_async(
            self, llm_request, stream=False
        ) -> AsyncGenerator[LlmResponse, None]:
            capturados.append(llm_request)
            yield LlmResponse(
                content=types.Content(role="model", parts=[types.Part(text=texto)])
            )

    return FakeLlm(), capturados


@pytest.fixture
def cliente(monkeypatch, snapshot):
    from fastapi.testclient import TestClient

    from app import abertura, agent as modulo_agente

    fake, capturados = _fake_llm(RESPOSTA_DO_REDATOR)
    monkeypatch.setattr(abertura.redator, "model", fake)
    monkeypatch.setattr(modulo_agente.root_agent, "model", fake)
    from app.fast_api_app import app as fastapi_app

    return TestClient(fastapi_app), capturados


def _dispara(cliente):
    return cliente.post(
        "/events",
        json={"event_type": "dreno_rotativo", "customer_id": BRUNO, "details": {"mes_referencia": 202512}},
    )


def test_pipeline_diagnostico_vai_por_tools_e_o_redator_recebe_o_payload(cliente):
    http, capturados = cliente
    with http:
        r = _dispara(http)
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["push"] == "O Vita tem uma análise nova para você"
    assert corpo["session_id"] == f"abertura-{BRUNO}"
    assert corpo["abertura"]["texto"].startswith("Olá, Bruno")
    assert [a["tipo"] for a in corpo["abertura"]["acoes"]] == [
        "abrir_fatura", "abrir_visao_financeira", "falar_com_pessoa"
    ]
    # Uma chamada ao modelo (o redator); o diagnóstico não usa LLM.
    assert len(capturados) == 1
    enviado = " ".join(
        p.text for c in capturados[0].contents for p in (c.parts or []) if p.text
    ) + " " + str(capturados[0].config.system_instruction or "")
    for numero in ("127.96", "725.07", "101.51"):
        assert numero in enviado, numero
    assert BRUNO not in enviado  # D2: id nunca no contexto do modelo


def test_ca03_abertura_e_lida_da_sessao_sem_nova_chamada_ao_modelo(cliente):
    http, capturados = cliente
    with http:
        assert _dispara(http).status_code == 200
        chamadas = len(capturados)
        r = http.get(f"/customers/{BRUNO}/opening")
        assert r.status_code == 200, r.text
        corpo = r.json()
        assert corpo["push"] == "O Vita tem uma análise nova para você"
        assert corpo["texto"] == RESPOSTA_DO_REDATOR["texto"]
        assert len(corpo["acoes"]) == 3
        for valor in ("127,96", "725,07", "101,51"):
            assert valor in corpo["texto"]
        assert len(capturados) == chamadas  # zero chamadas novas
        assert http.get(f"/customers/{OUTRO}/opening").status_code == 404


def test_redator_fora_do_schema_e_bloqueado_e_a_abertura_cai_no_texto_deterministico(
    monkeypatch, snapshot
):
    from fastapi.testclient import TestClient

    from app import abertura, agent as modulo_agente

    fake, _ = _fake_llm("Oi Bruno, vi seus juros! Quer contratar um empréstimo?")
    monkeypatch.setattr(abertura.redator, "model", fake)
    monkeypatch.setattr(modulo_agente.root_agent, "model", fake)
    from app.fast_api_app import app as fastapi_app

    with TestClient(fastapi_app) as http:
        r = _dispara(http)
        assert r.status_code == 200, r.text
        corpo = r.json()["abertura"]
        # Texto fora do schema não chega ao cliente: entra o fallback calculado.
        assert "empréstimo" not in corpo["texto"].lower()
        assert "127,96" in corpo["texto"] and "725,07" in corpo["texto"]
        assert corpo["fallback"] is True
        assert [a["tipo"] for a in corpo["acoes"]] == ["abrir_fatura", "abrir_visao_financeira", "falar_com_pessoa"]


# ------------------------------------------------- semente: sobrevive a reinício


def test_semente_recria_a_sessao_pre_montada_num_processo_novo(snapshot):
    """Reiniciar a instância = session service novo e vazio. A semente
    carregada no boot devolve a abertura sem chamar o modelo."""
    import asyncio

    from google.adk.sessions.in_memory_session_service import InMemorySessionService

    from app.abertura import carregar_semente, montar_abertura, salvar_semente

    semente = snapshot / "evento" / "seed_sessions.json"
    salvar_semente(
        semente,
        [
            {
                "user_id": BRUNO,
                "session_id": f"abertura-{BRUNO}",
                "state": {"customer_id": BRUNO, "trigger": "dreno_rotativo"},
                "abertura": RESPOSTA_DO_REDATOR,
            }
        ],
    )
    novo = InMemorySessionService()
    quantas = asyncio.run(carregar_semente(novo, "app", semente))
    assert quantas == 1
    sessao = asyncio.run(novo.get_session(app_name="app", user_id=BRUNO, session_id=f"abertura-{BRUNO}"))
    abertura = montar_abertura(sessao)
    assert abertura["texto"] == RESPOSTA_DO_REDATOR["texto"]
    assert abertura["acoes"][0]["tipo"] == "abrir_fatura"
    assert sessao.state["customer_id"] == BRUNO


def test_semente_ausente_nao_quebra_o_boot(tmp_path):
    import asyncio

    from google.adk.sessions.in_memory_session_service import InMemorySessionService

    from app.abertura import carregar_semente

    assert asyncio.run(carregar_semente(InMemorySessionService(), "app", tmp_path / "nao-existe.json")) == 0
