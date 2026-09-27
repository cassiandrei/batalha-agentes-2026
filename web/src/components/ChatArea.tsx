import React, { useRef, useEffect } from 'react';
import { Volume2, CheckCheck, Sparkles, BarChart3, ShieldCheck } from 'lucide-react';
import { AcaoAgente, Message } from '../types';

interface ChatAreaProps {
  messages: Message[];
  isTyping: boolean;
  onOpenFinancialOverview: () => void;
  onOpenInvoice: () => void;
  onSpeak: (text: string) => void;
  // S2: botões estruturados vindos do agente
  onAction: (acao: AcaoAgente) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isTyping,
  onOpenFinancialOverview,
  onOpenInvoice,
  onSpeak,
  onAction,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-5 flex flex-col scroll-smooth">
      {/* Date Pill / Conversation Start */}
      <div className="flex justify-center my-1">
        <span className="text-[11px] text-gray-500 bg-gray-900/60 px-3 py-1 rounded-full border border-gray-800">
          Hoje · Itaú Organização e Bem-Estar Financeiro
        </span>
      </div>

      {messages.map((message) => {
        const isAssistant = message.role === 'assistant';

        if (isAssistant) {
          return (
            <div key={message.id} className="flex flex-col items-start max-w-[88%] sm:max-w-[85%] group animate-fade-in">
              {/* ia.i Assistant Message - Exact styling from prompt */}
              <div className="bg-gray-800/50 border-l-2 border-[#EC7000] p-4 rounded-r-xl rounded-bl-xl text-sm leading-relaxed text-gray-200 shadow-sm relative">
                {/* Format markdown bold if present */}
                <div 
                  className="space-y-1.5"
                  dangerouslySetInnerHTML={{
                    __html: message.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
                      .replace(/\n\n/g, '<br/><br/>')
                  }}
                />

                {/* S2: botões renderizados a partir das ações do agente, não do front */}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-gray-700/60 flex flex-wrap gap-2">
                    {message.actions.map((acao, i) => (
                      <button
                        key={`${acao.tipo}-${i}`}
                        onClick={() => onAction(acao)}
                        className={
                          i === 0
                            ? 'inline-flex items-center gap-1.5 text-xs text-[#EC7000] hover:text-orange-300 font-semibold bg-[#EC7000]/10 hover:bg-[#EC7000]/20 px-2.5 py-1 rounded-md transition-colors cursor-pointer'
                            : 'inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-white font-medium bg-gray-700/50 hover:bg-gray-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer'
                        }
                      >
                        {acao.tipo === 'abrir_visao_financeira' && <BarChart3 className="w-3.5 h-3.5" />}
                        <span>{acao.rotulo}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Status badge if treatment was applied */}
                {message.actionTaken === 'flow_adjusted' && (
                  <div className="mt-3 p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-xs text-emerald-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Cobrança de R$ 142,50/mês eliminada com a Reserva Itaú</span>
                    </div>
                  </div>
                )}

                {message.actionTaken === 'installment_active' && (
                  <div className="mt-3 p-2.5 bg-orange-950/30 border border-[#EC7000]/40 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-xs text-orange-200">
                      <Sparkles className="w-4 h-4 text-[#EC7000] shrink-0" />
                      <span>Taxa congelada em parcelas fixas sem novos juros rotativos</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Message metadata & listen button */}
              <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-gray-500">
                <span className="font-semibold text-gray-400">Vita · IA</span>
                <span>·</span>
                <span>{message.timestamp}</span>
                <button
                  onClick={() => onSpeak(message.content)}
                  className="opacity-0 group-hover:opacity-100 hover:text-[#EC7000] transition-opacity p-0.5 cursor-pointer"
                  title="Ouvir mensagem"
                >
                  <Volume2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        }

        // User Message - Exact styling from prompt
        return (
          <div key={message.id} className="flex flex-col items-end self-end max-w-[88%] sm:max-w-[85%] group animate-fade-in">
            <div className="bg-gray-700 p-4 rounded-l-xl rounded-br-xl text-sm leading-relaxed text-white shadow-sm">
              {message.content}
            </div>
            <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-gray-500">
              <span>{message.timestamp}</span>
              <CheckCheck className="w-3 h-3 text-[#EC7000]" />
            </div>
          </div>
        );
      })}

      {/* Typing indicator */}
      {isTyping && (
        <div className="flex flex-col items-start max-w-[85%] animate-fade-in">
          <div className="bg-gray-800/50 border-l-2 border-[#EC7000] p-3.5 rounded-r-xl rounded-bl-xl text-sm text-gray-400 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EC7000] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EC7000] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EC7000] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-gray-400">ia.i está calculando as opções...</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </main>
  );
};
