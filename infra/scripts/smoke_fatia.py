#!/usr/bin/env python3
"""Smoke das fatias contra um agente vivo, SEM chamar o modelo (custo zero de cota).

    python3 infra/scripts/smoke_fatia.py s1 --base-url https://s1---batalha-agentes-....run.app \
        --customer-id 36d74064-cc59-4ad2-9304-aeae46e660e4

S1 — "Pronto quando": o detalhe da fatura na URL da tag mostra R$ 853,07,
R$ 127,96, R$ 725,07 e R$ 101,51 (dezembro/2025 do Bruno, reconstruído por regra).
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request

ESPERADO_S1 = {
    "total_invoice": 853.07,
    "paid_amount": 127.96,
    "outstanding_balance": 725.07,
    "revolving_interest_charged": 101.51,
}


def s1(base_url: str, customer_id: str) -> int:
    url = f"{base_url.rstrip('/')}/customers/{customer_id}/financial-profile"
    with urllib.request.urlopen(url, timeout=60) as r:
        perfil = json.loads(r.read().decode())
    cartao = perfil["card"]
    ok = 0
    for campo, valor in ESPERADO_S1.items():
        passou = cartao.get(campo) == valor
        ok += passou
        print(f"{'✓' if passou else '✗'} card.{campo} = {cartao.get(campo)} (esperado {valor})")
    meses = len(perfil.get("invoice_history") or [])
    passou = meses == 12 and perfil.get("reference_month") == 202512
    ok += passou
    print(f"{'✓' if passou else '✗'} 12 meses de histórico, referência 202512 (meses={meses})")
    print(f"\n{ok}/5 verificacoes passaram — sem nenhuma chamada ao modelo")
    return 0 if ok == 5 else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("fatia", choices=["s1"])
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--customer-id", required=True)
    args = ap.parse_args()
    sys.exit({"s1": s1}[args.fatia](args.base_url, args.customer_id))
