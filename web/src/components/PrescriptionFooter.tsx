import React, { useEffect, useState } from 'react';
import { Send, Brain, Eraser, AlertTriangle } from 'lucide-react';
import { Chip } from './ui';

// Rodapé do chat no Vita-UI: chips acima, composer em pílula. Os cards de tratamento
// vivem na conversa (Cards.tsx); aqui só entrada e atalhos, sem número.
interface ComposerProps {
  onSendMessage: (text: string) => void;
  isTyping: boolean;
  // S5: direitos de acesso e eliminação, sem passar pelo modelo
  onShowMemory: () => void;
  onForgetAll: () => void;
}

// Ordem pensada para a demo: o que rende na apresentação vem primeiro; a memória depois.
const PERGUNTAS = [
  'Quanto paguei de juros no ano?',
  'Posso ficar no rotativo por mais de um mês?',
  'Qual a economia entre quitar à vista ou parcelar?',
  'Como recompor minha reserva?',
];

export const PrescriptionFooter: React.FC<ComposerProps> = ({ onSendMessage, isTyping, onShowMemory, onForgetAll }) => {
  const [texto, setTexto] = useState('');
  // "Esqueça tudo" apaga de verdade: pede um segundo toque, que expira sozinho.
  const [confirmarEsquecer, setConfirmarEsquecer] = useState(false);

  useEffect(() => {
    if (!confirmarEsquecer) return;
    const id = setTimeout(() => setConfirmarEsquecer(false), 5000);
    return () => clearTimeout(id);
  }, [confirmarEsquecer]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || isTyping) return;
    onSendMessage(texto.trim());
    setTexto('');
  };

  const esquecer = () => {
    if (!confirmarEsquecer) {
      setConfirmarEsquecer(true);
      return;
    }
    setConfirmarEsquecer(false);
    onForgetAll();
  };

  return (
    <footer className="shrink-0 bg-surface border-t border-line z-20 flex flex-col">
      <div className="flex gap-2 overflow-x-auto no-scrollbar rail-fade px-3.5 pr-10 pt-2.5 pb-1">
        {PERGUNTAS.map((p) => (
          <Chip key={p} onClick={() => onSendMessage(p)} disabled={isTyping}>
            {p}
          </Chip>
        ))}
        <Chip onClick={onShowMemory} icon={<Brain className="w-4 h-4" />}>
          O que você lembra sobre mim?
        </Chip>
        <Chip
          onClick={esquecer}
          icon={confirmarEsquecer ? <AlertTriangle className="w-4 h-4 text-alert" /> : <Eraser className="w-4 h-4" />}
          className={confirmarEsquecer ? 'border-alert/40 bg-alert-soft text-alert-text' : ''}
          aria-live="polite"
        >
          {confirmarEsquecer ? 'Toque de novo para apagar tudo' : 'Esqueça tudo'}
        </Chip>
      </div>

      <div className="px-3.5 pt-1.5 pb-2.5">
        <form onSubmit={enviar} className="flex items-center gap-2.5 min-h-12 pl-4 pr-1.5 py-1 bg-surface border border-line-strong rounded-full shadow-chip focus-within:border-accent transition-colors">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Converse ou pergunte ao Vita…"
            aria-label="Mensagem para o Vita"
            className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-mid outline-none border-0 p-0 min-w-0"
          />
          <button
            type="submit"
            disabled={!texto.trim() || isTyping}
            aria-label="Enviar mensagem para o Vita"
            className="w-10 h-10 rounded-full bg-accent hover:bg-accent-dark disabled:bg-line disabled:text-low text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
      <div className="w-28 h-1 bg-ink/20 rounded-full mx-auto mb-1.5" aria-hidden="true" />
    </footer>
  );
};
