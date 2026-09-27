"""Política de memória (PRD, "Mapa de dados pessoais"): o que pode ser lembrado.

Guarda: objetivos declarados, ofertas recusadas e tratamentos confirmados, com data.
Nunca guarda: valores de transação, payload das tools, dados de cadastro e texto
bruto. A regra é código, não prompt: a tool e o endpoint passam por aqui.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)

CHAVES_PERMITIDAS = ("objetivo", "oferta_recusada", "tratamento", "canal_preferido")
_TAMANHO_MAXIMO = 160
_VALOR_MONETARIO = re.compile(r"R\$|\d+[.,]\d{2}\b")
_PAYLOAD = re.compile(r"[{}\[\]]|\w+\s*[:=]\s*\d")


def valor_permitido(chave: str, valor: str) -> bool:
    base = chave.split(":", 1)[0]
    if base not in CHAVES_PERMITIDAS:
        return False
    if not valor or len(valor) > _TAMANHO_MAXIMO:
        return False
    if _VALOR_MONETARIO.search(valor) or _PAYLOAD.search(valor):
        return False
    return True


async def carregar_semente_memoria(store, caminho: Path, ttl_days: int) -> int:
    """Semente do Bruno no boot: lembranças de uma conversa anterior, gravadas com o
    consentimento daquela conversa. Só entra o que a política permite."""
    if not caminho.exists():
        return 0
    quantas = 0
    for item in json.loads(caminho.read_text(encoding="utf-8")):
        cid = item["customer_id"]
        if (await store.get_profile_summary(cid))["preferences"]:
            continue  # já há memória viva: a semente não sobrescreve
        for chave, valor in item.get("lembrancas", {}).items():
            if not valor_permitido(chave, valor):
                logger.warning("semente de memória: %r ignorada pela política", chave)
                continue
            if await store.save_preference(
                cid, chave, valor, item["consent_given_at"], ttl_days
            ):
                quantas += 1
    return quantas
