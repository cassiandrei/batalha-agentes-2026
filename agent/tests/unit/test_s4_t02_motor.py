"""S4 — T02 (parcelar a fatura) com motor de decisão.

CA-05: faixa V (Marcos) recebe lista vazia com motivo, nenhuma oferta.
CA-06: comprometimento >= 35% → prazo cuja parcela supere o custo mensal atual de
juros é rejeitado. CA-07: parcelas pela tabela Price até R$ 0,01.

Bruno em dezembro: saldo 725,07 no rotativo, juros do mês 101,51, faixa C (catálogo:
parcelamento_fatura a 8,5% a.m.): 3x 283,89, 6x 159,23, 9x 118,49 rejeitados;
12x 98,72 aprovado. T01 custa 6,21/mês líquidos: é a recomendação principal.
"""

from __future__ import annotations

import csv
import json
from types import SimpleNamespace

import pytest
from google.adk.sessions.state import State

from app.datasources.evento import EventoDataSource
from tests.unit.test_s3_visao_t01 import BIO_REAL, CDI, INVEST, PARAMS
from tests.unit.test_vita_datasource import BRUNO, EXTRATO, FATURA, OUTRO, PERFIL

MARCOS = OUTRO  # 8fbc8ba3, faixa V no fixture PERFIL
CATALOGO = [
    dict(modalidade="parcelamento_fatura", faixa_risco="A", taxa_mensal="0.065", prazo_min="3", prazo_max="24", carencia_dias="30", origem="sintetico"),
    dict(modalidade="parcelamento_fatura", faixa_risco="B", taxa_mensal="0.075", prazo_min="3", prazo_max="24", carencia_dias="30", origem="sintetico"),
    dict(modalidade="parcelamento_fatura", faixa_risco="C", taxa_mensal="0.085", prazo_min="3", prazo_max="24", carencia_dias="30", origem="sintetico"),
    dict(modalidade="credito_pessoal", faixa_risco="C", taxa_mensal="0.055", prazo_min="6", prazo_max="36", carencia_dias="30", origem="sintetico"),
    dict(modalidade="parcelamento_cheque_especial", faixa_risco="C", taxa_mensal="0.045", prazo_min="6", prazo_max="24", carencia_dias="30", origem="sintetico"),
]
FATURA_MARCOS = [
    dict(id_usuario=MARCOS, anomes="202512", mes="12", modo="parcial", pago="795.51",
         juros_rotativo="69.82", fatura_total_reconstruida="", saldo_rotativo_reconstruido="498.71"),
]
TABELAS = {
    "vw_fatura_mensal": FATURA + FATURA_MARCOS,
    "perfil_risco": PERFIL,
    "vw_bioimpedancia": BIO_REAL,
    "posicao_investimentos": INVEST,
    "parametros_modelo": PARAMS,
    "catalogo_ofertas": CATALOGO,
}


@pytest.fixture
def ds():
    return EventoDataSource(EXTRATO, tabelas=TABELAS, cdi=CDI)


@pytest.fixture(autouse=True)
def _fonte(monkeypatch, ds):
    from app.tools import vita

    monkeypatch.setattr(vita, "get_data_source", lambda: ds)


def ctx(customer_id=BRUNO, **estado):
    valores = {"customer_id": customer_id, **estado} if customer_id else dict(estado)
    return SimpleNamespace(state=State(value=valores, delta={}))


# ------------------------------------------------------------- datasource


def test_catalogo_por_faixa_vem_do_snapshot(ds):
    c = ds.get_catalogo_ofertas("C")
    assert {o["modalidade"] for o in c} == {"parcelamento_fatura", "credito_pessoal", "parcelamento_cheque_especial"}
    pf = next(o for o in c if o["modalidade"] == "parcelamento_fatura")
    assert (pf["taxa_mensal"], pf["prazo_min"], pf["prazo_max"]) == (0.085, 3, 24)
    assert ds.get_catalogo_ofertas("V") == []


# ------------------------------------------------------------ CA-05 faixa V


def test_ca05_marcos_faixa_v_nao_recebe_oferta_e_ganha_motivo():
    from app.tools.vita import get_ofertas_elegiveis, simular_parcelamento_fatura

    r = get_ofertas_elegiveis(tool_context=ctx(MARCOS))
    assert r["faixa_risco"] == "V" and r["elegivel"] is False
    assert r["ofertas"] == []
    assert "50%" in r["motivo"] and "renegocia" in r["encaminhamento"].lower()
    # a tool de cálculo também recusa: guarda determinística, não depende do prompt
    s = simular_parcelamento_fatura(tool_context=ctx(MARCOS))
    assert "error" in s and "V" in s["error"]


def test_ofertas_do_bruno_faixa_c_com_regra_de_atencao():
    from app.tools.vita import get_ofertas_elegiveis

    r = get_ofertas_elegiveis(tool_context=ctx())
    assert r["faixa_risco"] == "C" and r["elegivel"] is True
    assert r["regra_atencao"] is True  # comprometimento 37,7% >= 35%
    assert r["custo_mensal_juros_atual"] == 101.51
    modalidades = {o["modalidade"]: o for o in r["ofertas"]}
    assert modalidades["parcelamento_fatura"]["taxa_mensal"] == 0.085
    assert all("origem" not in o for o in r["ofertas"])


# ---------------------------------------------------- CA-06 / CA-07 Price


def test_ca07_price_confere_ate_um_centavo_e_ca06_rejeita_acima_do_custo_atual():
    from app.tools.vita import simular_parcelamento_fatura

    r = simular_parcelamento_fatura(tool_context=ctx())
    s = r["simulacao"]
    assert s["saldo"] == 725.07 and s["taxa_mensal"] == 0.085
    assert s["custo_mensal_juros_atual"] == 101.51 and s["regra_atencao"] is True
    por_prazo = {o["prazo"]: o for o in s["opcoes"]}
    assert [o["prazo"] for o in s["opcoes"]] == [3, 6, 9, 12]
    for prazo, parcela, juros, ok in [(3, 283.89, 126.61, False), (6, 159.23, 230.31, False), (9, 118.49, 341.37, False), (12, 98.72, 459.58, True)]:
        assert abs(por_prazo[prazo]["parcela"] - parcela) <= 0.01, prazo
        assert abs(por_prazo[prazo]["juros_totais"] - juros) <= 0.02, prazo
        assert por_prazo[prazo]["aprovado"] is ok, prazo
    assert "supera" in por_prazo[9]["motivo"].lower()
    assert "IOF" in s["aviso"] and "CET" in s["aviso"]
    assert s["simulacao_id"].startswith("t02-") and s["expira_em"] > "2026"
    assert not [k for k, v in s.items() if v is None]


def test_sem_regra_de_atencao_todos_os_prazos_do_catalogo_sao_aprovados(ds):
    """Faixa A/B ou comprometimento < 35%: a regra de atenção não se aplica."""
    from app.tools.vita import simular_parcelamento_fatura

    ds._tabelas["perfil_risco"][BRUNO] = [dict(ds._tabelas["perfil_risco"][BRUNO][0], comprometimento="0.20", faixa_risco="A")]
    s = simular_parcelamento_fatura(tool_context=ctx())["simulacao"]
    assert s["regra_atencao"] is False and s["taxa_mensal"] == 0.065
    assert all(o["aprovado"] for o in s["opcoes"])


def test_t02_registra_simulacao_valida_para_o_schema():
    from app.abertura import validar_resposta
    from app.tools.vita import simular_parcelamento_fatura

    c = ctx()
    sid = simular_parcelamento_fatura(tool_context=c)["simulacao"]["simulacao_id"]
    assert c.state["simulacoes"][sid]["tipo"] == "t02"
    ok = validar_resposta(json.dumps({"texto": "x", "acoes": [{"tipo": "abrir_simulacao_t02", "rotulo": "Parcelar", "simulacao_id": sid}]}), c.state["simulacoes"])
    assert ok.acoes[0].tipo == "abrir_simulacao_t02"


# ------------------------------------------------------- motor de decisão


def test_motor_poe_o_t01_primeiro_quando_custa_menos():
    from app.motor import ordenar_tratamentos

    t01 = {"rendimento_liquido_perdido_mes": 6.21, "juros_evitados_mes": 101.51}
    t02 = {"opcoes": [{"prazo": 12, "parcela": 98.72, "juros_totais": 459.58, "aprovado": True},
                      {"prazo": 9, "parcela": 118.49, "juros_totais": 341.37, "aprovado": False}]}
    r = ordenar_tratamentos(t01, t02)
    assert r["principal"] == "t01"
    assert [x["tipo"] for x in r["ordem"]] == ["t01", "t02"]
    assert r["ordem"][0]["custo_mensal"] == 6.21
    assert r["ordem"][1]["custo_mensal"] == round(459.58 / 12, 2)  # só prazos aprovados contam
    assert "custa menos" in r["motivo"]


def test_motor_sem_t01_recomenda_t02_e_sem_nada_recomenda_nada():
    from app.motor import ordenar_tratamentos

    t02 = {"opcoes": [{"prazo": 12, "parcela": 98.72, "juros_totais": 459.58, "aprovado": True}]}
    assert ordenar_tratamentos(None, t02)["principal"] == "t02"
    nada = ordenar_tratamentos(None, {"opcoes": [{"prazo": 3, "parcela": 1, "juros_totais": 1, "aprovado": False}]})
    assert nada["principal"] is None and nada["ordem"] == []


# ---------------------------------------------------------------- endpoint


def _escreve(caminho, linhas):
    with open(caminho, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(linhas[0]))
        w.writeheader()
        w.writerows(linhas)


@pytest.fixture
def cliente(monkeypatch, tmp_path):
    from app.datasources import evento as mod
    from app.datasources.factory import get_data_source as fabrica
    from app.tools import vita

    monkeypatch.setattr(vita, "get_data_source", fabrica)
    (tmp_path / "evento").mkdir()
    extrato_marcos = [dict(EXTRATO[0], id_usuario=MARCOS, vlr="6238.14")]
    _escreve(tmp_path / "evento" / "extrato.csv", EXTRATO + extrato_marcos)
    for nome, linhas in TABELAS.items():
        _escreve(tmp_path / "evento" / f"{nome}.csv", linhas)
    (tmp_path / "evento" / "cdi_sgs.json").write_text(json.dumps(CDI))
    mod._carregar_snapshot.cache_clear()
    monkeypatch.setenv("DATA_SOURCE", "evento")
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    from fastapi.testclient import TestClient

    from app.fast_api_app import app as fastapi_app

    return TestClient(fastapi_app)


def test_perfil_traz_ofertas_t02_e_recomendacao(cliente):
    corpo = cliente.get(f"/customers/{BRUNO}/financial-profile").json()
    assert corpo["offers"]["elegivel"] is True and corpo["offers"]["faixa_risco"] == "C"
    t02 = corpo["treatments"]["t02"]
    assert [o["aprovado"] for o in t02["opcoes"]] == [False, False, False, True]
    assert corpo["treatments"]["principal"] == "t01"
    assert corpo["treatments"]["ordem"][0]["tipo"] == "t01"


def test_perfil_do_marcos_sem_ofertas_nem_t02(cliente):
    corpo = cliente.get(f"/customers/{MARCOS}/financial-profile").json()
    assert corpo["offers"]["elegivel"] is False and corpo["offers"]["ofertas"] == []
    assert corpo["treatments"]["t02"] is None and corpo["treatments"]["t01"] is None
    assert corpo["treatments"]["principal"] is None
