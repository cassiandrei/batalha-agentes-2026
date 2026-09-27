# Documento explicativo da arquitetura: Vita

> Estado em 27/09/2026, 06h. Descreve o que está publicado no projeto do evento
> (`batalha-time-06-1t82`, `us-central1`), não o desenho ideal. Onde o ambiente do evento
> impôs um contorno, o texto diz qual e por quê. Este arquivo é a fonte do entregável 5;
> os diagramas estão em `docs/diagrams/` e no PRD (`docs/produto/PRD.md`).

---

## 1. Visão geral

O Vita é um assistente de bem-estar financeiro com IA que age antes de o cliente pedir
ajuda. Ele detecta o **dreno de juros do rotativo do cartão** no extrato, mostra em reais
quanto isso custou e oferece só os tratamentos que cabem no orçamento. A persona de demo é
o Bruno, cliente real da base do evento (`36d74064`): três faturas seguidas sem pagamento
integral, R$ 101,51 de juros em dezembro, R$ 725,07 no rotativo.

Três princípios sustentam a arquitetura, e há teste para cada um:

- **Nenhum número vem do modelo.** Toda cifra sai de uma tool determinística. O redator
  da abertura só recebe um payload já calculado, e sua resposta só chega ao cliente se
  passar num schema; se não passar, entra um texto calculado.
- **Os guardrails cobrem todos os agentes por construção**, como plugin do `App`, não por
  disciplina de quem cria um agente novo.
- **O modelo recebe o mínimo.** O identificador do cliente vive no estado da sessão e
  nunca é parâmetro de tool nem entra no prompt; as tools projetam só os campos
  necessários.

Dois serviços no Cloud Run: o **agente** (`batalha-agentes`, FastAPI + ADK 2.8) e o
**front** (`vita-app`, React servido por Express). O front não tem chave de modelo: tudo
que ele mostra ou responde passa pelo agente.

## 2. Componentes

| Componente | Tecnologia | Papel | Estado |
|---|---|---|---|
| API e runtime do agente | Cloud Run `batalha-agentes`, FastAPI, ADK 2.8, Gemini pelo Vertex AI | Recebe conversa e eventos, executa os agentes | Publicado, revisão `fatia-s2` |
| Front | Cloud Run `vita-app`, Vite/React + Express | Telas do cliente; proxy para o agente (`/api/abertura`, `/api/financial-profile`, `/api/chat`) | Publicado |
| Orquestrador | `LlmAgent` raiz | Conduz a conversa e roteia para `analyst` e `educator` | Implementado; prompt ainda genérico (S3) |
| Analista | `LlmAgent` com as tools de dados e cálculo | Situação financeira concreta, só via tools | Implementado, com as tools do Vita |
| Educador | `LlmAgent` + busca local em `data/knowledge` | Conceitos financeiros com fonte | Implementado; RAG Engine é caminho de produção |
| Especialista em normas | `LlmAgent` exposto como `AgentTool`, modelo próprio, BM25 local em `data/normas` | Regra, lei ou norma sempre com a fonte citada (CA-17 a CA-19) | Implementado (S8); RAG Engine é o alvo pela mesma interface |
| Camada de entrada | Funções puras em `callbacks/entrada.py`, aplicadas pelo `SecurityPlugin` | Normalização, PII mascarada, injeção, outro cliente e escopo, sem chamar o modelo; red team em `data/redteam` | Implementado (S6) |
| Modo de ensaio | `LLM_MODE=simulado` troca o modelo por um dublê local em todos os papéis | Ensaio e roteiro sem cota; regeneração única e `event=turn` nos plugins | Implementado (S7) |
| Pipeline de abertura | `SequentialAgent`: `DiagnosticoAgent` (sem LLM) → `redator` (`LlmAgent` com `output_schema`) | Gatilho → payload no estado → mensagem de abertura com ações do catálogo | Implementado (S2) |
| Tools | Python tipado: `get_fatura_rotativo`, `get_perfil_risco`, `get_diagnostico`, `get_posicao_investimentos`, `simular_uso_reserva` (T01), `get_ofertas_elegiveis` e `simular_parcelamento_fatura` (T02), transações, conta, cartão, três calculadoras, memória, `propose_action` | Dados, cálculo, memória e ação | Implementadas |
| Dados do cliente | Snapshot da `extrato_sintetico` (1.000 clientes, 467 mil linhas) e das tabelas do time em `vita_sintetico`, embarcado na imagem | Fonte de toda tool de dados | Implementado; BigQuery ao vivo é opção com a `squad-agent-sa` |
| Prompts | Arquivos em `app/prompts/v1/` (`orchestrator`, `analyst`, `educator`, `redator`), selecionados por `PROMPT_VERSION` | Experimento sem mudar código | Implementado |
| Guardrails | `SecurityPlugin` (PII, injection direta e indireta, autorização de tools, checagem de saída) | Cobre orquestrador, subagentes e redator | Implementado; Model Armor **indisponível** no projeto do evento |
| Índice e T01 | `agent/app/indice.py` (4 pilares × 25, sobre a `vw_bioimpedancia`) e `simular_uso_reserva` (CDI do SGS série 4389, IR na alíquota mais alta, `simulacao_id` com validade) | Visão financeira e recomendação principal, por regra | Implementado (S3) |
| Motor de decisão | `agent/app/motor.py`: política por faixa (`perfil_risco` + `catalogo_ofertas`, faixa V sem oferta), regra de atenção, tabela Price, ordenação pelo custo mensal | Decide quais tratamentos o cliente vê e qual é o principal; o LLM só explica | Implementado (S4) |
| Confirmação e memória | `agent/app/confirmacoes.py` (idempotência, iToken mock, evento `tratamento_confirmado`); `memory/politica.py` e SQLite com consentimento no estado da sessão; `/handoff` com resumo sem dado sensível | Nada muda sem "sim" e iToken; o cliente vê e apaga o que é lembrado; sempre há uma pessoa | Implementado (S5) |
| Auditoria | `AuditPlugin` → Cloud Logging, JSON sem conteúdo | Rastreabilidade sem PII | Implementado |
| Eventos proativos | `POST /events`; tipo `dreno_rotativo` dispara o pipeline de abertura | Agente age no momento certo | Implementado; Pub/Sub é caminho de produção |
| Sessão | ADK em memória + semente (`seed_sessions.json`) carregada no boot | Abertura pré-montada sobrevive a reinício | Implementado; Agent Engine Sessions é o próximo passo (engine já criado) |
| Memória de longo prazo | SQLite com consentimento, TTL e exclusão, exposta como tools | Preferências do cliente | Implementado; Memory Bank é caminho de produção |
| Identidade de execução | `squad-agent-sa` (Vertex, BigQuery, Secret Manager) | Sem chave de modelo em lugar nenhum | Em uso nas revisões `fatia-s2` e `vita-app` |

## 3. Fluxo da abertura proativa (o momento de atuação)

1. Uma rotina sobre a `vw_fatura_mensal` seleciona quem completou três faturas seguidas
   sem pagamento integral terminando no mês de referência (245 dos 1.000 clientes). Para
   cada um, `POST /events` recebe `dreno_rotativo` com o identificador do cliente, que vai
   para o **estado** da sessão `abertura-<cliente>`.
2. `DiagnosticoAgent` lê as tools (fatura reconstruída, perfil de risco, bioimpedância) e
   grava o payload no estado. Sem LLM.
3. `redator` recebe só esse payload pela instrução, sem histórico e sem tools, e devolve
   JSON no schema `{texto, acoes}`. O ADK valida o `output_schema`; o agente valida de novo
   as ações contra o catálogo e a validade das simulações.
4. Se qualquer validação falhar, ou o modelo estiver indisponível, a abertura vira um texto
   calculado a partir do payload, com as três ações padrão. O cliente nunca vê erro nem
   texto fora do contrato.
5. A abertura fica no estado e no histórico da sessão. O push é uma constante neutra:
   "O Vita tem uma análise nova para você".
6. `GET /customers/{id}/opening` entrega a abertura ao front sem chamar o modelo. Uma
   semente gerada uma vez (`make seed-abertura`) recria a sessão a cada boot.

## 4. Fluxo de uma conversa

1. O front envia a mensagem para `POST /run` do agente na sessão pré-montada. Na demo, a
   identidade vem de `DEMO_CUSTOMER_ID`; em produção, do canal autenticado.
2. `SecurityPlugin.before_model` detecta injection na mensagem nova e mascara PII em todo
   o histórico.
3. O orquestrador roteia; o analista chama tools, que leem a identidade do estado e
   devolvem campos projetados. Texto de terceiros vindo dos dados passa pela detecção de
   injection indireta em `after_tool`.
4. Ação financeira exige confirmação explícita (`require_confirmation`).
5. `after_model` verifica PII, suitability e transparência; `AuditPlugin` registra
   metadados. O front extrai o texto dos eventos e mostra.

## 5. Decisões técnicas e alternativas descartadas

| Decisão | Por quê | Alternativa descartada |
|---|---|---|
| D1. Guardrails como plugin do `App`, com lógica em funções puras | Cobrem qualquer agente presente ou futuro, inclusive o redator criado hoje; funções puras testam sem subir agente | Callback por agente |
| D2. Identidade nunca é parâmetro de tool | Se fosse, o modelo a preencheria a partir do texto: "me mostre o extrato do cliente 42". `before_tool` rejeita identificadores nos argumentos, inclusive aninhados | Validar depois, com o id já no prompt |
| D3. Três calculadoras separadas | O modelo escolhe tool pela docstring; uma função com modos roteia pior | Uma calculadora com parâmetro `mode` |
| D4. Fonte de dados atrás de `Protocol` + fábrica | `local`, `evento` (snapshot) e `bigquery` trocam por variável; as tools não mudam | Stub que finge funcionar |
| D5. Região do serviço separada da do modelo | No evento coincidem (`us-central1`), mas a separação permite declarar onde o dado transita | Derivar uma da outra |
| D6. Memória exposta como tools | Consentimento, TTL e exclusão são regras de negócio demonstráveis na conversa | Só o memory service do runner |
| D7. Identidade só em demo; consentimento nunca pré-preenchido | A demo mostra recusa antes e gravação depois | Pré-preencher |
| D8. Minimização na camada de tools (`projections.py`) | O maior caminho de PII até o modelo é o resultado da tool | Mascarar só a entrada |
| D9. Injection detectada também nos dados | Descrição de Pix é texto de terceiro que entra pela tool | Proteger só a mensagem |
| **D10. Diagnóstico sem LLM, redator com schema** | O que decide (elegibilidade, números) é código; o modelo só redige, a partir de um payload fechado, e dentro de um contrato validado duas vezes | Um agente com tools escrevendo a abertura livremente |
| **D11. Fallback calculado, nunca erro nem texto solto** | Cota, rede ou modelo fora do contrato não podem virar tela em branco na demo nem texto inventado para o cliente | Regenerar até passar ou mostrar o erro |
| **D12. Abertura pré-montada e semeada** | A primeira mensagem aparece sem chamada ao modelo e sobrevive a reinício da instância; a demo não depende de cota | Gerar a abertura ao abrir o chat |
| **D13. Front sem chave de modelo** | O protótipo chamava o Gemini direto, com números no prompt e sem guardrail: dois cérebros. Agora todo texto e número passam pelo agente | Manter o chat do protótipo e sincronizar prompts |
| **D15. Validador de números na saída** | O `SecurityPlugin` guarda todo número devolvido pelas tools na sessão e bloqueia qualquer "R$ X" da resposta que não esteja nesse conjunto (guard `numero_inventado`). É o invariante "número nunca vem do LLM" verificado no texto final, não só na origem | Confiar no prompt |
| **D14. Snapshot embarcado em vez de BigQuery ao vivo** | Determinístico, sem custo por turno e sem dependência de rede na demo; a fábrica liga o BigQuery com uma variável | Consultar o BigQuery a cada tool |

## 6. Contexto e memória

**Curto prazo.** Estado da sessão do ADK: `customer_id`, `trigger`, `abertura_payload`,
`abertura`, `suitability`, contador de guardrails. Compactação de eventos
(`compaction_interval=10`, `overlap_size=3`). No projeto do evento a sessão vive na
instância (uma só), recriada da semente no boot; o Agent Engine `6089108039007207424`
já existe e a `squad-agent-sa` tem permissão nele, então trocar para sessão gerenciada é
`MEMORY_BACKEND=agent_engine` no deploy.

**Longo prazo.** `MemoryStore` com `created_at`, `expires_at`, `consent_given_at`. Sem
consentimento não grava; TTL aplicado na leitura; "esqueça tudo" apaga e revoga.

**Contexto de dados.** A base do evento tem 467.585 transações de 1.000 clientes em 2025,
sem PII (descrições padronizadas, id pseudonimizado). Dela derivam, por regra e sem LLM:
modo de pagamento da fatura (integral, parcial, mínimo, no fim do `descr`), fatura
reconstruída em mês de mínimo (pago ÷ 0,15), saldo no rotativo (juros ÷ 0,14), perfil de
risco (faixas A, B, C, V com motivo) e bioimpedância anual. Tudo em
`docs/produto/DADOS_EVENTO.md`.

## 7. Segurança

| Ameaça | Mitigação | Como está provado |
|---|---|---|
| Prompt injection direta | Heurística na mensagem nova; Model Armor como segunda camada quando disponível | Testes de detecção e de sessão que sobrevive à tentativa; smoke |
| Injection indireta pelos dados | Detecção em `after_tool` | Teste com Pix malicioso nos dados sintéticos |
| Acesso a dado de outro cliente | Identidade só no estado; guarda nos argumentos; endpoint do front usa o id do ambiente | Teste que inspeciona a declaração real das tools; teste do payload sem id |
| Número inventado pelo modelo | Tools determinísticas; redator com `output_schema`; validador de ações; validador de números na saída (S3); fallback calculado | Testes do schema, do fallback e do validador (bloqueia "R$ 1.200,00" fora do payload); smoke confere os números na URL |
| Vazamento de PII | Mascaramento na entrada (CPF com dígito verificador, Luhn, e-mail, telefone), projeções, checagem de saída | Testes de mascaramento e projeção |
| Ação indevida | `require_confirmation` nas tools; `/confirmations` com iToken e chave de idempotência (S5) | Teste de que a tool não executa sem confirmação; CA-14 com duplo clique e iToken inválido |
| Oferta a cliente vulnerável | Faixa V no `perfil_risco`; catálogo sem linha para V; `get_ofertas_elegiveis` e `simular_parcelamento_fatura` recusam por regra | Gerador com assert; teste CA-05 com o Marcos; smoke S4 |
| Chave de modelo exposta | Nenhuma: tudo roda pela `squad-agent-sa` | Teste do deploy que falha se `GEMINI_API_KEY` aparecer |

Números: 310 testes automatizados sem credencial; smokes por fatia contra o serviço vivo
(S1 5/5, S2 7/7, S2b 6/6, S3 7/7, S4 7/7, S5 8/8).

## 8. LGPD

- **Base legal.** Execução de contrato para o atendimento (art. 7º, V); consentimento para
  a memória de longo prazo (art. 7º, I).
- **Minimização.** Tools devolvem só campos projetados; o id nunca chega ao modelo; a base
  do evento não tem nome, CPF nem texto livre de pessoa.
- **Retenção.** Memória com TTL; logs sem conteúdo.
- **Direitos do titular.** Acesso e exclusão pela conversa e por botão ("O que você lembra?",
  "Esqueça tudo", sem modelo); "Falar com uma pessoa" sempre disponível, com resumo só
  mediante consentimento.
- **Transferência internacional.** Serviço, modelo e dados em `us-central1`, como o ambiente
  do evento. Em produção, sessão e memória iriam para `southamerica-east1` e só a
  inferência sairia, separação que a D5 permite.
- **Dados.** Base sintética dos organizadores e tabelas sintéticas do time, com coluna
  `origem` em tudo que foi gerado.

## 9. Experimentação

Prompts em arquivo por versão e modelo por variável: um experimento é uma variável de
ambiente. Cada fatia publica uma revisão com tag e 0% de tráfego (`fatia-s1`, `fatia-s2`),
roda o smoke na URL da tag e só então promove; o rollback é de tráfego, em segundos. A
avaliação offline roda no harness do `agents-cli` (14 casos). Métrica principal proposta no
PRD: juros de rotativo evitados por cliente elegível; proteção: nenhuma oferta a faixa V,
zero número fora do payload.

## 10. Ciência de dados

Sem modelo estatístico no gatilho, de propósito: a regra "três faturas seguidas sem
integral" é explicável, auditável e cobre 245 clientes. As features vêm de SQL sobre a
base (`vw_fatura_mensal`, `vw_bioimpedancia`, `perfil_risco`) e as constantes do rotativo
foram **inferidas da própria base** (razão juros/mínimo constante em 0,793 ⇒ mínimo de 15%
e taxa de 14% a.m.), documentadas com a evidência em `docs/produto/DADOS_EVENTO.md`.

## 11. Observabilidade

Log JSON por interação (`conversation_id`, `prompt_version`, modelo, latência, tokens,
guardrail acionado), nunca conteúdo. `jsonPayload.event="guard"` no Cloud Logging mostra
cada bloqueio. O `SecurityPlugin` emite a própria linha de auditoria quando age, porque o
`PluginManager` interrompe a cadeia no primeiro plugin que responde.

## 12. Custo e escala

Cloud Run com `min-instances=0`; modelo da linha Flash. A abertura não gasta inferência
(semente); o perfil financeiro não gasta; só o chat gasta. O snapshot completo carrega em
4,4 s e 0,44 GB, dentro dos 2 GiB da instância.

## 13. Limitações conhecidas

- Sessão na instância, com uma instância: o backend gerenciado existe e liga por variável,
  mas ainda não foi validado no projeto do evento.
- Model Armor negado no projeto do evento; roda o guard heurístico.
- Streaming desligado; PII partida entre trechos escaparia da checagem.
- O orquestrador ainda responde em texto livre no chat; o schema de ações vale hoje para a
  abertura. Estender ao chat é a fatia de confirmação.
- Registro de confirmações e SQLite vivem na instância (uma só); em produção, tabela com
  chave de idempotência e Memory Bank.
- Três recursos do ADK 2.8 em uso são experimentais: confirmação de ação, compactação de
  eventos e declaração de função por JSON Schema. Estão cobertos por testes.

## 14. Caminho para produção

1. Canal autenticado do banco criando a sessão com identidade validada.
2. Agent Engine Sessions e Memory Bank no lugar da sessão na instância e do SQLite.
3. BigQuery ao vivo pela `squad-agent-sa` (`DATA_SOURCE=bigquery`).
4. Model Armor como segunda camada; RAG Engine para o educador e para o especialista em normas.
5. Pub/Sub autenticado por OIDC no `/events`, com a rotina do gatilho agendada.
6. Piloto A/B por hash do cliente, com os critérios de promoção do PRD.
