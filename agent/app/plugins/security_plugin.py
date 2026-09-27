"""Guardrails transversais.

Registrado uma vez em App(plugins=[...]), vale para o orquestrador e para todo
subagente — inclusive os que forem criados no sábado. Um callback por agente
faria a cobertura depender de alguém lembrar de plugá-lo.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.plugins.base_plugin import BasePlugin
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext
from google.genai import types

from app.callbacks.authz import UnsafeToolArgs, assert_tool_args_safe
from app.callbacks.entrada import avaliar_entrada, hash_entrada
from app.callbacks.injection import detect_injection
from app.callbacks.numeros import numeros_do_payload, valores_fora_do_payload
from app.callbacks.output import check_output
from app.callbacks.pii import mask_pii
from app.config import load_config

RECUSA = (
    "Não consigo ajudar com isso. Posso mostrar sua visão financeira ou as opções "
    "para reduzir juros. Se preferir, posso transferir para uma pessoa."
)
RECUSA_ESCOPO = (
    "Isso fica fora do que eu faço. Posso ajudar com a sua fatura, o rotativo, a "
    "reserva e as opções para reduzir juros."
)
RECUSA_OUTRO_CLIENTE = (
    "Só consigo falar da sua própria conta: a identidade vem da sessão, e nenhum "
    "identificador escrito na conversa muda isso. Posso mostrar a sua visão financeira."
)
RECUSA_SAIDA = (
    "Prefiro não prometer resultado. Posso mostrar sua visão financeira ou as opções "
    "para reduzir juros, com os números da sua conta."
)
RECUSA_FAIXA_V = "Nenhuma oferta de crédito por regra; o caminho é renegociação assistida com uma pessoa."
# Tools que criam ou simulam crédito novo: a faixa V não chega nelas.
TOOLS_CREDITO = {"simular_parcelamento_fatura"}
TRANSFERENCIA = "Vou transferir você para um atendente humano, que consegue ajudar melhor a partir daqui."
RECUSA_NUMERO = (
    "Prefiro não citar um valor que não veio dos seus dados. Posso mostrar os números "
    "exatos da sua fatura e da sua reserva, ou explicar como eles foram calculados."
)
RECUSA_CITACAO = (
    "Não consigo afirmar isso sem citar a norma. Posso buscar de novo a regra com a "
    "fonte, ou você pode falar com uma pessoa."
)
_MAX_NUMEROS_NO_ESTADO = 400
# S8: resultado do especialista (AgentTool) — texto livre que deve carregar a fonte.
NORMAS_TOOL = "especialista_normas"
# Campos de texto livre vindos dos dados: escritos por terceiros, nunca confiáveis.
FREE_TEXT_KEYS = {"description", "name", "merchant", "title", "excerpt"}
SANITIZED = "[conteúdo removido: instrução suspeita nos dados]"


# O PluginManager faz early exit no primeiro retorno não-None: quando o
# SecurityPlugin age, o AuditPlugin NUNCA roda. Por isso o guard emite a própria
# linha de auditoria, em vez de depender do plugin seguinte.
_audit_logger = logging.getLogger("audit")


def _audit_guard(
    guard: str, camada: str = "entrada", decisao: str = "bloqueado", **campos: Any
) -> None:
    """Registra que um guard agiu: camada, categoria, decisão e hash. Nunca o texto."""
    _audit_logger.info(
        json.dumps(
            {
                "event": "guard",
                "guard": guard,
                "camada": camada,
                "decisao": decisao,
                **campos,
            },
            ensure_ascii=False,
        )
    )


def _texto_resposta(texto: str) -> LlmResponse:
    return LlmResponse(
        content=types.Content(role="model", parts=[types.Part(text=texto)])
    )


def _limpar(valor: Any, chave: str | None = None) -> tuple[Any, bool]:
    """Percorre o resultado da tool e neutraliza injection em campos de texto livre."""
    if isinstance(valor, dict):
        saida, mexeu = {}, False
        for k, v in valor.items():
            saida[k], m = _limpar(v, k)
            mexeu = mexeu or m
        return saida, mexeu
    if isinstance(valor, list):
        itens = [_limpar(v, chave) for v in valor]
        return [i for i, _ in itens], any(m for _, m in itens)
    if (
        isinstance(valor, str)
        and chave in FREE_TEXT_KEYS
        and detect_injection(valor).blocked
    ):
        return SANITIZED, True
    return valor, False


def faixa_do_cliente(state: Any) -> str | None:
    """Faixa de risco do cliente da sessão, por regra, memorizada no estado."""
    faixa = state.get("faixa_risco")
    if faixa:
        return faixa
    cid = state.get("customer_id")
    if not cid:
        return None
    from app.tools.vita import get_data_source

    try:
        perfil = get_data_source().get_perfil_risco(cid)
    except Exception:  # datasource sem perfil de risco (modo local): sem política
        return None
    faixa = (perfil or {}).get("faixa_risco")
    if faixa:
        state["faixa_risco"] = faixa
    return faixa


class SecurityPlugin(BasePlugin):
    def __init__(self) -> None:
        super().__init__(name="security")
        # Sob streaming, after_model roda por chunk. Acumulamos por invocação
        # para enxergar PII partida entre dois chunks.
        self._acumulado: dict[str, str] = {}
        # S7: o último pedido ao modelo, para regenerar UMA vez a saída reprovada.
        self._pedidos: dict[str, LlmRequest] = {}
        self._regeneracoes: dict[str, int] = {}

    async def before_model_callback(
        self, *, callback_context: CallbackContext, llm_request: LlmRequest
    ) -> LlmResponse | None:
        cfg = load_config()
        estado = callback_context.state
        conteudos = llm_request.contents or []
        self._pedidos[getattr(callback_context, "invocation_id", "sem-invocacao")] = (
            llm_request
        )

        # Mascaramento PRIMEIRO, no histórico inteiro. Além de idempotente, é o que
        # garante residência: o que atravessa a fronteira já vai sem CPF, cartão,
        # e-mail e telefone.
        for content in conteudos:
            for part in content.parts or []:
                if not part.text:
                    continue
                mascarado, achados = mask_pii(part.text)
                if achados:
                    part.text = mascarado
                    _audit_guard(
                        "pii_masked",
                        decisao="mascarado",
                        kinds=achados,
                        hash=hash_entrada(part.text),
                    )

        # Camada de entrada: só na mensagem NOVA. O histórico já foi vetado, e a
        # mensagem bloqueada continua persistida na sessão — varrer tudo a
        # redetectava a cada turno, recusando conversa legítima para sempre.
        for part in (conteudos[-1].parts if conteudos else None) or []:
            if not part.text:
                continue
            veredito = avaliar_entrada(part.text)
            part.text = veredito.texto  # normalizado: sem invisíveis, com teto
            motivo = veredito.categoria if veredito.decisao == "bloqueado" else None
            if motivo is None and cfg.use_model_armor:
                # Camada adicional, nunca substituta.
                from app.callbacks import model_armor

                armor = model_armor.scan_prompt(part.text)
                if armor.unavailable:
                    _audit_guard("model_armor_unavailable", decisao="indisponivel")
                elif armor.blocked:
                    motivo = "model_armor"
            if motivo:
                strikes = estado.get("guard_strikes", 0) + 1
                estado["guard_strikes"] = strikes
                _audit_guard(motivo, strikes=strikes, hash=veredito.hash)
                if strikes >= cfg.guard_strikes_to_human:
                    return _texto_resposta(TRANSFERENCIA)
                if motivo == "outro_cliente":
                    return _texto_resposta(RECUSA_OUTRO_CLIENTE)
                if motivo in ("tarefa_generica", "tema_fora", "ofensa"):
                    return _texto_resposta(RECUSA_ESCOPO)
                return _texto_resposta(RECUSA)
        return None

    async def before_tool_callback(
        self, *, tool: BaseTool, tool_args: dict[str, Any], tool_context: ToolContext
    ) -> dict[str, Any] | None:
        try:
            assert_tool_args_safe(tool.name, tool_args)
        except UnsafeToolArgs as erro:
            _audit_guard("unsafe_tool_args", camada="tool", tool=tool.name)
            return {"error": str(erro)}
        if tool.name in TOOLS_CREDITO and faixa_do_cliente(tool_context.state) == "V":
            _audit_guard("faixa_v_sem_credito", camada="tool", tool=tool.name)
            return {"error": RECUSA_FAIXA_V, "elegivel": False, "faixa_risco": "V"}
        return None

    async def after_tool_callback(
        self,
        *,
        tool: BaseTool,
        tool_args: dict[str, Any],
        tool_context: ToolContext,
        result: dict[str, Any],
    ) -> dict[str, Any] | None:
        """Injection indireta: neutraliza texto de terceiro vindo dos dados. E
        registra os números do payload: são os únicos que a resposta pode citar."""
        novos = numeros_do_payload(result)
        if novos:
            atuais = list(tool_context.state.get("numeros_tools") or [])
            juntos = list(dict.fromkeys(atuais + sorted(novos)))[
                -_MAX_NUMEROS_NO_ESTADO:
            ]
            tool_context.state["numeros_tools"] = juntos
        if tool.name == NORMAS_TOOL:
            # A resposta do orquestrador que usa o especialista tem de manter a fonte.
            from app.tools.normas import chaves_do_corpus, cita

            texto = (
                result
                if isinstance(result, str)
                else json.dumps(result, ensure_ascii=False)
            )
            citadas = [c for c in chaves_do_corpus() if cita(c, texto)]
            tool_context.state["citacao_pendente"] = citadas or None
        limpo, mexeu = _limpar(result)
        if mexeu:
            _audit_guard("indirect_injection", camada="tool", tool=tool.name)
            return limpo
        return None

    async def after_model_callback(
        self, *, callback_context: CallbackContext, llm_response: LlmResponse
    ) -> LlmResponse | None:
        cfg = load_config()
        suitability = callback_context.state.get("suitability", "moderado")
        inv = getattr(callback_context, "invocation_id", "sem-invocacao")
        partes = (llm_response.content.parts if llm_response.content else None) or []
        final = not getattr(llm_response, "partial", False)
        self._acumulado[inv] = self._acumulado.get(inv, "") + "".join(
            p.text for p in partes if p.text
        )

        # Cada chunk é checado isoladamente: o que couber inteiro num chunk é
        # mascarado ANTES de sair.
        for part in partes:
            if not part.text:
                continue
            texto, violacoes = check_output(part.text, suitability)
            if violacoes:
                _audit_guard("output_violation", camada="saida", kinds=violacoes)
                if final:
                    self._acumulado.pop(inv, None)
                if violacoes == ["pii_leak"]:
                    return _texto_resposta(texto)
                if violacoes == ["termo_proibido"] and final:
                    return await self._regenerar_ou_recusar(
                        callback_context, inv, "termo_proibido", RECUSA_SAIDA, None
                    )
                return _texto_resposta(
                    RECUSA_SAIDA if "termo_proibido" in violacoes else RECUSA
                )

        if final:
            completo = self._acumulado.pop(inv, "")
            # Número nunca vem do LLM: cifra em reais fora do payload das tools não sai.
            permitidos = set(callback_context.state.get("numeros_tools") or [])
            inventados = valores_fora_do_payload(completo, permitidos)
            if inventados:
                _audit_guard(
                    "numero_inventado", camada="saida", quantos=len(inventados)
                )
                return await self._regenerar_ou_recusar(
                    callback_context, inv, "numero_inventado", RECUSA_NUMERO, permitidos
                )
            # CA-19: resposta apoiada em norma sem a fonte não sai.
            pendentes = callback_context.state.get("citacao_pendente") or []
            if pendentes and completo.strip():
                from app.tools.normas import cita

                callback_context.state["citacao_pendente"] = None
                if not any(cita(c, completo) for c in pendentes):
                    _audit_guard(
                        "resposta_sem_citacao", camada="saida", fontes=len(pendentes)
                    )
                    return _texto_resposta(RECUSA_CITACAO)
            _, violacoes = check_output(completo, suitability)
            if violacoes:
                # Chegou aqui = a PII estava partida entre chunks, e os chunks
                # anteriores JÁ foram entregues. Não dá para desfazer; registra
                # para a trilha de auditoria. Mitigação real: desligar streaming.
                _audit_guard(
                    "split_pii_leak",
                    camada="saida",
                    decisao="registrado",
                    kinds=violacoes,
                )
            # Model Armor na SAÍDA: com os filtros de IA responsável no template,
            # olhar só o prompt deixaria o agente produzir o que o filtro barra.
            # Roda no texto completo, uma vez por invocação, não por chunk.
            if cfg.use_model_armor and completo:
                from app.callbacks import model_armor

                veredito = model_armor.scan_response(completo)
                if veredito.unavailable:
                    _audit_guard("model_armor_unavailable", where="response")
                elif veredito.blocked:
                    _audit_guard(
                        "model_armor_response", camada="saida", kinds=["rai_or_sdp"]
                    )
                    return _texto_resposta(RECUSA)
        return None

    async def _regenerar_ou_recusar(
        self,
        callback_context: CallbackContext,
        inv: str,
        motivo: str,
        recusa: str,
        permitidos: set[float] | None,
    ) -> LlmResponse:
        """CA-09: uma regeneração por resposta, pedindo ao mesmo modelo que reescreva
        sem o problema; se falhar de novo (ou não houver como), resposta segura."""
        cfg = load_config()
        pedido = self._pedidos.get(inv)
        feitas = self._regeneracoes.get(inv, 0)
        try:
            llm = callback_context._invocation_context.agent.canonical_model
        except Exception:  # contexto sem agente (testes unitários com dublê)
            llm = None
        if pedido is None or llm is None or feitas >= cfg.regeneracoes_max:
            self._regeneracoes.pop(inv, None)
            return _texto_resposta(recusa)
        self._regeneracoes[inv] = feitas + 1
        instrucao = {
            "numero_inventado": (
                "Reescreva a resposta anterior citando SOMENTE valores em reais que "
                "estejam no resultado das tools, copiados com centavos; se um valor "
                "não estiver lá, não o cite."
            ),
            "termo_proibido": (
                "Reescreva a resposta anterior sem as palavras 'garantido', "
                "'aprovado', 'sem risco' e sem linguagem de culpa."
            ),
        }[motivo]
        pedido.contents = [
            *(pedido.contents or []),
            types.Content(role="user", parts=[types.Part(text=instrucao)]),
        ]
        novo = ""
        try:
            async for resposta in llm.generate_content_async(pedido, stream=False):
                partes = (resposta.content.parts if resposta.content else None) or []
                novo = "".join(p.text for p in partes if p.text) or novo
        except Exception:
            novo = ""
        _audit_guard(motivo, camada="saida", decisao="regenerado")
        ok = bool(novo.strip())
        if ok and permitidos is not None:
            ok = not valores_fora_do_payload(novo, permitidos)
        if ok:
            suit = callback_context.state.get("suitability", "moderado")
            ok = not check_output(novo, suit)[1]
        self._regeneracoes.pop(inv, None)
        if not ok:
            _audit_guard(motivo, camada="saida", decisao="resposta_segura")
            return _texto_resposta(recusa)
        return _texto_resposta(novo)
