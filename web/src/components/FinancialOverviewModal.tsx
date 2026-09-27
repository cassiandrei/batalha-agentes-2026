import React from 'react';
import { X, TrendingUp, AlertTriangle, ShieldCheck, DollarSign, ArrowRight, BarChart3, PieChart } from 'lucide-react';
import { FinancialProfile } from '../types';

interface FinancialOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FinancialProfile;
  treatmentStatus: 'pending' | 'flow_adjusted' | 'installment_active';
  onSelectOption: (type: 'flow' | 'installment') => void;
}

export const FinancialOverviewModal: React.FC<FinancialOverviewModalProps> = ({
  isOpen,
  onClose,
  profile,
  treatmentStatus,
  onSelectOption,
}) => {
  if (!isOpen) return null;

  const isAdjusted = treatmentStatus !== 'pending';
  const score = isAdjusted ? 94 : 72;
  const statusLabel = isAdjusted ? 'Orçamento Otimizado (Juros Eliminados)' : 'Alerta: Pagamento de Juros Rotativos';
  const statusColor = isAdjusted ? 'text-emerald-400' : 'text-amber-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#181818] border border-gray-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#1E1E1E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EC7000]/10 border border-[#EC7000]/30 flex items-center justify-center text-[#EC7000]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Visão Financeira & Orçamento</h2>
              <p className="text-xs text-gray-400">Análise de gastos e eficiência patrimonial de Bruno</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Main Score Card */}
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#EC7000]/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">Índice de Organização Financeira</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-extrabold text-white tracking-tight">{score}</span>
                  <span className="text-sm text-gray-500 font-medium">/ 100</span>
                </div>
                <div className={`flex items-center gap-1.5 mt-2 text-xs font-semibold ${statusColor}`}>
                  {isAdjusted ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  <span>{statusLabel}</span>
                </div>
              </div>

              {/* Visual gauge */}
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={isAdjusted ? "text-emerald-500" : "text-[#EC7000]"}
                    strokeDasharray={`${score}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-xs font-bold text-gray-300">
                  {score}%
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-800/80 text-xs text-gray-300 leading-relaxed">
              {isAdjusted ? (
                <span>
                  Seu orçamento está equilibrado. O custo com juros rotativos de <strong>R$ 142,50/mês</strong> foi zerado e seu fluxo de caixa livre foi normalizado.
                </span>
              ) : (
                <span>
                  Identificamos um <strong>gasto invisível de R$ 142,50/mês</strong> proveniente de juros rotativos da fatura. A perda anual acumulada no rotativo atinge <strong>R$ 1.710,00</strong> se o saldo não for renegociado.
                </span>
              )}
            </div>
          </div>

          {/* Financial Indicators Grid */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-gray-400 font-semibold px-1">Indicadores do Seu Orçamento</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Gasto Invisível com Juros */}
              <div className={`p-4 rounded-xl border ${isAdjusted ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-red-950/20 border-red-900/40'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300">Custo com Juros (Rotativo)</span>
                  <DollarSign className={`w-4 h-4 ${isAdjusted ? 'text-emerald-400' : 'text-red-400'}`} />
                </div>
                <div className="text-lg font-bold text-white">
                  {isAdjusted ? 'R$ 0,00' : 'R$ 142,50 / mês'}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {isAdjusted ? 'Juros zerados, saldo liquidado ou renegociado' : 'Taxa rotativa de 14,8% a.m. ativa na fatura'}
                </p>
              </div>

              {/* Reserva de Emergência */}
              <div className="p-4 rounded-xl bg-[#141414] border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300">Reserva de Emergência</span>
                  <ShieldCheck className="w-4 h-4 text-[#EC7000]" />
                </div>
                <div className="text-lg font-bold text-white">
                  {treatmentStatus === 'flow_adjusted' ? 'R$ 4.280,00' : 'R$ 5.480,00'}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {treatmentStatus === 'flow_adjusted' ? '3,2 meses de despesas básicas protegidas' : '4,1 meses de custos essenciais cobertos'}
                </p>
              </div>

              {/* Dinheiro Livre */}
              <div className="p-4 rounded-xl bg-[#141414] border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300">Dinheiro Livre (Margem)</span>
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-lg font-bold text-white">
                  {isAdjusted ? '84%' : '68%'}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Percentual de renda disponível após pagamento de despesas fixas
                </p>
              </div>

              {/* Organização Orçamentária */}
              <div className="p-4 rounded-xl bg-[#141414] border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300">Despesas Flexíveis</span>
                  <PieChart className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-lg font-bold text-white">18,4%</div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Gastos com serviços de assinatura e lazer recorrentes
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Prompt if not adjusted */}
          {!isAdjusted && (
            <div className="p-4 bg-orange-950/20 border border-[#EC7000]/40 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#EC7000]">
                <BarChart3 className="w-4 h-4" />
                <span>Opções de Ajuste Recomendadas</span>
              </div>
              <p className="text-xs text-gray-200">
                Zere a cobrança de <strong>R$ 142,50</strong> agora escolhendo uma das soluções fechadas calculadas pela ia.i:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    onClose();
                    onSelectOption('flow');
                  }}
                  className="bg-[#EC7000] hover:bg-[#d96600] text-white text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Opção A: Ajuste de Fluxo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onSelectOption('installment');
                  }}
                  className="border border-[#EC7000] text-[#EC7000] hover:bg-gray-800 text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Opção B: Parcelar Fatura</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#141414] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
