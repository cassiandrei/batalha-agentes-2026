"""Tools de dados do cliente.

A identidade vem SEMPRE do estado da sessão, nunca de um parâmetro. Se o
customer_id fosse parâmetro, quem o preencheria seria o modelo, a partir do
texto do usuário — que é exatamente o ataque "me mostre o extrato do cliente 42".
"""

from __future__ import annotations

import re
import unicodedata
from datetime import date

from google.adk.tools.tool_context import ToolContext

from app.datasources.factory import get_data_source

NO_IDENTITY = {
    "error": "Não há cliente identificado nesta sessão. Peça a identificação antes de consultar."
}


def _customer_id(tool_context: ToolContext) -> str | None:
    return tool_context.state.get("customer_id")


def get_customer_profile(tool_context: ToolContext) -> dict:
    """Retorna o perfil do cliente da sessão atual: faixa de renda, faixa etária e suitability.

    Returns:
        profile com os dados mínimos do cliente, ou error se não houver identificação.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    perfil = get_data_source().get_customer(cid)
    if perfil is None:
        return {"error": f"Cliente {cid} não encontrado na base."}
    return {"profile": perfil}


# CA-22: saúde, religião, política e filiação sindical nunca chegam ao modelo como
# categoria nem como descrição: viram "outros" no payload. O total continua certo.
CATEGORIAS_SENSIVEIS = {
    "saude",
    "farmacia",
    "plano_de_saude",
    "religiao",
    "doacoes",
    "igreja",
    "entidades_de_classe",
    "sindicato",
    "partido",
    "politica",
}
_DESCRICAO_SENSIVEL = re.compile(
    r"(igreja|templo|paroquia|doacao|dizimo|oferta religiosa|sindicat|partido|entidade de classe|farmac|drogaria|hospital|clinica|plano de saude|psic|terapia|laborator|exame)",
    re.IGNORECASE,
)


def _agregar_sensivel(t: dict) -> dict:
    descricao = unicodedata.normalize("NFKD", str(t.get("description") or ""))
    descricao = "".join(c for c in descricao if not unicodedata.combining(c))
    if t.get("category") in CATEGORIAS_SENSIVEIS or _DESCRICAO_SENSIVEL.search(
        descricao
    ):
        return {**t, "category": "outros", "description": "transacao agregada"}
    return t


def get_transactions(
    start_date: str,
    end_date: str,
    tool_context: ToolContext,
    category: str | None = None,
) -> dict:
    """Retorna as transações do cliente da sessão num período.

    Args:
        start_date: data inicial no formato AAAA-MM-DD.
        end_date: data final no formato AAAA-MM-DD.
        category: opcional, em minúsculas e sem acento: delivery, restaurantes,
            mercado, assinaturas, casa, transporte_por_app, posto_de_combustivel,
            lojas_e_sites, produtos_financeiros, transferencias_diversas, saude.

    Returns:
        transactions com a lista; total_out (quanto saiu, positivo), total_in
        (quanto entrou), net (entradas menos saídas) e by_category (quanto saiu por
        categoria). Para "quanto gastei", use total_out ou by_category; nunca some
        transações de cabeça.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    # Sem validar, "2026-7-01" passava na comparação de string, invertia o
    # intervalo e devolvia zero transações — "você não gastou nada".
    for rotulo, valor in (("start_date", start_date), ("end_date", end_date)):
        try:
            date.fromisoformat(valor)
        except ValueError:
            return {
                "error": f"{rotulo} deve estar no formato AAAA-MM-DD; recebido {valor!r}."
            }

    linhas = [
        _agregar_sensivel(t)
        for t in get_data_source().get_transactions(cid, start_date, end_date, category)
    ]
    # Separado porque somar tudo devolve o líquido: para o cliente organizado,
    # "quanto gastei?" respondia com um número positivo que era a sobra.
    saidas = sum(-t["amount"] for t in linhas if t["amount"] < 0)
    entradas = sum(t["amount"] for t in linhas if t["amount"] > 0)
    # QA R1: sem os totais por categoria no payload, o modelo somava de cabeça e o
    # validador de números recusava a resposta inteira.
    por_categoria: dict[str, float] = {}
    for t in linhas:
        if t["amount"] < 0:
            por_categoria[t["category"]] = (
                por_categoria.get(t["category"], 0.0) - t["amount"]
            )
    return {
        "transactions": linhas,
        "total_out": round(saidas, 2),
        "total_in": round(entradas, 2),
        "net": round(entradas - saidas, 2),
        "by_category": {
            k: round(v, 2)
            for k, v in sorted(por_categoria.items(), key=lambda kv: -kv[1])
        },
    }


def get_card_summary(tool_context: ToolContext) -> dict:
    """Retorna limite, fatura atual, pagamento mínimo e saldo do rotativo do cartão.

    Returns:
        card com os valores, ou error se não houver identificação.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    cartao = get_data_source().get_card(cid)
    if cartao is None:
        return {"error": f"Cliente {cid} não tem cartão na base."}
    return {"card": cartao}


def get_goals(tool_context: ToolContext) -> dict:
    """Retorna as metas financeiras do cliente da sessão, com valor alvo e já guardado.

    Use antes de `time_to_reach_goal`: os valores da meta vêm daqui, nunca de estimativa.

    Returns:
        goals com a lista de metas, ou error se não houver identificação.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    metas = get_data_source().get_goals(cid)
    if not metas:
        return {
            "goals": [],
            "reason": "Nenhuma meta cadastrada; o cliente pode definir uma na conversa.",
        }
    return {"goals": metas}


def get_account_summary(tool_context: ToolContext) -> dict:
    """Retorna o saldo em conta e o limite do cheque especial do cliente da sessão.

    Use antes de estimar quanto o cliente consegue guardar por mês.

    Returns:
        account com balance e overdraft_limit, ou error se não houver identificação.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    conta = get_data_source().get_accounts(cid)
    if conta is None:
        return {"error": f"Cliente {cid} não tem conta na base."}
    return {"account": conta}
