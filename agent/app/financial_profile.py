"""Perfil financeiro para as telas: montado só a partir das funções das tools.

O protótipo lê este payload; nenhum número entra por outro caminho. Sem dado
na tabela do time, o campo vai None — a tela mostra "sem dado", não um chute.
"""

from __future__ import annotations

from app.datasources.factory import get_data_source
from app.indice import indice_organizacao
from app.tools.vita import calcular_t01, fatura_rotativo


def build_financial_profile(customer_id: str) -> dict | None:
    ds = get_data_source()
    if ds.get_customer(customer_id) is None:
        return None
    fatura = fatura_rotativo(customer_id)
    meses = fatura["meses"]
    ref = meses[-1] if meses else {}
    diag = ds.get_diagnostico(customer_id)
    aplicacoes = ds.get_posicao_investimentos(customer_id)
    reserva = max(aplicacoes, key=lambda i: i["saldo"]) if aplicacoes else None
    t01 = calcular_t01(customer_id)
    return {
        "customer_id": customer_id,
        "reference_month": fatura["mes_referencia"],
        "card": {
            "payment_mode": ref.get("modo"),
            "total_invoice": ref.get("fatura_total_reconstruida"),
            "paid_amount": ref.get("pago"),
            "outstanding_balance": ref.get("saldo_rotativo_reconstruido"),
            "revolving_interest_charged": ref.get("juros_rotativo"),
        },
        "invoice_history": meses,
        "risk_profile": ds.get_perfil_risco(customer_id),
        "diagnosis": diag,
        # S3: índice por regra, reserva e o T01 calculado — mesmas funções das tools.
        "index": indice_organizacao(diag) if diag else None,
        "reserve": reserva,
        "treatments": {"t01": t01 if "error" not in t01 else None},
        "parameters": ds.get_parametros_modelo(),
        "cdi": ds.get_cdi(),
    }
