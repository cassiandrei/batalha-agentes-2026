import React from 'react';
import { BarChart3, Receipt, Volume2, VolumeX, Smartphone, Monitor } from 'lucide-react';

interface HeaderProps {
  onOpenFinancialOverview: () => void;
  onOpenInvoice: () => void;
  onReset: () => void;
  speechEnabled: boolean;
  onToggleSpeech: () => void;
  treatmentStatus: 'pending' | 'flow_adjusted' | 'installment_active';
  isMobileFrame: boolean;
  onToggleFrame: () => void;
  // S1: vem do perfil; null até a S3 definir o índice. Nada de número fixo aqui.
  score: number | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenFinancialOverview,
  onOpenInvoice,
  onReset,
  speechEnabled,
  onToggleSpeech,
  treatmentStatus,
  isMobileFrame,
  onToggleFrame,
  score,
}) => {
  const isHealthy = treatmentStatus !== 'pending';

  return (
    <header className="flex items-center justify-between px-4 py-3.5 border-b border-gray-800 bg-[#1E1E1E] shrink-0 sticky top-0 z-30 select-none">
      {/* Brand Identity */}
      <div className="flex items-center gap-2.5">
        <div className="bg-[#1FA37C] text-white font-bold px-2.5 py-1 rounded text-sm tracking-wide shadow-sm shadow-teal-900/30">
          Vita
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-gray-200 font-light text-xl tracking-tight">Vita</span>
          <span className="hidden sm:inline text-[11px] text-gray-500 font-normal">
            organização financeira
          </span>
        </div>
      </div>

      {/* Quick Access Badges & Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Financial Overview quick trigger */}
        <button
          onClick={onOpenFinancialOverview}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            isHealthy
              ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-900/30'
              : 'bg-teal-950/30 text-[#1FA37C] border border-[#1FA37C]/30 hover:bg-[#1FA37C]/20'
          }`}
          title="Ver Visão Financeira"
        >
          <BarChart3 className={`w-3.5 h-3.5 ${!isHealthy ? 'text-[#1FA37C]' : 'text-emerald-400'}`} />
          <span className="hidden xs:inline">Visão Financeira</span>
          {score !== null && (
            <span className="text-[10px] font-bold opacity-80">{score}%</span>
          )}
        </button>

        {/* Invoice trigger */}
        <button
          onClick={onOpenInvoice}
          className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800/80 rounded-lg transition-colors cursor-pointer"
          title="Ver detalhes da fatura"
        >
          <Receipt className="w-4 h-4" />
        </button>

        {/* Speech toggle */}
        <button
          onClick={onToggleSpeech}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            speechEnabled ? 'text-[#1FA37C] bg-[#1FA37C]/10' : 'text-gray-500 hover:text-gray-300'
          }`}
          title={speechEnabled ? 'Voz ativada (clique para silenciar)' : 'Ativar leitura por voz'}
        >
          {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Frame Toggle (Desktop helper) */}
        <button
          onClick={onToggleFrame}
          className="hidden md:flex p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800/60 rounded-lg transition-colors cursor-pointer"
          title={isMobileFrame ? 'Expandir para tela cheia' : 'Modo aplicativo móvel'}
        >
          {isMobileFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
        </button>

        {/* Fechar button (Exact style from prompt) */}
        <button
          onClick={onReset}
          className="text-[#1FA37C] hover:text-teal-400 text-sm font-medium px-2 py-1 rounded transition-colors ml-1 cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </header>
  );
};
