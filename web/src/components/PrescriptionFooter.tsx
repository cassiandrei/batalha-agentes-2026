import React, { useState } from 'react';
import { Send, CheckCircle2, RefreshCw, UserRound } from 'lucide-react';
import { FinancialProfile } from '../types';

// S4: os cards vêm do motor de decisão (profile.principal, t01, t02). Faixa V não vê
// card de oferta: vê o motivo e o caminho para uma pessoa. Nenhum número escrito aqui.
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface PrescriptionFooterProps {
  profile: FinancialProfile;
  onSelectFlowAdjustment: () => void;
  onSelectInstallment: () => void;
  onSendMessage: (text: string) => void;
  treatmentStatus: 'pending' | 'flow_adjusted' | 'installment_active';
  isTyping: boolean;
  onResetTreatment: () => void;
  // S5: direitos de acesso e eliminação, sem passar pelo modelo
  onShowMemory: () => void;
  onForgetAll: () => void;
}

export const PrescriptionFooter: React.FC<PrescriptionFooterProps> = ({
  profile,
  onSelectFlowAdjustment,
  onSelectInstallment,
  onSendMessage,
  treatmentStatus,
  isTyping,
  onResetTreatment,
  onShowMemory,
  onForgetAll,
}) => {
  const [inputText, setInputText] = useState('');

  const quickPrompts = [
    'Qual a economia entre quitar à vista ou parcelar?',
    'Quanto paguei de juros no ano?',
    'Como recompor minha reserva?',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const isAdjusted = treatmentStatus !== 'pending';
  const { t01, t02, offers, principal } = profile;
  const melhorT02 = t02?.opcoes.filter((o) => o.aprovado).reduce<(typeof t02.opcoes)[number] | null>(
    (a, b) => (a === null || b.juros_totais < a.juros_totais ? b : a),
    null,
  );
  const semOferta = offers !== null && !offers.elegivel;

  const cardT01 = t01 && (
    <button
      type="button"
      onClick={onSelectFlowAdjustment}
      className={`w-full p-4 rounded-lg flex flex-col items-start transition-colors cursor-pointer group shadow-sm ${
        principal === 't01' ? 'bg-[#1FA37C] hover:bg-teal-600 text-white' : 'bg-transparent border border-[#1FA37C] hover:bg-gray-800 text-[#1FA37C]'
      }`}
    >
      <span className="font-bold text-base mb-1 flex items-center justify-between w-full">
        <span>Usar a reserva</span>
        {principal === 't01' && (
          <span className="text-[11px] bg-teal-700/60 font-semibold px-2 py-0.5 rounded text-teal-100">Recomendado</span>
        )}
      </span>
      <span className={`text-xs text-left ${principal === 't01' ? 'text-teal-100' : 'text-gray-300'}`}>
        Quitar {brl(t01.saldo_quitado)} do rotativo e deixar de pagar {brl(t01.juros_evitados_mes)} por mês; a reserva deixa de render{' '}
        {brl(t01.rendimento_liquido_perdido_mes)}.
      </span>
    </button>
  );

  const cardT02 = t02 && melhorT02 && (
    <button
      type="button"
      onClick={onSelectInstallment}
      className={`w-full p-4 rounded-lg flex flex-col items-start transition-colors cursor-pointer group ${
        principal === 't02' ? 'bg-[#1FA37C] hover:bg-teal-600 text-white' : 'bg-transparent border border-[#1FA37C] hover:bg-gray-800 text-[#1FA37C]'
      }`}
    >
      <span className="font-bold text-base mb-1 flex items-center justify-between w-full">
        <span>Parcelar o rotativo</span>
        {principal === 't02' && (
          <span className="text-[11px] bg-teal-700/60 font-semibold px-2 py-0.5 rounded text-teal-100">Recomendado</span>
        )}
      </span>
      <span className={`text-xs text-left ${principal === 't02' ? 'text-teal-100' : 'text-gray-300'}`}>
        {melhorT02.prazo}x de {brl(melhorT02.parcela)} a {(t02.taxa_mensal * 100).toLocaleString('pt-BR')}% ao mês, {brl(melhorT02.juros_totais)} de
        juros no total. {t02.aviso}
      </span>
    </button>
  );

  return (
    <footer className="p-4 bg-[#141414] border-t border-gray-800 space-y-3 shrink-0">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
        <button
          type="button"
          onClick={onShowMemory}
          className="whitespace-nowrap text-[11px] bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-full border border-gray-700 transition-colors shrink-0 cursor-pointer"
        >
          O que você lembra sobre mim?
        </button>
        <button
          type="button"
          onClick={onForgetAll}
          className="whitespace-nowrap text-[11px] bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-full border border-gray-700 transition-colors shrink-0 cursor-pointer"
        >
          Esqueça tudo
        </button>
        {quickPrompts.map((prompt, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSendMessage(prompt)}
            disabled={isTyping}
            className="whitespace-nowrap text-[11px] bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-full border border-gray-700 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {!isAdjusted ? (
        semOferta ? (
          <div className="bg-amber-950/20 border border-amber-800/40 p-3.5 rounded-lg space-y-2">
            <div className="text-xs font-semibold text-amber-200">Sem oferta de crédito por regra</div>
            <div className="text-[11px] text-gray-300">
              {offers?.motivo} {offers?.encaminhamento}
            </div>
            <button
              type="button"
              onClick={() => onSendMessage('Quero falar com uma pessoa.')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg cursor-pointer"
            >
              <UserRound className="w-3.5 h-3.5" />
              Falar com uma pessoa
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {principal === 't02' ? (
              <>
                {cardT02}
                {cardT01}
              </>
            ) : (
              <>
                {cardT01}
                {cardT02}
              </>
            )}
          </div>
        )
      ) : (
        <div className="bg-emerald-950/20 border border-emerald-800/40 p-3.5 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-emerald-300">
                {treatmentStatus === 'flow_adjusted' ? 'Reserva usada: rotativo quitado' : 'Parcelamento confirmado: rotativo parado'}
              </div>
              <div className="text-[11px] text-gray-400">
                {t01 ? `${brl(t01.juros_evitados_mes)} por mês que deixam de ir para juros.` : ''}
              </div>
            </div>
          </div>
          <button
            onClick={onResetTreatment}
            className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 p-1 hover:bg-gray-800 rounded transition-colors cursor-pointer"
            title="Simular outra opção"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tire dúvidas sobre seu orçamento com o Vita..."
            className="w-full bg-[#1E1E1E] border border-gray-700 focus:border-[#1FA37C] focus:ring-1 focus:ring-[#1FA37C] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={!inputText.trim() || isTyping}
          className="bg-[#1FA37C] hover:bg-teal-600 disabled:bg-gray-800 disabled:text-gray-600 text-white p-2.5 rounded-xl transition-colors cursor-pointer shrink-0"
          aria-label="Enviar mensagem para Vita"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </footer>
  );
};
