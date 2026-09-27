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
    const eventos = (await r.json()) as Array<{
      author?: string;
      content?: { parts?: Array<{ text?: string; functionCall?: { name: string } }> };
    }>;
    const textos: string[] = [];
    const tools: string[] = [];
    for (const ev of eventos) {
      for (const parte of ev.content?.parts ?? []) {
        if (parte.text) textos.push(parte.text);
        if (parte.functionCall) tools.push(parte.functionCall.name);
      }
    }
    const reply = textos.join(' ').trim();
    if (!reply) {
      res.status(502).json({ error: 'o agente não devolveu texto' });
      return;
    }
    res.json({ reply, source: 'agente', tools });
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
      // TODO(S3): reserve e financialOverview saem das tools de investimento e do índice.
      reserve: {
        total: 0,
        product: '',
        monthlyYieldRate: 0,
        monthsCoverage: 0,
      },
      financialOverview: {
        score: null,
        status: '',
        freeCashflowPercentage: 0,
        emergencyReserve: 0,
        variableExpensesPercentage: 0,
        monthlyInterestCost: agente.card.revolving_interest_charged ?? 0,
      },
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
