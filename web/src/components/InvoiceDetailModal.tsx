import React from 'react';
import { AlertCircle, Receipt, CheckCircle2, MinusCircle } from 'lucide-react';
import { FinancialProfile, InvoiceMonth } from '../types';
import { brl, Linha, Sheet } from './ui';

// S1: todo número desta tela vem de profile.card (agente). Nada escrito à mão.
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

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ isOpen, onClose, profile }) => {
  const { card } = profile;
  const carregando = card.referenceMonth === null;
  const historico = [...card.invoiceHistory].sort((a, b) => b.anomes - a.anomes);

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      icon={<div className="w-7 h-7 rounded-lg bg-accent-soft flex items-center justify-center text-accent shrink-0" aria-hidden="true"><Receipt className="w-4 h-4" /></div>}
      title="Detalhamento da fatura"
      subtitle={carregando ? 'Carregando…' : `Fatura de ${rotuloMes(card.referenceMonth as number)}, reconstruída do seu extrato`}
    >
      <section className="bg-surface rounded-pedra p-4 border border-line shadow-card">
        <div className="divide-y divide-line">
          <Linha rotulo="Total da fatura" valor={brl(card.totalInvoice)} />
          <Linha rotulo={card.paymentMode ? `${MODO[card.paymentMode]}` : 'Pagamento realizado'} valor={`- ${brl(card.paidAmount)}`} destaque="success" />
          <Linha rotulo="Saldo que ficou no rotativo" valor={brl(card.outstandingBalance)} destaque="alert" />
        </div>
        <div className="mt-2 flex items-center justify-between text-[12.5px] bg-alert-soft/70 p-2.5 rounded-xl border border-alert/20">
          <span className="text-alert-text font-medium">Juros do rotativo neste ciclo</span>
          <span className="text-alert-text font-bold">+ {brl(card.rotaryInterestCharged)}</span>
        </div>
      </section>

      <div className="space-y-2">
        <h3 className="text-[13px] font-bold text-ink px-1">Como você pagou a fatura em 2025</h3>
        <div className="divide-y divide-line bg-surface border border-line rounded-pedra overflow-hidden">
          {historico.map((m) => {
            const comJuros = m.juros_rotativo > 0;
            const Icon = m.modo === 'integral' ? CheckCircle2 : comJuros ? AlertCircle : MinusCircle;
            return (
              <div key={m.anomes} className="p-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${comJuros ? 'bg-alert-soft text-alert' : 'bg-line text-ink-3'}`} aria-hidden="true">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-[12.5px] font-semibold ${comJuros ? 'text-alert-text' : 'text-ink'}`}>
                      {rotuloMes(m.anomes)} · {MODO[m.modo]}
                    </div>
                    <div className="text-[11px] text-mid">
                      pago {brl(m.pago)}
                      {m.fatura_total_reconstruida !== null && ` de ${brl(m.fatura_total_reconstruida)}`}
                    </div>
                  </div>
                </div>
                <div className={`text-[12px] font-bold whitespace-nowrap ${comJuros ? 'text-alert-text' : 'text-mid'}`}>{comJuros ? `juros ${brl(m.juros_rotativo)}` : 'sem juros'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
};
