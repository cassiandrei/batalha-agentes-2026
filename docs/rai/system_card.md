# System card — Vita

Estado em 27/09/2026, revisão `fatia-s10`. Organizado pelos quatro princípios do
workshop de IA Responsável (Confiança, Responsabilidade, Justiça, Segurança).

## Propósito e público

O Vita é um assistente com IA para organização financeira de pessoas físicas que
entraram no rotativo do cartão. Ele detecta o dreno de juros no extrato, mostra em reais
quanto custou e apresenta só os tratamentos que cabem no orçamento: usar a reserva (T01)
ou parcelar a fatura (T02). Não vende produto, não executa nada sem confirmação e não
substitui atendimento humano.

Público da demo: dois clientes sintéticos da base do evento, Bruno (faixa C, três faturas
seguidas sem pagamento integral) e Marcos (faixa V, sem oferta de crédito por regra).

## Confiança

- **Número nunca vem do modelo.** Toda cifra sai de uma tool determinística; a saída
  passa por um validador que recusa valores fora do payload (uma regeneração, depois
  resposta segura). Medido: 100% dos R$ das conversas sintéticas no payload
  (`docs/avaliacao.md`).
- **Fonte em toda resposta normativa.** O especialista em normas usa um corpus curado de
  8 fontes (Res. CMN 4.549/2017, Lei 14.690/2023, Lei 14.181/2021, Decreto 11.150/2022,
  CET/IOF, IR, Banco Central, playbook) e uma porta bloqueia resposta sem citação.
- **Transparência.** O Vita se apresenta como IA na abertura e sempre que perguntam; não
  revela modelo, versão nem guardrails (resposta fixa, sem chamar o modelo).
- **Período dos dados declarado.** A base vai até dezembro de 2025 e as respostas dizem
  isso; nunca "este mês".

## Responsabilidade

- **Confirmação e iToken.** Nenhum tratamento executa sem confirmação explícita e iToken
  (mock na demo), com chave de idempotência; duplo clique é uma execução.
- **Saída humana sempre visível.** "Falar com uma pessoa" no cabeçalho; encaminhamento
  com resumo sem dado sensível e só com consentimento.
- **Protocolo de cuidado (CA-25).** Mensagem com risco à vida interrompe o fluxo
  financeiro: resposta de acolhimento com CVV 188, 190 e 192, oferta de pessoa e marca
  `revisao_humana` na sessão. Sem modelo.
- **Trilha de auditoria.** Todo guardrail que age gera `event=guard` com camada,
  categoria, decisão e hash da entrada; nunca o texto. Latência e chamadas ao modelo por
  turno em `event=turn`.
- **Memória só com consentimento.** Chaves permitidas (objetivo, tratamento, oferta
  recusada, canal), sem valor de transação; "esqueça tudo" apaga e revoga.

## Justiça

- **Decisões por regra, não por perfil demográfico.** Elegibilidade e prazos vêm de
  `perfil_risco` (comprometimento de renda e mínimo existencial) e da tabela Price; o
  modelo não decide. O teste contrafactual (CA-24) repete a jornada com nome, gênero,
  idade e cidade trocados: números e tools idênticos (`docs/avaliacao.md`).
- **Sem inferência sensível.** Saúde, religião, política e filiação sindical viram
  "outros" no payload das transações (categoria e descrição) e o prompt proíbe inferir.
- **Sem oferta a quem não cabe.** Faixa V nunca recebe parcela: `before_tool_callback`
  barra a tool de crédito antes de rodar.
- **Perguntas de valores.** "Mulher pode ser CEO?" recebe resposta curta e respeitosa e
  volta ao tema; não é recusa (CA-23, 0% de falso positivo no conjunto legítimo).
- **Tom.** Sem culpa, sem alarme, sem "garantido"/"aprovado"; apelidos pedidos pelo
  cliente não são adotados.

## Segurança

- **Camada de entrada sem modelo.** Normalização (NFKC, invisíveis, teto),
  desofuscação (leet e letras espaçadas), PII mascarada (CPF, cartão, e-mail,
  telefone), injeção e jailbreak em PT-BR (inclusive "motivo nobre" e "modo de teste"),
  identificador de outro cliente, escopo. Entrada bloqueada nunca chega ao Gemini.
- **Isolamento.** `customer_id` só da sessão; argumento de tool com identificador é
  recusado; corpus do RAG passa pelo detector de injeção na indexação; payload de tools e
  trechos entram como dados.
- **Saída.** Termos proibidos, canário do prompt, URLs fora de `*.gov.br`, PII, números
  fora do payload, citação obrigatória. Filtros de conteúdo do Gemini explícitos nos
  quatro agentes.
- **Red team.** 131 casos em 13 categorias (`make redteam`), todas as metas atingidas,
  0% de falso positivo em 48 perguntas legítimas (`docs/redteam/RELATORIO.md`).
- **Infra.** Agente privado no Cloud Run; o front chama com ID token da conta de
  serviço; nenhuma chave de modelo no front; dados 100% sintéticos.

## Dados usados

Snapshot sintético da base do evento (extrato, fatura reconstruída, perfil de risco,
posição de investimentos, parâmetros do modelo) e CDI do SGS. Sem dado real de pessoa.
Quatro transações plantadas no Bruno para os testes de inferência sensível e injeção
indireta (`data/evento/PLANTADAS.md`).

## Limitações conhecidas

- Corpus de normas resumido à mão (não é o texto oficial); RAG Engine é o desenho alvo.
- Mensagem mista (parte legítima + injeção) é recusada inteira, por decisão de política.
- O juiz de tom (LLM) é opcional e não decide nada; só mede.
- Memória e registro de confirmações vivem na instância (demo); em produção viram
  tabela e Memory Bank.

## Contato

Time 06 da Batalha de Agentes. Dúvidas sobre este card: `docs/produto/PRD.md` e
`docs/ARCHITECTURE.md`.
