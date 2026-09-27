import React from 'react';
import { ArrowDown, ArrowRight, Calendar, CreditCard, Receipt, RefreshCw, ShieldCheck, TrendingUp, UserRound, Wallet, Zap, BarChart3 } from 'lucide-react';
import { FinancialProfile } from '../types';
import { brl, pct, Botao } from './ui';

// Cards do Vita-UI dentro da conversa. Todo número vem do perfil (agente); sem dado, "—".
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotuloMes = (anomes: number | null) => (anomes ? `${MESES[(anomes % 100) - 1]}/${Math.floor(anomes / 100)}` : '');

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  organizado: { rotulo: 'Organizado', classe: 'bg-success-soft text-success-text border-success/25' },
  atencao: { rotulo: 'Atenção', classe: 'bg-warn-soft text-warn-text border-warn/40' },
  critico: { rotulo: 'Crítico', classe: 'bg-alert-soft text-alert-text border-alert/25' },
};

interface RaioXProps {
  profile: FinancialProfile;
  onOpenInvoice: () => void;
  onOpenFinancialOverview: () => void;
}

/** Raio-X da fatura: o card principal do diagnóstico, no lugar do "Raio-X das suas contas". */
export const RaioXCard: React.FC<RaioXProps> = ({ profile, onOpenInvoice, onOpenFinancialOverview }) => {
  const { card, financialOverview: fo, reserve } = profile;
  const carregando = card.referenceMonth === null;
  const total = card.totalInvoice ?? 0;
  const pago = card.paidAmount ?? 0;
  const saldo = card.outstandingBalance ?? 0;
  const juros = card.rotaryInterestCharged ?? 0;
  const base = Math.max(total + juros, 1);
  const w = (v: number) => `${Math.max((v / base) * 100, v > 0 ? 3 : 0)}%`;
  const comp = fo.comprometimentoCreditoPct;
  const status = fo.status ? STATUS[fo.status] : null;

  return (
    <section className="bg-surface rounded-pedra p-4 shadow-card border border-line flex flex-col gap-3.5" aria-label="Raio-X da sua fatura">
      <div className="flex items-start justify-between gap-2.5 pb-2.5 border-b border-line">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-accent-soft flex items-center justify-center text-accent shrink-0" aria-hidden="true">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14.5px] font-bold text-ink leading-tight">Raio-X da sua fatura</h3>
            <p className="text-[11px] text-mid mt-0.5">{carregando ? 'Carregando o extrato…' : `Fatura de ${rotuloMes(card.referenceMonth)}, reconstruída do extrato`}</p>
          </div>
        </div>
        {comp !== null && (
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 whitespace-nowrap border self-start mt-0.5 ${
              comp >= 35 ? 'bg-alert-soft text-alert-text border-alert/20' : 'bg-canvas text-ink-3 border-line-strong'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${comp >= 35 ? 'bg-alert' : 'bg-low'}`} aria-hidden="true" />
            {pct(comp, 0)} da renda em crédito
          </span>
        )}
      </div>

      {!carregando && (
        <div className="bg-canvas p-3 rounded-xl flex flex-col gap-2 border border-line">
          <div className="flex justify-between items-center text-[11.5px]">
            <span className="text-mid">Fatura × o que foi pago</span>
            <span className="font-semibold text-ink">{brl(pago)} de {brl(total)}</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-line-strong overflow-hidden flex" role="img" aria-label={`Pago ${brl(pago)}, saldo no rotativo ${brl(saldo)}, juros ${brl(juros)}`}>
            <div className="bg-success h-full" style={{ width: w(pago) }} />
            <div className="bg-ink-3 h-full ml-0.5" style={{ width: w(saldo) }} />
            <div className="bg-alert h-full ml-0.5" style={{ width: w(juros) }} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-mid pt-0.5">
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden="true" /> pago</span>
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-ink-3" aria-hidden="true" /> saldo no rotativo</span>
            <span className="inline-flex items-center gap-1 font-medium text-alert-text"><span className="w-1.5 h-1.5 rounded-full bg-alert" aria-hidden="true" /> juros</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Row icon={<Receipt className="w-4 h-4" />} tom="neutro" rotulo="Total da fatura" valor={brl(card.totalInvoice)} tag={card.paymentMode === 'integral' ? 'Pagamento integral' : card.paymentMode === 'minimo' ? 'Pagamento mínimo' : card.paymentMode === 'parcial' ? 'Pagamento parcial' : undefined} />
        <Row icon={<ArrowDown className="w-4 h-4" />} tom="sucesso" rotulo="Você pagou" valor={brl(card.paidAmount)} tag="Pago" />
        <Row icon={<CreditCard className="w-4 h-4" />} tom="neutro" rotulo="Saldo que ficou no rotativo" valor={brl(card.outstandingBalance)} />
        <div className="bg-alert-soft/60 border border-alert/20 p-2.5 rounded-xl flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-alert/10 flex items-center justify-center text-alert shrink-0" aria-hidden="true">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-alert-text font-medium block leading-none mb-0.5">Juros do rotativo</span>
                <span className="text-[15px] font-bold text-alert-text">{brl(card.rotaryInterestCharged)}</span>
              </div>
            </div>
            <span className="text-[10px] text-alert-text font-semibold bg-alert/10 px-2 py-0.5 rounded-full shrink-0">neste mês</span>
          </div>
          {fo.mesesPagandoJuros !== null && (
            <div className="text-[11px] text-ink-2 pt-1.5 border-t border-alert/15 flex items-center justify-between gap-2">
              <span>
                <strong>{fo.mesesPagandoJuros}</strong> {fo.mesesPagandoJuros === 1 ? 'mês' : 'meses'} pagando juros em 2025
              </span>
              <span className="text-alert-text font-semibold whitespace-nowrap">{brl(fo.jurosEncargosAno)} no ano</span>
            </div>
          )}
        </div>
        {reserve && (
          <Row icon={<ShieldCheck className="w-4 h-4" />} tom="acento" rotulo={`Reserva em ${reserve.produto}`} valor={brl(reserve.saldo)} tag={reserve.liquidez === 'diaria' ? 'Liquidez diária' : reserve.liquidez} />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        {fo.score !== null && status ? (
          <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full border ${status.classe}`}>
            Índice {fo.score}/100 · {status.rotulo}
          </span>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onOpenInvoice} className="inline-flex items-center gap-1 min-h-11 px-3 rounded-full text-[12.5px] font-semibold text-ink-3 hover:text-ink hover:bg-canvas cursor-pointer">
            <Receipt className="w-3.5 h-3.5" aria-hidden="true" /> Fatura completa
          </button>
          <button type="button" onClick={onOpenFinancialOverview} className="inline-flex items-center gap-1 min-h-11 px-3 rounded-full text-[12.5px] font-semibold text-accent hover:bg-accent-soft cursor-pointer">
            <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" /> Visão financeira <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};

const Row: React.FC<{ icon: React.ReactNode; tom: 'neutro' | 'sucesso' | 'acento'; rotulo: string; valor: string; tag?: string }> = ({ icon, tom, rotulo, valor, tag }) => {
  const box = tom === 'sucesso' ? 'bg-success-soft/40 border-success/20' : tom === 'acento' ? 'bg-accent-soft/50 border-accent/20' : 'bg-surface border-line-strong/80';
  const ic = tom === 'sucesso' ? 'bg-success/10 text-success-text' : tom === 'acento' ? 'bg-accent/10 text-accent' : 'bg-line text-ink-3';
  const val = tom === 'sucesso' ? 'text-success-text' : tom === 'acento' ? 'text-accent-dark' : 'text-ink';
  return (
    <div className={`border p-2.5 rounded-xl flex items-center justify-between gap-2 ${box}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ic}`} aria-hidden="true">{icon}</div>
        <div className="min-w-0">
          <span className="text-[11px] text-mid block leading-none mb-0.5">{rotulo}</span>
          <span className={`text-[14px] font-bold ${val}`}>{valor}</span>
        </div>
      </div>
      {tag && <span className="text-[10px] text-ink-3 font-medium bg-canvas px-2 py-0.5 rounded-full border border-line-strong shrink-0">{tag}</span>}
    </div>
  );
};

interface TratamentosProps {
  profile: FinancialProfile;
  treatmentStatus: 'pending' | 'flow_adjusted' | 'installment_active';
  onSelectFlowAdjustment: () => void;
  onSelectInstallment: () => void;
  onTalkToHuman: () => void;
  onResetTreatment: () => void;
}

/** Tratamentos: T01 e T02 como opções do motor, ou a cena da faixa V sem oferta. */
export const TratamentosCard: React.FC<TratamentosProps> = ({ profile, treatmentStatus, onSelectFlowAdjustment, onSelectInstallment, onTalkToHuman, onResetTreatment }) => {
  const { t01, t02, offers, principal } = profile;
  const semOferta = offers !== null && !offers.elegivel;
  const melhorT02 = t02?.opcoes.filter((o) => o.aprovado).reduce<(typeof t02.opcoes)[number] | null>((a, b) => (a === null || b.juros_totais < a.juros_totais ? b : a), null) ?? null;

  if (treatmentStatus !== 'pending') {
    return (
      <section className="bg-success-soft border border-success/25 rounded-pedra p-4 flex items-center justify-between gap-3" aria-live="polite">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-success flex items-center justify-center text-white shrink-0" aria-hidden="true">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-success-text">{treatmentStatus === 'flow_adjusted' ? 'Reserva usada: rotativo quitado' : 'Parcelamento confirmado: rotativo parado'}</div>
            <div className="text-[11.5px] text-ink-3">{t01 ? `${brl(t01.juros_evitados_mes)} por mês deixam de ir para juros.` : ''}</div>
          </div>
        </div>
        <button type="button" onClick={onResetTreatment} className="w-11 h-11 rounded-full flex items-center justify-center text-success-text hover:bg-success/10 cursor-pointer shrink-0" title="Simular outra opção" aria-label="Simular outra opção">
          <RefreshCw className="w-4 h-4" />
        </button>
      </section>
    );
  }

  if (semOferta) {
    return (
      <section className="bg-surface rounded-pedra p-4 shadow-card border border-line flex flex-col gap-3" aria-label="Sem oferta de crédito por regra">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[14.5px] font-bold text-ink">Sem oferta de crédito por regra</h3>
          <span className="text-[10px] text-alert-text font-semibold bg-alert-soft px-2 py-0.5 rounded-full border border-alert/20 shrink-0">Faixa {offers?.faixa_risco}</span>
        </div>
        <p className="text-[13px] text-ink-2 leading-relaxed">{offers?.motivo}</p>
        <div className="bg-accent-soft border border-accent/20 rounded-2xl p-3.5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-white shrink-0" aria-hidden="true">
            <UserRound className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-semibold text-ink block">O caminho é com uma pessoa</span>
            <p className="text-[12.5px] text-ink leading-snug mt-0.5">{offers?.encaminhamento}</p>
          </div>
        </div>
        <Botao onClick={onTalkToHuman} className="w-full">
          <UserRound className="w-4 h-4" aria-hidden="true" /> Falar com uma pessoa
        </Botao>
      </section>
    );
  }

  if (!t01 && !melhorT02) return null;

  const cardT01 = t01 && (
    <Opcao
      principal={principal === 't01'}
      icon={<Zap className="w-4 h-4" />}
      titulo="Usar a reserva"
      linha1={`Quita ${brl(t01.saldo_quitado)} do rotativo e evita ${brl(t01.juros_evitados_mes)} de juros por mês`}
      linha2={`A reserva deixa de render ${brl(t01.rendimento_liquido_perdido_mes)}; ganho líquido de ${brl(t01.ganho_liquido_mes)} por mês`}
      onClick={onSelectFlowAdjustment}
    />
  );
  const cardT02 = t02 && melhorT02 && (
    <Opcao
      principal={principal === 't02'}
      icon={<Calendar className="w-4 h-4" />}
      titulo="Parcelar o rotativo"
      linha1={`${melhorT02.prazo}x de ${brl(melhorT02.parcela)} a ${(t02.taxa_mensal * 100).toLocaleString('pt-BR')}% ao mês`}
      linha2={`${brl(melhorT02.juros_totais)} de juros no total · ${t02.aviso}`}
      onClick={onSelectInstallment}
    />
  );

  return (
    <section className="bg-surface rounded-pedra p-4 shadow-card border border-line flex flex-col gap-3" aria-label="Tratamentos">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14.5px] font-bold text-ink">Tratamentos que cabem no seu orçamento</h3>
        <span className="text-[10px] text-ink-3 font-medium bg-canvas px-2 py-0.5 rounded-full border border-line-strong shrink-0">por regra</span>
      </div>
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
    </section>
  );
};

const Opcao: React.FC<{ principal: boolean; icon: React.ReactNode; titulo: string; linha1: string; linha2: string; onClick: () => void }> = ({ principal, icon, titulo, linha1, linha2, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 active:scale-[0.99] ${
      principal ? 'border-accent bg-accent-soft/50 shadow-xs hover:bg-accent-soft' : 'border-line bg-canvas hover:border-low'
    }`}
  >
    {/* Sem selo de recomendação: o Vita não enviesa a decisão financeira (27/09). */}
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${principal ? 'bg-accent text-white' : 'bg-surface text-mid border border-line'}`} aria-hidden="true">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-[13.5px] text-ink">{titulo}</span>
        <ArrowRight className={`w-4 h-4 shrink-0 ${principal ? 'text-accent' : 'text-low'}`} aria-hidden="true" />
      </div>
      <p className="text-[12.5px] text-ink-2 mt-0.5 leading-snug">{linha1}</p>
      <p className="text-[11.5px] text-mid mt-0.5 leading-snug">{linha2}</p>
    </div>
  </button>
);
