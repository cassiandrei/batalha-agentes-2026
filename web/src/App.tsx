import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Message, FinancialProfile, ActiveModal, Abertura, AcaoAgente, OpcaoT02, Confirmacao } from './types';
import { Header } from './components/Header';
import { ChatArea } from './components/ChatArea';
import { PrescriptionFooter } from './components/PrescriptionFooter';
import { FinancialOverviewModal } from './components/FinancialOverviewModal';
import { FlowAdjustmentModal } from './components/FlowAdjustmentModal';
import { InstallmentModal } from './components/InstallmentModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { LockScreen } from './components/LockScreen';
import { HandoffSheet, Encaminhamento, Modalidade } from './components/HandoffSheet';
import { agora, brl as brlTxt } from './components/ui';

// S1: nenhum número escrito aqui. O card é preenchido pelo /api/financial-profile,
// que busca no agente. Até chegar, referenceMonth fica null e a tela diz "carregando".
const INITIAL_PROFILE: FinancialProfile = {
  user: 'Bruno',
  card: {
    brand: 'Cartão de crédito',
    lastFour: '',
    referenceMonth: null,
    paymentMode: null,
    totalInvoice: null,
    paidAmount: null,
    outstandingBalance: null,
    rotaryInterestCharged: null,
    invoiceHistory: [],
  },
  reserve: null,
  financialOverview: {
    score: null,
    status: null,
    componentes: null,
    poupancaSobreEntradasPct: null,
    drenoPctRenda: null,
    comprometimentoCreditoPct: null,
    mesesPagandoJuros: null,
    jurosUltimoMes: null,
    jurosEncargosAno: null,
    essenciaisMediaMensal: null,
  },
  t01: null,
  offers: null,
  t02: null,
  principal: null,
  ordem: [],
};

// S2: a conversa começa vazia. A primeira mensagem vem da sessão pré-montada no
// agente (/api/abertura), depois que o cliente toca no push. Nada escrito aqui.
const INITIAL_MESSAGES: Message[] = [];

// S5: a confirmação vai ao agente com iToken e chave de idempotência (CA-14). Um
// duplo clique reusa a chave e o agente devolve a mesma execução.
async function confirmarNoAgente(simulacaoId: string, itoken: string, idempotencyKey: string): Promise<Confirmacao> {
  const r = await fetch(api('/api/confirmar'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ simulacao_id: simulacaoId, itoken, idempotency_key: idempotencyKey }),
  });
  if (!r.ok) {
    const erro = (await r.json().catch(() => ({}))) as { detail?: string };
    throw new Error(erro.detail || `HTTP ${r.status}`);
  }
  return (await r.json()) as Confirmacao;
}

// S6: ?cliente=marcos põe a cena do Marcos (faixa V) na tela. O id fica no servidor.
const CLIENTE: 'bruno' | 'marcos' = new URLSearchParams(window.location.search).get('cliente') === 'marcos' ? 'marcos' : 'bruno';
const api = (caminho: string) => `${caminho}${caminho.includes('?') ? '&' : '?'}cliente=${CLIENTE}`;

export default function App() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  // S2: push neutro + abertura pré-montada
  const [abertura, setAbertura] = useState<Abertura | null>(null);
  const [pushVisivel, setPushVisivel] = useState<boolean>(true);
  const [profile, setProfile] = useState<FinancialProfile>(INITIAL_PROFILE);
  const [treatmentStatus, setTreatmentStatus] = useState<'pending' | 'flow_adjusted' | 'installment_active'>('pending');
  const [activeModal, setActiveModal] = useState<ActiveModal | 'handoff'>('none');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(false);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);

  // S2: busca a abertura pré-montada. Zero chamadas ao modelo: ela já está na sessão.
  useEffect(() => {
    let ativo = true;
    fetch(api('/api/abertura'))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((a: Abertura) => {
        if (ativo) setAbertura(a);
      })
      .catch((e) => console.error('abertura indisponível', e));
    return () => {
      ativo = false;
    };
  }, []);

  const abrirPeloPush = () => {
    setPushVisivel(false);
    if (!abertura) return;
    setMessages([
      {
        id: 'abertura',
        role: 'assistant',
        content: abertura.texto,
        timestamp: agora(),
        isInitial: true,
        actions: abertura.acoes,
      },
    ]);
  };

  const executarAcao = (acao: AcaoAgente) => {
    switch (acao.tipo) {
      case 'abrir_fatura':
        setActiveModal('invoice_details');
        break;
      case 'abrir_visao_financeira':
        setActiveModal('financial_overview');
        break;
      case 'abrir_simulacao_t01':
        setActiveModal('flow_adjustment');
        break;
      case 'abrir_simulacao_t02':
        setActiveModal('installment');
        break;
      case 'falar_com_pessoa':
        setActiveModal('handoff');
        break;
    }
  };

  // S1: o perfil vem do agente; nenhum valor fixo sobra no card.
  useEffect(() => {
    let ativo = true;
    fetch(api('/api/financial-profile'))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((p: FinancialProfile) => {
        if (ativo) setProfile(p);
      })
      .catch((e) => console.error('perfil financeiro indisponível', e));
    return () => {
      ativo = false;
    };
  }, []);

  // Leitura em voz alta em pt-BR
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'));
    if (ptVoice) utterance.voice = ptVoice;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!speechEnabled) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.isInitial) {
      speakText(lastMsg.content);
    }
  }, [messages, speechEnabled]);

  const handleSendMessage = async (text: string) => {
    const userMsg: Message = { id: `usr_${Date.now()}`, role: 'user', content: text, timestamp: agora() };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    try {
      const response = await fetch(api('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.concat(userMsg).map((m) => ({ role: m.role, content: m.content })),
          userMessage: text,
        }),
      });
      if (!response.ok) throw new Error('Erro na resposta do agente');
      const data = await response.json();
      const replyText = data.reply || 'Não recebi resposta do agente. Pode repetir?';
      setMessages((prev) => [
        ...prev,
        { id: `asst_${Date.now()}`, role: 'assistant', content: replyText, timestamp: agora(), citacoes: Array.isArray(data.citacoes) ? data.citacoes : undefined },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `asst_${Date.now()}`, role: 'assistant', content: 'Não consegui falar com o agente agora. Tente de novo em instantes ou toque em "Falar com uma pessoa".', timestamp: agora() },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const [memoriaConsentida, setMemoriaConsentida] = useState<boolean>(false);
  const [consentPerguntado, setConsentPerguntado] = useState<boolean>(false);

  const addAssistant = (content: string, extra: Partial<Message> = {}) =>
    setMessages((prev) => [...prev, { id: `asst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, role: 'assistant', content, timestamp: agora(), ...extra }]);

  // S5: depois da primeira confirmação, o Vita pergunta se pode lembrar (uma vez).
  const perguntarConsentimento = () => {
    if (memoriaConsentida || consentPerguntado) return;
    setConsentPerguntado(true);
    addAssistant('Quer que eu lembre seus objetivos e os tratamentos que você fez para as próximas conversas? Você pode ver e apagar isso quando quiser.', { consentPrompt: true });
  };

  // T01 — usar a reserva (S3 calcula; S5 confirma no agente)
  const handleConfirmFlowAdjustment = async (itoken: string, idempotencyKey: string): Promise<boolean> => {
    const t01 = profile.t01;
    if (!t01) return false;
    try {
      const c = await confirmarNoAgente(t01.simulacao_id, itoken, idempotencyKey);
      setTreatmentStatus('flow_adjusted');
      setProfile((prev) => ({
        ...prev,
        card: { ...prev.card, outstandingBalance: 0, rotaryInterestCharged: 0 },
        reserve: prev.reserve ? { ...prev.reserve, saldo: t01.reserva_restante } : prev.reserve,
        financialOverview: { ...prev.financialOverview, jurosUltimoMes: 0 },
      }));
      addAssistant(
        `Confirmado (execução ${c.execucao_id}). ${brlTxt(t01.saldo_quitado)} do rotativo foram quitados com a sua reserva. Você deixa de pagar ${brlTxt(t01.juros_evitados_mes)} de juros por mês e a reserva continua com ${brlTxt(t01.reserva_restante)}.`,
        { actionTaken: 'flow_adjusted' },
      );
      perguntarConsentimento();
      return true;
    } catch (e) {
      addAssistant(`Não confirmei: ${(e as Error).message} Nada foi executado.`);
      return false;
    }
  };

  // T02 — parcelar (S4 calcula; S5 confirma no agente)
  const handleConfirmInstallment = async (opcao: OpcaoT02, itoken: string, idempotencyKey: string): Promise<boolean> => {
    const t02 = profile.t02;
    if (!t02 || !opcao.aprovado) return false;
    try {
      const c = await confirmarNoAgente(t02.simulacao_id, itoken, idempotencyKey);
      setTreatmentStatus('installment_active');
      setProfile((prev) => ({
        ...prev,
        card: { ...prev.card, outstandingBalance: 0, rotaryInterestCharged: 0 },
        financialOverview: { ...prev.financialOverview, jurosUltimoMes: 0 },
      }));
      addAssistant(
        `Confirmado (execução ${c.execucao_id}). Os ${brlTxt(t02.saldo)} do rotativo foram parcelados em ${opcao.prazo}x de ${brlTxt(opcao.parcela)} a ${(t02.taxa_mensal * 100).toLocaleString('pt-BR')}% ao mês, ${brlTxt(opcao.juros_totais)} de juros no total. ${t02.aviso}`,
        { actionTaken: 'installment_active' },
      );
      perguntarConsentimento();
      return true;
    } catch (e) {
      addAssistant(`Não confirmei: ${(e as Error).message} Nada foi executado.`);
      return false;
    }
  };

  // S5: memória com consentimento, sem passar pelo modelo
  const handleConsent = async (sim: boolean) => {
    const r = await fetch(api('/api/memoria/consentimento'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consentimento: sim }) });
    setMemoriaConsentida(sim && r.ok);
    setMessages((prev) => prev.map((m) => (m.consentPrompt ? { ...m, consentPrompt: false } : m)));
    addAssistant(sim ? 'Combinado. Vou lembrar seus objetivos e tratamentos. Para ver ou apagar, use "O que você lembra?" e "Esqueça tudo".' : 'Tudo bem, não vou guardar nada entre conversas.');
  };

  const handleShowMemory = async () => {
    const r = await fetch(api('/api/memoria'));
    const m = (await r.json()) as { consentimento: boolean; lembrancas: Record<string, string> };
    const itens = Object.entries(m.lembrancas);
    addAssistant(
      itens.length
        ? `Isto é o que eu lembro sobre você:\n\n${itens.map(([k, v]) => `• ${k}: ${v}`).join('\n')}\n\nNunca guardo valores das suas transações, seus dados de cadastro nem o texto das mensagens.`
        : 'Não lembro nada sobre você entre conversas.' + (m.consentimento ? '' : ' Você ainda não autorizou que eu guardasse.'),
    );
  };

  const handleForgetAll = async () => {
    const r = await fetch(api('/api/memoria'), { method: 'DELETE' });
    const d = (await r.json()) as { apagadas: number };
    setMemoriaConsentida(false);
    addAssistant(`Pronto: apaguei ${d.apagadas} lembrança(s) e não vou mais guardar nada até você autorizar de novo.`);
  };

  // S5: "Falar com uma pessoa" — sempre disponível; o resumo só vai com consentimento.
  // S6/Vita-UI: passa pelo sheet de negociação assistida; o agente registra o protocolo.
  const encaminhar = async (modalidade: Modalidade): Promise<Encaminhamento> => {
    const r = await fetch(api('/api/pessoa'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consentimento: memoriaConsentida, motivo: modalidade === 'chat' ? 'pedido pelo cliente na conversa (chat)' : 'pedido pelo cliente na conversa (ligacao agendada)' }),
    });
    if (!r.ok) throw new Error(`O agente respondeu ${r.status}.`);
    const h = (await r.json()) as Encaminhamento;
    addAssistant(
      `${h.resumo ? 'Encaminhei você para uma pessoa da equipe com um resumo da conversa, sem seus valores nem dados pessoais.' : 'Encaminhei você para uma pessoa da equipe, sem enviar resumo (você não autorizou compartilhar).'} Protocolo ${h.protocolo}.`,
    );
    return h;
  };

  const handleReset = () => {
    setMessages(INITIAL_MESSAGES);
    setPushVisivel(true);
    setProfile(INITIAL_PROFILE);
    setTreatmentStatus('pending');
    setActiveModal('none');
    setConsentPerguntado(false);
    fetch(api('/api/financial-profile'))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((p: FinancialProfile) => setProfile(p))
      .catch(() => undefined);
  };

  const fechar = () => setActiveModal('none');

  // Confete só dentro da moldura do aparelho, e só se o sistema não pediu menos movimento.
  const canvasConfete = useRef<HTMLCanvasElement>(null);
  const celebrar = () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !canvasConfete.current) return;
    try {
      confetti.create(canvasConfete.current, { resize: true, useWorker: false })({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#FF6200', '#00875A', '#FFFFFF'],
      });
    } catch {
      // sem confete não é erro
    }
  };

  return (
    <div className="min-h-screen bg-[#E9E9EB] flex flex-col items-center justify-center font-sans antialiased text-ink">
      <div
        className={`relative w-full h-screen flex flex-col overflow-hidden transition-all ${
          isMobileFrame
            ? 'max-w-[420px] max-h-[880px] md:h-[92vh] md:rounded-[44px] md:border-[10px] md:border-[#1c1c1e] md:shadow-[0_30px_80px_rgba(0,0,0,0.35)] bg-canvas'
            : 'max-w-4xl md:h-[94vh] md:rounded-3xl md:border md:border-line-strong md:shadow-[0_20px_60px_rgba(0,0,0,0.12)] bg-canvas'
        }`}
      >
        {isMobileFrame && (
          <div className="hidden md:flex absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-[#1c1c1e] rounded-full z-30 pointer-events-none" aria-hidden="true" />
        )}
        {isMobileFrame && <div className="hidden md:block h-9 shrink-0 bg-surface" aria-hidden="true" />}

        <Header
          onReset={handleReset}
          speechEnabled={speechEnabled}
          onToggleSpeech={() => setSpeechEnabled(!speechEnabled)}
          isMobileFrame={isMobileFrame}
          onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}
          onTalkToHuman={() => setActiveModal('handoff')}
          cliente={CLIENTE}
        />

        <ChatArea
          messages={messages}
          isTyping={isTyping}
          profile={profile}
          treatmentStatus={treatmentStatus}
          onAction={executarAcao}
          onConsent={handleConsent}
          onOpenFinancialOverview={() => setActiveModal('financial_overview')}
          onOpenInvoice={() => setActiveModal('invoice_details')}
          onSelectFlowAdjustment={() => setActiveModal('flow_adjustment')}
          onSelectInstallment={() => setActiveModal('installment')}
          onResetTreatment={() => setTreatmentStatus('pending')}
          onTalkToHuman={() => setActiveModal('handoff')}
          onSpeak={speakText}
        />

        <PrescriptionFooter onSendMessage={handleSendMessage} isTyping={isTyping} onShowMemory={handleShowMemory} onForgetAll={handleForgetAll} />

        {/* S2: a cena do push, na tela de bloqueio. O texto vem do agente. */}
        {pushVisivel && <LockScreen push={abertura?.push ?? null} onOpen={abrirPeloPush} />}

        <FinancialOverviewModal
          isOpen={activeModal === 'financial_overview'}
          onClose={fechar}
          profile={profile}
          treatmentStatus={treatmentStatus}
          onSelectOption={(type) => setActiveModal(type === 'flow' ? 'flow_adjustment' : 'installment')}
        />
        <FlowAdjustmentModal isOpen={activeModal === 'flow_adjustment'} onClose={fechar} onConfirm={handleConfirmFlowAdjustment} isAlreadyAdjusted={treatmentStatus === 'flow_adjusted'} t01={profile.t01} onCelebrate={celebrar} />
        <InstallmentModal isOpen={activeModal === 'installment'} onClose={fechar} onConfirm={handleConfirmInstallment} t02={profile.t02} onCelebrate={celebrar} />
        <canvas ref={canvasConfete} className="absolute inset-0 w-full h-full pointer-events-none z-[60]" aria-hidden="true" />
        <InvoiceDetailModal isOpen={activeModal === 'invoice_details'} onClose={fechar} profile={profile} />
        <HandoffSheet open={activeModal === 'handoff'} onClose={fechar} profile={profile} memoriaConsentida={memoriaConsentida} onConfirm={encaminhar} />
      </div>
    </div>
  );
}
