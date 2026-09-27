"""Confirmação de tratamento: idempotente, com iToken (mock) e evento auditável.

CA-14: nenhuma ação muda estado sem confirmação e iToken; um duplo clique gera uma
única execução. O registro vive no processo (a demo tem uma instância); em produção
vira uma tabela com a chave de idempotência como chave primária.
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import UTC, datetime

_audit = logging.getLogger("audit")
_ITOKEN = re.compile(r"^\d{6}$")
# iToken mock: 6 dígitos, e "000000" é o token inválido de teste.
_ITOKEN_INVALIDO = "000000"


class Confirmacoes:
    def __init__(self) -> None:
        self._simulacoes: dict[str, dict] = {}
        self._por_chave: dict[str, dict] = {}
        self._por_simulacao: dict[str, dict] = {}
        self.eventos: list[dict] = []

    def limpar(self) -> None:
        self.__init__()

    def registrar(self, customer_id: str, simulacao: dict) -> None:
        """Toda simulação que uma tela ou tool mostrou pode ser confirmada — só ela."""
        self._simulacoes[simulacao["simulacao_id"]] = {
            **simulacao,
            "customer_id": customer_id,
        }

    def confirmar(
        self, customer_id: str, simulacao_id: str, itoken: str, idempotency_key: str
    ) -> dict:
        if not idempotency_key:
            return {"status": "recusada", "motivo": "idempotency_key é obrigatória."}
        if (anterior := self._por_chave.get(idempotency_key)) is not None:
            return {**anterior, "status": "ja_confirmada"}
        if not _ITOKEN.match(itoken or "") or itoken == _ITOKEN_INVALIDO:
            return {
                "status": "recusada",
                "motivo": "iToken inválido: nada foi executado.",
            }
        sim = self._simulacoes.get(simulacao_id)
        if sim is None or sim["customer_id"] != customer_id:
            return {
                "status": "recusada",
                "motivo": "Simulação desconhecida para este cliente.",
            }
        expira = datetime.fromisoformat(sim["expira_em"])
        if expira.tzinfo is None:
            expira = expira.replace(tzinfo=UTC)
        if expira <= datetime.now(UTC):
            return {
                "status": "recusada",
                "motivo": "Simulação expirada: refaça a simulação.",
            }
        if (feita := self._por_simulacao.get(simulacao_id)) is not None:
            resultado = {**feita, "status": "ja_confirmada"}
            self._por_chave[idempotency_key] = feita
            return resultado
        execucao = {
            "status": "confirmada",
            "execucao_id": f"exec-{uuid.uuid4().hex[:10]}",
            "evento": "tratamento_confirmado",
            "tipo": sim["tipo"],
            "simulacao_id": simulacao_id,
            "em": datetime.now(UTC).isoformat(timespec="seconds"),
        }
        self._por_chave[idempotency_key] = execucao
        self._por_simulacao[simulacao_id] = execucao
        evento = {
            "evento": "tratamento_confirmado",
            "execucao_id": execucao["execucao_id"],
            "customer_id": customer_id,
            "simulacao_id": simulacao_id,
            "tipo": sim["tipo"],
            "em": execucao["em"],
        }
        self.eventos.append(evento)
        _audit.info(
            json.dumps({**evento, "customer_id": "<sessao>"}, ensure_ascii=False)
        )
        return execucao


REGISTRO = Confirmacoes()
