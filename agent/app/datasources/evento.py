"""O dado do hackathon (hackathon_dados.extrato_sintetico) atrás do DataSource.

Colunas: id_usuario, data, tipo (S saída / E entrada), descr, vlr, nom_cate_macro,
nom_cate_micro, saldo_apos, parcela_atual, parcela_total. Não há cadastro, cartão
nem metas: o que dá para DERIVAR do extrato é derivado; o que não dá fica de
fora, em vez de inventado — o modelo não pode receber suitability que não existe.

Lê um snapshot local (make stage-evento) porque a SA de execução do projeto do
evento não tem papel no BigQuery. Se os organizadores concederem, a mesma classe
recebe as linhas de uma query em vez do CSV.
"""

from __future__ import annotations

import csv
import json
import unicodedata
from collections import defaultdict
from collections.abc import Iterable
from functools import lru_cache
from pathlib import Path

from app.datasources.projections import (
    project_diagnostico,
    project_fatura,
    project_investimento,
    project_parametro,
    project_perfil_risco,
    project_transaction,
)

# Tabelas do time exportadas por `make stage-evento`, além do extrato. Opcionais:
# um snapshot antigo (só extrato) continua servindo o que tem.
TABELAS_DO_TIME = (
    "vw_fatura_mensal",
    "perfil_risco",
    "vw_bioimpedancia",
    "posicao_investimentos",
    "parametros_modelo",
)
# CDI sem o arquivo do SGS (make cdi): valor fixo, com a origem dizendo que é fixo.
# O modelo pode citar a origem; nunca fica em dúvida se o número é medido ou chutado.
CDI_FIXO_DECLARADO = {
    "serie_sgs": 4389,
    "data_referencia": "24/09/2026",
    "cdi_aa_pct": 13.65,
    "origem": "fixo_declarado",
}

# Vocabulário do agente (prompts, eval) ← categorias do evento.
_MAPA = {
    "salarios e bonificacoes": "salario",
    "recebimentos diversos": "pix_recebido",
    "transferencias diversas": "pix_enviado",
    "posto de combustivel": "transporte",
    "transporte por app": "transporte",
    "emprestimos e financiamentos": "emprestimo",
    "produtos financeiros": "produtos_financeiros",
    "lojas e sites": "compras",
    "casa": "moradia",
}


def normalizar_categoria(macro: str) -> str:
    base = (
        "".join(
            c
            for c in unicodedata.normalize("NFKD", macro)
            if not unicodedata.combining(c)
        )
        .lower()
        .strip()
    )
    return _MAPA.get(base, base.replace(" ", "_"))


def _f(v: str | None) -> float | None:
    return float(v) if v not in (None, "") else None


class EventoDataSource:
    def __init__(
        self,
        linhas: Iterable[dict],
        tabelas: dict[str, Iterable[dict]] | None = None,
        cdi: dict | None = None,
    ) -> None:
        self._cdi = dict(cdi) if cdi else None
        self._parametros: dict[str, dict] = {}
        por_usuario: dict[str, list[dict]] = defaultdict(list)
        for r in linhas:
            por_usuario[r["id_usuario"]].append(r)
        for rs in por_usuario.values():
            rs.sort(key=lambda r: r["data"])
        self._por_usuario = dict(por_usuario)
        self._tabelas: dict[str, dict[str, list[dict]]] = {}
        for nome, rows in (tabelas or {}).items():
            if nome == "parametros_modelo":  # não é por usuário
                self._parametros = {r["parametro"]: project_parametro(r) for r in rows}
                continue
            idx: dict[str, list[dict]] = defaultdict(list)
            for r in rows:
                idx[r["id_usuario"]].append(r)
            self._tabelas[nome] = dict(idx)

    def _linhas_do_time(self, tabela: str, customer_id: str) -> list[dict]:
        return self._tabelas.get(tabela, {}).get(customer_id, [])

    def _rows(self, customer_id: str) -> list[dict]:
        return self._por_usuario.get(customer_id, [])

    def get_customer(self, customer_id: str) -> dict | None:
        rs = self._rows(customer_id)
        if not rs:
            return None
        salarios = [
            _f(r["vlr"])
            for r in rs
            if r["tipo"] == "E"
            and normalizar_categoria(r["nom_cate_macro"]) == "salario"
        ]
        renda = max(salarios) if salarios else None
        return {
            "customer_id": customer_id,
            "first_name": "cliente",  # o extrato não tem nome — e não deve ter
            "income_band": f"{int(renda // 1000)}k-{int(renda // 1000) + 1}k"
            if renda
            else "nao_informado",
            "suitability": "nao_informado",
        }

    def get_accounts(self, customer_id: str) -> dict | None:
        rs = self._rows(customer_id)
        if not rs:
            return None
        saldo = next(
            (
                _f(r["saldo_apos"])
                for r in reversed(rs)
                if _f(r["saldo_apos"]) is not None
            ),
            0.0,
        )
        return {"balance": saldo, "overdraft_limit": 0.0}  # limite não existe no dado

    def get_transactions(
        self,
        customer_id: str,
        start_date: str,
        end_date: str,
        category: str | None = None,
    ) -> list[dict]:
        inicio, fim = sorted(
            (start_date, end_date)
        )  # invertidas não viram vazio silencioso
        saida = []
        for r in self._rows(customer_id):
            if not (inicio <= r["data"] <= fim):
                continue
            cat = normalizar_categoria(r["nom_cate_macro"])
            if category and cat != category:
                continue
            vlr = _f(r["vlr"]) or 0.0
            saida.append(
                project_transaction(
                    {
                        "date": r["data"],
                        "category": cat,
                        "amount": vlr if r["tipo"] == "E" else -vlr,
                        "description": r["descr"],
                    }
                )
            )
        return saida

    def get_card(self, customer_id: str) -> dict | None:
        rs = self._rows(customer_id)
        if not rs:
            return None
        # Só o que o extrato permite derivar: parcelamentos em andamento.
        em_curso = {
            r["descr"]
            for r in rs
            if _f(r["parcela_total"])
            and (_f(r["parcela_atual"]) or 0) < _f(r["parcela_total"])
        }
        return {"installment_count": float(len(em_curso))}

    def get_goals(self, customer_id: str) -> list[dict]:
        return []  # o dado do evento não tem metas

    # --- tabelas do time (vita_sintetico) ---

    def customer_ids(self) -> list[str]:
        """Clientes com fatura na vw_fatura_mensal (o público possível do gatilho)."""
        return sorted(self._tabelas.get("vw_fatura_mensal", {}))

    def get_fatura_rotativo(self, customer_id: str) -> list[dict]:
        meses = [
            project_fatura(r)
            for r in self._linhas_do_time("vw_fatura_mensal", customer_id)
        ]
        return sorted(meses, key=lambda m: m["anomes"])

    def get_perfil_risco(self, customer_id: str) -> dict | None:
        rs = self._linhas_do_time("perfil_risco", customer_id)
        return project_perfil_risco(rs[0]) if rs else None

    def get_diagnostico(self, customer_id: str) -> dict | None:
        rs = self._linhas_do_time("vw_bioimpedancia", customer_id)
        return project_diagnostico(rs[0]) if rs else None

    def get_posicao_investimentos(self, customer_id: str) -> list[dict]:
        return [
            project_investimento(r)
            for r in self._linhas_do_time("posicao_investimentos", customer_id)
        ]

    def get_parametros_modelo(self) -> dict[str, dict]:
        return dict(self._parametros)

    def get_cdi(self) -> dict:
        return dict(self._cdi) if self._cdi else dict(CDI_FIXO_DECLARADO)


@lru_cache(maxsize=8)
def _carregar_snapshot(caminho: str) -> tuple[dict, ...]:
    p = Path(caminho)
    if not p.exists():
        raise FileNotFoundError(
            f"{p} não existe. Rode: make stage-evento PROJECT_ID=<projeto do evento>"
        )
    with open(p, encoding="utf-8") as fh:
        return tuple(csv.DictReader(fh))


def from_snapshot(data_dir: Path) -> EventoDataSource:
    pasta = data_dir / "evento"
    tabelas = {
        nome: _carregar_snapshot(str(pasta / f"{nome}.csv"))
        for nome in TABELAS_DO_TIME
        if (pasta / f"{nome}.csv").exists()
    }
    cdi_path = pasta / "cdi_sgs.json"
    cdi = (
        json.loads(cdi_path.read_text(encoding="utf-8")) if cdi_path.exists() else None
    )
    return EventoDataSource(
        _carregar_snapshot(str(pasta / "extrato.csv")), tabelas=tabelas, cdi=cdi
    )
