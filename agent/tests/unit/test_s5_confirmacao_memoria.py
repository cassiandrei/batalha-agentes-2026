"""S5 — confirmação segura e memória com consentimento.

CA-14: nenhuma ação muda estado sem confirmação e iToken (mock); duplo clique gera
uma única execução; o evento tratamento_confirmado é registrado. Memória: sem "sim"
nada é gravado; "esqueça tudo" apaga; a memória nunca guarda valores de transação,
payload das tools, cadastro ou texto bruto.
"""

from __future__ import annotations

import csv
import json
import re

import pytest

from tests.unit.test_s3_visao_t01 import CDI
from tests.unit.test_s4_t02_motor import MARCOS, TABELAS
from tests.unit.test_vita_datasource import BRUNO, EXTRATO

ITOKEN_OK = "123456"


# ------------------------------------------------------ confirmação (regra pura)


@pytest.fixture
def reg():
    from app.confirmacoes import Confirmacoes

    c = Confirmacoes()
    c.registrar(BRUNO, {"simulacao_id": "t01-abc", "tipo": "t01", "expira_em": "2999-01-01T00:00:00+00:00", "saldo_quitado": 725.07})
    c.registrar(BRUNO, {"simulacao_id": "t01-velha", "tipo": "t01", "expira_em": "2000-01-01T00:00:00+00:00", "saldo_quitado": 1.0})
    return c


def test_ca14_duplo_clique_gera_uma_unica_execucao(reg):
    primeira = reg.confirmar(BRUNO, "t01-abc", ITOKEN_OK, idempotency_key="k1")
    segunda = reg.confirmar(BRUNO, "t01-abc", ITOKEN_OK, idempotency_key="k1")
    assert primeira["status"] == "confirmada" and primeira["evento"] == "tratamento_confirmado"
    assert segunda["status"] == "ja_confirmada"
    assert primeira["execucao_id"] == segunda["execucao_id"]
    assert len(reg.eventos) == 1 and reg.eventos[0]["evento"] == "tratamento_confirmado"
    # outra chave para a MESMA simulação também não executa de novo
    terceira = reg.confirmar(BRUNO, "t01-abc", ITOKEN_OK, idempotency_key="k2")
    assert terceira["status"] == "ja_confirmada" and len(reg.eventos) == 1


def test_ca14_sem_itoken_valido_nada_muda(reg):
    for ruim in ("", "12", "abcdef", "000000"):
        r = reg.confirmar(BRUNO, "t01-abc", ruim, idempotency_key="k")
        assert r["status"] == "recusada" and "iToken" in r["motivo"], ruim
    assert reg.eventos == []


def test_simulacao_expirada_desconhecida_ou_de_outro_cliente_e_recusada(reg):
    assert reg.confirmar(BRUNO, "t01-velha", ITOKEN_OK, idempotency_key="a")["status"] == "recusada"
    assert reg.confirmar(BRUNO, "nao-existe", ITOKEN_OK, idempotency_key="b")["status"] == "recusada"
    assert reg.confirmar(MARCOS, "t01-abc", ITOKEN_OK, idempotency_key="c")["status"] == "recusada"
    assert reg.eventos == []


def test_evento_registrado_nao_leva_valores_nem_texto_livre(reg):
    reg.confirmar(BRUNO, "t01-abc", ITOKEN_OK, idempotency_key="k1")
    ev = reg.eventos[0]
    assert set(ev) == {"evento", "execucao_id", "customer_id", "simulacao_id", "tipo", "em"}


# --------------------------------------------------- política de memória (pura)


def test_politica_de_memoria_recusa_valor_de_transacao_payload_e_texto_bruto():
    from app.memory.politica import CHAVES_PERMITIDAS, valor_permitido

    assert {"objetivo", "oferta_recusada", "tratamento"} <= set(CHAVES_PERMITIDAS)
    assert valor_permitido("objetivo", "recompor a reserva depois de quitar o rotativo")
    assert valor_permitido("tratamento", "T01 confirmado em 2026-09-27")
    assert not valor_permitido("objetivo", "quitar os R$ 725,07 do rotativo")  # valor de transação
    assert not valor_permitido("objetivo", "saldo 725.07")  # número com decimais
    assert not valor_permitido("objetivo", "x" * 200)  # texto bruto longo
    assert not valor_permitido("cadastro", "Bruno Carvalho, 41")  # chave fora da política
    assert not valor_permitido("objetivo", '{"saldo_quitado": 725}')  # payload


# ------------------------------------------------------------------ endpoints


def _escreve(caminho, linhas):
    with open(caminho, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(linhas[0]))
        w.writeheader()
        w.writerows(linhas)


@pytest.fixture
def cliente(monkeypatch, tmp_path):
    from app import confirmacoes
    from app.datasources import evento as mod
    from app.datasources.factory import get_data_source as fabrica
    from app.tools import vita

    monkeypatch.setattr(vita, "get_data_source", fabrica)
    (tmp_path / "evento").mkdir()
    _escreve(tmp_path / "evento" / "extrato.csv", EXTRATO + [dict(EXTRATO[0], id_usuario=MARCOS)])
    for nome, linhas in TABELAS.items():
        _escreve(tmp_path / "evento" / f"{nome}.csv", linhas)
    (tmp_path / "evento" / "cdi_sgs.json").write_text(json.dumps(CDI))
    mod._carregar_snapshot.cache_clear()
    monkeypatch.setenv("DATA_SOURCE", "evento")
    monkeypatch.setenv("DATA_DIR", str(tmp_path))  # memory.db vai para cá
    monkeypatch.setenv("MEMORY_BACKEND", "local")
    confirmacoes.REGISTRO.limpar()
    from fastapi.testclient import TestClient

    from app.fast_api_app import app as fastapi_app

    return TestClient(fastapi_app)


def _t01_id(http):
    return http.get(f"/customers/{BRUNO}/financial-profile").json()["treatments"]["t01"]["simulacao_id"]


def test_ca14_endpoint_confirma_uma_vez_com_itoken_e_idempotencia(cliente):
    with cliente as http:
        sid = _t01_id(http)
        corpo = {"simulacao_id": sid, "itoken": ITOKEN_OK, "idempotency_key": "clique-1"}
        r1 = http.post(f"/customers/{BRUNO}/confirmations", json=corpo)
        r2 = http.post(f"/customers/{BRUNO}/confirmations", json=corpo)
        assert r1.status_code == 200 and r2.status_code == 200, (r1.text, r2.text)
        assert r1.json()["status"] == "confirmada" and r2.json()["status"] == "ja_confirmada"
        assert r1.json()["execucao_id"] == r2.json()["execucao_id"]
        assert r1.json()["tipo"] == "t01" and r1.json()["evento"] == "tratamento_confirmado"
        ruim = http.post(f"/customers/{BRUNO}/confirmations", json={**corpo, "itoken": "000000", "idempotency_key": "x"})
        assert ruim.status_code == 401


def test_sem_sim_nada_vai_para_a_memoria_e_esqueca_tudo_apaga(cliente):
    with cliente as http:
        m0 = http.get(f"/customers/{BRUNO}/memory").json()
        assert m0["consentimento"] is False and m0["lembrancas"] == {}
        # confirmar SEM consentimento: executa, mas não lembra nada
        sid = _t01_id(http)
        http.post(f"/customers/{BRUNO}/confirmations", json={"simulacao_id": sid, "itoken": ITOKEN_OK, "idempotency_key": "a"})
        assert http.get(f"/customers/{BRUNO}/memory").json()["lembrancas"] == {}
        # "sim": passa a lembrar
        c = http.post(f"/customers/{BRUNO}/memory/consent", json={"consentimento": True})
        assert c.status_code == 200 and c.json()["consentimento"] is True
        sid2 = http.get(f"/customers/{BRUNO}/financial-profile").json()["treatments"]["t01"]["simulacao_id"]
        http.post(f"/customers/{BRUNO}/confirmations", json={"simulacao_id": sid2, "itoken": ITOKEN_OK, "idempotency_key": "b"})
        m1 = http.get(f"/customers/{BRUNO}/memory").json()
        chaves = list(m1["lembrancas"])
        assert chaves and chaves[0].startswith("tratamento"), m1
        for valor in m1["lembrancas"].values():
            assert "R$" not in valor and not re.search(r"\d+[.,]\d{2}", valor), valor
        # "esqueça tudo"
        d = http.delete(f"/customers/{BRUNO}/memory")
        assert d.status_code == 200 and d.json()["apagadas"] >= 1
        m2 = http.get(f"/customers/{BRUNO}/memory").json()
        assert m2["lembrancas"] == {} and m2["consentimento"] is False


def test_consentimento_vai_para_o_estado_da_sessao_do_chat(cliente):
    """As tools de memória do chat leem consent_given_at do estado da sessão
    pré-montada; o endpoint tem de escrever lá, não só no banco."""
    import asyncio

    from app.abertura import session_id_abertura

    with cliente as http:
        http.post(f"/customers/{BRUNO}/memory/consent", json={"consentimento": True})
        svc = http.app.state.runner.session_service
        s = asyncio.run(svc.get_session(app_name="app", user_id=BRUNO, session_id=session_id_abertura(BRUNO)))
        assert s is not None and s.state.get("consent_given_at")
        http.delete(f"/customers/{BRUNO}/memory")
        s = asyncio.run(svc.get_session(app_name="app", user_id=BRUNO, session_id=session_id_abertura(BRUNO)))
        assert not s.state.get("consent_given_at")


def test_semente_de_memoria_do_bruno_no_boot(tmp_path):
    import asyncio

    from app.memory.local import SqliteMemoryStore
    from app.memory.politica import carregar_semente_memoria

    semente = tmp_path / "seed_memory.json"
    semente.write_text(json.dumps([
        {"customer_id": BRUNO, "consent_given_at": "2025-06-05T10:00:00+00:00",
         "lembrancas": {"tratamento:2025-06": "T01 confirmado: usou a reserva para quitar o rotativo",
                        "objetivo": "manter a fatura no pagamento integral",
                        "cadastro": "Bruno Carvalho"}},  # fora da política: ignorada
    ]))
    store = SqliteMemoryStore(tmp_path / "m.db")
    n = asyncio.run(carregar_semente_memoria(store, semente, ttl_days=365))
    assert n == 2
    lemb = asyncio.run(store.get_profile_summary(BRUNO))["preferences"]
    assert set(lemb) == {"tratamento:2025-06", "objetivo"}
    assert asyncio.run(carregar_semente_memoria(store, tmp_path / "nao.json", ttl_days=1)) == 0


def test_falar_com_uma_pessoa_leva_resumo_sem_dado_sensivel_e_so_com_consentimento(cliente):
    with cliente as http:
        r = http.post(f"/customers/{BRUNO}/handoff", json={"consentimento": True, "motivo": "quero falar com alguem"})
        assert r.status_code == 200, r.text
        corpo = r.json()
        assert corpo["protocolo"].startswith("VITA-") and corpo["fila"] == "renegociacao_assistida"
        resumo = corpo["resumo"]
        assert resumo["faixa_risco"] == "C" and resumo["mes_referencia"] == 202512
        texto = json.dumps(resumo)
        assert "R$" not in texto and BRUNO not in texto and "Bruno" not in texto
        sem = http.post(f"/customers/{BRUNO}/handoff", json={"consentimento": False}).json()
        assert sem["resumo"] is None and sem["protocolo"]
