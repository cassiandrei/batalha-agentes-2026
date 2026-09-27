import React from 'react';
import { TrendingUp, AlertTriangle, ShieldCheck, ArrowRight, BarChart3, PieChart, Zap } from 'lucide-react';
import { FinancialProfile } from '../types';
import { brl, pct, Botao, Sheet } from './ui';

// S3: todo número desta tela vem de profile.financialOverview, profile.reserve e
// profile.t01 (agente). Nada escrito à mão; sem dado, mostra "—".
const STATUS: Record<string, { rotulo: string; classe: string }> = {
  organizado: { rotulo: 'Organizado', classe: 'text-success-text' },
  atencao: { rotulo: 'Atenção: juros do rotativo pesando', classe: 'text-warn-text' },
  critico: { rotulo: 'Crítico', classe: 'text-alert-text' },
};

interface FinancialOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FinancialProfile;
  treatmentStatus: 'pending' | 'flow_adjusted' | 'installment_active';
  onSelectOption: (type: 'flow' | 'installment') => void;
}

export const FinancialOverviewModal: React.FC<FinancialOverviewModalProps> = ({ isOpen, onClose, profile, treatmentStatus, onSelectOption }) => {
  const fo = profile.financialOverview;
  const reserva = profile.reserve;
  const t01 = profile.t01;
  const isAdjusted = treatmentStatus !== 'pending';
  const score = fo.score;
  const status = fo.status ? STATUS[fo.status] : null;
  const cobertura = reserva?.saldo != null && fo.essenciaisMediaMensal ? reserva.saldo / fo.essenciaisMediaMensal : null;

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      icon={<div className="w-7 h-7 rounded-lg bg-accent-soft flex items-center justify-center text-accent shrink-0" aria-hidden="true"><BarChart3 className="w-4 h-4" /></div>}
      title="Visão financeira"
      subtitle="Diagnóstico de 2025, calculado sobre o seu extrato"
      footer={
        !isAdjusted && t01 ? (
          <div className="grid grid-cols-2 gap-2">
            <Botao onClick={() => { onClose(); onSelectOption('flow'); }}>
              <Zap className="w-4 h-4" aria-hidden="true" /> Usar a reserva
            </Botao>
            <Botao variante="secundario" onClick={() => { onClose(); onSelectOption('installment'); }}>
              Comparar com parcelar <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Botao>
          </div>
        ) : undefined
      }
    >
      <section className="bg-surface rounded-pedra p-4 border border-line shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[12px] text-mid font-medium">Índice de Organização Financeira</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-[40px] font-extrabold text-ink tracking-tight leading-none">{score ?? '—'}</span>
              <span className="text-[13px] text-mid font-medium">/ 100</span>
            </div>
            {status && (
              <div className={`flex items-center gap-1.5 mt-2 text-[12.5px] font-semibold ${status.classe}`}>
                {fo.status === 'organizado' ? <ShieldCheck className="w-4 h-4" aria-hidden="true" /> : <AlertTriangle className="w-4 h-4" aria-hidden="true" />}
                <span>{status.rotulo}</span>
              </div>
            )}
          </div>
        </div>
        {score !== null && (
          <div className="mt-3 w-full h-2.5 rounded-full bg-line overflow-hidden" role="img" aria-label={`Índice ${score} de 100`}>
            <div className="h-full bg-accent rounded-full" style={{ width: `${score}%` }} />
          </div>
        )}
        {fo.componentes && (
          <div className="mt-4 pt-3 border-t border-line grid grid-cols-4 gap-2 text-center">
            {(
              [
                ['Poupança', fo.componentes.poupanca],
                ['Dreno', fo.componentes.dreno],
                ['Crédito', fo.componentes.comprometimento],
                ['Juros no ano', fo.componentes.cronicidade],
              ] as const
            ).map(([nome, valor]) => (
              <div key={nome}>
                <div className="text-[14px] font-bold text-ink">{valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</div>
                <div className="text-[10.5px] text-mid">{nome} / 25</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="space-y-2">
        <h3 className="text-[13px] font-bold text-ink px-1">Indicadores do seu extrato</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <Indicador tom={isAdjusted ? 'sucesso' : 'alerta'} icone={<TrendingUp className="w-4 h-4" />} rotulo="Juros do rotativo no mês" valor={brl(fo.jurosUltimoMes)} nota={`${brl(fo.jurosEncargosAno)} de juros e encargos em 2025, em ${fo.mesesPagandoJuros ?? '—'} meses`} />
          <Indicador tom="acento" icone={<ShieldCheck className="w-4 h-4" />} rotulo={`Reserva (${reserva?.produto ?? 'sem aplicação'})`} valor={brl(reserva?.saldo)} nota={cobertura !== null ? `${cobertura.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses de despesas essenciais` : 'sem aplicação com liquidez diária'} />
          <Indicador tom="neutro" icone={<TrendingUp className="w-4 h-4" />} rotulo="Poupança sobre entradas" valor={pct(fo.poupancaSobreEntradasPct)} nota="Do que entrou em 2025, quanto sobrou" />
          <Indicador tom="neutro" icone={<PieChart className="w-4 h-4" />} rotulo="Crédito na renda" valor={pct(fo.comprometimentoCreditoPct)} nota={`Parcelas sobre a renda; dreno de ${pct(fo.drenoPctRenda, 2)} da renda com juros e tarifas`} />
        </div>
      </div>

      {!isAdjusted && t01 && (
        <section className="bg-accent-soft/60 border border-accent/25 rounded-pedra p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-accent-dark">
            <Zap className="w-4 h-4" aria-hidden="true" />
            <span>Recomendação principal: usar a reserva</span>
          </div>
          <p className="text-[13px] text-ink-2 leading-relaxed">
            Quitar {brl(t01.saldo_quitado)} do rotativo com a reserva evita {brl(t01.juros_evitados_mes)} de juros por mês; a reserva deixa de render {brl(t01.rendimento_liquido_perdido_mes)} líquidos. Ganho de {brl(t01.ganho_liquido_mes)} por mês.
          </p>
          <details className="text-[12px] text-mid">
            <summary className="cursor-pointer text-ink-3 font-semibold min-h-11 flex items-center">Por que recomendamos isso</summary>
            <p className="mt-1 leading-relaxed">{t01.justificativa}</p>
          </details>
        </section>
      )}
    </Sheet>
  );
};

const Indicador: React.FC<{ tom: 'alerta' | 'sucesso' | 'acento' | 'neutro'; icone: React.ReactNode; rotulo: string; valor: string; nota: string }> = ({ tom, icone, rotulo, valor, nota }) => {
  const box = { alerta: 'bg-alert-soft/60 border-alert/20', sucesso: 'bg-success-soft border-success/25', acento: 'bg-accent-soft/60 border-accent/20', neutro: 'bg-surface border-line' }[tom];
  const ic = { alerta: 'text-alert', sucesso: 'text-success-text', acento: 'text-accent', neutro: 'text-ink-3' }[tom];
  return (
    <div className={`p-3.5 rounded-2xl border ${box}`}>
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="text-[11.5px] font-medium text-ink-3 leading-tight">{rotulo}</span>
        <span className={`shrink-0 ${ic}`} aria-hidden="true">{icone}</span>
      </div>
      <div className="text-[17px] font-bold text-ink">{valor}</div>
      <p className="text-[11px] text-mid mt-1 leading-snug">{nota}</p>
    </div>
  );
};
