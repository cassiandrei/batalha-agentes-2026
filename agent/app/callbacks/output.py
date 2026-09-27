"""Checagem da resposta antes de chegar ao cliente."""

from __future__ import annotations

import re

from app.callbacks.pii import mask_pii

RISCO_ALTO = re.compile(
    r"\b(cripto|criptomoedas?|bitcoin|day\s?trade|alavancagem|derivativos?|op(c|ç)(o|õ)es)\b",
    re.IGNORECASE,
)
PERFIS_INCOMPATIVEIS = {"conservador"}
# CA-15: promessa de resultado e linguagem de culpa nunca saem. "aprovado" é decisão
# do motor, exibida pelo front; o modelo não a pronuncia.
TERMOS_PROIBIDOS = re.compile(
    r"\b(garantid[oa]s?|garantia\s+de\s+aprova|aprovad[oa]s?|sem\s+risco|risco\s+zero|sangria|"
    r"voce\s+errou|culpa\s+sua|irrespons[aá]vel)\b",
    re.IGNORECASE,
)
# Token canário: vive só no system prompt. Se aparece na resposta, o prompt vazou.
CANARIO = "VITA-CANARIO-7f3a9c"
# URLs: só domínios do governo e do Banco Central saem para o cliente.
URL_RE = re.compile(r"https?://([\w.-]+)", re.IGNORECASE)
DOMINIOS_PERMITIDOS = (".gov.br",)


def _sem_acento(texto: str) -> str:
    import unicodedata

    return "".join(
        c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c)
    )


def urls_nao_permitidas(texto: str) -> list[str]:
    return [
        h
        for h in URL_RE.findall(texto)
        if not any(
            h.lower().endswith(d) or h.lower() == d.lstrip(".")
            for d in DOMINIOS_PERMITIDOS
        )
    ]


def check_output(text: str, suitability: str) -> tuple[str, list[str]]:
    """Devolve o texto (com PII mascarada) e a lista de violações encontradas."""
    violacoes: list[str] = []
    texto, achados = mask_pii(text)
    if achados:
        violacoes.append("pii_leak")
    if suitability in PERFIS_INCOMPATIVEIS and RISCO_ALTO.search(text):
        violacoes.append("suitability_mismatch")
    if TERMOS_PROIBIDOS.search(_sem_acento(text)):
        violacoes.append("termo_proibido")
    if CANARIO in text:
        violacoes.append("canario_vazado")
    if urls_nao_permitidas(text):
        violacoes.append("url_nao_permitida")
    return texto, violacoes
