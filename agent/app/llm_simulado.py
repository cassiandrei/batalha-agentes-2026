"""LLM simulado para o modo de ensaio (LLM_MODE=simulado).

Sem rede e sem cota: cada agente devolve um texto fixo, curto e dentro das regras
(sem número, sem termo proibido). Serve para ensaiar a demo, rodar o roteiro ponta a
ponta e testar guardrails sem gastar as chamadas do dia.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from google.adk.models.base_llm import BaseLlm
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.genai import types

TEXTO_ENSAIO = (
    "[ensaio] Esta resposta veio do LLM simulado. Os números que você vê nas telas "
    "vêm das tools; para a conversa real, rode com LLM_MODE=real."
)


class LlmSimulado(BaseLlm):
    model: str = "simulado"
    chamadas: int = 0

    async def generate_content_async(
        self, llm_request: LlmRequest, stream: bool = False
    ) -> AsyncGenerator[LlmResponse, None]:
        self.chamadas += 1
        yield LlmResponse(
            content=types.Content(role="model", parts=[types.Part(text=TEXTO_ENSAIO)])
        )
