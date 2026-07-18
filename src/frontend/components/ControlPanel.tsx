/* ─────────────────────────────────────────────────────────────
   Control Panel Component - Simulation Status & Command Actions
   Provides execution controls and live temporal metrics.
   ───────────────────────────────────────────────────────────── */

import { useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { setupButtonRipple, setupMagneticHover } from '../utils/gsapAnimations';
import gsap from 'gsap';

// Properties defining the state and callbacks for the control panel.
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

  // Initialize GSAP entrance animations for the control panel container.
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

  // Attach interaction effects (ripple and magnetic hover) to control buttons.
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

  // Format the elapsed simulation time in seconds to a MM:SS string representation.
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
        {/* Status indicator displaying the current operational state of the engine. */}
        <div className={`status-pill ${isRunning ? 'bg-emerald-math/10 border-emerald-math/20 text-emerald-math animate-glow-pulse' : 'bg-white/5 border-white/10 text-text-secondary'}`}>
          <span className="block text-[11px] uppercase tracking-[0.35em]">State</span>
          <strong className="block text-sm">{isRunning ? 'Active' : 'Paused'}</strong>
        </div>
      </div>

      {/* Simulation step counter and formatted elapsed time metrics. */}
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

      {/* Primary execution commands: Play, Pause, and Reset. */}
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
