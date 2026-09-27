import React, { useState } from 'react';
import { Send, Brain, Eraser } from 'lucide-react';
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

const PERGUNTAS = ['Qual a economia entre quitar à vista ou parcelar?', 'Quanto paguei de juros no ano?', 'Como recompor minha reserva?'];

export const PrescriptionFooter: React.FC<ComposerProps> = ({ onSendMessage, isTyping, onShowMemory, onForgetAll }) => {
  const [texto, setTexto] = useState('');

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || isTyping) return;
    onSendMessage(texto.trim());
    setTexto('');
  };

  return (
    <footer className="shrink-0 bg-surface border-t border-line z-20 flex flex-col">
      <div className="flex gap-2 overflow-x-auto no-scrollbar rail-fade px-3.5 pr-10 pt-2.5 pb-1">
        <Chip onClick={onShowMemory} icon={<Brain className="w-4 h-4" />}>
          O que você lembra sobre mim?
        </Chip>
        <Chip onClick={onForgetAll} icon={<Eraser className="w-4 h-4" />}>
          Esqueça tudo
        </Chip>
        {PERGUNTAS.map((p) => (
          <Chip key={p} onClick={() => onSendMessage(p)} disabled={isTyping}>
            {p}
          </Chip>
        ))}
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
