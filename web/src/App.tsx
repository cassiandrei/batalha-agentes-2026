import React, { useState, useEffect } from 'react';
import { Message, FinancialProfile, ActiveModal, Abertura, AcaoAgente, OpcaoT02, Confirmacao } from './types';
import { Header } from './components/Header';
import { ChatArea } from './components/ChatArea';
import { PrescriptionFooter } from './components/PrescriptionFooter';
import { FinancialOverviewModal } from './components/FinancialOverviewModal';
import { FlowAdjustmentModal } from './components/FlowAdjustmentModal';
import { InstallmentModal } from './components/InstallmentModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';

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

const brlTxt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const agora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// S5: a confirmação vai ao agente com iToken e chave de idempotência (CA-14). Um
// duplo clique reusa a chave e o agente devolve a mesma execução.
async function confirmarNoAgente(simulacaoId: string, itoken: string, idempotencyKey: string): Promise<Confirmacao> {
  const r = await fetch('/api/confirmar', {
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

export default function App() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  // S2: push neutro + abertura pré-montada
  const [abertura, setAbertura] = useState<Abertura | null>(null);
  const [pushVisivel, setPushVisivel] = useState<boolean>(true);
  const [profile, setProfile] = useState<FinancialProfile>(INITIAL_PROFILE);
  const [treatmentStatus, setTreatmentStatus] = useState<'pending' | 'flow_adjusted' | 'installment_active'>('pending');
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(false);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);


  // S2: busca a abertura pré-montada. Zero chamadas ao modelo: ela já está na sessão.
  useEffect(() => {
    let ativo = true;
    fetch('/api/abertura')
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
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
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
        handleTalkToHuman();
        break;
    }
  };

  // S1: o perfil vem do agente; nenhum valor fixo sobra no card.
  useEffect(() => {
    let ativo = true;
    fetch('/api/financial-profile')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((p: FinancialProfile) => {
        if (ativo) setProfile(p);
      })
      .catch((e) => console.error('perfil financeiro indisponível', e));
    return () => {
      ativo = false;
    };
  }, []);

  // Initialize Speech Synthesis voice in Portuguese
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    
    // Pick pt-BR voice if available
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'));
    if (ptVoice) {
      utterance.voice = ptVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  // Trigger speech when speechEnabled and new assistant message appears
  useEffect(() => {
    if (!speechEnabled) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.isInitial) {
      speakText(lastMsg.content);
    }
  }, [messages, speechEnabled]);

  // Handle user sending free-form message
  const handleSendMessage = async (text: string) => {
    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.concat(userMsg).map(m => ({ role: m.role, content: m.content })),
          userMessage: text,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro na resposta do agente');
      }

      const data = await response.json();
      const replyText = data.reply || 'Não recebi resposta do agente. Pode repetir?';

      const assistantMsg: Message = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Local fallback in case network issue
      const assistantMsg: Message = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: 'Não consegui falar com o agente agora. Tente de novo em instantes ou toque em "Falar com uma pessoa".',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
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
    const r = await fetch('/api/memoria/consentimento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consentimento: sim }) });
    setMemoriaConsentida(sim && r.ok);
    setMessages((prev) => prev.map((m) => (m.consentPrompt ? { ...m, consentPrompt: false } : m)));
    addAssistant(sim ? 'Combinado. Vou lembrar seus objetivos e tratamentos. Para ver ou apagar, use "O que você lembra?" e "Esqueça tudo".' : 'Tudo bem, não vou guardar nada entre conversas.');
  };

  const handleShowMemory = async () => {
    const r = await fetch('/api/memoria');
    const m = (await r.json()) as { consentimento: boolean; lembrancas: Record<string, string> };
    const itens = Object.entries(m.lembrancas);
    addAssistant(
      itens.length
        ? `Isto é o que eu lembro sobre você:\n\n${itens.map(([k, v]) => `• ${k}: ${v}`).join('\n')}\n\nNunca guardo valores das suas transações, seus dados de cadastro nem o texto das mensagens.`
        : 'Não lembro nada sobre você entre conversas.' + (m.consentimento ? '' : ' Você ainda não autorizou que eu guardasse.'),
    );
  };

  const handleForgetAll = async () => {
    const r = await fetch('/api/memoria', { method: 'DELETE' });
    const d = (await r.json()) as { apagadas: number };
    setMemoriaConsentida(false);
    addAssistant(`Pronto: apaguei ${d.apagadas} lembrança(s) e não vou mais guardar nada até você autorizar de novo.`);
  };

  // S5: "Falar com uma pessoa" — sempre disponível; o resumo só vai com consentimento
  const handleTalkToHuman = async () => {
    const r = await fetch('/api/pessoa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consentimento: memoriaConsentida, motivo: 'pedido pelo cliente na conversa' }) });
    const h = (await r.json()) as { protocolo: string; fila: string; resumo: unknown };
    addAssistant(`${h.resumo ? 'Encaminhei você para uma pessoa da equipe com um resumo da conversa, sem seus valores nem dados pessoais.' : 'Encaminhei você para uma pessoa da equipe, sem enviar resumo (você não autorizou compartilhar).'} Protocolo ${h.protocolo}.`);
  };

  // Reset conversation to initial state
  const handleReset = () => {
    setMessages(INITIAL_MESSAGES);
    setPushVisivel(true);
    setProfile(INITIAL_PROFILE);
    setTreatmentStatus('pending');
    setActiveModal('none');
    setConsentPerguntado(false);
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center font-sans antialiased text-white selection:bg-[#1FA37C]/30 selection:text-[#1FA37C]">
      {/* Container: Either mobile frame or responsive full width */}
      <div 
        className={`w-full h-screen transition-all flex flex-col bg-[#1E1E1E] shadow-2xl relative overflow-hidden ${
          isMobileFrame 
            ? 'max-w-[440px] max-h-[920px] md:h-[90vh] md:rounded-3xl md:border md:border-gray-800'
            : 'max-w-4xl h-screen md:h-[94vh] md:rounded-2xl md:border md:border-gray-800'
        }`}
      >
        {/* Mobile Top Speaker/Sensor Notch (aesthetic detail on framed view) */}
        {isMobileFrame && (
          <div className="hidden md:flex justify-between items-center px-6 pt-2 pb-1 bg-[#1E1E1E] border-b border-gray-800/40 text-[11px] text-gray-400 select-none">
            <span className="font-semibold text-gray-300">09:41</span>
            <div className="w-20 h-4 bg-black/60 rounded-full" />
            <div className="flex items-center gap-1.5 font-medium">
              <span>5G</span>
              <div className="w-4 h-2.5 border border-gray-400 rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-emerald-400 rounded-xs" />
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <Header
          onOpenFinancialOverview={() => setActiveModal('financial_overview')}
          onOpenInvoice={() => setActiveModal('invoice_details')}
          onReset={handleReset}
          speechEnabled={speechEnabled}
          onToggleSpeech={() => setSpeechEnabled(!speechEnabled)}
          treatmentStatus={treatmentStatus}
          isMobileFrame={isMobileFrame}
          onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}
          score={profile.financialOverview.score}
          onTalkToHuman={handleTalkToHuman}
        />

        {/* S2: push neutro simulado (tela bloqueada). O texto vem do agente. */}
        {pushVisivel && (
          <button
            onClick={abrirPeloPush}
            className="mx-4 mt-3 text-left bg-[#1E1E1E] border border-gray-700 rounded-xl p-3.5 shadow-lg hover:border-[#1FA37C]/60 transition-colors cursor-pointer"
            title="Abrir a análise"
          >
            <div className="text-[11px] text-gray-500 mb-1">Notificação · agora</div>
            <div className="text-sm text-gray-100 font-medium">
              {abertura ? abertura.push : 'Carregando…'}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Toque para abrir</div>
          </button>
        )}

        {/* Chat Area - S2: a abertura e os botões vêm da sessão pré-montada */}
        <ChatArea
          messages={messages}
          isTyping={isTyping}
          onAction={executarAcao}
          onConsent={handleConsent}
          onOpenFinancialOverview={() => setActiveModal('financial_overview')}
          onOpenInvoice={() => setActiveModal('invoice_details')}
          onSpeak={speakText}
        />

        {/* Action Cards (Prescription / Closed Solutions) */}
        <PrescriptionFooter
          profile={profile}
          onSelectFlowAdjustment={() => setActiveModal('flow_adjustment')}
          onSelectInstallment={() => setActiveModal('installment')}
          onSendMessage={handleSendMessage}
          treatmentStatus={treatmentStatus}
          isTyping={isTyping}
          onResetTreatment={() => setTreatmentStatus('pending')}
          onShowMemory={handleShowMemory}
          onForgetAll={handleForgetAll}
        />

        {/* Interactive Modals */}
        <FinancialOverviewModal
          isOpen={activeModal === 'financial_overview'}
          onClose={() => setActiveModal('none')}
          profile={profile}
          treatmentStatus={treatmentStatus}
          onSelectOption={(type) => {
            setActiveModal(type === 'flow' ? 'flow_adjustment' : 'installment');
          }}
        />

        <FlowAdjustmentModal
          isOpen={activeModal === 'flow_adjustment'}
          onClose={() => setActiveModal('none')}
          onConfirm={handleConfirmFlowAdjustment}
          isAlreadyAdjusted={treatmentStatus === 'flow_adjusted'}
          t01={profile.t01}
        />

        <InstallmentModal
          isOpen={activeModal === 'installment'}
          onClose={() => setActiveModal('none')}
          onConfirm={handleConfirmInstallment}
          t02={profile.t02}
        />

        <InvoiceDetailModal
          isOpen={activeModal === 'invoice_details'}
          onClose={() => setActiveModal('none')}
          profile={profile}
        />

      </div>
    </div>
  );
}
