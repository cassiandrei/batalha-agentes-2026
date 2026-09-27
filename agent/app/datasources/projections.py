"""Minimização de dados (LGPD): o único lugar que decide o que sai da camada de dados.

Nada aqui pode devolver CPF, nome completo ou qualquer identificador direto além
do customer_id pseudonimizado. O teste test_nenhuma_tool_devolve_cpf depende disso.
"""

from __future__ import annotations

CUSTOMER_FIELDS = (
    "customer_id",
    "first_name",
    "age_band",
    "income_band",
    "suitability",
    "preferred_channel",
    "accessibility_flags",
)
TRANSACTION_FIELDS = ("date", "category", "amount", "description")
CARD_FIELDS = (
    "credit_limit",
    "current_invoice",
    "minimum_payment",
    "revolving_balance",
    "installment_count",
)
GOAL_FIELDS = ("goal_id", "name", "target_amount", "current_amount")


def _pick(row: dict, campos: tuple[str, ...]) -> dict:
    return {c: row[c] for c in campos if c in row}


def project_customer(row: dict) -> dict:
    return _pick(row, CUSTOMER_FIELDS)


def project_transaction(row: dict) -> dict:
    d = _pick(row, TRANSACTION_FIELDS)
    if "amount" in d:
        d["amount"] = float(d["amount"])
    return d


def project_card(row: dict) -> dict:
    return {c: float(row[c]) for c in CARD_FIELDS if c in row}


def project_goal(row: dict) -> dict:
    d = _pick(row, GOAL_FIELDS)
    for c in ("target_amount", "current_amount"):
        if c in d:
            d[c] = float(d[c])
    return d


# Tabelas do time (vita_sintetico). id_usuario e origem ficam de fora: o modelo
# não precisa do id (vem da sessão) nem de metadado de linhagem.
FATURA_FIELDS = (
    "anomes",
    "mes",
    "modo",
    "pago",
    "juros_rotativo",
    "fatura_total_reconstruida",
    "saldo_rotativo_reconstruido",
)
PERFIL_RISCO_FIELDS = (
    "faixa_risco",
    "motivo_faixa",
    "renda_mensal",
    "parcelas_mensais",
    "comprometimento",
    "sobra_apos_parcelas",
    "meses_juros_rot",
    "meses_juros_ce",
)
DIAGNOSTICO_FIELDS = (
    "renda_media_mensal",
    "entradas_media_mensal",
    "saidas_media_mensal",
    "essenciais_media_mensal",
    "poupanca_sobre_entradas_pct",
    "poupanca_sobre_renda_pct",
    "meses_fluxo_negativo",
    "meses_saldo_negativo",
    "meses_pagando_juros",
    "juros_encargos_ano",
    "tarifas_ano",
    "dreno_pct_renda",
    "capitalizacao_ano",
    "meses_capitalizacao_com_juros",
    "essenciais_pct_renda",
    "comprometimento_credito_pct",
    "fatura_pct_saidas",
    "tem_seguro",
    "saldo_ultimo_mes",
    "juros_ultimo_mes",
    "parcelado_a_vencer",
)
_INTEIROS = {"anomes", "mes"} | {
    c for c in DIAGNOSTICO_FIELDS + PERFIL_RISCO_FIELDS if c.startswith("meses_")
}
_TEXTO = {"modo", "faixa_risco", "motivo_faixa"}


def _tipado(campo: str, valor):
    """CSV traz tudo como string; vazio é NULL (fatura não reconstruível), não zero."""
    if valor is None or valor == "":
        return None
    if campo in _TEXTO:
        return valor
    if campo == "tem_seguro":
        return valor if isinstance(valor, bool) else str(valor).lower() == "true"
    if campo in _INTEIROS:
        return int(float(valor))
    return float(valor)


def _pick_tipado(row: dict, campos: tuple[str, ...]) -> dict:
    return {c: _tipado(c, row[c]) for c in campos if c in row}


def project_fatura(row: dict) -> dict:
    return _pick_tipado(row, FATURA_FIELDS)


def project_perfil_risco(row: dict) -> dict:
    return _pick_tipado(row, PERFIL_RISCO_FIELDS)


def project_diagnostico(row: dict) -> dict:
    return _pick_tipado(row, DIAGNOSTICO_FIELDS)


INVESTIMENTO_FIELDS = ("produto", "liquidez", "percentual_cdi", "finalidade", "saldo")


def project_investimento(row: dict) -> dict:
    d = {c: row[c] for c in INVESTIMENTO_FIELDS if c in row}
    for c in ("percentual_cdi", "saldo"):
        if c in d:
            d[c] = float(d[c])
    return d


def project_parametro(row: dict) -> dict:
    """parametros_modelo: valor numérico + origem e fonte, que o modelo pode citar."""
    return {
        "valor": float(row["valor"]),
        "unidade": row.get("unidade", ""),
        "origem": row.get("origem", ""),
        "fonte": row.get("fonte", ""),
    }


def project_oferta(row: dict) -> dict:
    """catalogo_ofertas: uma linha por modalidade e faixa; sem `origem`."""
    return {
        "modalidade": row["modalidade"],
        "faixa_risco": row["faixa_risco"],
        "taxa_mensal": float(row["taxa_mensal"]),
        "prazo_min": int(float(row["prazo_min"])),
        "prazo_max": int(float(row["prazo_max"])),
        "carencia_dias": int(float(row["carencia_dias"])),
    }
