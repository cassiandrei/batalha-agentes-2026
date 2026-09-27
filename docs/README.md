# Mapa da documentação

| Pasta ou arquivo | O que tem |
| --- | --- |
| `produto/PRD.md` | o produto: problema, persona, tratamentos, guardrails, critérios de aceite, plano |
| `produto/fatias_verticais.md` | as fatias S1–S10, o que cada uma entregou |
| `produto/DADOS_EVENTO.md` | dados, regras e decisões, uma seção por fatia |
| `ARCHITECTURE.md` | o que está publicado (fonte do entregável 5) |
| `entregaveis/3. Racional de prototipação.md` | entregável 3: experiência, jornada, roteiro de diálogo, tom, elementos e limites do protótipo |
| `entregaveis/` | proposta de negócio em PDF (1), racional (3), desenho de solução em `.drawio` e `.svg` (4, gerados por `infra/scripts/desenho_solucao.py`) e documento explicativo (5); o protótipo (2) é o `vita-app` publicado |
| `SECURITY_LGPD.md`, `EXPERIMENTATION.md` | LGPD e estratégia de experimentação |
| `SATURDAY_CHECKLIST.md` | preparação e roteiro do dia da banca |
| `produto/avaliacao.md`, `redteam/` | números medidos: conversas sintéticas, contrafactual e red team |
| `banca/` | relatórios da banca simulada (skill `banca-batalha-agentes`) |
| `rai/` | system card, política de conteúdo e ciclo purple (IA Responsável) |
| `design/PRODUCT.md`, `design/DESIGN.md` | artefatos do impeccable do front (a skill os procura na raiz; copie para lá se for regenerar) |
| `design/DESIGN_SPEC.md` | jornadas, telas e estados do `vita-app` |
| `design/RACIONAL_PROTOTIPACAO.md` | racional de experiência do protótipo: conceito visual, decisões da jornada, acessibilidade e limites |
| board de prototipação | [Vita UI no Figma](https://www.figma.com/board/Q7AT7ixAWbHOCdK62QAQYq/Vita-UI---prototipa%C3%A7%C3%A3o?node-id=0-1&t=IWzzhY5ypC7wMkV8-1): processo de prototipação da interface |
| `diagrams/` | SVGs usados no PRD |
| `historico/` | blueprint do template, patches do protótipo, specs e planos antigos |

Regra: nenhum documento solto na raiz do repositório, exceto o `README.md` (porta de entrada: os cinco entregáveis obrigatórios e a URL pública do protótipo) e o `CLAUDE.md`.
