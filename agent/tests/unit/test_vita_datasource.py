"""S1 — as tabelas do time (vita_sintetico) atrás do EventoDataSource.

Fixture com os números REAIS do Bruno (36d74064) em dezembro/2025, conferidos na
seção 12 do docs/DADOS_EVENTO.md: pago 127,96 → fatura 853,07; juros 101,51 →
saldo no rotativo 725,07. Se a reconstrução mudar, este teste tem de mudar junto.
"""

import csv

import pytest

from app.datasources.evento import EventoDataSource, from_snapshot

BRUNO = "36d74064-cc59-4ad2-9304-aeae46e660e4"
OUTRO = "8fbc8ba3-7d20-4382-ba8d-ffd070e836a1"

EXTRATO = [
    dict(id_usuario=BRUNO, data="2025-12-05", tipo="E", descr="salario", vlr="7116.25",
         nom_cate_macro="Salarios e bonificacoes", nom_cate_micro="Salario CLT",
         saldo_apos="9000.00", parcela_atual="", parcela_total=""),
]

# vw_fatura_mensal: id_usuario, anomes, mes, modo, pago, juros_rotativo,
# fatura_total_reconstruida, saldo_rotativo_reconstruido (CSV: tudo string, vazio = NULL)
FATURA = [
    dict(id_usuario=BRUNO, anomes="202501", mes="1", modo="integral", pago="1422.17",
         juros_rotativo="0.0", fatura_total_reconstruida="", saldo_rotativo_reconstruido=""),
    dict(id_usuario=BRUNO, anomes="202503", mes="3", modo="minimo", pago="190.06",
         juros_rotativo="150.78", fatura_total_reconstruida="1267.07", saldo_rotativo_reconstruido="1077.0"),
    dict(id_usuario=BRUNO, anomes="202512", mes="12", modo="minimo", pago="127.96",
         juros_rotativo="101.51", fatura_total_reconstruida="853.07", saldo_rotativo_reconstruido="725.07"),
    dict(id_usuario=BRUNO, anomes="202510", mes="10", modo="parcial", pago="294.84",
         juros_rotativo="14.77", fatura_total_reconstruida="", saldo_rotativo_reconstruido="105.5"),
    dict(id_usuario=OUTRO, anomes="202512", mes="12", modo="minimo", pago="999.99",
         juros_rotativo="500.0", fatura_total_reconstruida="6666.6", saldo_rotativo_reconstruido="3571.43"),
]

PERFIL = [
    dict(id_usuario=BRUNO, faixa_risco="C", motivo_faixa="comprometimento de credito entre 35% e 50%",
         renda_mensal="7116.25", parcelas_mensais="2681.38", comprometimento="0.3768",
         sobra_apos_parcelas="4434.87", meses_juros_rot="6", meses_juros_ce="0", origem="sintetico_regra"),
    dict(id_usuario=OUTRO, faixa_risco="V", motivo_faixa="comprometimento de credito >= 50%",
         renda_mensal="6238.14", parcelas_mensais="4605.1", comprometimento="0.7382",
         sobra_apos_parcelas="1633.04", meses_juros_rot="10", meses_juros_ce="9", origem="sintetico_regra"),
]

BIO = [
    dict(id_usuario=BRUNO, renda_media_mensal="7116.25", entradas_media_mensal="9451.76",
         saidas_media_mensal="6896.3", essenciais_media_mensal="3100.0",
         poupanca_sobre_entradas_pct="27.0", poupanca_sobre_renda_pct="3.1",
         meses_fluxo_negativo="2", meses_saldo_negativo="0", meses_pagando_juros="6",
         juros_encargos_ano="708.28", tarifas_ano="480.0", dreno_pct_renda="1.39",
         capitalizacao_ano="0.0", meses_capitalizacao_com_juros="0", essenciais_pct_renda="43.6",
         comprometimento_credito_pct="37.7", fatura_pct_saidas="15.2", tem_seguro="true",
         saldo_ultimo_mes="1234.5", juros_ultimo_mes="101.51", parcelado_a_vencer="0.0"),
]

TABELAS = {"vw_fatura_mensal": FATURA, "perfil_risco": PERFIL, "vw_bioimpedancia": BIO}


@pytest.fixture
def ds():
    return EventoDataSource(EXTRATO, tabelas=TABELAS)


def test_fatura_rotativo_reconstroi_dezembro_do_bruno(ds):
    meses = ds.get_fatura_rotativo(BRUNO)
    dez = next(m for m in meses if m["anomes"] == 202512)
    assert dez["modo"] == "minimo"
    assert dez["pago"] == 127.96
    assert dez["juros_rotativo"] == 101.51
    assert dez["fatura_total_reconstruida"] == 853.07
    assert dez["saldo_rotativo_reconstruido"] == 725.07


def test_fatura_rotativo_vem_em_ordem_e_com_nulos_honestos(ds):
    meses = ds.get_fatura_rotativo(BRUNO)
    assert [m["anomes"] for m in meses] == [202501, 202503, 202510, 202512]
    jan = meses[0]
    # Mês integral: a fatura total NÃO é reconstruível — fica None, não zero.
    assert jan["fatura_total_reconstruida"] is None
    assert jan["saldo_rotativo_reconstruido"] is None
    assert jan["juros_rotativo"] == 0.0


def test_fatura_rotativo_nunca_vaza_outro_usuario_nem_o_id(ds):
    meses = ds.get_fatura_rotativo(BRUNO)
    assert all(m["pago"] != 999.99 for m in meses)
    assert all("id_usuario" not in m for m in meses)
    assert ds.get_fatura_rotativo("nao-existe") == []


def test_perfil_risco_do_bruno_e_faixa_c_com_motivo(ds):
    p = ds.get_perfil_risco(BRUNO)
    assert p["faixa_risco"] == "C"
    assert "35%" in p["motivo_faixa"]
    assert p["renda_mensal"] == 7116.25
    assert p["comprometimento"] == 0.3768
    assert p["sobra_apos_parcelas"] == 4434.87
    assert p["meses_juros_rot"] == 6
    assert "id_usuario" not in p and "origem" not in p
    assert ds.get_perfil_risco("nao-existe") is None


def test_ca04_diagnostico_devolve_exatamente_a_vw_bioimpedancia(ds):
    """CA-04: get_diagnostico devolve para o Bruno exatamente os valores da view."""
    d = ds.get_diagnostico(BRUNO)
    esperado = BIO[0]
    for campo, valor in esperado.items():
        if campo == "id_usuario":
            assert campo not in d
            continue
        if valor in ("true", "false"):
            assert d[campo] is (valor == "true"), campo
        else:
            assert d[campo] == pytest.approx(float(valor)), campo
    assert ds.get_diagnostico("nao-existe") is None


def test_sem_tabelas_do_time_as_tools_novas_devolvem_vazio_e_nao_quebram():
    """Snapshot antigo (só extrato): o adaptador continua servindo o que tem."""
    ds = EventoDataSource(EXTRATO)
    assert ds.get_fatura_rotativo(BRUNO) == []
    assert ds.get_perfil_risco(BRUNO) is None
    assert ds.get_diagnostico(BRUNO) is None


def _escreve(caminho, linhas):
    with open(caminho, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(linhas[0]))
        w.writeheader()
        w.writerows(linhas)


def test_from_snapshot_carrega_as_tabelas_do_time_quando_existem(tmp_path):
    from app.datasources import evento as mod

    (tmp_path / "evento").mkdir()
    _escreve(tmp_path / "evento" / "extrato.csv", EXTRATO)
    _escreve(tmp_path / "evento" / "vw_fatura_mensal.csv", FATURA)
    _escreve(tmp_path / "evento" / "perfil_risco.csv", PERFIL)
    _escreve(tmp_path / "evento" / "vw_bioimpedancia.csv", BIO)
    mod._carregar_snapshot.cache_clear()
    ds = from_snapshot(tmp_path)
    assert ds.get_fatura_rotativo(BRUNO)[-1]["saldo_rotativo_reconstruido"] == 725.07
    assert ds.get_perfil_risco(BRUNO)["faixa_risco"] == "C"
    assert ds.get_diagnostico(BRUNO)["juros_ultimo_mes"] == 101.51
