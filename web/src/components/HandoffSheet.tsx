import React, { useState } from 'react';
import { MessageSquare, PhoneCall, ShieldCheck, AlertCircle, RotateCcw, Loader2, Headphones, ChevronRight, Check } from 'lucide-react';
import { FinancialProfile } from '../types';
import { Botao, Sheet, VitaMark } from './ui';

// S5 + Vita-UI: "falar com uma pessoa" como negociação assistida, com os cinco estados.
// O agente devolve protocolo e fila; o resumo só vai com consentimento e nunca leva valores.
export type Modalidade = 'chat' | 'ligacao';
export interface Encaminhamento {
  protocolo: string;
  fila: string;
  resumo: unknown;
}
type Estado = 'default' | 'loading' | 'error' | 'success';

interface HandoffSheetProps {
  open: boolean;
  onClose: () => void;
  profile: FinancialProfile;
  memoriaConsentida: boolean;
  onConfirm: (modalidade: Modalidade) => Promise<Encaminhamento>;
}

const FILAS: Record<string, string> = {
  renegociacao_assistida: 'Renegociação assistida',
  atendimento_geral: 'Atendimento geral',
};

export const HandoffSheet: React.FC<HandoffSheetProps> = ({ open, onClose, profile, memoriaConsentida, onConfirm }) => {
  const [estado, setEstado] = useState<Estado>('default');
  const [modalidade, setModalidade] = useState<Modalidade>('chat');
  const [resultado, setResultado] = useState<Encaminhamento | null>(null);
  const [erro, setErro] = useState('');

  const faixaV = profile.offers !== null && !profile.offers.elegivel;

  const confirmar = async () => {
    setEstado('loading');
    try {
      const r = await onConfirm(modalidade);
      setResultado(r);
      setEstado('success');
    } catch (e) {
      setErro((e as Error).message);
      setEstado('error');
    }
  };

  const fechar = () => {
    setEstado('default');
    setResultado(null);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={fechar}
      icon={<div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white shrink-0" aria-hidden="true"><Headphones className="w-4 h-4" /></div>}
      title="Falar com uma pessoa"
      subtitle={faixaV ? 'Renegociação assistida, sem novo crédito' : 'Uma pessoa da equipe continua a partir daqui'}
      footer={
        estado === 'default' ? (
          <Botao onClick={confirmar} className="w-full">
            <span>{modalidade === 'chat' ? 'Falar com uma pessoa agora' : 'Agendar a ligação'}</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Botao>
        ) : estado === 'success' ? (
          <Botao onClick={fechar} className="w-full">
            Voltar para a conversa
          </Botao>
        ) : undefined
      }
    >
      {estado === 'loading' && (
        <div className="flex flex-col items-center justify-center text-center py-8 space-y-4" role="status" aria-live="polite">
          <div className="w-16 h-16 rounded-pedra bg-accent-soft flex items-center justify-center text-accent" aria-hidden="true">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="font-bold text-[17px] text-ink">Abrindo o seu protocolo…</h3>
            <p className="text-xs text-mid mt-1.5 leading-relaxed max-w-xs">Registrando o pedido e {memoriaConsentida ? 'montando o resumo sem os seus valores' : 'sem enviar resumo, como você preferiu'}.</p>
          </div>
        </div>
      )}

      {estado === 'error' && (
        <div className="flex flex-col items-center justify-center text-center py-6 space-y-4" role="alert">
          <div className="w-16 h-16 rounded-pedra bg-alert-soft flex items-center justify-center text-alert" aria-hidden="true">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-[17px] text-ink">Não consegui abrir o protocolo</h3>
            <p className="text-xs text-mid mt-1 leading-relaxed max-w-xs">{erro || 'O agente não respondeu.'} Nada foi enviado. Você pode tentar de novo.</p>
          </div>
          <Botao onClick={confirmar} className="w-full max-w-xs">
            <RotateCcw className="w-4 h-4" aria-hidden="true" /> Tentar de novo
          </Botao>
        </div>
      )}

      {estado === 'success' && resultado && (
        <div className="flex flex-col items-center text-center py-2 space-y-4" aria-live="polite">
          <div className="w-16 h-16 rounded-pedra bg-success-soft flex items-center justify-center text-success-text animate-pop" aria-hidden="true">
            <Check className="w-8 h-8" strokeWidth={3} />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 bg-success-soft text-success-text text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-1">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Pedido registrado
            </span>
            <h3 className="text-[20px] font-bold text-ink">{modalidade === 'chat' ? 'Uma pessoa vai continuar com você' : 'Ligação agendada'}</h3>
            <p className="text-[12.5px] text-mid mt-1 max-w-xs">
              {resultado.resumo ? 'Enviei um resumo da conversa sem os seus valores nem dados pessoais.' : 'Sem resumo: você não autorizou compartilhar. Só o protocolo vai junto.'}
            </p>
          </div>
          <div className="w-full bg-surface rounded-pedra p-4 border border-line shadow-card text-left space-y-2 text-[12.5px]">
            <div className="flex justify-between items-center"><span className="text-mid">Protocolo</span><span className="font-mono font-bold text-ink">{resultado.protocolo}</span></div>
            <div className="flex justify-between items-center"><span className="text-mid">Fila</span><span className="font-bold text-ink">{FILAS[resultado.fila] ?? resultado.fila}</span></div>
            <div className="flex justify-between items-center"><span className="text-mid">Modalidade</span><span className="font-medium text-ink">{modalidade === 'chat' ? 'Chat com uma pessoa' : 'Ligação'}</span></div>
          </div>
        </div>
      )}

      {estado === 'default' && (
        <>
          <div className="bg-surface rounded-pedra p-4 shadow-card border border-line flex items-start gap-3">
            <VitaMark size="md" className="mt-0.5" />
            <div className="flex-1">
              <span className="text-[11px] font-bold text-accent-dark uppercase tracking-wider block mb-1">O que o Vita viu</span>
              <p className="text-[13px] text-ink-2 leading-relaxed">
                {faixaV
                  ? `${profile.offers?.motivo} ${profile.offers?.encaminhamento}`
                  : 'Você pediu para continuar com uma pessoa. O Vita para aqui e entrega o que já foi calculado, sem executar nada.'}
              </p>
            </div>
          </div>

          <section className="bg-surface rounded-pedra p-4 shadow-card border border-line space-y-3" aria-label="Como prefere ser atendido">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-bold text-ink">Como prefere ser atendido?</h3>
              <span className="text-[10px] text-success-text font-semibold bg-success-soft px-2 py-0.5 rounded-full">sem pressão</span>
            </div>
            <div role="radiogroup" aria-label="Modalidade de atendimento" className="space-y-2.5">
              {(
                [
                  ['chat', 'Chat com uma pessoa', 'Continua por texto, com o histórico do que o Vita calculou.', <MessageSquare key="c" className="w-4 h-4" />],
                  ['ligacao', 'Agendar ligação', 'Uma pessoa liga no horário que você escolher.', <PhoneCall key="l" className="w-4 h-4" />],
                ] as const
              ).map(([valor, titulo, texto, icone]) => {
                const sel = modalidade === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => setModalidade(valor)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${sel ? 'border-accent bg-accent-soft/50 shadow-xs' : 'border-line bg-canvas hover:border-low'}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${sel ? 'bg-accent text-white' : 'bg-surface text-mid border border-line'}`} aria-hidden="true">
                      {icone}
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-[13.5px] text-ink block">{titulo}</span>
                      <p className="text-[12px] text-mid mt-0.5 leading-snug">{texto}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <div className={`rounded-[20px] p-3.5 flex items-center gap-3 border ${memoriaConsentida ? 'bg-success-soft border-success/25' : 'bg-canvas border-line'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${memoriaConsentida ? 'bg-success' : 'bg-mid'}`} aria-hidden="true">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className={`text-[11px] font-bold uppercase tracking-wider block ${memoriaConsentida ? 'text-success-text' : 'text-ink-3'}`}>O que vai junto</span>
              <p className="text-[12px] font-medium text-ink leading-snug">
                {memoriaConsentida
                  ? 'Faixa, mês, gatilho e recomendação. Nunca valores, nome ou identificador.'
                  : 'Só o protocolo. Você não autorizou compartilhar um resumo.'}
              </p>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
};
