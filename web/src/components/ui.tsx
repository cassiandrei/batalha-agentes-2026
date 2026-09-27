import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Primitivas do mundo visual do Vita: marca, sheet que sobe do rodapé, botões em pílula.
// Nenhum número aqui; nenhuma marca de terceiros.

export const brl = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const pct = (v: number | null | undefined, casas = 1) =>
  v === null || v === undefined ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`;
export const agora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const TAMANHO: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-7 h-7 rounded-lg',
  md: 'w-8 h-8 rounded-xl',
  lg: 'w-9 h-9 rounded-[14px]',
};

/** Squircle verde com a estrela de quatro pontas: a marca do Vita. */
export const VitaMark: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ size = 'md', className = '' }) => (
  <div className={`${TAMANHO[size]} bg-accent flex items-center justify-center text-white shrink-0 shadow-xs ${className}`} aria-hidden="true">
    <svg className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" />
    </svg>
  </div>
);

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tag?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Muda quando a vista troca (simulação → sucesso): o corpo remonta e volta ao topo. */
  bodyKey?: string;
}

/** Folha modal que sobe do rodapé, contida na moldura do aparelho. */
export const Sheet: React.FC<SheetProps> = ({ open, onClose, title, subtitle, icon, tag, children, footer, bodyKey = 'corpo' }) => {
  const painel = useRef<HTMLDivElement>(null);
  const tituloId = useRef(`sheet-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (!open) return;
    painel.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center animate-fade-in" onClick={onClose}>
      <div
        ref={painel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId.current}
        className="bg-surface rounded-t-3xl w-full max-h-[88%] flex flex-col shadow-sheet outline-none animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-3 pb-3 border-b border-line flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            {icon ?? <VitaMark size="sm" className="mt-0.5" />}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {tag && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent-soft px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                )}
                <h2 id={tituloId.current} className="text-[15px] font-bold text-ink leading-tight">
                  {title}
                </h2>
              </div>
              {subtitle && <p className="text-[12px] text-mid mt-0.5 leading-snug">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-11 h-11 -mr-2 -mt-1 rounded-full flex items-center justify-center text-mid hover:text-ink hover:bg-canvas transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div key={bodyKey} className="px-4 py-4 overflow-y-auto space-y-3.5">{children}</div>
        {footer && <div className="px-4 pt-3 pb-4 border-t border-line bg-surface flex flex-col gap-2">{footer}</div>}
      </div>
    </div>
  );
};

type BotaoProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'secundario' | 'texto' };

/** Botão em pílula: primário no acento, secundário branco com borda, texto sem fundo. */
export const Botao: React.FC<BotaoProps> = ({ variante = 'primario', className = '', children, ...props }) => {
  const base =
    'inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-full text-[14px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  const estilo =
    variante === 'primario'
      ? 'bg-accent hover:bg-accent-dark text-white shadow-md shadow-accent/20'
      : variante === 'secundario'
        ? 'bg-surface hover:bg-canvas border border-line-strong text-ink'
        : 'bg-transparent text-mid hover:text-ink';
  return (
    <button type="button" className={`${base} ${estilo} ${className}`} {...props}>
      {children}
    </button>
  );
};

/** Chip em pílula: ação sugerida ou pergunta rápida, ícone à esquerda. */
export const Chip: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode; ativo?: boolean }> = ({
  icon,
  ativo,
  className = '',
  children,
  ...props
}) => (
  <button
    type="button"
    className={`inline-flex items-center gap-2 min-h-11 px-4 rounded-full border text-[13.5px] font-medium whitespace-nowrap transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-chip ${
      ativo ? 'bg-accent-soft border-accent/30 text-accent-dark' : 'bg-surface border-line-strong text-ink-3 hover:bg-canvas hover:border-low'
    } ${className}`}
    {...props}
  >
    {icon && <span className="text-ink-3 shrink-0" aria-hidden="true">{icon}</span>}
    <span className="truncate">{children}</span>
  </button>
);

/** Linha rótulo × valor dos cards de detalhe. */
export const Linha: React.FC<{ rotulo: React.ReactNode; valor: React.ReactNode; destaque?: 'ink' | 'success' | 'alert' | 'accent' }> = ({
  rotulo,
  valor,
  destaque = 'ink',
}) => {
  const cor = { ink: 'text-ink', success: 'text-success-text', alert: 'text-alert-text', accent: 'text-accent-dark' }[destaque];
  return (
    <div className="flex justify-between items-center gap-3 py-2.5 text-[13.5px]">
      <span className="text-mid">{rotulo}</span>
      <span className={`font-bold text-right ${cor}`}>{valor}</span>
    </div>
  );
};

/** Campo do iToken: vive no rodapé do sheet, colado ao botão que ele libera. */
export const CampoIToken: React.FC<{ id: string; valor: string; onChange: (v: string) => void }> = ({ id, valor, onChange }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
      <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      Confirme com o seu iToken (6 dígitos)
    </label>
    <input
      id={id}
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={6}
      value={valor}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="••••••"
      autoComplete="one-time-code"
      className="w-full bg-canvas border border-line-strong focus:border-accent rounded-xl px-3 min-h-12 text-[16px] tracking-[0.4em] text-ink outline-none"
    />
    <p className="text-[11px] text-mid">Nada é executado sem o token. Na demo, qualquer 6 dígitos vale, menos 000000.</p>
  </div>
);

/** Hero de sucesso: pedra verde com check, tag e título. */
export const HeroSucesso: React.FC<{ tag: string; titulo: string; texto: string }> = ({ tag, titulo, texto }) => (
  <div className="flex flex-col items-center text-center pt-1 pb-1">
    <div className="w-18 h-18 rounded-[22px] bg-success flex items-center justify-center text-white shadow-md shadow-success/25 animate-pop mb-3" aria-hidden="true">
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </div>
    <span className="inline-flex items-center gap-1.5 bg-success-soft border border-success/25 text-success-text text-[11.5px] font-semibold px-3 py-1 rounded-full mb-2.5">
      {tag}
    </span>
    <h3 className="text-[22px] font-bold text-ink tracking-tight leading-tight max-w-[320px]">{titulo}</h3>
    <p className="text-[13px] text-mid mt-1.5 leading-relaxed max-w-[300px]">{texto}</p>
  </div>
);
