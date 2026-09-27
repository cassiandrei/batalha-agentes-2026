import React from 'react';
import { ArrowLeft, Volume2, VolumeX, Smartphone, Monitor, UserRound } from 'lucide-react';
import { VitaMark } from './ui';

// Top App Bar do Vita-UI: voltar, marca, nome + ponto de presença, e os controles.
interface HeaderProps {
  onReset: () => void;
  speechEnabled: boolean;
  onToggleSpeech: () => void;
  isMobileFrame: boolean;
  onToggleFrame: () => void;
  onTalkToHuman: () => void;
  cliente: 'bruno' | 'marcos';
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  speechEnabled,
  onToggleSpeech,
  isMobileFrame,
  onToggleFrame,
  onTalkToHuman,
  cliente,
}) => {
  const nome = cliente === 'marcos' ? 'Marcos' : 'Bruno';
  const trocar = () => {
    window.location.search = cliente === 'marcos' ? '' : '?cliente=marcos';
  };

  return (
    <header className="shrink-0 z-20 bg-surface/95 backdrop-blur-xl border-b border-line shadow-[0_1px_6px_rgba(0,0,0,0.03)] px-3 pt-2 pb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={onReset}
            className="w-11 h-11 rounded-full hover:bg-canvas flex items-center justify-center text-mid hover:text-ink transition cursor-pointer shrink-0"
            title="Voltar para a tela de bloqueio"
            aria-label="Voltar para a tela de bloqueio"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <VitaMark size="sm" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-semibold text-ink tracking-tight leading-none">Vita</span>
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
            </div>
            <span className="text-[11px] text-mid leading-tight">assistente com IA</span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onTalkToHuman}
            className="w-11 h-11 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
            title="Falar com uma pessoa"
            aria-label="Falar com uma pessoa"
          >
            <UserRound className="w-4.5 h-4.5" />
          </button>
          <button
            type="button"
            onClick={onToggleSpeech}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              speechEnabled ? 'text-accent bg-accent-soft' : 'text-ink-3 hover:text-ink hover:bg-canvas'
            }`}
            title={speechEnabled ? 'Desativar leitura por voz' : 'Ativar leitura por voz'}
            aria-label={speechEnabled ? 'Desativar leitura por voz' : 'Ativar leitura por voz'}
            aria-pressed={speechEnabled}
          >
            {speechEnabled ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
          </button>
          <button
            type="button"
            onClick={onToggleFrame}
            className="hidden md:inline-flex w-11 h-11 rounded-full items-center justify-center text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
            title={isMobileFrame ? 'Expandir para tela cheia' : 'Modo aplicativo móvel'}
            aria-label={isMobileFrame ? 'Expandir para tela cheia' : 'Modo aplicativo móvel'}
          >
            {isMobileFrame ? <Monitor className="w-4.5 h-4.5" /> : <Smartphone className="w-4.5 h-4.5" />}
          </button>
          {/* S6: cena do Marcos. Sem foto: inicial do cliente no lugar do avatar. Recarrega a página. */}
          <button
            type="button"
            onClick={trocar}
            className="ml-1 w-9 h-9 rounded-full border border-line-strong bg-canvas text-ink font-bold text-[13px] flex items-center justify-center hover:bg-line transition-colors cursor-pointer"
            title={`${nome} · alternar para ${cliente === 'marcos' ? 'Bruno' : 'Marcos'}`}
            aria-label={`Cliente da demo: ${nome}. Alternar para ${cliente === 'marcos' ? 'Bruno' : 'Marcos'}`}
          >
            {nome[0]}
          </button>
        </div>
      </div>
    </header>
  );
};
