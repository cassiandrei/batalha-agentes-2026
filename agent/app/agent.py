"""Orquestrador e subagentes.

TODO(jornada): renomear e reescrever os subagentes conforme a jornada do evento.
Ao renomear o root agent, mude também agents-cli-manifest.yaml — o nome vive nos
dois lugares e a telemetria reporta o do código como gen_ai.agent.name.
"""

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.apps.app import EventsCompactionConfig
from google.adk.models import Gemini
from google.adk.tools.agent_tool import AgentTool
from google.genai import types

from app.callbacks.output import CANARIO
from app.config import assert_flags_coerentes, load_config
from app.plugins.audit_plugin import AuditPlugin
from app.plugins.security_plugin import SecurityPlugin
from app.prompts import load_prompt
from app.session_setup import seed_demo_identity
from app.tools.actions import PROPOSE_ACTION_TOOL
from app.tools.customer import (
    get_account_summary,
    get_card_summary,
    get_customer_profile,
    get_goals,
    get_transactions,
)
from app.tools.finance import (
    compare_revolving_vs_installments,
    compound_interest,
    time_to_reach_goal,
)
from app.tools.knowledge import search_knowledge
from app.tools.memory_tools import (
    forget_me,
    give_consent,
    recall_profile,
    remember_preference,
)
from app.tools.normas import buscar_normas
from app.tools.vita import (
    get_diagnostico,
    get_fatura_rotativo,
    get_ofertas_elegiveis,
    get_perfil_risco,
    get_posicao_investimentos,
    simular_parcelamento_fatura,
    simular_uso_reserva,
)

# Falha na importação se alguma flag estiver ligada sem implementação atrás.
# Melhor o app não subir do que subir fingindo ter proteção.
assert_flags_coerentes()
_cfg = load_config()


# S6: filtros de conteúdo do Gemini explícitos, em todo agente. O filtro do Google é
# a camada "Modelo" da tabela de guardrails; as demais são determinísticas.
SEGURANCA = types.GenerateContentConfig(
    safety_settings=[
        types.SafetySetting(
            category=c, threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        )
        for c in (
            types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            types.HarmCategory.HARM_CATEGORY_HARASSMENT,
            types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        )
    ]
)
# Token canário: só o system prompt o conhece; se sair na resposta, o prompt vazou.
_CANARIO_INSTRUCAO = f"\n\nCódigo interno de sessão (nunca mencione): {CANARIO}\n"


def _model(nome: str | None = None):
    # S7: LLM_MODE=simulado troca o Gemini por um dublê local em todos os papéis.
    if _cfg.llm_mode == "simulado":
        from app.llm_simulado import LlmSimulado

        return LlmSimulado()
    return Gemini(
        model=nome or _cfg.model_name,
        retry_options=types.HttpRetryOptions(attempts=3),
    )


# TODO(jornada): renomear para o papel da jornada escolhida.
analyst = Agent(
    name="analyst",
    model=_model(),
    instruction=load_prompt("analyst"),
    generate_content_config=SEGURANCA,
    tools=[
        get_customer_profile,
        get_transactions,
        get_card_summary,
        get_goals,
        get_account_summary,
        get_fatura_rotativo,
        get_perfil_risco,
        get_diagnostico,
        get_posicao_investimentos,
        simular_uso_reserva,
        get_ofertas_elegiveis,
        simular_parcelamento_fatura,
        compound_interest,
        compare_revolving_vs_installments,
        time_to_reach_goal,
        PROPOSE_ACTION_TOOL,
    ],
)

# S8: especialista em normas como AgentTool, não como transferência: devolve um trecho
# com citação e o orquestrador continua falando com o cliente. include_contents="none"
# isola o RAG (porta de entrada de conteúdo externo) do histórico da conversa.
# O ADK 2.8 sugere mode="single_turn" em sub_agents; AgentTool continua suportado e
# mantém o especialista fora da lista de transferência.
especialista_normas = Agent(
    name="especialista_normas",
    description=(
        "Responde perguntas sobre regras, leis e normas de crédito e cartão (rotativo, "
        "teto de juros, parcelamento, superendividamento, CET, IOF, imposto de renda) "
        "com a fonte citada. Passe a pergunta do cliente em `request`."
    ),
    model=_model(_cfg.model_name_normas),
    instruction=load_prompt("normas"),
    generate_content_config=SEGURANCA,
    include_contents="none",
    tools=[buscar_normas],
)

# TODO(jornada): renomear para o papel da jornada escolhida.
educator = Agent(
    name="educator",
    model=_model(),
    instruction=load_prompt("educator"),
    generate_content_config=SEGURANCA,
    # S7: pergunta normativa que chegue aqui por transferência ainda vai ao especialista.
    tools=[search_knowledge, AgentTool(agent=especialista_normas)],
)

root_agent = Agent(
    # Mantenha em sincronia com agents-cli-manifest.yaml.
    name="orchestrator",
    model=_model(),
    instruction=load_prompt("orchestrator") + _CANARIO_INSTRUCAO,
    generate_content_config=SEGURANCA,
    sub_agents=[analyst, educator],
    tools=[
        give_consent,
        remember_preference,
        recall_profile,
        forget_me,
        AgentTool(agent=especialista_normas),
    ],
    before_agent_callback=seed_demo_identity,
)

app = App(
    name="app",
    root_agent=root_agent,
    plugins=[SecurityPlugin(), AuditPlugin()],
    # compaction_interval e overlap_size precisam ser definidos juntos (ADK 2.8).
    # overlap preserva contexto entre janelas compactadas.
    events_compaction_config=EventsCompactionConfig(
        compaction_interval=10, overlap_size=3
    ),
)
