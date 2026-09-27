#!/usr/bin/env python3
"""Smoke das fatias contra um agente vivo, SEM chamar o modelo (custo zero de cota).

    python3 infra/scripts/smoke_fatia.py s1 --base-url https://s1---batalha-agentes-....run.app \
        --customer-id 36d74064-cc59-4ad2-9304-aeae46e660e4

S1 — "Pronto quando": o detalhe da fatura na URL da tag mostra R$ 853,07,
R$ 127,96, R$ 725,07 e R$ 101,51 (dezembro/2025 do Bruno, reconstruído por regra).
S2 — "Pronto quando": a abertura pré-montada está na sessão (GET /opening), com o
push neutro, o texto citando pago/saldo/juros e os botões do catálogo — e continua
lá depois de reiniciar a instância (a semente carregada no boot).
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
        print(
            f"{'✓' if passou else '✗'} card.{campo} = {cartao.get(campo)} (esperado {valor})"
        )
    meses = len(perfil.get("invoice_history") or [])
    passou = meses == 12 and perfil.get("reference_month") == 202512
    ok += passou
    print(
        f"{'✓' if passou else '✗'} 12 meses de histórico, referência 202512 (meses={meses})"
    )
    print(f"\n{ok}/5 verificacoes passaram — sem nenhuma chamada ao modelo")
    return 0 if ok == 5 else 1


PUSH_NEUTRO = "O Vita tem uma análise nova para você"


def s3(base_url: str, customer_id: str) -> int:
    """Visão financeira e T01: índice por regra, reserva e simulação, tudo do payload."""
    url = f"{base_url.rstrip('/')}/customers/{customer_id}/financial-profile"
    with urllib.request.urlopen(url, timeout=60) as r:
        p = json.loads(r.read().decode())
    idx = p.get("index") or {}
    res = p.get("reserve") or {}
    t01 = (p.get("treatments") or {}).get("t01") or {}
    nulos = [k for k, v in t01.items() if v is None]
    checks = [
        (
            "indice 0..100 com status e 4 componentes",
            isinstance(idx.get("score"), int)
            and 0 <= idx["score"] <= 100
            and idx.get("status") in ("organizado", "atencao", "critico")
            and len(idx.get("componentes") or {}) == 4,
        ),
        (
            "reserva: CDB DI de 41.270 a 103% do CDI",
            res.get("saldo") == 41270.0 and res.get("percentual_cdi") == 1.03,
        ),
        (
            "T01: saldo quitado 725,07 e juros evitados 101,51",
            t01.get("saldo_quitado") == 725.07
            and t01.get("juros_evitados_mes") == 101.51,
        ),
        ("T01: reserva restante 40.544,93", t01.get("reserva_restante") == 40544.93),
        (
            "T01: CDI do SGS com origem declarada e IR",
            t01.get("cdi_origem") in ("bcb_sgs", "fixo_declarado")
            and t01.get("ir_mes", 0) > 0,
        ),
        ("CA-08: nenhum campo nulo no T01", bool(t01) and not nulos),
        (
            "justificativa cita os numeros do payload",
            "725,07" in t01.get("justificativa", "")
            and "101,51" in t01.get("justificativa", ""),
        ),
    ]
    ok = 0
    for nome, passou in checks:
        ok += passou
        print(f"{'✓' if passou else '✗'} {nome}")
    print(f"\n{ok}/{len(checks)} verificacoes passaram — sem nenhuma chamada ao modelo")
    return 0 if ok == len(checks) else 1


def s2b(base_url: str, customer_id: str) -> int:
    """Front publicado: página carrega, abertura e perfil vêm do agente, chat passa
    pelo agente (UMA chamada real ao modelo)."""
    base = base_url.rstrip("/")
    checks = []
    with urllib.request.urlopen(base + "/", timeout=60) as r:
        html = r.read().decode()
    checks.append(
        (
            "página carrega (HTML com o app)",
            r.status == 200 and '<div id="root"' in html,
        )
    )
    with urllib.request.urlopen(base + "/api/abertura", timeout=60) as r:
        abertura = json.loads(r.read().decode())
    checks.append(
        (
            "/api/abertura: push neutro e texto com 127,96",
            abertura.get("push") == PUSH_NEUTRO
            and "127,96" in abertura.get("texto", ""),
        )
    )
    checks.append(
        ("/api/abertura: botões do catálogo", len(abertura.get("acoes", [])) == 3)
    )
    with urllib.request.urlopen(base + "/api/financial-profile", timeout=60) as r:
        perfil = json.loads(r.read().decode())
    checks.append(
        (
            "/api/financial-profile: fatura 853,07 do agente",
            perfil["card"]["totalInvoice"] == 853.07,
        )
    )
    req = urllib.request.Request(
        base + "/api/chat",
        data=json.dumps({"userMessage": "Quanto paguei de juros no ano?"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=240) as r:
        chat = json.loads(r.read().decode())
    checks.append(
        (
            "/api/chat: resposta veio do agente",
            chat.get("source") == "agente" and bool(chat.get("reply")),
        )
    )
    checks.append(
        (
            "/api/chat: número veio de tool (get_diagnostico/fatura)",
            any(t.startswith("get_") for t in chat.get("tools", [])),
        )
    )
    ok = 0
    for nome, passou in checks:
        ok += passou
        print(f"{'✓' if passou else '✗'} {nome}")
    print(f"\n{ok}/{len(checks)} verificacoes passaram — 1 chamada ao modelo (o chat)")
    if chat.get("reply"):
        print("resposta:", chat["reply"][:200].replace("\n", " "))
    return 0 if ok == len(checks) else 1


def s2(base_url: str, customer_id: str) -> int:
    url = f"{base_url.rstrip('/')}/customers/{customer_id}/opening"
    with urllib.request.urlopen(url, timeout=60) as r:
        abertura = json.loads(r.read().decode())
    checks = [
        ("push neutro, sem valor nem 'juros'", abertura.get("push") == PUSH_NEUTRO),
        (
            "apresenta o Vita como IA",
            "assistente com ia" in abertura.get("texto", "").lower(),
        ),
        ("texto cita pago 127,96", "127,96" in abertura.get("texto", "")),
        ("texto cita saldo no rotativo 725,07", "725,07" in abertura.get("texto", "")),
        ("texto cita juros do mes 101,51", "101,51" in abertura.get("texto", "")),
        (
            "acoes do catalogo: fatura, visao financeira, pessoa",
            [a.get("tipo") for a in abertura.get("acoes", [])]
            == ["abrir_fatura", "abrir_visao_financeira", "falar_com_pessoa"],
        ),
        ("texto veio do redator (nao do fallback)", abertura.get("fallback") is False),
    ]
    ok = 0
    for nome, passou in checks:
        ok += passou
        print(f"{'✓' if passou else '✗'} {nome}")
    print(f"\n{ok}/{len(checks)} verificacoes passaram — sem nenhuma chamada ao modelo")
    return 0 if ok == len(checks) else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("fatia", choices=["s1", "s2", "s2b", "s3"])
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--customer-id", required=True)
    args = ap.parse_args()
    sys.exit(
        {"s1": s1, "s2": s2, "s2b": s2b, "s3": s3}[args.fatia](
            args.base_url, args.customer_id
        )
    )
