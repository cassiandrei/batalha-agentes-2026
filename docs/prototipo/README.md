# Patches para o protótipo (repositório `danmarcello/Vita`)

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
