// Floating media controls bc scrolling to da sidebar is mid. 
// Highkey useful for debugging, no cap.
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { setupButtonRipple, setupMagneticHover } from '../utils/gsapAnimations';
import { useEffect, useRef } from 'react';

// props for da dock, keeping it 100
interface FloatingPlaybackDockProps {
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep?: () => void;
  isRunning: boolean;
  status: string;
}

export const FloatingPlaybackDock: React.FC<FloatingPlaybackDockProps> = ({
  onPlay,
  onPause,
  onReset,
  onStep,
  isRunning,
  status,
}) => {
  const dockRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // magnetic hover effects so da buttons follow yo mouse slightly. magnetic rizz fr.
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    buttonRefs.current.forEach((button) => {
      if (!button) return;
      setupButtonRipple(button);
      cleanups.push(setupMagneticHover(button, 12));
    });
    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <div
      ref={dockRef}
      className="mt-6 flex items-center justify-between gap-4 p-3 rounded-[2rem] bg-white/[0.02] border border-white/5 shadow-inner backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <button
          ref={(el) => { buttonRefs.current[0] = el; }}
          onClick={onReset}
          className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-all active:scale-95"
          title="Reset Simulation (R)"
        >
          <RotateCcw size={22} />
        </button>

        <button
          ref={(el) => { buttonRefs.current[2] = el; }}
          onClick={onStep}
          className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-all active:scale-95"
          title="Step Forward"
        >
          <SkipForward size={22} />
        </button>
      </div>

      {/* da big play/pause button. swaps colors based on state, real flashy */}
      <div className="flex-1 flex justify-center">
        {isRunning ? (
          <button
            ref={(el) => { buttonRefs.current[1] = el; }}
            onClick={onPause}
            className="group relative px-10 py-4 rounded-2xl bg-neon-pink text-white shadow-glow-pink hover:bg-fuchsia-400 active:scale-95 transition-all overflow-hidden"
            title="Pause (Space)"
          >
            <div className="relative z-10 flex items-center gap-3">
              <Pause size={24} fill="currentColor" />
              <span className="text-sm font-black uppercase tracking-widest">Halt Engine</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <button
            ref={(el) => { buttonRefs.current[1] = el; }}
            onClick={onPlay}
            className="group relative px-10 py-4 rounded-2xl bg-neon-cyan text-void-950 shadow-glow-cyan hover:bg-cyan-400 active:scale-95 transition-all overflow-hidden"
            title="Play (Space)"
          >
            <div className="relative z-10 flex items-center gap-3">
              <Play size={24} fill="currentColor" />
              <span className="text-sm font-black uppercase tracking-widest">Initiate Sim</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 px-6 py-3 bg-void-950/50 rounded-2xl border border-white/5 min-w-[140px] justify-center">
        <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-neon-green animate-pulse shadow-[0_0_12px_rgba(132,204,22,0.6)]' : 'bg-gray-600'}`} />
        <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 select-none">
          {status}
        </span>
      </div>
    </div>
  );
};
