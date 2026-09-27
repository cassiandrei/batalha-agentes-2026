#!/usr/bin/env python3
"""Busca o CDI no SGS do Banco Central e grava data/evento/cdi_sgs.json.

    python3 infra/scripts/fetch_cdi.py [--saida data/evento/cdi_sgs.json]

Série 4389: CDI acumulada no mês, anualizada (% a.a.). O agente lê o arquivo como
parâmetro com origem declarada; sem o arquivo, usa o valor fixo declarado em código.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

SERIE = 4389
URL = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{SERIE}/dados/ultimos/1?formato=json"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--saida", default="data/evento/cdi_sgs.json")
    args = ap.parse_args()
    with urllib.request.urlopen(URL, timeout=30) as r:
        ponto = json.loads(r.read().decode())[0]
    dado = {
        "serie_sgs": SERIE,
        "descricao": "CDI acumulada no mês, anualizada (% a.a.)",
        "data_referencia": ponto["data"],
        "cdi_aa_pct": float(ponto["valor"].replace(",", ".")),
        "origem": "bcb_sgs",
        "coletado_em": datetime.now(UTC).isoformat(timespec="seconds"),
    }
    saida = Path(args.saida)
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(json.dumps(dado, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"CDI {dado['cdi_aa_pct']}% a.a. em {dado['data_referencia']} → {saida}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
