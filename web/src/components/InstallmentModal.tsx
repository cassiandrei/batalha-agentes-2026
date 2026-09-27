import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, XCircle, Shield, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { OpcaoT02, SimulacaoT02 } from '../types';

// S4: todo número desta tela vem de t02 (simular_parcelamento_fatura, no agente).
// Aprovado e rejeitado aparecem em texto e ícone, não só em cor.
const brl = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface InstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (opcao: OpcaoT02) => void;
  t02: SimulacaoT02 | null;
}

export const InstallmentModal: React.FC<InstallmentModalProps> = ({ isOpen, onClose, onConfirm, t02 }) => {
  const [prazoEscolhido, setPrazoEscolhido] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successView, setSuccessView] = useState(false);

  if (!isOpen) return null;

  const aprovadas = t02?.opcoes.filter((o) => o.aprovado) ?? [];
  const escolhida =
    (t02?.opcoes.find((o) => o.prazo === prazoEscolhido && o.aprovado)) ??
    (aprovadas.length ? aprovadas.reduce((a, b) => (a.juros_totais <= b.juros_totais ? a : b)) : null);

  const handleApply = () => {
    if (!escolhida) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessView(true);
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 }, colors: ['#1FA37C', '#FFFFFF'] });
      } catch {
        // ignore
      }
      onConfirm(escolhida);
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
            <div className="w-10 h-10 rounded-xl border border-[#1FA37C] text-[#1FA37C] flex items-center justify-center font-bold bg-[#1FA37C]/10">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1FA37C] bg-[#1FA37C]/10 px-2 py-0.5 rounded border border-[#1FA37C]/20">
                  T02
                </span>
                <h2 className="text-base font-semibold text-white">Parcelar o saldo do rotativo</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Prazos calculados pelo agente; a regra decide o que cabe no seu orçamento</p>
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

        {!t02 ? (
          <div className="p-6 text-sm text-gray-300">
            Não há parcelamento disponível para você agora. Isso acontece quando não há saldo no rotativo ou quando a regra
            não permite oferta de crédito. Se quiser, fale com uma pessoa.
          </div>
        ) : !successView ? (
          <div className="p-5 overflow-y-auto space-y-5">
            {/* Resumo */}
            <div className="p-4 bg-[#121212] border border-gray-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Saldo a parcelar:</span>
                <span className="font-semibold text-white">{brl(t02.saldo)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Custo atual de juros por mês:</span>
                <span className="text-red-400 font-semibold">{brl(t02.custo_mensal_juros_atual)}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-800">
                <span className="text-emerald-400 font-medium">Taxa do parcelamento (faixa {t02.faixa_risco}):</span>
                <span className="text-emerald-400 font-bold">{(t02.taxa_mensal * 100).toLocaleString('pt-BR')}% ao mês</span>
              </div>
              {t02.regra_atencao && (
                <p className="text-[11px] text-amber-300 pt-1">
                  Regra de atenção: só entra prazo cuja parcela fique até o custo atual de juros ({brl(t02.custo_mensal_juros_atual)}).
                </p>
              )}
            </div>

            {/* Prazos */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">Prazos calculados</span>
              <div className="space-y-2.5" role="radiogroup" aria-label="Prazos do parcelamento">
                {t02.opcoes.map((o) => {
                  const selecionada = escolhida?.prazo === o.prazo;
                  return (
                    <button
                      key={o.prazo}
                      type="button"
                      role="radio"
                      aria-checked={selecionada}
                      disabled={!o.aprovado}
                      onClick={() => setPrazoEscolhido(o.prazo)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                        !o.aprovado
                          ? 'bg-[#141414] border-gray-800 opacity-70 cursor-not-allowed'
                          : selecionada
                            ? 'bg-[#1FA37C]/15 border-[#1FA37C] ring-1 ring-[#1FA37C] cursor-pointer'
                            : 'bg-[#141414] border-gray-800 hover:border-gray-700 cursor-pointer'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {o.prazo}x de {brl(o.parcela)}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium inline-flex items-center gap-1 ${
                              o.aprovado ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-950/50 text-red-300'
                            }`}
                          >
                            {o.aprovado ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {o.aprovado ? 'Aprovado' : 'Rejeitado'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {brl(o.juros_totais)} de juros no total · {o.motivo}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          selecionada ? 'border-[#1FA37C] bg-[#1FA37C]' : 'border-gray-600'
                        }`}
                        aria-hidden="true"
                      >
                        {selecionada && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 bg-gray-900/60 rounded-xl border border-gray-800/80 text-xs text-gray-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>{t02.aviso}</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Primeira parcela em {t02.carencia_dias} dias. Nada é contratado sem a sua confirmação no aplicativo.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-[#1FA37C]/10 border-2 border-[#1FA37C] rounded-full flex items-center justify-center mx-auto text-[#1FA37C] animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Parcelamento confirmado</h3>
              <p className="text-sm text-gray-300 mt-2 max-w-sm mx-auto">
                {escolhida ? `${escolhida.prazo}x de ${brl(escolhida.parcela)}` : ''}. O rotativo para de correr.
              </p>
            </div>
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 max-w-xs mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Juros no total:</span>
                <span className="font-bold text-white">{brl(escolhida?.juros_totais)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Simulação:</span>
                <span className="font-mono text-gray-400">{t02.simulacao_id}</span>
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
                disabled={isSubmitting || !escolhida}
                className="bg-[#1FA37C] hover:bg-[#178a68] disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Confirmando...</span>
                  </>
                ) : (
                  <>
                    <span>{escolhida ? `Confirmar ${escolhida.prazo}x de ${brl(escolhida.parcela)}` : 'Nenhum prazo aprovado'}</span>
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
