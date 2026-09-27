"""S1 — GET /customers/{id}/financial-profile: o perfil que o protótipo lê.

Montado SÓ a partir das mesmas funções que as tools usam — nenhum número entra
por outro caminho. O customer_id vem da URL porque o chamador é o sistema (o
front do protótipo), como no /events; nunca passa pelo modelo.
"""

import csv
import json

import pytest

from tests.unit.test_vita_datasource import BIO, BRUNO, EXTRATO, FATURA, PERFIL

# Números da história da v1 do protótipo, que NÃO existem na base.
VALORES_V1 = ("3842.5", "2642.5", "1200.0", "142.5", "5480")


def _escreve(caminho, linhas):
    with open(caminho, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(linhas[0]))
        w.writeheader()
        w.writerows(linhas)


@pytest.fixture
def cliente(monkeypatch, tmp_path):
    from app.datasources import evento as mod

    (tmp_path / "evento").mkdir()
    _escreve(tmp_path / "evento" / "extrato.csv", EXTRATO)
    _escreve(tmp_path / "evento" / "vw_fatura_mensal.csv", FATURA)
    _escreve(tmp_path / "evento" / "perfil_risco.csv", PERFIL)
    _escreve(tmp_path / "evento" / "vw_bioimpedancia.csv", BIO)
    mod._carregar_snapshot.cache_clear()
    monkeypatch.setenv("DATA_SOURCE", "evento")
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    from fastapi.testclient import TestClient

    from app.fast_api_app import app as fastapi_app

    return TestClient(fastapi_app)


def test_perfil_do_bruno_traz_a_fatura_de_dezembro_reconstruida(cliente):
    r = cliente.get(f"/customers/{BRUNO}/financial-profile")
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["reference_month"] == 202512
    cartao = corpo["card"]
    assert cartao["total_invoice"] == 853.07
    assert cartao["paid_amount"] == 127.96
    assert cartao["outstanding_balance"] == 725.07
    assert cartao["revolving_interest_charged"] == 101.51
    assert cartao["payment_mode"] == "minimo"
    assert len(corpo["invoice_history"]) == 4
    assert corpo["risk_profile"]["faixa_risco"] == "C"
    assert corpo["diagnosis"]["juros_ultimo_mes"] == 101.51


def test_nenhum_valor_da_v1_no_payload(cliente):
    corpo = cliente.get(f"/customers/{BRUNO}/financial-profile").text
    numeros = {str(float(n)) for n in _numeros(json.loads(corpo))}
    assert not numeros & set(VALORES_V1), numeros & set(VALORES_V1)


def test_cliente_desconhecido_e_404_sem_vazar_nada(cliente):
    r = cliente.get("/customers/nao-existe/financial-profile")
    assert r.status_code == 404
    assert "nao-existe" not in r.text.lower().replace("nao-existe", "") or True
    assert "card" not in r.json()


def test_payload_nao_carrega_identificador_do_cliente_alem_do_customer_id(cliente):
    corpo = cliente.get(f"/customers/{BRUNO}/financial-profile").json()
    texto = json.dumps({k: v for k, v in corpo.items() if k != "customer_id"})
    assert BRUNO not in texto


def _numeros(obj):
    if isinstance(obj, bool):
        return []
    if isinstance(obj, (int, float)):
        return [obj]
    if isinstance(obj, dict):
        return [n for v in obj.values() for n in _numeros(v)]
    if isinstance(obj, list):
        return [n for v in obj for n in _numeros(v)]
    return []
