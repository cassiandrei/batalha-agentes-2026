"""Validador de números: todo valor em reais na resposta tem de existir no payload das tools.

Função pura, sem ADK. O plugin registra os números de cada resultado de tool no
estado e, na saída do modelo, confere os "R$ X" do texto contra esse conjunto.
Percentuais e contagens ("3 meses", "12x") ficam fora de propósito: o risco que
importa é cifra inventada.
"""

from __future__ import annotations

import re

_REAIS = re.compile(r"R\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)")
_TOLERANCIA = 0.006


def valores_em_reais(texto: str) -> list[float]:
    saida = []
    for m in _REAIS.finditer(texto):
        bruto = m.group(1).replace(".", "").replace(",", ".")
        try:
            saida.append(round(float(bruto), 2))
        except ValueError:
            continue
    return saida


def numeros_do_payload(obj) -> set[float]:
    """Todo número (não booleano) de um resultado de tool, em qualquer profundidade."""
    achados: set[float] = set()
    if isinstance(obj, bool):
        return achados
    if isinstance(obj, (int, float)):
        achados.add(round(float(obj), 2))
    elif isinstance(obj, dict):
        for v in obj.values():
            achados |= numeros_do_payload(v)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            achados |= numeros_do_payload(v)
    return achados


def valores_fora_do_payload(texto: str, permitidos: set[float]) -> list[float]:
    """Sem payload registrado não há o que validar: nunca bloqueia por engano."""
    if not permitidos:
        return []
    return [v for v in valores_em_reais(texto) if not _bate(v, permitidos)]


def _bate(v: float, permitidos: set[float]) -> bool:
    """Igual a um número do payload, ou o mesmo número arredondado para reais inteiros
    ("R$ 3.654" para 3654.36). Arredondar não é inventar; qualquer outra cifra é."""
    for p in permitidos:
        if abs(v - p) <= _TOLERANCIA:
            return True
        if v.is_integer() and abs(v - round(p)) <= _TOLERANCIA:
            return True
    return False
