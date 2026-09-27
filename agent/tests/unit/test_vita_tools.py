"""S1 — tools get_fatura_rotativo, get_perfil_risco e get_diagnostico.

Mesmas regras das tools de cliente: identidade vem do State da sessão, nunca de
parâmetro; sem identidade, recusa; nada de id no payload que vai ao modelo.
"""

from types import SimpleNamespace

import pytest
from google.adk.sessions.state import State
from google.adk.tools.function_tool import FunctionTool

from app.datasources.evento import EventoDataSource
from app.tools import vita
from tests.unit.test_vita_datasource import BRUNO, EXTRATO, TABELAS


def ctx(customer_id=BRUNO):
    valores = {"customer_id": customer_id} if customer_id else {}
    return SimpleNamespace(state=State(value=valores, delta={}))


@pytest.fixture(autouse=True)
def _fonte(monkeypatch):
    ds = EventoDataSource(EXTRATO, tabelas=TABELAS)
    monkeypatch.setattr(vita, "get_data_source", lambda: ds)


def test_fatura_rotativo_de_dezembro_vem_da_tool_com_os_numeros_reconstruidos():
    r = vita.get_fatura_rotativo(tool_context=ctx())
    dez = r["meses"][-1]
    assert (dez["anomes"], dez["modo"]) == (202512, "minimo")
    assert (dez["pago"], dez["juros_rotativo"]) == (127.96, 101.51)
    assert (dez["fatura_total_reconstruida"], dez["saldo_rotativo_reconstruido"]) == (853.07, 725.07)
    assert r["mes_referencia"] == 202512


def test_perfil_risco_e_diagnostico_vem_da_sessao():
    assert vita.get_perfil_risco(tool_context=ctx())["perfil_risco"]["faixa_risco"] == "C"
    assert vita.get_diagnostico(tool_context=ctx())["diagnostico"]["juros_ultimo_mes"] == 101.51


def test_sem_identidade_recusa():
    for fn in (vita.get_fatura_rotativo, vita.get_perfil_risco, vita.get_diagnostico):
        r = fn(tool_context=ctx(None))
        assert r["error"], fn.__name__
        assert len(r) == 1, fn.__name__


def test_cliente_sem_dado_nas_tabelas_do_time_devolve_erro_claro():
    r = vita.get_perfil_risco(tool_context=ctx("nao-existe"))
    assert "error" in r and "nao-existe" in r["error"]
    assert vita.get_fatura_rotativo(tool_context=ctx("nao-existe"))["meses"] == []


def test_customer_id_nao_e_exposto_ao_modelo():
    for fn in (vita.get_fatura_rotativo, vita.get_perfil_risco, vita.get_diagnostico):
        schema = FunctionTool(fn)._get_declaration().parameters_json_schema or {}
        expostos = set((schema.get("properties") or {}).keys())
        assert "customer_id" not in expostos, fn.__name__
        assert "tool_context" not in expostos, fn.__name__


def test_as_tools_estao_no_analista():
    from app.agent import analyst

    nomes = {getattr(t, "__name__", getattr(t, "name", "")) for t in analyst.tools}
    assert {"get_fatura_rotativo", "get_perfil_risco", "get_diagnostico"} <= nomes
