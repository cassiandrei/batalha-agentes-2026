import React from 'react';
import { X, AlertCircle, Receipt, CheckCircle2, MinusCircle } from 'lucide-react';
import { FinancialProfile, InvoiceMonth } from '../types';

// S1: todo número desta tela vem de profile.card (agente). Nada escrito à mão.
const brl = (v: number | null | undefined) =>
  v === null || v === undefined
    ? '—'
    : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotuloMes = (anomes: number) => `${MESES[(anomes % 100) - 1]}/${Math.floor(anomes / 100)}`;
const MODO: Record<InvoiceMonth['modo'], string> = {
  integral: 'Pagamento integral',
  parcial: 'Pagamento parcial',
  minimo: 'Pagamento mínimo',
};

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FinancialProfile;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  if (!isOpen) return null;

  const { card } = profile;
  const carregando = card.referenceMonth === null;
  const historico = [...card.invoiceHistory].sort((a, b) => b.anomes - a.anomes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#181818] border border-gray-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#1E1E1E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-white">
              <Receipt className="w-5 h-5 text-[#EC7000]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Detalhamento da Fatura</h2>
              <p className="text-xs text-gray-400">
                {carregando ? 'Carregando…' : `Fatura de ${rotuloMes(card.referenceMonth as number)}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Summary Card */}
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Total da Fatura</span>
              <span className="text-lg font-bold text-white">{brl(card.totalInvoice)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">
                {card.paymentMode ? `${MODO[card.paymentMode]} realizado:` : 'Pagamento realizado:'}
              </span>
              <span className="text-emerald-400 font-semibold">- {brl(card.paidAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-800">
              <span className="text-red-400 font-medium">Saldo no Rotativo:</span>
              <span className="text-red-400 font-bold text-sm">{brl(card.outstandingBalance)}</span>
            </div>
            <div className="flex items-center justify-between text-xs bg-red-950/20 p-2.5 rounded-lg border border-red-900/30">
              <span className="text-red-300 font-medium">Encargo rotativo deste ciclo:</span>
              <span className="text-red-400 font-bold">+ {brl(card.rotaryInterestCharged)}</span>
            </div>
          </div>

          {/* Histórico da fatura, mês a mês (vw_fatura_mensal via agente) */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block px-1">
              Como você pagou a fatura em 2025
            </span>

            <div className="divide-y divide-gray-800/80 bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
              {historico.map((m) => {
                const comJuros = m.juros_rotativo > 0;
                const Icon = m.modo === 'integral' ? CheckCircle2 : comJuros ? AlertCircle : MinusCircle;
                return (
                  <div key={m.anomes} className="p-3.5 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        comJuros ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-300'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-semibold ${comJuros ? 'text-red-300' : 'text-gray-200'}`}>
                          {rotuloMes(m.anomes)} · {MODO[m.modo]}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          pago {brl(m.pago)}
                          {m.fatura_total_reconstruida !== null && ` de ${brl(m.fatura_total_reconstruida)}`}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs font-bold ${comJuros ? 'text-red-400' : 'text-gray-500'}`}>
                      {comJuros ? `juros ${brl(m.juros_rotativo)}` : 'sem juros'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#141414] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
