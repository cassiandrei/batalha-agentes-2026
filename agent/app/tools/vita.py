"""Tools da jornada Vita: fatura do rotativo, perfil de risco e diagnóstico.

Leitura pura das tabelas do time (vita_sintetico) e da vw_bioimpedancia. A
identidade vem do estado da sessão, como em todas as tools; os números vêm da
fonte, reconstruídos por regra (mínimo 15%, rotativo 14% a.m.) — nunca do modelo.
"""

from __future__ import annotations

from google.adk.tools.tool_context import ToolContext

from app.datasources.factory import get_data_source
from app.tools.customer import NO_IDENTITY, _customer_id


def fatura_rotativo(customer_id: str) -> dict:
    """Mesma montagem para a tool e para o endpoint do perfil financeiro."""
    meses = get_data_source().get_fatura_rotativo(customer_id)
    return {
        "meses": meses,
        "mes_referencia": meses[-1]["anomes"] if meses else None,
    }


def get_fatura_rotativo(tool_context: ToolContext) -> dict:
    """Retorna a fatura do cartão mês a mês: modo de pagamento, valor pago, juros do rotativo.

    Em mês de pagamento mínimo, fatura_total_reconstruida é a fatura inteira; em mês
    com juros, saldo_rotativo_reconstruido é quanto ficou no rotativo. None = não
    reconstruível naquele mês (não é zero).

    Returns:
        meses (lista em ordem cronológica) e mes_referencia (AAAAMM do último mês),
        ou error se não houver identificação.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    return fatura_rotativo(cid)


def get_perfil_risco(tool_context: ToolContext) -> dict:
    """Retorna a faixa de risco (A, B, C ou V) do cliente da sessão e o motivo.

    Faixa V = vulnerável: nenhuma oferta de crédito; renegociação assistida.

    Returns:
        perfil_risco com faixa, motivo, renda, parcelas, comprometimento e sobra,
        ou error se não houver identificação ou dado.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    perfil = get_data_source().get_perfil_risco(cid)
    if perfil is None:
        return {"error": f"Cliente {cid} não tem perfil de risco na base."}
    return {"perfil_risco": perfil}


def get_diagnostico(tool_context: ToolContext) -> dict:
    """Retorna o diagnóstico financeiro anual do cliente da sessão (bioimpedância).

    Indicadores: renda e saídas médias, poupança, meses no vermelho, juros e
    tarifas no ano, dreno em % da renda, comprometimento com crédito, seguro.

    Returns:
        diagnostico com os indicadores, ou error se não houver identificação ou dado.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    diag = get_data_source().get_diagnostico(cid)
    if diag is None:
        return {"error": f"Cliente {cid} não tem diagnóstico na base."}
    return {"diagnostico": diag}
