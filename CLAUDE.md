# Convenções do projeto

> Contexto para uma sessão nova de agente de código. Leia antes de alterar qualquer coisa.
> As convenções do scaffold do `agents-cli` ficam em `agent/CLAUDE.md` e continuam valendo.

---

## O que é este repositório

O **Vita**, agente de bem-estar financeiro em **ADK 2.8** sobre **GCP** para a Batalha de
Agentes (26–27/09/2026). Nasceu de um template genérico (histórico em
`docs/produto/BLUEPRINT.md` e `HANDOFF.md`) e foi construído em fatias verticais S1–S8
sobre a jornada do rotativo do cartão (persona Bruno; cena do Marcos na faixa V).

Leitura na primeira vez, nesta ordem: `docs/produto/PRD.md` (o produto),
`docs/produto/fatias_verticais.md` (o que cada fatia entregou), `docs/produto/DADOS_EVENTO.md`
(dados, regras e decisões, uma seção por fatia) e `docs/ARCHITECTURE.md` (o que está
publicado). `docs/SATURDAY_CHECKLIST.md` tem o roteiro do dia da banca.

---

## Regras que não podem ser quebradas

1. **A jornada é a do PRD (rotativo do cartão).** O que é específico dela vive em
   `app/tools/vita.py`, `abertura.py`, `indice.py`, `motor.py`, `confirmacoes.py`,
   `financial_profile.py`, `tools/normas.py` e nos prompts; guardas, plugins, memória e
   datasources continuam genéricos. Os marcadores `TODO(jornada)` nos prompts ficam: há
   teste que os procura.
2. **Somente dados sintéticos.** Identificadores com prefixo `FICT-`. Nenhum dado real de
   pessoa, em nenhuma circunstância.
3. **Nenhuma marca, logo ou identidade visual do Itaú** em código, assets, prompts ou UI.
4. **Nenhum segredo commitado.** `.env` é ignorado; `.env.example` é versionado sem valores.
5. **Tudo parametrizado** por `PROJECT_ID` e `REGION`.
6. **Não confie na memória sobre as APIs do ADK.** Ele muda rápido. Verifique na versão
   instalada (`agent/.venv`) antes de escrever código. Se algo não existir como esperado,
   diga em vez de inventar.
7. **No projeto do evento (`batalha-time-06-1t82`), NÃO tente de novo o que já foi negado.**
   A organização avisou: insistir em módulo negado **desclassifica o time**. Já negados em
   26/09: Cloud Build (`builds submit`), qualquer alteração de IAM (projeto ou recurso),
   criar SA ou repositório, Model Armor (criar template ou chamar `sanitize`), aumento de
   cota da chave. **Liberado na noite de 26/09:** a SA `squad-agent-sa@…` ganhou
   `aiplatform.user` (Vertex e Agent Engine), BigQuery e Secret Manager — é a `RUNTIME_SA`
   do deploy; a chave do AI Studio (`MODEL_KEY_SECRET`) não é mais necessária. Nada de
   contornar por outro projeto. Detalhe e contorno de cada um: `docs/SATURDAY_CHECKLIST.md`,
   Bloco 2.5. Se algo novo for negado, acrescente aqui na hora.
   **Exceção dada pela organização (26/09, noite):** a SA `squad-agent-sa@…` tem
   `aiplatform.user`, BigQuery e Secret Manager. Usá-la como `RUNTIME_SA` é o caminho
   oficial, não reincidência. Model Armor e IAM continuam negados. **Nunca baixe nem
   commite a chave JSON dela** — Cloud Run usa `--service-account`.
8. **Projeto pessoal e projeto do evento não se misturam.** Nada de papel cruzado, recurso
   compartilhado (template, engine, dataset, bucket, chave) ou credencial de uma conta usada
   contra o projeto da outra. Confira `gcloud config list` antes de qualquer comando.

---

## Invariantes de desenho

Quebrar qualquer um destes invalida o argumento técnico do projeto. Há teste para todos.

| Invariante | Onde vive |
|---|---|
| **Número nunca vem do LLM.** Toda cifra vem de tool determinística | `app/tools/finance.py`, `app/tools/customer.py` |
| **`customer_id` nunca é parâmetro de tool.** Vem de `tool_context.state` | `app/tools/customer.py` |
| **Tool nunca devolve CPF ou nome completo.** Projeção num ponto só | `app/datasources/projections.py` |
| **Guardrail é transversal.** Plugin no `App`, não callback por agente | `app/plugins/security_plugin.py` |
| **Consentimento é porta.** Sem ele, não grava | `app/memory/local.py` |
| **Ação financeira exige confirmação** | `app/tools/actions.py` |
| **Log nunca tem conteúdo de conversa** | `app/plugins/audit_plugin.py` |
| **Entrada bloqueada não chama o modelo; log `guard` só com hash** | `app/callbacks/entrada.py`, `app/plugins/security_plugin.py` |
| **Resposta sobre norma sempre cita a fonte** | `app/tools/normas.py`, porta em `app/plugins/security_plugin.py` |

---

## Estrutura

```
agent/app/
  agent.py             orquestrador + analyst/educator + especialista_normas (AgentTool) + App(plugins)
  fast_api_app.py      /events e /customers/{id}/{opening,financial-profile,confirmations,memory,handoff}
  config.py            ÚNICO ponto de leitura de env
  abertura.py          pipeline proativo (diagnóstico → redator) e semente da sessão (S2)
  financial_profile.py perfil que o front consome, montado só a partir das tools (S1–S4)
  indice.py, motor.py  índice de organização financeira (S3) e motor de decisão (S4)
  confirmacoes.py      confirmação idempotente com iToken mock (S5)
  llm_simulado.py      LLM_MODE=simulado (S7)
  session_setup.py     semeadura de identidade em modo demo
  prompts/v1/          prompts versionados, escolhidos por PROMPT_VERSION
  tools/               vita.py (fatura, risco, T01, T02, ofertas), normas.py (BM25), finance, customer, memory
  callbacks/           funções puras de guarda, SEM dependência de ADK (entrada, injection, pii, output, numeros, authz)
  plugins/             security (todas as camadas) e audit (guard, turn, seed, model_call)
  datasources/         Protocol + local + evento (snapshot) + projeções
  memory/              Protocol + SQLite + política do que pode ser lembrado
data/
  evento/              snapshot da base do evento, CDI e seed_sessions (make stage-evento, make cdi, make seed-abertura)
  seeds/               memória semeada do Bruno
  generator/           gerador sintético, seed fixa
  knowledge/           textos de educação financeira
  normas/              corpus do especialista em normas (uma fonte por arquivo)
  redteam/             casos do red team (make redteam, sem modelo)
web/                   front React/Vite + Express publicado como vita-app; só proxy, nenhum número escrito
infra/scripts/         deploy, deploy_web, smoke, smoke_fatia, roteiro_e2e, redteam, seed_abertura, fetch_cdi
docs/produto/          PRD, fatias verticais, DADOS_EVENTO (uma seção por fatia), blueprint histórico
docs/                  arquitetura (entregável 5), drawio (entregável 4), LGPD, experimentação, checklist, redteam
```

---

## Comandos

| Comando | O que faz |
|---|---|
| `make setup` | venv 3.12 + dependências + `.env` |
| `make data` | gera os dados sintéticos |
| `make test` | 361 testes, **sem credencial nenhuma** |
| `make test-llm` | inclui os que chamam o modelo |
| `make lint` | ruff check + format |
| `make run` | playground local |
| `make switch-project PROJECT_ID=x [REGION=y] [MODE=vertex\|local]` | troca projeto, região e modo |
| `make stage-evento PROJECT_ID=x` | exporta o snapshot da base do evento para `data/evento/` |
| `make cdi` | busca o CDI no SGS do Banco Central (parâmetro com origem) |
| `make deploy PROJECT_ID=x [TAG=fatia-sN] [MIN_INSTANCES=1] [DRY_RUN=1]` | deploy no Cloud Run; com `TAG`, revisão sem tráfego |
| `make deploy-web PROJECT_ID=x AGENT_URL=y` | publica o front como `vita-app` |
| `make smoke BASE_URL=x [TOKEN=y]` | verificações de arquitetura contra o agente vivo |
| `make smoke-fatia FATIA=sN BASE_URL=x` | smoke de uma fatia (s1–s8), quase sempre sem modelo |
| `make seed-abertura BASE_URL=x CUSTOMER_ID=y` | gera a semente da abertura proativa a partir do agente vivo |
| `make roteiro BASE_URL=x [SEM_CHAT=1]` | roteiro ponta a ponta da demo (Bruno + Marcos) com latência por passo |
| `make redteam` | red team sobre as camadas determinísticas, sem modelo; grava `docs/redteam/RELATORIO.md` |
| `make teardown PROJECT_ID=x [DRY_RUN=1]` | apaga o que o deploy criou |

---

## Estilo

- **Código e identificadores em inglês; comentários, docstrings e documentação em
  português.** Os prompts também são em português — é a língua do cliente.
- Python tipado, formatado com Ruff (`line-length = 88`).
- Funções pequenas, arquivos de responsabilidade única.
- **Docstring de tool é interface, não decoração.** O modelo escolhe tool lendo docstring.
  Descreva o que ela faz, os argumentos e o que devolve, em linguagem direta.
- Comentário explica **por que**, não o que. Se explicar o que, apague.

---

## Ao escrever uma tool nova

1. Não receba `customer_id`. Leia de `tool_context.state`.
2. Não devolva PII. Projete os campos em `datasources/projections.py`.
3. Docstring clara, com `Args:` e `Returns:`.
4. Registre no subagente certo em `app/agent.py`. **Os guardrails são herdados
   automaticamente** — não plugue nada.
5. Se mudar algo, use `FunctionTool(..., require_confirmation=True)`.

---

## Ao escrever um teste

**Use os objetos reais do ADK como dublê, não `dict`.** O `State` do ADK não tem `pop()`
nem `__delitem__`; um `dict` tem. Essa divergência já deixou um bug chegar à produção que
a suíte inteira não pegou.

```python
from google.adk.sessions.state import State
ctx = SimpleNamespace(state=State(value={"customer_id": "FICT-0001"}, delta={}))
```

Teste que precisa de modelo leva `pytest.mark.llm` — `make test` os exclui, e o critério de
"funciona sem credencial" depende disso.

---

## Armadilhas conhecidas

| Sintoma | Causa |
|---|---|
| Modelo dá 404 | `GOOGLE_CLOUD_LOCATION`, não o nome do modelo. Deixe `global` |
| 429 `generate_content_free_tier_requests` | Está no AI Studio, não no Vertex — ou o projeto dono da chave não tem billing |
| `storage.objects.get denied` em `run-sources-*` | SA padrão do Compute sem papel de build. O `deploy.sh` concede |
| `ALREADY_EXISTS` no deploy | Dois deploys simultâneos |
| Teste lê CSV e falha | `conftest.py` gera em `tmp`; rode `make data` se persistir |
| Porta 8000 ocupada nos testes e2e | Eles escolhem porta livre; `E2E_PORT` força |
| Quer ensaiar sem gastar cota | `LLM_MODE=simulado` (todos os papéis respondem um texto fixo) |

**`REGION` e `GOOGLE_CLOUD_LOCATION` são variáveis diferentes.** A primeira é onde o Cloud
Run roda; a segunda é onde o modelo roda. Nunca derive uma da outra.

---

## Três features experimentais do ADK 2.8 em uso

`require_confirmation`, `EventsCompactionConfig` e `JSON_SCHEMA_FOR_FUNC_DECL`. Funcionam e
têm teste, mas podem mudar sem aviso. A mais sensível é a confirmação de ação.

---

## O que não existe

Leitura **ao vivo** no BigQuery (o agente lê o snapshot exportado por `make stage-evento`),
RAG Engine (a busca de normas é BM25 local pela mesma interface), Model Armor (negado no
projeto do evento), `/events` por Pub/Sub (o endpoint existe e é chamado por HTTP),
avaliação offline com conversas sintéticas (S10, não feita), vídeo de backup (tarefa
manual). As costuras (`Protocol` + fábrica + flags) estão prontas para recebê-los.
