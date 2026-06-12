/* ─────────────────────────────────────────────────────────────
   Control Panel Component - Simulation Status & Command Actions
   Control panel but make it main character energy, no cap.
   ───────────────────────────────────────────────────────────── */

import { useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { setupButtonRipple, setupMagneticHover } from '../utils/gsapAnimations';
import gsap from 'gsap';

// props for da hub, staying 100
interface ControlPanelProps {
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  isRunning?: boolean;
  step?: number;
  elapsed?: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onPlay,
  onPause,
  onReset,
  isRunning = false,
  step = 0,
  elapsed = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // entrance animation, real smooth like a DM slide
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!containerRef.current) return;
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.2 }
      );
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  // button effects for dat extra rizz
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    buttonsRef.current.forEach((button) => {
      if (!button) return;
      setupButtonRipple(button);
      cleanups.push(setupMagneticHover(button, 20));
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  // formatting time bc we don't want it messy fr
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="glass-card p-5 space-y-5" data-sidebar-card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Simulation Status</p>
          <h3 className="mt-2 text-lg font-bold text-text-primary">Command Hub</h3>
        </div>
        {/* status pill, active or nah? check it */}
        <div className={`status-pill ${isRunning ? 'bg-emerald-math/10 border-emerald-math/20 text-emerald-math animate-glow-pulse' : 'bg-white/5 border-white/10 text-text-secondary'}`}>
          <span className="block text-[11px] uppercase tracking-[0.35em]">State</span>
          <strong className="block text-sm">{isRunning ? 'Active' : 'Paused'}</strong>
        </div>
      </div>

      {/* iteration and time stats, strictly data energy */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-white/5 bg-obsdian-950/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.35em] text-text-muted">Iterations</p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">{step}</p>
        </div>
        <div className="rounded-3xl border border-white/5 bg-obsdian-950/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.35em] text-text-muted">Elapsed</p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">{formatTime(elapsed)}</p>
        </div>
      </div>

      {/* buttons to play, pause, reset. big button energy */}
      <div className="grid grid-cols-3 gap-3">
        <button
          ref={(el) => { buttonsRef.current[0] = el; }}
          onClick={onPlay}
          disabled={isRunning}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Play size={16} />
          Play
        </button>
        <button
          ref={(el) => { buttonsRef.current[1] = el; }}
          onClick={onPause}
          disabled={!isRunning}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Pause size={16} />
          Pause
        </button>
        <button
          ref={(el) => { buttonsRef.current[2] = el; }}
          onClick={onReset}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>
    </div>
  );
};
