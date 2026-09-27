import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { SimulacaoT01 } from '../types';
import { brl, Botao, CampoIToken, HeroSucesso, Linha, Sheet } from './ui';

// S3: todo número desta tela vem de t01 (simular_uso_reserva, no agente). Nada escrito à mão.
interface FlowAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // S5: devolve true se o agente confirmou; a chave de idempotência é uma por abertura do modal
  onConfirm: (itoken: string, idempotencyKey: string) => Promise<boolean>;
  isAlreadyAdjusted: boolean;
  t01: SimulacaoT01 | null;
  // confete dentro da moldura do aparelho (App decide se há movimento)
  onCelebrate?: () => void;
}

const novaChave = () => `t01-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const FlowAdjustmentModal: React.FC<FlowAdjustmentModalProps> = ({ isOpen, onClose, onConfirm, isAlreadyAdjusted, t01, onCelebrate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successView, setSuccessView] = useState(false);
  const [itoken, setItoken] = useState('');
  const [chave, setChave] = useState<string>(novaChave);

  const handleApply = async () => {
    if (!t01 || isSubmitting) return;
    setIsSubmitting(true);
    const ok = await onConfirm(itoken, chave);
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
      icon={<div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white shrink-0" aria-hidden="true"><Zap className="w-4 h-4" /></div>}
      tag="T01"
      title="Usar a reserva para quitar o rotativo"
      subtitle={successView ? 'Executado com o seu iToken e registrado uma vez só' : 'Simulação calculada pelo agente; nada acontece sem a sua confirmação'}
      bodyKey={successView ? 'sucesso' : 'simulacao'}
      footer={
        !successView ? (
          <>
            {t01 && !isAlreadyAdjusted && <CampoIToken id="itoken-t01" valor={itoken} onChange={setItoken} />}
            <Botao onClick={handleApply} disabled={isSubmitting || !t01 || isAlreadyAdjusted || itoken.length !== 6} className="w-full">
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <span>Confirmando…</span>
              </>
            ) : (
              <>
                <span>Confirmar {t01 ? brl(t01.saldo_quitado) : ''}</span>
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
      {!t01 ? (
        <p className="text-[13.5px] text-ink-2 leading-relaxed">
          {isAlreadyAdjusted ? 'Este tratamento já foi aplicado nesta sessão.' : 'Não há simulação disponível: sem saldo no rotativo ou sem aplicação com liquidez diária.'}
        </p>
      ) : !successView ? (
        <>
          <section className="bg-accent-soft/60 border border-accent/25 rounded-pedra p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11.5px] text-mid block">Saldo no rotativo a quitar</span>
              <span className="text-[26px] font-bold text-ink tracking-tight leading-tight">{brl(t01.saldo_quitado)}</span>
              <span className="text-[12px] text-success-text font-medium block mt-1">Evita {brl(t01.juros_evitados_mes)} de juros por mês</span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] text-mid block">Origem</span>
              <span className="text-[12.5px] font-semibold text-accent-dark">{t01.origem_reserva}</span>
            </div>
          </section>

          <section className="bg-surface rounded-pedra p-4 border border-line shadow-card space-y-3">
            <h3 className="text-[13px] font-bold text-ink">Comparativo por mês</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-canvas p-3 rounded-2xl border border-line flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[11.5px] text-mid font-medium"><span className="w-2 h-2 rounded-full bg-alert shrink-0" aria-hidden="true" />Sem fazer nada</div>
                <div className="mt-2">
                  <span className="text-[18px] font-bold text-alert-text block leading-tight">-{brl(t01.juros_evitados_mes)}</span>
                  <span className="text-[11px] text-mid">em juros, a {(t01.taxa_rotativo_mes * 100).toLocaleString('pt-BR')}% ao mês</span>
                </div>
              </div>
              <div className="bg-success-soft p-3 rounded-2xl border border-success/25 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[11.5px] text-success-text font-semibold"><span className="w-2 h-2 rounded-full bg-success shrink-0" aria-hidden="true" />Usando a reserva</div>
                <div className="mt-2">
                  <span className="text-[18px] font-bold text-success-text block leading-tight">+{brl(t01.ganho_liquido_mes)}</span>
                  <span className="text-[11px] text-success-text font-medium">no bolso por mês</span>
                </div>
              </div>
            </div>
            <p className="text-[11.5px] text-mid leading-relaxed">
              A reserva deixa de render {brl(t01.rendimento_liquido_perdido_mes)} líquidos ({brl(t01.rendimento_bruto_perdido_mes)} brutos, IR de {(t01.ir_aliquota * 100).toLocaleString('pt-BR')}%). CDI de {t01.cdi_aa_pct.toLocaleString('pt-BR')}% a.a. ({t01.cdi_origem === 'bcb_sgs' ? `Banco Central, série 4389, ${t01.cdi_data}` : 'valor fixo declarado'}), aplicação a {(t01.percentual_cdi * 100).toLocaleString('pt-BR')}% do CDI.
            </p>
          </section>

          <section className="bg-surface rounded-pedra p-4 border border-line shadow-card">
            <h3 className="text-[13px] font-bold text-ink mb-1">Sua reserva depois</h3>
            <div className="divide-y divide-line">
              <Linha rotulo="Reserva hoje" valor={brl(t01.reserva_antes)} />
              <Linha rotulo="Quitação do rotativo" valor={`- ${brl(t01.saldo_quitado)}`} destaque="accent" />
              <Linha rotulo="Novo saldo da reserva" valor={brl(t01.reserva_restante)} destaque="success" />
            </div>
            <div className="mt-2 p-2.5 bg-success-soft rounded-xl text-[12px] text-success-text flex items-center gap-2 border border-success/20">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Continua cobrindo <strong>{t01.meses_cobertura_essenciais.toLocaleString('pt-BR')} meses</strong> das suas despesas essenciais.</span>
            </div>
          </section>

          <details className="bg-surface rounded-pedra p-4 border border-line text-[12.5px] text-ink-2">
            <summary className="cursor-pointer font-semibold text-ink min-h-11 flex items-center">Por que recomendamos isso</summary>
            <p className="mt-2 leading-relaxed text-mid">{t01.justificativa}</p>
          </details>
        </>
      ) : (
        <>
          <HeroSucesso tag="Confirmado" titulo="Rotativo quitado com a reserva" texto={`${brl(t01.saldo_quitado)} do rotativo foram cobertos. Os juros deste ciclo param aqui.`} />
          <section className="bg-surface rounded-pedra p-4 border border-line shadow-card">
            <h3 className="text-[15px] font-bold text-ink mb-1">Condição confirmada</h3>
            <div className="divide-y divide-line">
              <Linha rotulo="Juros evitados" valor={`${brl(t01.juros_evitados_mes)} / mês`} destaque="success" />
              <Linha rotulo="Saldo da reserva" valor={brl(t01.reserva_restante)} />
              <Linha rotulo="Simulação" valor={<span className="font-mono text-[12px] font-medium text-mid">{t01.simulacao_id}</span>} />
            </div>
          </section>
          <section className="bg-surface rounded-pedra p-4 border border-line shadow-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[15px] font-bold text-ink">Comparativo de fluxo mensal</h3>
              <span className="text-[11px] font-semibold text-success-text bg-success-soft px-2.5 py-1 rounded-full border border-success/20">sem rotativo</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-canvas p-3 rounded-2xl border border-line"><span className="text-[11.5px] text-mid font-medium block">Mês anterior (com rotativo)</span><span className="text-[18px] font-bold text-alert-text block mt-1.5 leading-tight">-{brl(t01.juros_evitados_mes)}</span><span className="text-[11px] text-mid">em juros</span></div>
              <div className="bg-success-soft p-3 rounded-2xl border border-success/25"><span className="text-[11.5px] text-success-text font-semibold block">Próximo mês</span><span className="text-[18px] font-bold text-success-text block mt-1.5 leading-tight">+{brl(t01.ganho_liquido_mes)}</span><span className="text-[11px] text-success-text font-medium">de folga no orçamento</span></div>
            </div>
          </section>
        </>
      )}
    </Sheet>
  );
};
