import React, { useState } from 'react';
import { Send, CheckCircle2, RefreshCw } from 'lucide-react';

interface PrescriptionFooterProps {
  onSelectFlowAdjustment: () => void;
  onSelectInstallment: () => void;
  onSendMessage: (text: string) => void;
  treatmentStatus: 'pending' | 'flow_adjusted' | 'installment_active';
  isTyping: boolean;
  onResetTreatment: () => void;
}

export const PrescriptionFooter: React.FC<PrescriptionFooterProps> = ({
  onSelectFlowAdjustment,
  onSelectInstallment,
  onSendMessage,
  treatmentStatus,
  isTyping,
  onResetTreatment,
}) => {
  const [inputText, setInputText] = useState('');

  const quickPrompts = [
    'Qual a economia entre quitar à vista ou parcelar?',
    'Posso adiantar parcelas com desconto?',
    'Como recompor minha reserva de emergência?',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const isAdjusted = treatmentStatus !== 'pending';

  return (
    <footer className="p-4 bg-[#141414] border-t border-gray-800 space-y-3 shrink-0">
      {/* Quick suggestions chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
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

      {/* Action Cards (Required Flow: Two Closed Solutions) */}
      {!isAdjusted ? (
        <div className="space-y-3">
          {/* Opção A: Ajuste de Fluxo */}
          <button 
            type="button"
            onClick={onSelectFlowAdjustment}
            className="w-full bg-[#1FA37C] hover:bg-teal-600 text-white p-4 rounded-lg flex flex-col items-start transition-colors cursor-pointer group shadow-sm"
          >
            <span className="font-bold text-base mb-1 group-hover:translate-x-0.5 transition-transform flex items-center justify-between w-full">
              <span>Opção A: Ajuste de Fluxo</span>
              <span className="text-[11px] bg-teal-700/60 font-semibold px-2 py-0.5 rounded text-teal-100">
                Zerar juros imediatamente
              </span>
            </span>
            <span className="text-xs text-teal-100 text-left">
              Usar o dinheiro da Reserva de Emergência para quitar o saldo e zerar os juros.
            </span>
          </button>
          
          {/* Opção B: Parcelar Fatura */}
          <button 
            type="button"
            onClick={onSelectInstallment}
            className="w-full bg-transparent border border-[#1FA37C] hover:bg-gray-800 text-[#1FA37C] p-4 rounded-lg flex flex-col items-start transition-colors cursor-pointer group"
          >
            <span className="font-bold text-base mb-1 group-hover:translate-x-0.5 transition-transform flex items-center justify-between w-full">
              <span>Opção B: Parcelar Fatura</span>
              <span className="text-[11px] bg-teal-950/40 border border-[#1FA37C]/40 font-semibold px-2 py-0.5 rounded text-[#1FA37C]">
                Taxas menores
              </span>
            </span>
            <span className="text-xs text-left text-gray-300">
              Parcelar a fatura em taxas pré-fixadas menores que o rotativo.
            </span>
          </button>
        </div>
      ) : (
        /* Adjusted Status Bar */
        <div className="bg-emerald-950/20 border border-emerald-800/40 p-3.5 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-emerald-300">
                {treatmentStatus === 'flow_adjusted'
                  ? 'Opção A Concluída (Juros Rotativos Zerados)'
                  : 'Opção B Ativada (Parcelamento Pré-fixado)'}
              </div>
              <div className="text-[11px] text-gray-400">
                Economia de <strong>R$ 142,50/mês</strong> garantida para seu orçamento.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onResetTreatment}
              className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 p-1 hover:bg-gray-800 rounded transition-colors cursor-pointer"
              title="Simular outra opção"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Freeform Message Input */}
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
