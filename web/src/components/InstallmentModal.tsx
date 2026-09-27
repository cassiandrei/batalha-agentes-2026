import React, { useState } from 'react';
import { ArrowRight, Calendar, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { OpcaoT02, SimulacaoT02 } from '../types';
import { brl, Botao, CampoIToken, HeroSucesso, Linha, Sheet } from './ui';

// S4: todo número desta tela vem de t02 (simular_parcelamento_fatura, no agente).
// Cabe e não cabe na regra aparecem em texto e ícone, não só em cor.
interface InstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (opcao: OpcaoT02, itoken: string, idempotencyKey: string) => Promise<boolean>;
  t02: SimulacaoT02 | null;
  onCelebrate?: () => void;
}

const novaChave = () => `t02-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const InstallmentModal: React.FC<InstallmentModalProps> = ({ isOpen, onClose, onConfirm, t02, onCelebrate }) => {
  const [prazoEscolhido, setPrazoEscolhido] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successView, setSuccessView] = useState(false);
  const [itoken, setItoken] = useState('');
  const [chave, setChave] = useState<string>(novaChave);

  const aprovadas = t02?.opcoes.filter((o) => o.aprovado) ?? [];
  const escolhida =
    t02?.opcoes.find((o) => o.prazo === prazoEscolhido && o.aprovado) ??
    (aprovadas.length ? aprovadas.reduce((a, b) => (a.juros_totais <= b.juros_totais ? a : b)) : null);

  const handleApply = async () => {
    if (!escolhida || isSubmitting) return;
    setIsSubmitting(true);
    const ok = await onConfirm(escolhida, itoken, chave);
    setIsSubmitting(false);
    if (!ok) return;
    setSuccessView(true);
    onCelebrate?.();
  };

  const handleFinish = () => {
    setSuccessView(false);
    setItoken('');
    setChave(novaChave());
    onClose();
  };

  return (
    <Sheet
      open={isOpen}
      onClose={successView ? handleFinish : onClose}
      icon={<div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white shrink-0" aria-hidden="true"><Calendar className="w-4 h-4" /></div>}
      tag="T02"
      title="Parcelar o saldo do rotativo"
      subtitle={successView ? 'Executado com o seu iToken e registrado uma vez só' : 'Prazos calculados pelo agente; a regra decide o que cabe no seu orçamento'}
      bodyKey={successView ? 'sucesso' : 'simulacao'}
      footer={
        !t02 ? undefined : !successView ? (
          <>
            {escolhida && <CampoIToken id="itoken-t02" valor={itoken} onChange={setItoken} />}
            <Botao onClick={handleApply} disabled={isSubmitting || !escolhida || itoken.length !== 6} className="w-full">
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <span>Confirmando…</span>
              </>
            ) : (
              <>
                <span>{escolhida ? `Confirmar ${escolhida.prazo}x de ${brl(escolhida.parcela)}` : 'Nenhum prazo cabe na regra'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
            </Botao>
          </>
        ) : (
          <Botao onClick={handleFinish} className="w-full">
            Voltar para a conversa <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Botao>
        )
      }
    >
      {!t02 ? (
        <p className="text-[13.5px] text-ink-2 leading-relaxed">
          Não há parcelamento disponível para você agora. Isso acontece quando não há saldo no rotativo ou quando a regra não permite oferta de crédito. Se quiser, fale com uma pessoa.
        </p>
      ) : !successView ? (
        <>
          <section className="bg-surface rounded-pedra p-4 border border-line shadow-card">
            <div className="divide-y divide-line">
              <Linha rotulo="Saldo a parcelar" valor={brl(t02.saldo)} />
              <Linha rotulo="Custo atual de juros por mês" valor={brl(t02.custo_mensal_juros_atual)} destaque="alert" />
              <Linha rotulo={`Taxa do parcelamento (faixa ${t02.faixa_risco})`} valor={`${(t02.taxa_mensal * 100).toLocaleString('pt-BR')}% ao mês`} destaque="accent" />
            </div>
            {t02.regra_atencao && (
              <p className="mt-2 text-[11.5px] text-warn-text bg-warn-soft border border-warn/40 rounded-xl px-3 py-2">
                Regra de atenção: só cabe prazo cuja parcela fique até o custo atual de juros ({brl(t02.custo_mensal_juros_atual)}).
              </p>
            )}
          </section>

          <div className="space-y-2" role="radiogroup" aria-label="Prazos do parcelamento">
            <h3 className="text-[13px] font-bold text-ink px-1">Prazos que cabem na regra</h3>
            {/* Prazo que não cabe na regra não é oferecido: só o motivo, em uma linha. */}
            {t02.opcoes.some((o) => !o.aprovado) && (
              <p className="text-[12px] text-low px-1">
                {t02.opcoes.filter((o) => !o.aprovado).map((o) => `${o.prazo}x`).join(', ')} não cabem na regra: a parcela passaria do custo mensal atual de juros ({brl(t02.custo_mensal_juros_atual)}).
              </p>
            )}
            {t02.opcoes.filter((o) => o.aprovado).map((o) => {
              const selecionada = escolhida?.prazo === o.prazo;
              return (
                <button
                  key={o.prazo}
                  type="button"
                  role="radio"
                  aria-checked={selecionada}
                  disabled={!o.aprovado}
                  onClick={() => setPrazoEscolhido(o.prazo)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    !o.aprovado ? 'bg-canvas border-line opacity-70 cursor-not-allowed' : selecionada ? 'bg-accent-soft/60 border-accent shadow-xs cursor-pointer' : 'bg-surface border-line hover:border-low cursor-pointer'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-bold text-ink">{o.prazo}x de {brl(o.parcela)}</span>
                      <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 ${o.aprovado ? 'bg-success-soft text-success-text' : 'bg-alert-soft text-alert-text'}`}>
                        {o.aprovado ? <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> : <XCircle className="w-3 h-3" aria-hidden="true" />}
                        {o.aprovado ? 'Cabe na regra' : 'Não cabe na regra'}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-mid leading-snug">{brl(o.juros_totais)} de juros no total · {o.motivo}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selecionada ? 'border-accent bg-accent' : 'border-line-strong'}`} aria-hidden="true">
                    {selecionada && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3.5 bg-surface rounded-pedra border border-line text-[12px] text-ink-2 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-ink">
              <ShieldCheck className="w-4 h-4 text-accent" aria-hidden="true" />
              <span>{t02.aviso}</span>
            </div>
            <p className="text-[11.5px] text-mid leading-relaxed">Primeira parcela em {t02.carencia_dias} dias. Nada é contratado sem a sua confirmação.</p>
          </div>
        </>
      ) : (
        <>
          <HeroSucesso tag="Confirmado" titulo="Parcelamento no lugar do rotativo" texto={escolhida ? `${escolhida.prazo}x de ${brl(escolhida.parcela)}. O rotativo para de correr.` : ''} />
          <section className="bg-surface rounded-pedra p-4 border border-line shadow-card">
            <h3 className="text-[15px] font-bold text-ink mb-1">Condição confirmada</h3>
            <div className="divide-y divide-line">
              <Linha rotulo="Plano" valor={escolhida ? `${escolhida.prazo}x de ${brl(escolhida.parcela)}` : '—'} />
              <Linha rotulo="Taxa" valor={`${(t02.taxa_mensal * 100).toLocaleString('pt-BR')}% ao mês`} />
              <Linha rotulo="Juros no total" valor={brl(escolhida?.juros_totais)} />
              <Linha rotulo="Primeira parcela" valor={`em ${t02.carencia_dias} dias`} />
              <Linha rotulo="Simulação" valor={<span className="font-mono text-[12px] font-medium text-mid">{t02.simulacao_id}</span>} />
            </div>
            <p className="text-[11px] text-mid mt-2">{t02.aviso}</p>
          </section>
          <section className="bg-surface rounded-pedra p-4 border border-line shadow-card">
            <h3 className="text-[15px] font-bold text-ink mb-2">Comparativo de fluxo mensal</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-canvas p-3 rounded-2xl border border-line"><span className="text-[11.5px] text-mid font-medium block">Mês anterior (rotativo)</span><span className="text-[18px] font-bold text-alert-text block mt-1.5 leading-tight">-{brl(t02.custo_mensal_juros_atual)}</span><span className="text-[11px] text-mid">em juros</span></div>
              <div className="bg-success-soft p-3 rounded-2xl border border-success/25"><span className="text-[11.5px] text-success-text font-semibold block">Próximos meses (parcela)</span><span className="text-[18px] font-bold text-success-text block mt-1.5 leading-tight">{escolhida ? brl(escolhida.parcela) : '—'}</span><span className="text-[11px] text-success-text font-medium">fixa, sem novos juros do rotativo</span></div>
            </div>
          </section>
        </>
      )}
    </Sheet>
  );
};
