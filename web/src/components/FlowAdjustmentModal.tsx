import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, ArrowRight, Zap, Lock, DollarSign } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FlowAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isAlreadyAdjusted: boolean;
}

export const FlowAdjustmentModal: React.FC<FlowAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isAlreadyAdjusted,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successView, setSuccessView] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessView(true);
      
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#EC7000', '#FFFFFF', '#FFA726', '#4CAF50']
        });
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
            <div className="w-10 h-10 rounded-xl bg-[#EC7000] text-white flex items-center justify-center font-bold shadow-md shadow-orange-950/50">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#EC7000] bg-[#EC7000]/10 px-2 py-0.5 rounded border border-[#EC7000]/20">
                  Opção A
                </span>
                <h2 className="text-base font-semibold text-white">Ajuste de Fluxo com Reserva</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Quitação do saldo devedor e eliminação imediata de juros</p>
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
            {/* Value Callout */}
            <div className="p-4 bg-gradient-to-br from-[#EC7000]/15 to-[#181818] border border-[#EC7000]/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block">Saldo devedor a quitar</span>
                <span className="text-2xl font-bold text-white tracking-tight">R$ 1.200,00</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Economia de R$ 142,50/mês garantida
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-gray-400 block">Origem do recurso</span>
                <span className="text-xs font-semibold text-orange-200">CDB DI Liquidez Diária</span>
              </div>
            </div>

            {/* Visual Math Comparison */}
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Comparativo Financeiro Objetivo
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Cenário A: Sem Ajuste */}
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg space-y-1">
                  <div className="text-red-400 font-semibold text-[11px]">Cenário A: Sem Ajuste</div>
                  <div className="text-white font-bold text-sm">Custo de R$ 142,50/mês</div>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    Juros rotativos de ~14,8% ao mês acumulam R$ 1.710 em 12 meses (efeito bola de neve).
                  </p>
                </div>

                {/* Cenário B: Ajuste com Reserva */}
                <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg space-y-1">
                  <div className="text-emerald-400 font-semibold text-[11px]">Cenário B: Com Ajuste</div>
                  <div className="text-white font-bold text-sm">+ R$ 131,94/mês no bolso</div>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    A reserva deixa de render R$ 10,56 no CDB, mas você zera os R$ 142,50 de juros.
                  </p>
                </div>
              </div>
            </div>

            {/* Impact on Bruno's Reserve */}
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Sua Reserva de Emergência Pós-Ajuste</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-800/80">
                <span className="text-gray-400">Reserva de emergência atual:</span>
                <span className="font-semibold text-white">R$ 5.480,00</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-800/80">
                <span className="text-gray-400">Quitação do saldo devedor:</span>
                <span className="font-semibold text-[#EC7000]">- R$ 1.200,00</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5">
                <span className="text-gray-300 font-medium">Novo saldo da reserva:</span>
                <span className="font-bold text-emerald-400 text-sm">R$ 4.280,00</span>
              </div>

              <div className="p-2.5 bg-gray-900/70 rounded-lg text-[11px] text-gray-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Sua reserva continuará protegendo <strong>3,2 meses</strong> das suas despesas essenciais mensais.
                </span>
              </div>
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 text-[11px] text-gray-400 px-1">
              <Lock className="w-3.5 h-3.5 text-[#EC7000]" />
              <span>Transação segura e validada via iToken Itaú no aplicativo</span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Saldo Quitado com Sucesso!</h3>
              <p className="text-sm text-gray-300 mt-2 max-w-sm mx-auto">
                O saldo devedor de <strong>R$ 1.200,00</strong> foi coberto com a sua reserva. A cobrança de juros rotativos foi zerada imediatamente.
              </p>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 max-w-xs mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Juros economizados:</span>
                <span className="font-bold text-emerald-400">R$ 142,50 / mês</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Saldo da reserva:</span>
                <span className="font-bold text-white">R$ 4.280,00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Protocolo:</span>
                <span className="font-mono text-gray-400">IAI-8834-OK</span>
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
                Voltar
              </button>
              <button
                onClick={handleApply}
                disabled={isSubmitting}
                className="bg-[#EC7000] hover:bg-[#d96600] text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-orange-950/40 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processando via iToken...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar Ajuste (R$ 1.200)</span>
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
