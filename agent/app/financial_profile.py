"""Perfil financeiro para as telas: montado só a partir das funções das tools.

O protótipo lê este payload; nenhum número entra por outro caminho. Sem dado
na tabela do time, o campo vai None — a tela mostra "sem dado", não um chute.
"""

from __future__ import annotations

from app.datasources.factory import get_data_source
from app.indice import indice_organizacao
from app.motor import ordenar_tratamentos
from app.tools.vita import _politica, calcular_t01, calcular_t02, fatura_rotativo


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
    t02 = calcular_t02(customer_id)
    politica = _politica(customer_id)
    t01_ok = t01 if "error" not in t01 else None
    t02_ok = t02 if "error" not in t02 else None
    motor = ordenar_tratamentos(t01_ok, t02_ok)
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
        # S4: ofertas por regra (faixa V = vazio com motivo) e T02 pela tabela Price;
        # o motor põe primeiro o tratamento que custa menos por mês.
        "offers": politica if "error" not in politica else None,
        "treatments": {"t01": t01_ok, "t02": t02_ok, **motor},
        "parameters": ds.get_parametros_modelo(),
        "cdi": ds.get_cdi(),
    }
