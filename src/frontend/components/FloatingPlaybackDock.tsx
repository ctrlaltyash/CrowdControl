import React, { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, ShieldCheck, Activity } from 'lucide-react';
import { setupButtonRipple, setupMagneticHover } from '../utils/gsapAnimations';

/**
 * Properties for the FloatingPlaybackDock component, managing simulation playback and display states.
 */
interface FloatingPlaybackDockProps {
  /** Callback to initiate simulation execution. */
  onPlay: () => void;
  /** Callback to halt simulation execution. */
  onPause: () => void;
  /** Callback to reset the simulation to its initial state. */
  onReset: () => void;
  /** Optional callback to advance the simulation by a single discrete time step. */
  onStep?: () => void;
  /** Indicates if the simulation is currently active. */
  isRunning: boolean;
  /** Current active visualization layer ('density' for heatmap, 'risk' for hazard overlay). */
  viewMode: 'density' | 'risk';
  /** Callback to switch the active visualization layer. */
  onViewModeChange: (mode: 'density' | 'risk') => void;
  /** Indicates if the AI-driven autonomous mitigation system is active. */
  preventionEnabled: boolean;
  /** Callback to toggle the AI mitigation system. */
  onPreventionChange: (value: boolean) => void;
  /** Current simulation iteration step count. */
  step: number;
  /** Target simulation frames per second (tick rate). */
  fps: number;
  /** Callback to adjust the target simulation tick rate. */
  onFpsChange: (fps: number) => void;
}

export const FloatingPlaybackDock: React.FC<FloatingPlaybackDockProps> = ({
  onPlay,
  onPause,
  onReset,
  onStep,
  isRunning,
  viewMode,
  onViewModeChange,
  preventionEnabled,
  onPreventionChange,
  step,
  fps,
  onFpsChange,
}) => {
  const dockRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Apply magnetic hover physics to interactive elements for enhanced tactile feedback.
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    buttonRefs.current.forEach((button) => {
      if (!button) return;
      setupButtonRipple(button);
      cleanups.push(setupMagneticHover(button, 10));
    });
    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <div
      ref={dockRef}
      className="mt-6 flex flex-col md:flex-row items-center justify-between gap-5 p-4 rounded-2xl bg-white/[0.04] border border-border-default shadow-glass backdrop-blur-md"
    >
      {/* Left Segment: Playback controls and Step Counter */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <button
          ref={(el) => { buttonRefs.current[0] = el; }}
          onClick={onReset}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-foreground-muted hover:text-white transition-all active:scale-95 border border-border-default"
          title="Reset Simulation (R)"
          aria-label="Reset simulation"
        >
          <RotateCcw size={18} />
        </button>

        <button
          ref={(el) => { buttonRefs.current[1] = el; }}
          onClick={onStep}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-foreground-muted hover:text-white transition-all active:scale-95 border border-border-default"
          title="Step Forward"
          aria-label="Step simulation forward"
        >
          <SkipForward size={18} />
        </button>

        <div className="telemetry-badge flex items-center gap-2 text-[10px] text-foreground-muted select-none">
          <Activity size={12} className="text-accent-bright" />
          STEP: <span className="text-white font-mono">{step}</span>
        </div>
      </div>

      {/* Central Segment: Main Play/Pause Action */}
      <div className="flex-1 flex justify-center w-full md:w-auto">
        {isRunning ? (
          <button
            ref={(el) => { buttonRefs.current[2] = el; }}
            onClick={onPause}
            className="group relative px-10 py-[15px] rounded-lg bg-accent-bright text-white shadow-accent hover:bg-accent active:scale-95 transition-all overflow-hidden w-full max-w-[240px] md:w-auto"
            title="Pause (Space)"
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <Pause size={18} fill="currentColor" />
              <span className="text-xs font-black uppercase tracking-widest">Halt Engine</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <button
            ref={(el) => { buttonRefs.current[2] = el; }}
            onClick={onPlay}
            className="group relative px-10 py-[15px] rounded-lg bg-accent text-white shadow-accent hover:bg-accent-bright active:scale-95 transition-all overflow-hidden w-full max-w-[240px] md:w-auto"
            title="Play (Space)"
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              <Play size={18} fill="currentColor" />
              <span className="text-xs font-black uppercase tracking-widest">Initiate Sim</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {/* Right Segment: Speed Selector & Layer HUD */}
      <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
        {/* Tick Rate Speed Toggle */}
        <div className="flex items-center bg-background-base/60 border border-border-default rounded-lg p-1">
          {[30, 60, 120].map((rate) => (
            <button
              key={rate}
              onClick={() => onFpsChange(rate)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                fps === rate
                  ? 'bg-accent/[0.18] text-white shadow-[0_0_0_1px_rgba(94,106,210,0.28)]'
                  : 'text-foreground-muted hover:text-white'
              }`}
            >
              {rate === 30 ? '0.5x' : rate === 60 ? '1.0x' : '2.0x'}
            </button>
          ))}
        </div>

        {/* View Mode Layer Toggles */}
        <div className="flex items-center bg-background-base/60 border border-border-default rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('density')}
            className={`layer-toggle-btn px-4 py-2 rounded-lg border border-transparent ${
              viewMode === 'density' ? 'active-cyan' : 'text-gray-500 hover:text-white'
            }`}
            title="Density Heatmap"
          >
            Density
          </button>
          <button
            onClick={() => onViewModeChange('risk')}
            className={`layer-toggle-btn px-4 py-2 rounded-lg border border-transparent ${
              viewMode === 'risk' ? 'active-pink' : 'text-gray-500 hover:text-white'
            }`}
            title="Risk Analysis"
          >
            Risk
          </button>
        </div>

        {/* AI Mitigation Trigger */}
        <button
          onClick={() => onPreventionChange(!preventionEnabled)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest ${
            preventionEnabled
              ? 'bg-accent/[0.16] border-border-accent text-white shadow-accent'
              : 'bg-white/[0.02] border-border-default text-foreground-muted hover:text-white hover:bg-white/[0.05]'
          }`}
          title="Toggle AI Mitigation Walls"
        >
          <ShieldCheck size={14} />
          Mitigate
        </button>
      </div>
    </div>
  );
};
