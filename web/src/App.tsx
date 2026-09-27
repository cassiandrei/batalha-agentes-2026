import React, { useState, useEffect } from 'react';
import { Message, FinancialProfile, ActiveModal, Abertura, AcaoAgente } from './types';
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
};

// S2: a conversa começa vazia. A primeira mensagem vem da sessão pré-montada no
// agente (/api/abertura), depois que o cliente toca no push. Nada escrito aqui.
const INITIAL_MESSAGES: Message[] = [];

const brlTxt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
        handleSendMessage('Quero falar com uma pessoa.');
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

  // Execution: Option A - Flow Adjustment Treatment
  // S3: o estado pós-confirmação deriva do T01 calculado pelo agente. A confirmação
  // real (iToken, evento tratamento_confirmado) é da S5; aqui só a tela muda.
  const handleConfirmFlowAdjustment = () => {
    const t01 = profile.t01;
    if (!t01) return;
    setTreatmentStatus('flow_adjusted');
    setProfile((prev) => ({
      ...prev,
      card: { ...prev.card, outstandingBalance: 0, rotaryInterestCharged: 0 },
      reserve: prev.reserve ? { ...prev.reserve, saldo: t01.reserva_restante } : prev.reserve,
      financialOverview: { ...prev.financialOverview, jurosUltimoMes: 0 },
    }));
    const confirmMsg: Message = {
      id: `treat_${Date.now()}`,
      role: 'assistant',
      content: `Feito. ${brlTxt(t01.saldo_quitado)} do saldo no rotativo foram quitados com a sua reserva. Você deixa de pagar ${brlTxt(t01.juros_evitados_mes)} de juros por mês e a reserva continua com ${brlTxt(t01.reserva_restante)}, ${t01.meses_cobertura_essenciais.toFixed(1)} meses das suas despesas essenciais.`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      actionTaken: 'flow_adjusted',
    };
    setMessages((prev) => [...prev, confirmMsg]);
  };


    setMessages((prev) => [...prev, confirmMsg]);
  };

  // Execution: Option B - Installment Treatment
  const handleConfirmInstallment = (plan: { count: number; value: number; total: number }) => {
    setTreatmentStatus('installment_active');
    // S4 vai derivar isto do T02 calculado; por ora só zera o rotativo na tela.
    setProfile((prev) => ({
      ...prev,
      card: { ...prev.card, outstandingBalance: 0, rotaryInterestCharged: 0 },
      financialOverview: { ...prev.financialOverview, jurosUltimoMes: 0 },
    }));

    const confirmMsg: Message = {
      id: `inst_${Date.now()}`,
      role: 'assistant',
      content: `🔒 Parcelamento ativado com sucesso! Congelamos o saldo em **${plan.count}x** fixas de **R$ ${plan.value.toFixed(2).replace('.', ',')}** a taxas pré-fixadas menores que o rotativo. Você eliminou a taxa de **14,8% ao mês** e manteve seus **R$ 5.480,00** intactos na reserva de emergência. A primeira parcela virá apenas na próxima fatura. Você pode salvar o resumo detalhado desta operação direto no seu Google Drive.`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      actionTaken: 'installment_active',
    };

    setMessages((prev) => [...prev, confirmMsg]);
  };

  // Reset conversation to initial state
  const handleReset = () => {
    setMessages(INITIAL_MESSAGES);
    setPushVisivel(true);
    setProfile(INITIAL_PROFILE);
    setTreatmentStatus('pending');
    setActiveModal('none');
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
          onOpenFinancialOverview={() => setActiveModal('financial_overview')}
          onOpenInvoice={() => setActiveModal('invoice_details')}
          onSpeak={speakText}
        />

        {/* Action Cards (Prescription / Closed Solutions) */}
        <PrescriptionFooter
          onSelectFlowAdjustment={() => setActiveModal('flow_adjustment')}
          onSelectInstallment={() => setActiveModal('installment')}
          onSendMessage={handleSendMessage}
          treatmentStatus={treatmentStatus}
          isTyping={isTyping}
          onResetTreatment={() => setTreatmentStatus('pending')}
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
