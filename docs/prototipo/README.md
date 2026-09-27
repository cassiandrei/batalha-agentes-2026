# Patches para o protótipo — HISTÓRICO

**Desde a fatia S2b o front vive em `web/` neste repositório.** Os patches abaixo foram a
ponte enquanto o código estava só em `danmarcello/Vita`; não precisam mais ser aplicados.
Edite `web/` diretamente e publique com `make deploy-web`.


O protótipo vive em outro repositório. Cada fatia deixa aqui o diff que liga as telas
ao agente, para o dono do protótipo aplicar:

```bash
cd Vita && git apply caminho/para/s1_front.patch
```

## S1 — `s1_front.patch` (sobre o commit `f7d9d34`)

- `server.ts`: `GET /api/financial-profile` passa a buscar
  `GET ${AGENT_URL}/customers/${DEMO_CUSTOMER_ID}/financial-profile` no agente e mapear o
  bloco `card`. Sem `AGENT_URL`/`DEMO_CUSTOMER_ID` no ambiente responde 503, não inventa.
- `src/App.tsx`: perfil inicial sem números; `useEffect` busca o perfil ao montar.
- `src/components/InvoiceDetailModal.tsx`: total, pago, saldo no rotativo e juros vêm de
  `profile.card`; a lista fictícia de lançamentos vira o histórico real mês a mês.
- `src/components/Header.tsx`: sem `72%`/`94%` fixos; mostra o índice só quando existir
  (`score` é `null` até a S3 definir a fórmula).
- `src/types.ts`: `InvoiceMonth`, campos novos em `card`, `score: number | null`.

Variáveis de ambiente do protótipo:

```
AGENT_URL=https://fatia-s1---batalha-agentes-277ilp3dyq-uc.a.run.app   # revisão da S1 (tag, 0% de tráfego)
DEMO_CUSTOMER_ID=36d74064-cc59-4ad2-9304-aeae46e660e4
```

Os valores da v1 que **sobram** no protótipo (mensagens iniciais do chat, system prompt,
cards A/B, Visão Financeira) pertencem às fatias S2, S3 e S4.

## S2 — `s2_front.patch` (cumulativo: S1 + S2, sobre o commit `f7d9d34`)

Aplique **este** no lugar do `s1_front.patch` (ele já contém a S1).

- `server.ts`: `GET /api/abertura` lê `GET ${AGENT_URL}/customers/${DEMO_CUSTOMER_ID}/opening`
  no agente: a abertura já está na sessão, zero chamadas ao modelo.
- `src/App.tsx`: a conversa começa vazia; um push neutro simulado ("O Vita tem uma análise
  nova para você", texto vindo do agente) aparece acima do chat; ao tocar, entra a mensagem
  de abertura com os botões vindos de `acoes`. As três mensagens iniciais da v1 saíram.
- `src/components/ChatArea.tsx`: botões renderizados a partir de `message.actions`
  (catálogo `abrir_fatura`, `abrir_visao_financeira`, `abrir_simulacao_t01/t02`,
  `falar_com_pessoa`); rótulo do assistente vira "Vita · IA". A apresentação "Sou o
  Vita, um assistente com IA" vem no texto do agente.
- `src/types.ts`: `AcaoAgente`, `Abertura`, `Message.actions`.

Sobras da v1 que **não** são da S2: respostas de fallback do chat, mensagens de
confirmação dos tratamentos e cards A/B (S3–S5).
