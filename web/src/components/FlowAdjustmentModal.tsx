import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, ArrowRight, Zap, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SimulacaoT01 } from '../types';

// S3: todo número desta tela vem de t01 (simular_uso_reserva, no agente). Nada escrito à mão.
const brl = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface FlowAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isAlreadyAdjusted: boolean;
  t01: SimulacaoT01 | null;
}

export const FlowAdjustmentModal: React.FC<FlowAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isAlreadyAdjusted,
  t01,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successView, setSuccessView] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!t01) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessView(true);
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#1FA37C', '#FFFFFF', '#4CAF50'] });
      } catch {
        // ignore
      }
      onConfirm();
    }, 1000);
  };

  const handleFinish = () => {
    setSuccessView(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-[#181818] border border-gray-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#1E1E1E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1FA37C] text-white flex items-center justify-center font-bold shadow-md shadow-teal-950/50">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1FA37C] bg-[#1FA37C]/10 px-2 py-0.5 rounded border border-[#1FA37C]/20">
                  T01
                </span>
                <h2 className="text-base font-semibold text-white">Usar a reserva para quitar o rotativo</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Simulação calculada pelo agente; nada acontece sem a sua confirmação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!t01 ? (
          <div className="p-6 text-sm text-gray-300">
            {isAlreadyAdjusted
              ? 'Este tratamento já foi aplicado nesta sessão.'
              : 'Não há simulação disponível: sem saldo no rotativo ou sem aplicação com liquidez diária.'}
          </div>
        ) : !successView ? (
          <div className="p-5 overflow-y-auto space-y-5">
            {/* Valor */}
            <div className="p-4 bg-gradient-to-br from-[#1FA37C]/15 to-[#181818] border border-[#1FA37C]/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block">Saldo no rotativo a quitar</span>
                <span className="text-2xl font-bold text-white tracking-tight">{brl(t01.saldo_quitado)}</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Evita {brl(t01.juros_evitados_mes)} de juros por mês
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-gray-400 block">Origem do recurso</span>
                <span className="text-xs font-semibold text-teal-200">{t01.origem_reserva}</span>
              </div>
            </div>

            {/* Comparativo */}
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Comparativo por mês</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg space-y-1">
                  <div className="text-red-400 font-semibold text-[11px]">Sem fazer nada</div>
                  <div className="text-white font-bold text-sm">{brl(t01.juros_evitados_mes)} de juros</div>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    Rotativo a {(t01.taxa_rotativo_mes * 100).toLocaleString('pt-BR')}% ao mês sobre {brl(t01.saldo_quitado)}.
                  </p>
                </div>
                <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg space-y-1">
                  <div className="text-emerald-400 font-semibold text-[11px]">Usando a reserva</div>
                  <div className="text-white font-bold text-sm">+ {brl(t01.ganho_liquido_mes)} no bolso</div>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    A reserva deixa de render {brl(t01.rendimento_liquido_perdido_mes)} líquidos ({brl(t01.rendimento_bruto_perdido_mes)} brutos, IR de{' '}
                    {(t01.ir_aliquota * 100).toLocaleString('pt-BR')}%).
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                CDI de {t01.cdi_aa_pct.toLocaleString('pt-BR')}% a.a. ({t01.cdi_origem === 'bcb_sgs' ? `Banco Central, série 4389, ${t01.cdi_data}` : 'valor fixo declarado'}), aplicação a{' '}
                {(t01.percentual_cdi * 100).toLocaleString('pt-BR')}% do CDI.
              </p>
            </div>

            {/* Reserva depois */}
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Sua reserva depois</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-800/80">
                <span className="text-gray-400">Reserva hoje:</span>
                <span className="font-semibold text-white">{brl(t01.reserva_antes)}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-800/80">
                <span className="text-gray-400">Quitação do rotativo:</span>
                <span className="font-semibold text-[#1FA37C]">- {brl(t01.saldo_quitado)}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5">
                <span className="text-gray-300 font-medium">Novo saldo da reserva:</span>
                <span className="font-bold text-emerald-400 text-sm">{brl(t01.reserva_restante)}</span>
              </div>
              <div className="p-2.5 bg-gray-900/70 rounded-lg text-[11px] text-gray-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  A reserva continua cobrindo <strong>{t01.meses_cobertura_essenciais.toLocaleString('pt-BR')} meses</strong> das suas despesas essenciais.
                </span>
              </div>
            </div>

            {/* Por que recomendamos isso */}
            <details className="bg-[#121212] border border-gray-800 rounded-xl p-4 text-xs text-gray-300">
              <summary className="cursor-pointer font-semibold text-gray-200">Por que recomendamos isso</summary>
              <p className="mt-2 leading-relaxed text-gray-400">{t01.justificativa}</p>
            </details>

            <div className="flex items-center gap-2 text-[11px] text-gray-400 px-1">
              <Lock className="w-3.5 h-3.5 text-[#1FA37C]" />
              <span>Nada é executado sem a sua confirmação no aplicativo</span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Saldo quitado</h3>
              <p className="text-sm text-gray-300 mt-2 max-w-sm mx-auto">
                {brl(t01.saldo_quitado)} do rotativo foram cobertos com a sua reserva. Os juros deste ciclo param aqui.
              </p>
            </div>
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 max-w-xs mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Juros evitados:</span>
                <span className="font-bold text-emerald-400">{brl(t01.juros_evitados_mes)} / mês</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Saldo da reserva:</span>
                <span className="font-bold text-white">{brl(t01.reserva_restante)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Simulação:</span>
                <span className="font-mono text-gray-400">{t01.simulacao_id}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#141414] flex gap-3 justify-end">
          {!successView ? (
            <>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-transparent hover:bg-gray-800 text-gray-400 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handleApply}
                disabled={isSubmitting || !t01 || isAlreadyAdjusted}
                className="bg-[#1FA37C] hover:bg-[#178a68] disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-teal-950/40 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Confirmando...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar ({t01 ? brl(t01.saldo_quitado) : '—'})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleFinish}
              className="bg-[#1FA37C] hover:bg-[#178a68] text-white text-xs font-semibold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 w-full justify-center cursor-pointer"
            >
              <span>Voltar para a conversa</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
