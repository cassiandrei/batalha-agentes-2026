#!/usr/bin/env python3
"""Gera a semente da abertura proativa a partir de um agente vivo.

    python3 infra/scripts/seed_abertura.py --base-url https://... \
        --customer-id 36d74064-... [--mes-referencia 202512] [--saida data/evento/seed_sessions.json]

Dispara o gatilho (POST /events, UMA chamada real ao modelo, pelo redator), lê a
abertura gravada na sessão (GET /customers/{id}/opening, sem modelo) e salva o
arquivo que o serviço carrega no boot. Assim a sessão pré-montada sobrevive a um
reinício da instância e a demo não depende de cota.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path


def _post(url: str, corpo: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(corpo).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.loads(r.read().decode())


def _get(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.loads(r.read().decode())


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--customer-id", required=True)
    ap.add_argument("--mes-referencia", type=int, default=202512)
    ap.add_argument("--saida", default="data/evento/seed_sessions.json")
    args = ap.parse_args()
    base = args.base_url.rstrip("/")

    evento = _post(
        f"{base}/events",
        {
            "event_type": "dreno_rotativo",
            "customer_id": args.customer_id,
            "details": {"mes_referencia": args.mes_referencia},
        },
    )
    abertura = _get(f"{base}/customers/{args.customer_id}/opening")
    if abertura.get("fallback"):
        print(
            "AVISO: o redator saiu do contrato; a semente leva o texto calculado.",
            file=sys.stderr,
        )

    saida = Path(args.saida)
    existentes = json.loads(saida.read_text(encoding="utf-8")) if saida.exists() else []
    outras = [s for s in existentes if s["user_id"] != args.customer_id]
    semente = {
        "user_id": args.customer_id,
        "session_id": evento["session_id"],
        "state": {
            "customer_id": args.customer_id,
            "trigger": "dreno_rotativo",
            "mes_referencia": args.mes_referencia,
        },
        "abertura": {
            k: abertura[k] for k in ("texto", "acoes", "fallback") if k in abertura
        },
    }
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(
        json.dumps([*outras, semente], ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"push: {abertura['push']}")
    print(f"texto: {abertura['texto']}")
    print(f"acoes: {[a['tipo'] for a in abertura['acoes']]}")
    print(f"semente gravada em {saida} ({len(outras) + 1} sessão(ões))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
