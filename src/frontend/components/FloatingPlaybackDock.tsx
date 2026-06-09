// Floating media controls because scrolling to the sidebar is too much effort. 
// Highkey useful for debugging.
import { Play, Pause, RotateCcw, FastForward, SkipForward } from 'lucide-react';
import { setupButtonRipple, setupMagneticHover } from '../utils/gsapAnimations';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

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

  // Smooth slide up when the canvas mounts
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (dockRef.current) {
        gsap.fromTo(
          dockRef.current,
          { y: 100, opacity: 0 },
          { y: -20, opacity: 1, duration: 1, ease: 'power4.out', delay: 0.5 }
        );
      }
    }, dockRef);

    return () => ctx.revert();
  }, []);

  // Magnetic hover effects so the buttons follow your mouse slightly. It's the little things.
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
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 p-2 rounded-3xl bg-void-900/80 backdrop-blur-2xl border border-white/10 shadow-glass"
    >
      <div className="flex items-center gap-1.5 px-3 border-r border-white/10 mr-1">
        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-neon-green animate-pulse shadow-glow-green' : 'bg-gray-600'}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 select-none w-16 text-center">
          {status}
        </span>
      </div>

      <button
        ref={(el) => { buttonRefs.current[0] = el; }}
        onClick={onReset}
        className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-90"
        title="Reset Simulation (R)"
      >
        <RotateCcw size={20} />
      </button>

      {/* The big play/pause button. Swaps colors based on state. */}
      {isRunning ? (
        <button
          ref={(el) => { buttonRefs.current[1] = el; }}
          onClick={onPause}
          className="p-4 rounded-2xl bg-neon-pink text-white shadow-glow-pink hover:scale-105 active:scale-95 transition-all"
          title="Pause (Space)"
        >
          <Pause size={24} fill="currentColor" />
        </button>
      ) : (
        <button
          ref={(el) => { buttonRefs.current[1] = el; }}
          onClick={onPlay}
          className="p-4 rounded-2xl bg-neon-cyan text-void-950 shadow-glow-cyan hover:scale-105 active:scale-95 transition-all"
          title="Play (Space)"
        >
          <Play size={24} fill="currentColor" />
        </button>
      )}

      <button
        ref={(el) => { buttonRefs.current[2] = el; }}
        onClick={onStep}
        className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-90"
        title="Step Forward"
      >
        <SkipForward size={20} />
      </button>

      {/* Speed control placeholder. Currently just aesthetic flex. */}
      <div className="flex items-center gap-1 px-3 border-l border-white/10 ml-1">
        <button
          className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all"
          title="Playback Speed"
        >
          <FastForward size={18} />
        </button>
      </div>
    </div>
  );
};
