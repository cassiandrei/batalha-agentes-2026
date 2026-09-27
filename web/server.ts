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
// S6: cena do Marcos (faixa V). ?cliente=marcos troca o cliente da demo; o id vem do
// ambiente, nunca da conversa.
const DEMO_CUSTOMER_ID_MARCOS = process.env.DEMO_CUSTOMER_ID_MARCOS || '8fbc8ba3-7d20-4382-ba8d-ffd070e836a1';
const clienteDe = (req: Request) => (req.query.cliente === 'marcos' ? DEMO_CUSTOMER_ID_MARCOS : DEMO_CUSTOMER_ID);
const nomeDe = (req: Request) => (req.query.cliente === 'marcos' ? 'Marcos' : 'Bruno');
const APP_NAME = 'app';
const sessaoDoCliente = (id: string) => `abertura-${id}`;

// 27/09: o acesso público do agente foi removido no projeto do evento e não pode ser
// reaplicado (regra 7). Este serviço roda como squad-agent-sa, que tem run.invoker: cada
// chamada leva o ID token da própria SA, obtido no servidor de metadados do Cloud Run.
// Fora do Cloud Run (dev local) o metadado não existe e a chamada segue sem token.
// O Cloud Run só verifica o token cuja audiência é a URL canônica do serviço; a URL de
// tag (fatia-s7---...) devolve 401 "could not be verified". Tira o prefixo da tag.
const AGENT_AUDIENCE = process.env.AGENT_AUDIENCE || AGENT_URL.replace(/^https:\/\/[a-z0-9-]+---/, 'https://');
let tokenCache: { valor: string; expira: number } | null = null;
async function authHeaders(): Promise<Record<string, string>> {
  if (!AGENT_URL) return {};
  const agora = Date.now();
  if (tokenCache && tokenCache.expira > agora) return { Authorization: `Bearer ${tokenCache.valor}` };
  try {
    const r = await fetch(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(AGENT_AUDIENCE)}`,
      { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(2000) },
    );
    if (!r.ok) return {};
    const valor = (await r.text()).trim();
    tokenCache = { valor, expira: agora + 50 * 60 * 1000 };
    return { Authorization: `Bearer ${valor}` };
  } catch {
    return {};
  }
}

async function agente(caminho: string, init: RequestInit = {}): Promise<globalThis.Response> {
  const auth = await authHeaders();
  return fetch(`${AGENT_URL}${caminho}`, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), ...auth } });
}

async function garantirSessao(userId: string, sessionId: string): Promise<void> {
  const r = await agente(`/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`);
  if (r.ok) return;
  const c = await agente(`/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`, {
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
  const cliente = clienteDe(req);
  const sessionId = sessaoDoCliente(cliente);
  try {
    await garantirSessao(cliente, sessionId);
    const r = await agente(`/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: APP_NAME,
        user_id: cliente,
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
    let reply = textos.join(' ').trim();
    // QA F1/F2: nunca devolver vazio. Pedido de confirmação de ação (transferência etc.)
    // fica pendente no ADK sem texto; qualquer outro vazio vira a resposta segura padrão.
    let fallback: string | null = null;
    if (!reply) {
      fallback = tools.includes('adk_request_confirmation') || tools.includes('propose_action')
        ? 'Eu não faço transferências, pagamentos nem contratações por aqui. Posso mostrar sua fatura, sua visão financeira ou simular as opções para reduzir juros.'
        : 'Não consegui montar a resposta agora. Posso mostrar sua visão financeira ou as opções para reduzir juros.';
      console.error('resposta vazia do agente', { tools });
      reply = fallback;
    }
    // Só a fonte que a resposta realmente cita vira link; sem citação, sem link.
    const compacta = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\./g, '');
    const vistas = new Set<string>();
    const citadas = citacoes.filter((c) => {
      if (!compacta(reply).includes(compacta(c.chave)) || vistas.has(c.fonte)) return false;
      vistas.add(c.fonte);
      return true;
    });
    res.json({ reply, source: 'agente', tools, fallback: fallback !== null, citacoes: citadas.map(({ fonte, link }) => ({ fonte, link })) });
  } catch (e) {
    console.error('falha ao falar com o agente:', e);
    res.status(502).json({ error: `falha ao consultar o agente: ${(e as Error).message}` });
  }
});

// Financial Profile Data endpoint — S1: o bloco `card` vem do agente (tools), nunca daqui.

app.get('/api/financial-profile', async (req: Request, res: Response) => {
  if (!AGENT_URL || !DEMO_CUSTOMER_ID) {
    res.status(503).json({ error: 'AGENT_URL e DEMO_CUSTOMER_ID precisam estar no ambiente' });
    return;
  }
  try {
    const r = await agente(`/customers/${clienteDe(req)}/financial-profile`);
    if (!r.ok) {
      res.status(r.status).json({ error: `agente respondeu ${r.status}` });
      return;
    }
    const perfil = await r.json();
    res.json({
      user: nomeDe(req),
      card: {
        brand: 'Cartão de crédito',
        lastFour: '',
        referenceMonth: perfil.reference_month,
        paymentMode: perfil.card.payment_mode,
        totalInvoice: perfil.card.total_invoice,
        paidAmount: perfil.card.paid_amount,
        outstandingBalance: perfil.card.outstanding_balance,
        rotaryInterestCharged: perfil.card.revolving_interest_charged,
        invoiceHistory: perfil.invoice_history,
      },
      // S3: tudo abaixo vem do agente (índice por regra, reserva e T01 calculado).
      reserve: perfil.reserve
        ? {
            produto: perfil.reserve.produto,
            liquidez: perfil.reserve.liquidez,
            saldo: perfil.reserve.saldo,
            percentualCdi: perfil.reserve.percentual_cdi,
            finalidade: perfil.reserve.finalidade,
          }
        : null,
      financialOverview: {
        score: perfil.index?.score ?? null,
        status: perfil.index?.status ?? null,
        componentes: perfil.index?.componentes ?? null,
        poupancaSobreEntradasPct: perfil.diagnosis?.poupanca_sobre_entradas_pct ?? null,
        drenoPctRenda: perfil.diagnosis?.dreno_pct_renda ?? null,
        comprometimentoCreditoPct: perfil.diagnosis?.comprometimento_credito_pct ?? null,
        mesesPagandoJuros: perfil.diagnosis?.meses_pagando_juros ?? null,
        jurosUltimoMes: perfil.diagnosis?.juros_ultimo_mes ?? null,
        jurosEncargosAno: perfil.diagnosis?.juros_encargos_ano ?? null,
        essenciaisMediaMensal: perfil.diagnosis?.essenciais_media_mensal ?? null,
      },
      t01: perfil.treatments?.t01 ?? null,
      // S4
      offers: perfil.offers ?? null,
      t02: perfil.treatments?.t02 ?? null,
      principal: perfil.treatments?.principal ?? null,
      ordem: perfil.treatments?.ordem ?? [],
    });
  } catch (e) {
    res.status(502).json({ error: `falha ao consultar o agente: ${(e as Error).message}` });
  }
});

// S2: abertura proativa. A sessão já está montada no agente; aqui só se lê.
app.get('/api/abertura', async (req: Request, res: Response) => {
  if (!AGENT_URL || !DEMO_CUSTOMER_ID) {
    res.status(503).json({ error: 'AGENT_URL e DEMO_CUSTOMER_ID precisam estar no ambiente' });
    return;
  }
  try {
    const r = await agente(`/customers/${clienteDe(req)}/opening`);
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
async function proxyJson(req: Request, res: Response, metodo: string, caminho: string, corpo?: unknown) {
  if (!AGENT_URL || !DEMO_CUSTOMER_ID) {
    res.status(503).json({ error: 'AGENT_URL e DEMO_CUSTOMER_ID precisam estar no ambiente' });
    return;
  }
  try {
    const r = await agente(`/customers/${clienteDe(req)}${caminho}`, {
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

app.post('/api/confirmar', (req: Request, res: Response) => proxyJson(req, res, 'POST', '/confirmations', req.body));
app.get('/api/memoria', (req: Request, res: Response) => proxyJson(req, res, 'GET', '/memory'));
app.delete('/api/memoria', (req: Request, res: Response) => proxyJson(req, res, 'DELETE', '/memory'));
app.post('/api/memoria/consentimento', (req: Request, res: Response) => proxyJson(req, res, 'POST', '/memory/consent', req.body));
app.post('/api/pessoa', (req: Request, res: Response) => proxyJson(req, res, 'POST', '/handoff', req.body));

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
