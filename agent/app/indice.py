"""Índice de Organização Financeira (0 a 100), calculado por regra sobre a vw_bioimpedancia.

Quatro pilares de 25 pontos, lineares e com limites explícitos, para o cliente
conseguir entender por que subiu ou desceu. Sem LLM, sem ponderação escondida.

| Pilar           | Indicador                      | 25 pontos em | 0 pontos em |
|-----------------|--------------------------------|--------------|-------------|
| poupança        | poupanca_sobre_entradas_pct    | >= +20 %      | <= -20 %     |
| dreno           | dreno_pct_renda                | 0 %          | >= 5 % da renda |
| comprometimento | comprometimento_credito_pct    | 0 %          | >= 50 %      |
| cronicidade     | meses_pagando_juros            | 0 meses      | 12 meses    |

Status: >= 75 organizado; 50 a 74 atencao; < 50 critico.
"""

from __future__ import annotations

VERSAO = "v1"


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def indice_organizacao(diag: dict) -> dict:
    poupanca = 25 * _clamp(
        (float(diag.get("poupanca_sobre_entradas_pct") or 0) + 20) / 40
    )
    dreno = 25 * (1 - _clamp(float(diag.get("dreno_pct_renda") or 0) / 5))
    comprometimento = 25 * (
        1 - _clamp(float(diag.get("comprometimento_credito_pct") or 0) / 50)
    )
    cronicidade = 25 * (1 - _clamp(float(diag.get("meses_pagando_juros") or 0) / 12))
    componentes = {
        "poupanca": round(poupanca, 2),
        "dreno": round(dreno, 2),
        "comprometimento": round(comprometimento, 2),
        "cronicidade": round(cronicidade, 2),
    }
    score = round(sum(componentes.values()))
    status = "organizado" if score >= 75 else "atencao" if score >= 50 else "critico"
    return {
        "score": score,
        "status": status,
        "componentes": componentes,
        "versao": VERSAO,
    }
