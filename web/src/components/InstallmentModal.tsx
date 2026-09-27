import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, Shield, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface InstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (plan: { count: number; value: number; total: number }) => void;
}

export const InstallmentModal: React.FC<InstallmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<number>(6);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successView, setSuccessView] = useState(false);

  if (!isOpen) return null;

  const plans = [
    { count: 3, value: 412.00, total: 1236.00, tag: 'Menor Custo Total' },
    { count: 6, value: 214.00, total: 1284.00, tag: 'Recomendado pela ia.i' },
    { count: 12, value: 112.00, total: 1344.00, tag: 'Menor Parcela Mensal' },
  ];

  const currentChoice = plans.find(p => p.count === selectedPlan) || plans[1];

  const handleApply = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessView(true);

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#EC7000', '#FF8F00', '#FFFFFF']
        });
      } catch {
        // ignore
      }

      onConfirm(currentChoice);
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
            <div className="w-10 h-10 rounded-xl border border-[#EC7000] text-[#EC7000] flex items-center justify-center font-bold bg-[#EC7000]/10">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#EC7000] bg-[#EC7000]/10 px-2 py-0.5 rounded border border-[#EC7000]/20">
                  Opção B
                </span>
                <h2 className="text-base font-semibold text-white">Parcelar Saldo da Fatura</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Fixe as parcelas em taxas pré-fixadas menores que o rotativo</p>
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

        {/* Content */}
        {!successView ? (
          <div className="p-5 overflow-y-auto space-y-5">
            {/* Rates Comparison */}
            <div className="p-4 bg-[#121212] border border-gray-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Saldo financiado:</span>
                <span className="font-semibold text-white">R$ 1.200,00</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Taxa rotativa anterior:</span>
                <span className="text-red-400 font-semibold line-through">14,80% ao mês</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-800">
                <span className="text-emerald-400 font-medium">Nova taxa pré-fixada:</span>
                <span className="text-emerald-400 font-bold">1,49% ao mês (fixa)</span>
              </div>
            </div>

            {/* Plan Options Selector */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
                Selecione o plano ideal para seu orçamento mensal:
              </label>

              <div className="space-y-2.5">
                {plans.map((p) => {
                  const isSelected = selectedPlan === p.count;
                  return (
                    <button
                      key={p.count}
                      type="button"
                      onClick={() => setSelectedPlan(p.count)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#EC7000]/15 border-[#EC7000] ring-1 ring-[#EC7000]'
                          : 'bg-[#141414] border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {p.count}x de R$ {p.value.toFixed(2).replace('.', ',')}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            isSelected ? 'bg-[#EC7000] text-white' : 'bg-gray-800 text-gray-300'
                          }`}>
                            {p.tag}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Total parcelado: R$ {p.total.toFixed(2).replace('.', ',')} (previsibilidade total)
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-[#EC7000] bg-[#EC7000]' : 'border-gray-600'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulation breakdown */}
            <div className="p-3.5 bg-gray-900/60 rounded-xl border border-gray-800/80 text-xs text-gray-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Primeira parcela apenas no próximo vencimento</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                As parcelas virão fixas nas próximas faturas. Você não precisa desembolsar nada hoje e mantém 100% da sua reserva de emergência intacta no CDB Itaú.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-[#EC7000]/10 border-2 border-[#EC7000] rounded-full flex items-center justify-center mx-auto text-[#EC7000] animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Parcelamento Contratado!</h3>
              <p className="text-sm text-gray-300 mt-2 max-w-sm mx-auto">
                Seu plano de <strong>{currentChoice.count}x de R$ {currentChoice.value.toFixed(2).replace('.', ',')}</strong> foi ativado. O rotativo foi eliminado.
              </p>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 max-w-xs mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Plano:</span>
                <span className="font-bold text-white">{currentChoice.count} parcelas mensais fixas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Valor da parcela:</span>
                <span className="font-bold text-[#EC7000]">R$ {currentChoice.value.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">1º Vencimento:</span>
                <span className="font-semibold text-gray-200">10/11/2026</span>
              </div>
            </div>

            <p className="text-xs text-blue-400 pt-1">
              Você pode salvar o resumo detalhado desta operação direto no seu Google Drive.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-800 bg-[#141414] flex gap-3 justify-end">
          {!successView ? (
            <>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-transparent hover:bg-gray-800 text-gray-400 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleApply}
                disabled={isSubmitting}
                className="bg-[#EC7000] hover:bg-[#d96600] text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Contratando...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar {currentChoice.count}x de R$ {currentChoice.value.toFixed(2).replace('.', ',')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleFinish}
              className="bg-[#EC7000] hover:bg-[#d96600] text-white text-xs font-semibold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 w-full justify-center cursor-pointer"
            >
              <span>Ver conversa com ia.i</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
