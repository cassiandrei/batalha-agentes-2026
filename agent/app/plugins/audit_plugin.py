"""Log estruturado sem PII: metadados da conversa, nunca o conteúdo."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.invocation_context import InvocationContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.plugins.base_plugin import BasePlugin
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext

from app.config import load_config

logger = logging.getLogger("audit")


class AuditPlugin(BasePlugin):
    def __init__(self) -> None:
        super().__init__(name="audit")
        self._inicio: dict[str, float] = {}
        # S7: latência por turno e chamadas ao modelo por turno e por conversa.
        self._inicio_turno: dict[str, float] = {}
        self._chamadas_turno: dict[str, int] = {}
        # ponytail: contagem por sessão em memória; some com a instância, como a sessão.
        self._chamadas_sessao: dict[str, int] = {}

    def _emit(self, evento: str, **campos: Any) -> None:
        cfg = load_config()
        logger.info(
            json.dumps(
                {
                    "event": evento,
                    "prompt_version": cfg.prompt_version,
                    "model": cfg.model_name,
                    **campos,
                },
                ensure_ascii=False,
            )
        )

    async def before_model_callback(
        self, *, callback_context: CallbackContext, llm_request: LlmRequest
    ) -> None:
        self._inicio[callback_context.invocation_id] = time.monotonic()
        return None

    async def before_run_callback(
        self, *, invocation_context: InvocationContext
    ) -> None:
        self._inicio_turno[invocation_context.invocation_id] = time.monotonic()
        self._chamadas_turno[invocation_context.invocation_id] = 0
        return None

    async def after_run_callback(
        self, *, invocation_context: InvocationContext
    ) -> None:
        inv = invocation_context.invocation_id
        iniciou = self._inicio_turno.pop(inv, None)
        chamadas = self._chamadas_turno.pop(inv, 0)
        sid = invocation_context.session.id
        total = self._chamadas_sessao.get(sid, 0) + chamadas
        self._chamadas_sessao[sid] = total
        self._emit(
            "turn",
            conversation_id=inv,
            session_id=sid,
            latency_ms=None
            if iniciou is None
            else round((time.monotonic() - iniciou) * 1000),
            model_calls=chamadas,
            model_calls_conversa=total,
        )
        return None

    async def after_model_callback(
        self, *, callback_context: CallbackContext, llm_response: LlmResponse
    ) -> None:
        if not getattr(llm_response, "partial", False):
            inv = callback_context.invocation_id
            self._chamadas_turno[inv] = self._chamadas_turno.get(inv, 0) + 1
        iniciou = self._inicio.pop(callback_context.invocation_id, None)
        uso = llm_response.usage_metadata
        self._emit(
            "model_call",
            conversation_id=callback_context.invocation_id,
            latency_ms=None
            if iniciou is None
            else round((time.monotonic() - iniciou) * 1000),
            input_tokens=getattr(uso, "prompt_token_count", None),
            output_tokens=getattr(uso, "candidates_token_count", None),
        )
        return None

    async def after_tool_callback(
        self,
        *,
        tool: BaseTool,
        tool_args: dict[str, Any],
        tool_context: ToolContext,
        result: dict[str, Any],
    ) -> None:
        # Apenas o nome da tool e se houve erro. Nunca os argumentos nem o resultado.
        self._emit("tool_call", tool=tool.name, had_error="error" in (result or {}))
        return None
