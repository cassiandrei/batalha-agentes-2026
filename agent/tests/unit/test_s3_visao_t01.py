"""S3 — visão financeira e T01 (usar a reserva).

CA-08: simular_uso_reserva devolve saldo quitado, juros evitados, rendimento perdido
(CDI do SGS) e IR, sem campo nulo para o Bruno. Mais: a fórmula do Índice de
Organização Financeira sobre a vw_bioimpedancia e o validador de números.

Números reais do Bruno (36d74064), snapshot completo: saldo no rotativo 725,07;
juros 101,51 (= 725,07 × 14%); CDB DI 41.270 a 103% do CDI; CDI 13,65% a.a. (SGS
4389, 24/09/2026).
"""

from __future__ import annotations

import csv
import json
from types import SimpleNamespace

import pytest
from google.adk.sessions.state import State

from app.datasources.evento import EventoDataSource
from tests.unit.test_vita_datasource import BRUNO, EXTRATO, FATURA, PERFIL

BIO_REAL = [
    dict(id_usuario=BRUNO, renda_media_mensal="7116.25", entradas_media_mensal="9451.76",
         saidas_media_mensal="6896.3", essenciais_media_mensal="1831.9",
         poupanca_sobre_entradas_pct="27.0", poupanca_sobre_renda_pct="3.1",
         meses_fluxo_negativo="4", meses_saldo_negativo="1", meses_pagando_juros="6",
         juros_encargos_ano="718.5", tarifas_ano="621.76", dreno_pct_renda="1.57",
         capitalizacao_ano="25.33", meses_capitalizacao_com_juros="1", essenciais_pct_renda="25.7",
         comprometimento_credito_pct="37.7", fatura_pct_saidas="10.5", tem_seguro="true",
         saldo_ultimo_mes="45503.1", juros_ultimo_mes="101.51", parcelado_a_vencer="0.0"),
]
INVEST = [
    dict(id_usuario=BRUNO, produto="CDB DI", liquidez="diaria", percentual_cdi="1.03",
         finalidade="reserva de emergencia", saldo="41270.0", origem="sintetico_cenario_demo"),
    dict(id_usuario="outro", produto="CDB DI", liquidez="diaria", percentual_cdi="1.0",
         finalidade="objetivo", saldo="999.0", origem="sintetico_regra"),
]
PARAMS = [
    dict(parametro="taxa_rotativo_cartao", valor="0.14", unidade="% a.m.", origem="inferida_da_base", fonte="razao 0,793"),
    dict(parametro="pagamento_minimo_fatura", valor="0.15", unidade="% da fatura", origem="inferida_da_base", fonte="idem"),
    dict(parametro="guardrail_atencao", valor="0.35", unidade="comprometimento/renda", origem="decisao_do_time", fonte="x"),
]
CDI = {"serie_sgs": 4389, "data_referencia": "24/09/2026", "cdi_aa_pct": 13.65, "origem": "bcb_sgs"}

TABELAS = {
    "vw_fatura_mensal": FATURA,
    "perfil_risco": PERFIL,
    "vw_bioimpedancia": BIO_REAL,
    "posicao_investimentos": INVEST,
    "parametros_modelo": PARAMS,
}


@pytest.fixture
def ds():
    return EventoDataSource(EXTRATO, tabelas=TABELAS, cdi=CDI)


def ctx(customer_id=BRUNO, **estado):
    valores = {"customer_id": customer_id, **estado} if customer_id else dict(estado)
    return SimpleNamespace(state=State(value=valores, delta={}))


# --------------------------------------------------------------- datasource


def test_investimentos_e_parametros_vem_do_snapshot(ds):
    inv = ds.get_posicao_investimentos(BRUNO)
    assert inv == [
        {"produto": "CDB DI", "liquidez": "diaria", "percentual_cdi": 1.03,
         "finalidade": "reserva de emergencia", "saldo": 41270.0}
    ]
    assert ds.get_posicao_investimentos("nao-existe") == []
    p = ds.get_parametros_modelo()
    assert p["taxa_rotativo_cartao"]["valor"] == 0.14
    assert p["taxa_rotativo_cartao"]["origem"] == "inferida_da_base"
    assert ds.get_cdi()["cdi_aa_pct"] == 13.65
    assert ds.get_cdi()["origem"] == "bcb_sgs"


def test_sem_arquivo_de_cdi_usa_o_valor_fixo_declarado():
    sem = EventoDataSource(EXTRATO, tabelas=TABELAS)
    cdi = sem.get_cdi()
    assert cdi["origem"] == "fixo_declarado"
    assert cdi["cdi_aa_pct"] > 0


# ------------------------------------------------- índice de organização


def test_formula_do_indice_no_bruno_real():
    """Quatro pilares de 25 pontos, todos dos indicadores da bioimpedância:
    poupança (−20%→0, +20%→25), dreno (0%→25, 5% da renda→0),
    comprometimento (0→25, 50%→0), cronicidade (12 meses com juros→0)."""
    from app.indice import indice_organizacao

    r = indice_organizacao(BIO_REAL[0] | {"poupanca_sobre_entradas_pct": 27.0, "dreno_pct_renda": 1.57,
                                         "comprometimento_credito_pct": 37.7, "meses_pagando_juros": 6})
    assert r["componentes"] == {"poupanca": 25.0, "dreno": 17.15, "comprometimento": 6.15, "cronicidade": 12.5}
    assert r["score"] == 61
    assert r["status"] == "atencao"
    assert r["versao"] == "v1"


def test_indice_extremos_e_limites():
    from app.indice import indice_organizacao

    otimo = indice_organizacao({"poupanca_sobre_entradas_pct": 30, "dreno_pct_renda": 0,
                                "comprometimento_credito_pct": 0, "meses_pagando_juros": 0})
    pessimo = indice_organizacao({"poupanca_sobre_entradas_pct": -40, "dreno_pct_renda": 9,
                                  "comprometimento_credito_pct": 80, "meses_pagando_juros": 12})
    assert (otimo["score"], otimo["status"]) == (100, "organizado")
    assert (pessimo["score"], pessimo["status"]) == (0, "critico")


# ------------------------------------------------------------ CA-08 T01


@pytest.fixture(autouse=True)
def _fonte(monkeypatch, ds):
    from app.tools import vita

    monkeypatch.setattr(vita, "get_data_source", lambda: ds)


def test_ca08_simular_uso_reserva_do_bruno_sem_campo_nulo():
    from app.tools.vita import simular_uso_reserva

    r = simular_uso_reserva(tool_context=ctx())
    s = r["simulacao"]
    assert s["saldo_quitado"] == 725.07
    assert s["juros_evitados_mes"] == 101.51  # 725,07 × 14%
    assert s["origem_reserva"] == "CDB DI"
    assert s["reserva_antes"] == 41270.0
    assert s["reserva_restante"] == 40544.93
    # rendimento perdido: 725,07 × ((1,1365)^(1/12) − 1) × 1,03, com IR de 22,5%
    assert s["cdi_aa_pct"] == 13.65 and s["cdi_origem"] == "bcb_sgs"
    assert 7.5 < s["rendimento_bruto_perdido_mes"] < 8.5
    assert s["ir_aliquota"] == 0.225 and s["ir_mes"] > 0
    assert s["rendimento_liquido_perdido_mes"] == round(s["rendimento_bruto_perdido_mes"] - s["ir_mes"], 2)
    assert s["ganho_liquido_mes"] == round(s["juros_evitados_mes"] - s["rendimento_liquido_perdido_mes"], 2)
    assert s["ganho_liquido_mes"] > 90
    assert s["meses_cobertura_essenciais"] > 20  # 40.544 / 1.831,90
    assert "725,07" in s["justificativa"] and "101,51" in s["justificativa"]
    assert not [k for k, v in s.items() if v is None], "campo nulo no T01"


def test_t01_registra_simulacao_com_validade_no_estado():
    from app.tools.vita import simular_uso_reserva

    c = ctx()
    r = simular_uso_reserva(tool_context=c)
    sid = r["simulacao"]["simulacao_id"]
    assert sid.startswith("t01-")
    reg = c.state["simulacoes"][sid]
    assert reg["tipo"] == "t01" and reg["expira_em"] > "2026"
    # CA-13: uma ação de simulação com esse id agora passa no schema
    from app.abertura import validar_resposta

    ok = validar_resposta(json.dumps({"texto": "x", "acoes": [{"tipo": "abrir_simulacao_t01", "rotulo": "Simular", "simulacao_id": sid}]}), c.state["simulacoes"])
    assert ok.acoes[0].simulacao_id == sid


def test_t01_sem_reserva_ou_sem_saldo_devolve_motivo_e_nao_inventa():
    from app.tools.vita import simular_uso_reserva

    r = simular_uso_reserva(tool_context=ctx("outro"))  # tem CDB de 999 mas sem fatura
    assert "error" in r and "rotativo" in r["error"].lower()
    assert simular_uso_reserva(tool_context=ctx(None))["error"]


# --------------------------------------------------- validador de números


def test_validador_de_numeros_pega_valor_fora_do_payload():
    from app.callbacks.numeros import valores_em_reais, valores_fora_do_payload

    assert valores_em_reais("Você paga R$ 101,51 por mês e tem R$ 41.270,00 no CDB.") == [101.51, 41270.0]
    permitidos = {725.07, 101.51, 41270.0}
    assert valores_fora_do_payload("Quitar os R$ 725,07 evita R$ 101,51", permitidos) == []
    assert valores_fora_do_payload("Sua taxa é de R$ 1.200,00 por mês", permitidos) == [1200.0]
    # sem payload registrado, não há o que validar: nunca bloqueia por engano
    assert valores_fora_do_payload("R$ 5,00", set()) == []


def test_numeros_das_tools_vao_para_o_estado():
    from app.callbacks.numeros import numeros_do_payload

    assert numeros_do_payload({"simulacao": {"saldo_quitado": 725.07, "meses": [{"pago": 127.96, "modo": "minimo"}], "n": 3}}) == {725.07, 127.96, 3.0}


# ---------------------------------------------------------------- endpoint


def _escreve(caminho, linhas):
    with open(caminho, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(linhas[0]))
        w.writeheader()
        w.writerows(linhas)


@pytest.fixture
def cliente(monkeypatch, tmp_path):
    from app.datasources import evento as mod
    from app.tools import vita

    from app.datasources.factory import get_data_source as fabrica

    monkeypatch.setattr(vita, "get_data_source", fabrica)  # desfaz o autouse: aqui é o snapshot real
    (tmp_path / "evento").mkdir()
    _escreve(tmp_path / "evento" / "extrato.csv", EXTRATO)
    for nome, linhas in TABELAS.items():
        _escreve(tmp_path / "evento" / f"{nome}.csv", linhas)
    (tmp_path / "evento" / "cdi_sgs.json").write_text(json.dumps(CDI))
    mod._carregar_snapshot.cache_clear()
    monkeypatch.setenv("DATA_SOURCE", "evento")
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    from fastapi.testclient import TestClient

    from app.fast_api_app import app as fastapi_app

    return TestClient(fastapi_app)


def test_perfil_financeiro_traz_indice_reserva_e_t01(cliente):
    corpo = cliente.get(f"/customers/{BRUNO}/financial-profile").json()
    assert corpo["index"]["score"] == 61 and corpo["index"]["status"] == "atencao"
    assert corpo["reserve"]["saldo"] == 41270.0 and corpo["reserve"]["produto"] == "CDB DI"
    t01 = corpo["treatments"]["t01"]
    assert t01["saldo_quitado"] == 725.07 and t01["reserva_restante"] == 40544.93
    assert t01["cdi_origem"] == "bcb_sgs"
    assert "Por que" not in t01["justificativa"]  # o rótulo é da tela; o texto é o motivo
    assert corpo["parameters"]["taxa_rotativo_cartao"]["valor"] == 0.14


# ------------------------------------------ validador no SecurityPlugin


def _plugin_ctx(**estado):
    return SimpleNamespace(state=State(value={"suitability": "moderado", **estado}, delta={}), invocation_id="inv-s3")


def _resposta(texto):
    from google.adk.models.llm_response import LlmResponse
    from google.genai import types

    return LlmResponse(content=types.Content(role="model", parts=[types.Part(text=texto)]))


def test_plugin_guarda_os_numeros_das_tools_no_estado():
    import asyncio

    from app.plugins.security_plugin import SecurityPlugin

    c = ctx()
    asyncio.run(SecurityPlugin().after_tool_callback(
        tool=SimpleNamespace(name="simular_uso_reserva"), tool_args={}, tool_context=c,
        result={"simulacao": {"saldo_quitado": 725.07, "juros_evitados_mes": 101.51}},
    ))
    assert {725.07, 101.51} <= set(c.state["numeros_tools"])


def test_plugin_bloqueia_resposta_com_valor_em_reais_fora_do_payload(caplog):
    """'Pronto quando' da S3: o validador bloqueia uma resposta de teste com
    número inventado. Só age quando há payload de tool na sessão."""
    import asyncio
    import logging

    from app.plugins.security_plugin import SecurityPlugin

    c = _plugin_ctx(numeros_tools=[725.07, 101.51, 41270.0])
    with caplog.at_level(logging.INFO, logger="audit"):
        saida = asyncio.run(SecurityPlugin().after_model_callback(
            callback_context=c, llm_response=_resposta("Quitar os R$ 725,07 custa R$ 1.200,00 por mês.")))
    assert saida is not None
    texto = saida.content.parts[0].text
    assert "1.200" not in texto
    assert any("numero_inventado" in r.getMessage() for r in caplog.records)


def test_plugin_deixa_passar_valores_do_payload_e_nao_age_sem_payload():
    import asyncio

    from app.plugins.security_plugin import SecurityPlugin

    c = _plugin_ctx(numeros_tools=[725.07, 101.51])
    assert asyncio.run(SecurityPlugin().after_model_callback(
        callback_context=c, llm_response=_resposta("Você pagou R$ 101,51 e ficaram R$ 725,07."))) is None
    sem = _plugin_ctx()
    assert asyncio.run(SecurityPlugin().after_model_callback(
        callback_context=sem, llm_response=_resposta("Custa R$ 1.200,00."))) is None
