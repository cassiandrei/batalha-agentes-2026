"""Perfil financeiro para as telas: montado só a partir das funções das tools.

O protótipo lê este payload; nenhum número entra por outro caminho. Sem dado
na tabela do time, o campo vai None — a tela mostra "sem dado", não um chute.
"""

from __future__ import annotations

from app.datasources.factory import get_data_source
from app.tools.vita import fatura_rotativo


def build_financial_profile(customer_id: str) -> dict | None:
    ds = get_data_source()
    if ds.get_customer(customer_id) is None:
        return None
    fatura = fatura_rotativo(customer_id)
    meses = fatura["meses"]
    ref = meses[-1] if meses else {}
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
        "diagnosis": ds.get_diagnostico(customer_id),
    }
