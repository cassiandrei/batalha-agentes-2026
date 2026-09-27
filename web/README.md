# web/ — o front do Vita

Origem: protótipo do designer (`danmarcello/Vita`, commit `f7d9d34`), trazido para este
repositório na fatia S2b com as mudanças das fatias S1 e S2 aplicadas. A partir daqui o
código vive aqui; os patches em `docs/prototipo/` são históricos.

## O que mudou em relação ao protótipo

- **Nenhum número escrito nas telas do que já foi fatiado.** Fatura (S1) e abertura
  proativa (S2) vêm do agente.
- **O chat passa pelo agente ADK** (`POST /api/chat` → `POST ${AGENT_URL}/run`, na sessão
  pré-montada `abertura-<cliente>`). Saíram o Gemini direto, o system prompt da v1 e as
  respostas de fallback com números inventados. Nenhuma chave de modelo aqui.
- **Google Drive e Firebase removidos** (decisão do time no PRD): escopo total do Drive e
  chave web no repositório não cabem na entrega.
- Rótulo do assistente: "Vita · IA"; a apresentação como IA vem no texto do agente.

As fatias S3 a S7 ligaram o resto às tools: Visão Financeira e índice (S3), cards e
parcelamento pelo motor (S4), confirmação com iToken, consentimento e memória (S5),
cena do Marcos e markdown sem HTML (S6), acessibilidade e citação de normas (S7, S8).
Nenhum número da v1 sobrou.

## Rodar

```bash
cd web
npm install --legacy-peer-deps
AGENT_URL=https://fatia-s2---batalha-agentes-277ilp3dyq-uc.a.run.app \
DEMO_CUSTOMER_ID=36d74064-cc59-4ad2-9304-aeae46e660e4 \
npm run dev            # http://localhost:3000
npm run lint           # tsc --noEmit
```

## Publicar no Cloud Run (projeto do evento)

```bash
make deploy-web PROJECT_ID=batalha-time-06-1t82 AGENT_URL=https://<url do agente>
```

Sobe o serviço `vita-app` em `us-central1`, público, rodando como `squad-agent-sa`, com
`AGENT_URL` e `DEMO_CUSTOMER_ID` no ambiente. Build local (Docker Desktop aberto), como o
agente.

## Rotas do servidor

| Rota | Faz | Chama o modelo? |
|---|---|---|
| `GET /api/abertura` | push neutro + primeira mensagem + botões, da sessão pré-montada | não |
| `GET /api/financial-profile` | fatura de dezembro reconstruída, histórico, perfil de risco | não |
| `POST /api/chat` | conversa na sessão do cliente, pelo agente; devolve `citacoes` (fonte + link) quando a resposta veio do especialista em normas (S8) | sim (pelo agente, com guardrails) |

## Cena do Marcos (S6)

`?cliente=marcos` na URL troca o cliente da demo para o Marcos (faixa V): o id vem do ambiente (`DEMO_CUSTOMER_ID_MARCOS`), nunca da conversa. O botão Bruno/Marcos no cabeçalho recarrega a página com esse parâmetro. As mensagens do agente são renderizadas sem HTML (só negrito e parágrafos).

## Mundo visual (27/09, migração de UI)

O front segue a estrutura do repositório privado `Grazinascito/Vita-UI` (tela de bloqueio com push
rico, Top App Bar, balões, Raio-X e tratamentos dentro do chat, chips e composer em pílula, sheets
que sobem do rodapé, hero de confirmação, negociação assistida com estados), com o acento verde
próprio do Vita (`#0F7A5A`) no lugar de qualquer marca do Itaú (regra 3). Tokens em
`src/index.css` (`@theme`); primitivas em `src/components/ui.tsx`; o design system está
registrado em `DESIGN.md` (raiz) e `.impeccable/design.json`. Nenhuma funcionalidade do chat mudou:
todos os números continuam vindo de `/api/*`.
