import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// S2b: o chat passa pelo agente ADK (Cloud Run), na sessão pré-montada da abertura.
// Nenhuma chave de modelo aqui, nenhum prompt aqui: guardrails, tools e números são
// do agente. Este servidor só faz o proxy e extrai o texto da resposta.
const AGENT_URL = (process.env.AGENT_URL || '').replace(/\/$/, '');
const DEMO_CUSTOMER_ID = process.env.DEMO_CUSTOMER_ID || '';
const APP_NAME = 'app';
const sessaoDoCliente = (id: string) => `abertura-${id}`;

async function garantirSessao(userId: string, sessionId: string): Promise<void> {
  const r = await fetch(`${AGENT_URL}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`);
  if (r.ok) return;
  const c = await fetch(`${AGENT_URL}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!c.ok && c.status !== 400) throw new Error(`não consegui criar a sessão (${c.status})`);
}

app.post('/api/chat', async (req: Request, res: Response) => {
  const { userMessage } = req.body as { userMessage?: string };
  if (!AGENT_URL || !DEMO_CUSTOMER_ID) {
    res.status(503).json({ error: 'AGENT_URL e DEMO_CUSTOMER_ID precisam estar no ambiente' });
    return;
  }
  if (!userMessage || !userMessage.trim()) {
    res.status(422).json({ error: 'userMessage vazio' });
    return;
  }
  const sessionId = sessaoDoCliente(DEMO_CUSTOMER_ID);
  try {
    await garantirSessao(DEMO_CUSTOMER_ID, sessionId);
    const r = await fetch(`${AGENT_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: APP_NAME,
        user_id: DEMO_CUSTOMER_ID,
        session_id: sessionId,
        new_message: { role: 'user', parts: [{ text: userMessage }] },
      }),
    });
    if (!r.ok) {
      res.status(502).json({ error: `agente respondeu ${r.status}` });
      return;
    }
    type Citacao = { fonte: string; chave: string; link: string };
    const eventos = (await r.json()) as Array<{
      author?: string;
      content?: { parts?: Array<{ text?: string; functionCall?: { name: string } }> };
      actions?: { stateDelta?: { citacoes?: Citacao[] }; state_delta?: { citacoes?: Citacao[] } };
    }>;
    const textos: string[] = [];
    const tools: string[] = [];
    let citacoes: Citacao[] = [];
    for (const ev of eventos) {
      for (const parte of ev.content?.parts ?? []) {
        if (parte.text) textos.push(parte.text);
        if (parte.functionCall) tools.push(parte.functionCall.name);
      }
      // S8: a tool buscar_normas grava as fontes no estado; o AgentTool repassa o delta.
      const delta = ev.actions?.stateDelta ?? ev.actions?.state_delta;
      if (delta?.citacoes) citacoes = delta.citacoes;
    }
    const reply = textos.join(' ').trim();
    if (!reply) {
      res.status(502).json({ error: 'o agente não devolveu texto' });
      return;
    }
    // Só a fonte que a resposta realmente cita vira link; sem citação, sem link.
    const compacta = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\./g, '');
    const vistas = new Set<string>();
    const citadas = citacoes.filter((c) => {
      if (!compacta(reply).includes(compacta(c.chave)) || vistas.has(c.fonte)) return false;
      vistas.add(c.fonte);
      return true;
    });
    res.json({ reply, source: 'agente', tools, citacoes: citadas.map(({ fonte, link }) => ({ fonte, link })) });
  } catch (e) {
    console.error('falha ao falar com o agente:', e);
    res.status(502).json({ error: `falha ao consultar o agente: ${(e as Error).message}` });
  }
});

// Financial Profile Data endpoint — S1: o bloco `card` vem do agente (tools), nunca daqui.

app.get('/api/financial-profile', async (_req: Request, res: Response) => {
  if (!AGENT_URL || !DEMO_CUSTOMER_ID) {
    res.status(503).json({ error: 'AGENT_URL e DEMO_CUSTOMER_ID precisam estar no ambiente' });
    return;
  }
  try {
    const r = await fetch(`${AGENT_URL}/customers/${DEMO_CUSTOMER_ID}/financial-profile`);
    if (!r.ok) {
      res.status(r.status).json({ error: `agente respondeu ${r.status}` });
      return;
    }
    const agente = await r.json();
    res.json({
      user: 'Bruno',
      card: {
        brand: 'Cartão de crédito',
        lastFour: '',
        referenceMonth: agente.reference_month,
        paymentMode: agente.card.payment_mode,
        totalInvoice: agente.card.total_invoice,
        paidAmount: agente.card.paid_amount,
        outstandingBalance: agente.card.outstanding_balance,
        rotaryInterestCharged: agente.card.revolving_interest_charged,
        invoiceHistory: agente.invoice_history,
      },
      // S3: tudo abaixo vem do agente (índice por regra, reserva e T01 calculado).
      reserve: agente.reserve
        ? {
            produto: agente.reserve.produto,
            liquidez: agente.reserve.liquidez,
            saldo: agente.reserve.saldo,
            percentualCdi: agente.reserve.percentual_cdi,
            finalidade: agente.reserve.finalidade,
          }
        : null,
      financialOverview: {
        score: agente.index?.score ?? null,
        status: agente.index?.status ?? null,
        componentes: agente.index?.componentes ?? null,
        poupancaSobreEntradasPct: agente.diagnosis?.poupanca_sobre_entradas_pct ?? null,
        drenoPctRenda: agente.diagnosis?.dreno_pct_renda ?? null,
        comprometimentoCreditoPct: agente.diagnosis?.comprometimento_credito_pct ?? null,
        mesesPagandoJuros: agente.diagnosis?.meses_pagando_juros ?? null,
        jurosUltimoMes: agente.diagnosis?.juros_ultimo_mes ?? null,
        jurosEncargosAno: agente.diagnosis?.juros_encargos_ano ?? null,
        essenciaisMediaMensal: agente.diagnosis?.essenciais_media_mensal ?? null,
      },
      t01: agente.treatments?.t01 ?? null,
      // S4
      offers: agente.offers ?? null,
      t02: agente.treatments?.t02 ?? null,
      principal: agente.treatments?.principal ?? null,
      ordem: agente.treatments?.ordem ?? [],
    });
  } catch (e) {
    res.status(502).json({ error: `falha ao consultar o agente: ${(e as Error).message}` });
  }
});

// S2: abertura proativa. A sessão já está montada no agente; aqui só se lê.
app.get('/api/abertura', async (_req: Request, res: Response) => {
  if (!AGENT_URL || !DEMO_CUSTOMER_ID) {
    res.status(503).json({ error: 'AGENT_URL e DEMO_CUSTOMER_ID precisam estar no ambiente' });
    return;
  }
  try {
    const r = await fetch(`${AGENT_URL}/customers/${DEMO_CUSTOMER_ID}/opening`);
    if (!r.ok) {
      res.status(r.status).json({ error: `agente respondeu ${r.status}` });
      return;
    }
    res.json(await r.json());
  } catch (e) {
    res.status(502).json({ error: `falha ao consultar o agente: ${(e as Error).message}` });
  }
});

// S5: confirmação (CA-14), memória com consentimento e "falar com uma pessoa".
// Tudo proxy para o agente; o front não decide nada.
async function proxyJson(res: Response, metodo: string, caminho: string, corpo?: unknown) {
  if (!AGENT_URL || !DEMO_CUSTOMER_ID) {
    res.status(503).json({ error: 'AGENT_URL e DEMO_CUSTOMER_ID precisam estar no ambiente' });
    return;
  }
  try {
    const r = await fetch(`${AGENT_URL}/customers/${DEMO_CUSTOMER_ID}${caminho}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const texto = await r.text();
    res.status(r.status).type('application/json').send(texto);
  } catch (e) {
    res.status(502).json({ error: `falha ao consultar o agente: ${(e as Error).message}` });
  }
}

app.post('/api/confirmar', (req: Request, res: Response) => proxyJson(res, 'POST', '/confirmations', req.body));
app.get('/api/memoria', (_req: Request, res: Response) => proxyJson(res, 'GET', '/memory'));
app.delete('/api/memoria', (_req: Request, res: Response) => proxyJson(res, 'DELETE', '/memory'));
app.post('/api/memoria/consentimento', (req: Request, res: Response) => proxyJson(res, 'POST', '/memory/consent', req.body));
app.post('/api/pessoa', (req: Request, res: Response) => proxyJson(res, 'POST', '/handoff', req.body));

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
