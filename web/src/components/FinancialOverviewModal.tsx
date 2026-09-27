import React from 'react';
import { X, TrendingUp, AlertTriangle, ShieldCheck, DollarSign, ArrowRight, BarChart3, PieChart } from 'lucide-react';
import { FinancialProfile } from '../types';

// S3: todo número desta tela vem de profile.financialOverview, profile.reserve e
// profile.t01 (agente). Nada escrito à mão; sem dado, mostra "—".
const brl = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: number | null | undefined, casas = 1) =>
  v === null || v === undefined ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`;

const STATUS: Record<string, { rotulo: string; cor: string }> = {
  organizado: { rotulo: 'Organizado', cor: 'text-emerald-400' },
  atencao: { rotulo: 'Atenção: juros do rotativo pesando', cor: 'text-amber-400' },
  critico: { rotulo: 'Crítico', cor: 'text-red-400' },
};

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

  const fo = profile.financialOverview;
  const reserva = profile.reserve;
  const t01 = profile.t01;
  const isAdjusted = treatmentStatus !== 'pending';
  const score = fo.score;
  const status = fo.status ? STATUS[fo.status] : null;
  const cobertura =
    reserva?.saldo != null && fo.essenciaisMediaMensal ? reserva.saldo / fo.essenciaisMediaMensal : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-[#181818] border border-gray-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#1E1E1E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1FA37C]/10 border border-[#1FA37C]/30 flex items-center justify-center text-[#1FA37C]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Visão Financeira</h2>
              <p className="text-xs text-gray-400">Diagnóstico de 2025, calculado sobre o seu extrato</p>
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
          {/* Índice */}
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1FA37C]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">Índice de Organização Financeira</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-extrabold text-white tracking-tight">{score ?? '—'}</span>
                  <span className="text-sm text-gray-500 font-medium">/ 100</span>
                </div>
                {status && (
                  <div className={`flex items-center gap-1.5 mt-2 text-xs font-semibold ${status.cor}`}>
                    {fo.status === 'organizado' ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    <span>{status.rotulo}</span>
                  </div>
                )}
              </div>
              <div className="relative w-20 h-20 flex items-center justify-center" aria-hidden="true">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-gray-800" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[#1FA37C]" strokeDasharray={`${score ?? 0}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute text-xs font-bold text-gray-300">{score ?? '—'}</span>
              </div>
            </div>

            {fo.componentes && (
              <div className="mt-4 pt-3 border-t border-gray-800/80 grid grid-cols-4 gap-2 text-center">
                {(
                  [
                    ['Poupança', fo.componentes.poupanca],
                    ['Dreno', fo.componentes.dreno],
                    ['Crédito', fo.componentes.comprometimento],
                    ['Juros no ano', fo.componentes.cronicidade],
                  ] as const
                ).map(([nome, valor]) => (
                  <div key={nome}>
                    <div className="text-sm font-bold text-white">{valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</div>
                    <div className="text-[10px] text-gray-500">{nome} / 25</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Indicadores */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-gray-400 font-semibold px-1">Indicadores do seu extrato</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`p-4 rounded-xl border ${isAdjusted ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-red-950/20 border-red-900/40'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300">Juros do rotativo no mês</span>
                  <DollarSign className={`w-4 h-4 ${isAdjusted ? 'text-emerald-400' : 'text-red-400'}`} />
                </div>
                <div className="text-lg font-bold text-white">{brl(fo.jurosUltimoMes)}</div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {brl(fo.jurosEncargosAno)} de juros e encargos em 2025, em {fo.mesesPagandoJuros ?? '—'} meses
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#141414] border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300">Reserva ({reserva?.produto ?? 'sem aplicação'})</span>
                  <ShieldCheck className="w-4 h-4 text-[#1FA37C]" />
                </div>
                <div className="text-lg font-bold text-white">{brl(reserva?.saldo)}</div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {cobertura !== null
                    ? `${cobertura.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses de despesas essenciais`
                    : 'sem aplicação com liquidez diária'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#141414] border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300">Poupança sobre entradas</span>
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-lg font-bold text-white">{pct(fo.poupancaSobreEntradasPct)}</div>
                <p className="text-[11px] text-gray-400 mt-1">Do que entrou em 2025, quanto sobrou</p>
              </div>

              <div className="p-4 rounded-xl bg-[#141414] border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300">Crédito na renda</span>
                  <PieChart className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-lg font-bold text-white">{pct(fo.comprometimentoCreditoPct)}</div>
                <p className="text-[11px] text-gray-400 mt-1">Parcelas de financiamento e empréstimo sobre a renda; dreno de {pct(fo.drenoPctRenda, 2)} da renda com juros e tarifas</p>
              </div>
            </div>
          </div>

          {/* Recomendação: T01 quando existir */}
          {!isAdjusted && t01 && (
            <div className="p-4 bg-teal-950/20 border border-[#1FA37C]/40 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1FA37C]">
                <BarChart3 className="w-4 h-4" />
                <span>Recomendação principal: usar a reserva</span>
              </div>
              <p className="text-xs text-gray-200">
                Quitar {brl(t01.saldo_quitado)} do rotativo com a reserva evita {brl(t01.juros_evitados_mes)} de juros por mês; a
                reserva deixa de render {brl(t01.rendimento_liquido_perdido_mes)} líquidos. Ganho de {brl(t01.ganho_liquido_mes)} por mês.
              </p>
              <details className="text-[11px] text-gray-400">
                <summary className="cursor-pointer text-gray-300">Por que recomendamos isso</summary>
                <p className="mt-1.5 leading-relaxed">{t01.justificativa}</p>
              </details>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    onClose();
                    onSelectOption('flow');
                  }}
                  className="bg-[#1FA37C] hover:bg-[#178a68] text-white text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Simular usar a reserva</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onSelectOption('installment');
                  }}
                  className="border border-[#1FA37C] text-[#1FA37C] hover:bg-gray-800 text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Comparar com parcelar</span>
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
