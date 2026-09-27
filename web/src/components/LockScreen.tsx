import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronUp, Lock, RotateCcw } from 'lucide-react';
import { VitaMark } from './ui';

// S2 + Vita-UI: o push é neutro por regra (o texto vem do agente e não traz número).
// A tela de bloqueio é só a cena do push: o detalhe fica dentro do app.
interface LockScreenProps {
  push: string | null;
  onOpen: () => void;
}

const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const LockScreen: React.FC<LockScreenProps> = ({ push, onOpen }) => {
  const [adiado, setAdiado] = useState(false);
  const [hora, setHora] = useState('');
  const [data, setData] = useState('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setHora(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      setData(`${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`);
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#08090f] via-[#0d1017] to-[#06080d] text-white select-none">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/15 rounded-full blur-[110px] pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 pt-4 px-6 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full bg-white/10 border border-white/[0.08] flex items-center justify-center" aria-hidden="true">
          <Lock className="w-3.5 h-3.5 text-white/90" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center mt-2 text-center">
        <p className="text-[19px] font-medium text-white tracking-tight">{data}</p>
        <p className="font-clock text-[84px] font-bold tracking-tight leading-none mt-1 drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">{hora}</p>
      </div>

      <div className="relative z-10 px-4 mt-auto mb-8 w-full">
        {!adiado ? (
          <div>
            <div className="relative bg-[#151821] border border-white/[0.08] rounded-[28px] p-5 shadow-[0_22px_45px_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <VitaMark size="lg" />
                  <span className="text-sm font-bold tracking-wide">VITA</span>
                </div>
                <span className="text-xs text-zinc-400 font-medium">agora</span>
              </div>

              <div className="flex items-start gap-2 mt-3.5">
                <span className="w-2.5 h-2.5 mt-[7px] rounded-full bg-accent shadow-[0_0_8px_rgba(255,98,0,0.6)] shrink-0" aria-hidden="true" />
                <h2 className="font-bold text-[17px] tracking-tight leading-snug">{push ?? 'Carregando…'}</h2>
              </div>
              <p className="text-zinc-300 text-[14px] leading-[1.45] mt-2">
                Os detalhes ficam só dentro do app. Toque para abrir e ver o que o Vita encontrou no seu extrato.
              </p>

              <button
                type="button"
                onClick={onOpen}
                disabled={!push}
                className="w-full bg-accent hover:bg-accent-dark disabled:opacity-60 active:scale-[0.98] transition-all text-white font-bold text-[15px] min-h-12 px-5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-accent/25 cursor-pointer mt-4"
              >
                <span>Abrir no Vita</span>
                <ArrowRight className="w-4.5 h-4.5" />
              </button>
              <button
                type="button"
                onClick={() => setAdiado(true)}
                className="w-full bg-white/[0.08] hover:bg-white/[0.13] active:scale-[0.98] transition-all text-white/90 font-medium text-[14px] min-h-11 px-5 rounded-full flex items-center justify-center cursor-pointer mt-2.5"
              >
                Lembrar mais tarde
              </button>
            </div>
            <div className="w-[93%] h-2.5 mx-auto bg-[#12151d] rounded-b-[24px] border-b border-x border-white/[0.04] -mt-1 opacity-90 pointer-events-none" aria-hidden="true" />
          </div>
        ) : (
          <div className="bg-[#151821]/90 border border-white/[0.08] rounded-2xl p-4 text-center">
            <p className="text-sm text-zinc-300 font-medium">Notificação adiada.</p>
            <button
              type="button"
              onClick={() => setAdiado(false)}
              className="mt-2 min-h-11 px-3 text-xs text-accent-soft hover:text-white inline-flex items-center gap-1 mx-auto font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar notificação
            </button>
          </div>
        )}
      </div>

      <button type="button" onClick={onOpen} className="relative z-10 pb-4 flex flex-col items-center cursor-pointer group text-white/70 hover:text-white">
        <ChevronUp className="w-4 h-4 animate-nudge" aria-hidden="true" />
        <span className="text-[13px] font-medium tracking-wide">Deslize para cima</span>
      </button>
    </div>
  );
};
