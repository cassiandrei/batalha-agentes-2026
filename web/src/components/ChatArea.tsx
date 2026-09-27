import React, { useRef, useEffect } from 'react';
import { Volume2, BarChart3, Receipt, Zap, Calendar, UserRound, BookOpen, ShieldCheck, Sparkles, Eraser } from 'lucide-react';
import { AcaoAgente, FinancialProfile, Message } from '../types';
import { RaioXCard, TratamentosCard } from './Cards';
import { Chip, VitaMark } from './ui';

interface ChatAreaProps {
  messages: Message[];
  isTyping: boolean;
  profile: FinancialProfile;
  treatmentStatus: 'pending' | 'flow_adjusted' | 'installment_active';
  onOpenFinancialOverview: () => void;
  onOpenInvoice: () => void;
  onSelectFlowAdjustment: () => void;
  onSelectInstallment: () => void;
  onResetTreatment: () => void;
  onTalkToHuman: () => void;
  onSpeak: (text: string) => void;
  // S2: botões estruturados vindos do agente
  onAction: (acao: AcaoAgente) => void;
  // S5: resposta à pergunta de consentimento de memória (sem modelo)
  onConsent: (sim: boolean) => void;
  // S5: direito de eliminação, oferecido dentro da resposta de "o que você lembra"
  onForgetAll: () => void;
}

// Só **negrito** e parágrafos viram elementos; qualquer outra coisa é texto puro.
export function renderTexto(texto: string): React.ReactNode {
  return texto.split(/\n{2,}/).map((paragrafo, i) => (
    <p key={i}>
      {paragrafo.split('\n').map((linha, l) => (
        <React.Fragment key={l}>
          {l > 0 && <br />}
          {linha.split(/(\*\*[^*]+\*\*)/g).map((parte, j) =>
            parte.startsWith('**') && parte.endsWith('**') ? (
              <strong key={j} className="font-semibold text-ink">
                {parte.slice(2, -2)}
              </strong>
            ) : (
              <React.Fragment key={j}>{parte}</React.Fragment>
            ),
          )}
        </React.Fragment>
      ))}
    </p>
  ));
}

const ICONE_ACAO: Record<AcaoAgente['tipo'], React.ReactNode> = {
  abrir_visao_financeira: <BarChart3 className="w-4 h-4" />,
  abrir_fatura: <Receipt className="w-4 h-4" />,
  abrir_simulacao_t01: <Zap className="w-4 h-4" />,
  abrir_simulacao_t02: <Calendar className="w-4 h-4" />,
  falar_com_pessoa: <UserRound className="w-4 h-4" />,
};

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isTyping,
  profile,
  treatmentStatus,
  onOpenFinancialOverview,
  onOpenInvoice,
  onSelectFlowAdjustment,
  onSelectInstallment,
  onResetTreatment,
  onTalkToHuman,
  onSpeak,
  onAction,
  onConsent,
  onForgetAll,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // A abertura começa pelo topo (a mensagem do agente e o Raio-X são a primeira tela);
  // só as mensagens seguintes puxam a rolagem para o fim.
  useEffect(() => {
    const ultima = messages[messages.length - 1];
    if (ultima?.isInitial) {
      mainRef.current?.scrollTo({ top: 0 });
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <main ref={mainRef} className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5 bg-canvas" role="log" aria-live="polite" aria-label="Conversa com o Vita">
      {messages.map((message) => {
        if (message.role === 'user') {
          return (
            <div key={message.id} className="flex flex-col items-end animate-fade-in">
              <div className="bg-ink text-white p-3 rounded-2xl rounded-br-sm text-[13.5px] max-w-[85%] leading-relaxed">{message.content}</div>
              <span className="text-[10px] text-mid mt-1 px-1">{message.timestamp}</span>
            </div>
          );
        }

        return (
          <React.Fragment key={message.id}>
            <div className="flex items-start gap-2 group animate-fade-in">
              <VitaMark size="md" className="mt-0.5" />
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5 px-0.5">
                  <span className="text-[12px] text-ink font-semibold">Vita</span>
                  <span className="text-[10px] text-mid">· IA · {message.timestamp}</span>
                  <button
                    type="button"
                    onClick={() => onSpeak(message.content)}
                    className="ml-auto opacity-60 focus:opacity-100 group-hover:opacity-100 w-9 h-9 -my-2 inline-flex items-center justify-center rounded-full text-mid hover:text-accent hover:bg-surface cursor-pointer"
                    title="Ouvir mensagem"
                    aria-label="Ouvir mensagem"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-surface p-3.5 rounded-2xl rounded-tl-sm shadow-chip border border-line text-[13.5px] leading-relaxed text-ink-2 space-y-2">
                  {renderTexto(message.content)}

                  {message.citacoes && message.citacoes.length > 0 && (
                    <div className="pt-2 border-t border-line flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-mid">
                      {message.citacoes.map((c) => (
                        <span key={c.fonte} className="inline-flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                          <span>Fonte:</span>
                          {/^https?:\/\//.test(c.link) ? (
                            <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-accent-dark font-semibold hover:underline underline-offset-2">
                              {c.fonte}
                            </a>
                          ) : (
                            <span className="text-ink-3 font-medium">{c.fonte}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {message.consentPrompt && (
                    <div className="pt-2.5 border-t border-line flex flex-wrap gap-2">
                      <Chip ativo onClick={() => onConsent(true)} icon={<ShieldCheck className="w-4 h-4 text-accent" />}>
                        Sim, pode lembrar
                      </Chip>
                      <Chip onClick={() => onConsent(false)}>Agora não</Chip>
                    </div>
                  )}

                  {message.forgetPrompt && (
                    <div className="pt-2.5 border-t border-line flex flex-wrap gap-2">
                      <Chip onClick={onForgetAll} icon={<Eraser className="w-4 h-4" />}>
                        Apagar tudo o que você lembra
                      </Chip>
                    </div>
                  )}

                  {message.actionTaken && (
                    <div className="flex items-center gap-2 text-[12px] text-success-text bg-success-soft rounded-xl px-3 py-2 border border-success/20">
                      {message.actionTaken === 'flow_adjusted' ? <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" /> : <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />}
                      <span>{message.actionTaken === 'flow_adjusted' ? 'Rotativo quitado com a sua reserva; os juros param aqui' : 'Parcelas fixas no lugar do rotativo; sem novos juros do rotativo'}</span>
                    </div>
                  )}
                </div>

                {message.actions && message.actions.length > 0 && (
                  <div className="flex flex-col items-start gap-2 pt-1.5">
                    <span className="text-[13px] font-semibold text-ink px-0.5">Ações sugeridas pelo Vita:</span>
                    {message.actions.map((acao, i) => (
                      <Chip key={`${acao.tipo}-${i}`} onClick={() => onAction(acao)} icon={ICONE_ACAO[acao.tipo]} ativo={i === 0}>
                        {acao.rotulo}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cards do diagnóstico logo abaixo da abertura, como no Vita-UI */}
            {message.isInitial && (
              <>
                <RaioXCard profile={profile} onOpenInvoice={onOpenInvoice} onOpenFinancialOverview={onOpenFinancialOverview} />
                <TratamentosCard
                  profile={profile}
                  treatmentStatus={treatmentStatus}
                  onSelectFlowAdjustment={onSelectFlowAdjustment}
                  onSelectInstallment={onSelectInstallment}
                  onTalkToHuman={onTalkToHuman}
                  onResetTreatment={onResetTreatment}
                />
              </>
            )}
          </React.Fragment>
        );
      })}

      {isTyping && (
        <div className="flex items-start gap-2 animate-fade-in" role="status" aria-live="polite">
          <VitaMark size="md" className="mt-0.5" />
          <div className="bg-surface border border-line shadow-chip px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2 text-[12.5px] text-mid">
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-dot" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-dot" style={{ animationDelay: '180ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-dot" style={{ animationDelay: '360ms' }} />
            </span>
            <span>O Vita está calculando…</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </main>
  );
};
