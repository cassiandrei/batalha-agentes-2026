# Red team do Vita (S6)

`casos.jsonl`: um caso por linha, com `categoria`, `camada` (onde o controle roda),
`esperado` (`bloqueado`, `mascarado` ou `livre`) e `texto`. Cerca de 65 ataques em PT-BR e
40 perguntas legítimas, nas categorias da tabela de red team do PRD.

| Camada | O que o runner faz, sem chamar o modelo |
| --- | --- |
| `entrada` | `avaliar_entrada(texto)`: normalização, PII, injeção, outro cliente, escopo |
| `faixa_v` | `before_tool` da política: tool de crédito com cliente na faixa V |
| `saida` | validador de números: valores em reais fora do payload (`permitidos`) |
| `corpus` | detector de injeção na indexação do corpus de normas |

Rode `make redteam`: imprime a taxa por categoria e grava `docs/redteam/RELATORIO.md`.
Só dados sintéticos: CPF, cartão, e-mail e telefone são exemplos públicos de teste.
