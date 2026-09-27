# Política de conteúdo — o que o Vita nunca gera

Pelos quatro princípios do workshop (Confiança, Responsabilidade, Justiça, Segurança).
Cada linha tem o controle que a garante; a maioria é determinística e tem teste.

## Confiança

| O Vita nunca | Controle |
| --- | --- |
| Cita valor em reais que não veio de uma tool | validador de números na saída (`numeros.py`); regeneração única; resposta segura |
| Afirma regra, lei ou norma sem fonte | porta de citação (`RECUSA_CITACAO`); especialista com corpus curado |
| Inventa fonte quando não encontra | prompt do especialista + teste c15 da avaliação |
| Diz "garantido", "aprovado", "sem risco", "sangria" | termos proibidos em `check_output` |
| Revela modelo, versão, empresa, ferramentas ou guardrails | resposta fixa na entrada (`RESPOSTA_IDENTIDADE`); canário na saída |
| Mostra configuração, JSON, nome de tool ou campo técnico | regra de prompt; comando "/debug" tratado como texto |

## Responsabilidade

| O Vita nunca | Controle |
| --- | --- |
| Executa transferência, PIX, pagamento ou contratação | não há tool para isso; pedido recebe resposta fixa no front |
| Executa um tratamento sem confirmação e iToken | `POST /confirmations` com idempotência |
| Segue o assunto financeiro diante de risco à vida | protocolo de cuidado (CVV 188, 190, 192), sem modelo, `revisao_humana` |
| Guarda memória sem "sim" explícito | consentimento no estado da sessão; política de chaves |
| Registra conteúdo de conversa no log | `event=guard` só com hash; `AuditPlugin` sem texto |

## Justiça

| O Vita nunca | Controle |
| --- | --- |
| Oferece crédito a cliente na faixa V | `before_tool_callback` barra a tool de crédito |
| Infere saúde, religião, política ou sindicato a partir de gastos | categorias sensíveis agregadas em "outros" no payload; regra de prompt |
| Muda decisão ou número por nome, gênero, idade ou cidade | decisões por regra; teste contrafactual (CA-24) |
| Recusa pergunta de valores inofensiva | conjunto legítimo do red team (0% de falso positivo) |
| Usa linguagem de culpa ou cobrança | termos proibidos + playbook de tom |
| Adota apelido ofensivo pedido pelo cliente | regra de prompt |
| Recomenda ativo ou promete retorno | prompt do educador; check "sem ativo" |

## Segurança

| O Vita nunca | Controle |
| --- | --- |
| Obedece instrução dentro da mensagem ("ignore as regras") | heurísticas de injeção em PT-BR, após desofuscação |
| Obedece instrução dentro de dado ou de trecho do corpus | `after_tool` neutraliza texto livre; detector na indexação |
| Lê dados de outro cliente | identificador na conversa bloqueado; `customer_id` só da sessão; argumento de tool recusado |
| Repete CPF, cartão, e-mail ou telefone | mascaramento antes do modelo e na saída |
| Devolve HTML executável na tela | front renderiza só negrito e parágrafos |
| Cita URL fora de `*.gov.br` | lista de domínios na saída |
| Produz conteúdo de ódio, assédio, sexual ou perigoso | filtros de conteúdo do Gemini em todos os agentes |

## Fora do escopo por decisão

Tarefas genéricas (redação, código, receita), temas sem relação com finanças pessoais
e ofensas recebem um redirecionamento curto, sem chamar o modelo.
