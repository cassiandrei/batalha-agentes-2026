"""Motor de decisão: ordena os tratamentos pelo custo mensal para o cliente. Sem LLM.

Custo mensal de cada tratamento:
- T01 (usar a reserva): o rendimento líquido que a reserva deixa de render por mês.
- T02 (parcelar): os juros totais do prazo aprovado mais barato, diluídos por mês.

O mais barato é a recomendação principal, mesmo quando o cliente tem crédito
disponível: o melhor para ele pode ser não contratar.
"""

from __future__ import annotations


def _custo_t02(t02: dict | None) -> tuple[float | None, dict | None]:
    if not t02:
        return None, None
    aprovadas = [o for o in t02.get("opcoes", []) if o.get("aprovado")]
    if not aprovadas:
        return None, None
    melhor = min(aprovadas, key=lambda o: o["juros_totais"])
    return round(melhor["juros_totais"] / melhor["prazo"], 2), melhor


def ordenar_tratamentos(t01: dict | None, t02: dict | None) -> dict:
    ordem = []
    if t01:
        ordem.append(
            {
                "tipo": "t01",
                "custo_mensal": round(float(t01["rendimento_liquido_perdido_mes"]), 2),
                "descricao": "rendimento líquido que a reserva deixa de render por mês",
            }
        )
    custo2, melhor = _custo_t02(t02)
    if custo2 is not None and melhor is not None:
        ordem.append(
            {
                "tipo": "t02",
                "custo_mensal": custo2,
                "descricao": f"juros do parcelamento em {melhor['prazo']}x, diluídos por mês",
                "prazo": melhor["prazo"],
            }
        )
    ordem.sort(key=lambda x: x["custo_mensal"])
    principal = ordem[0]["tipo"] if ordem else None
    motivo = ""
    if len(ordem) == 2:
        motivo = (
            f"{ordem[0]['tipo'].upper()} custa menos por mês "
            f"({ordem[0]['custo_mensal']:.2f} contra {ordem[1]['custo_mensal']:.2f})."
        )
    elif len(ordem) == 1:
        motivo = f"Só {ordem[0]['tipo'].upper()} se aplica."
    else:
        motivo = "Nenhum tratamento elegível."
    return {"principal": principal, "ordem": ordem, "motivo": motivo}
