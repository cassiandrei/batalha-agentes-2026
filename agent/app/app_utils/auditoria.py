"""Saída do log de auditoria: uma linha JSON por evento no stdout.

O Cloud Run indexa JSON no stdout como `jsonPayload`, então `event=guard` vira uma
consulta no Cloud Logging. Sem isto, o logger `audit` fica no nível padrão (WARNING)
e nenhuma linha sai do processo.
"""

from __future__ import annotations

import logging
import sys

AUDIT = "audit"


def configurar_auditoria(stream=None) -> logging.Logger:
    logger = logging.getLogger(AUDIT)
    logger.setLevel(logging.INFO)
    if not any(getattr(h, "_vita_audit", False) for h in logger.handlers):
        handler = logging.StreamHandler(stream or sys.stdout)
        handler.setFormatter(logging.Formatter("%(message)s"))
        handler._vita_audit = True  # type: ignore[attr-defined]
        logger.addHandler(handler)
    # propagate fica True: caplog dos testes e o handler raiz continuam vendo.
    return logger
