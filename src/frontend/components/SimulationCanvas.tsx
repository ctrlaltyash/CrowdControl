/* ─────────────────────────────────────────────────────────────
   Simulation Canvas Component - Live Heatmap Rendering
   ───────────────────────────────────────────────────────────── */

import { useRef, useEffect, type RefObject, type PointerEvent } from 'react';
import gsap from 'gsap';

/**
 * Properties for the SimulationCanvas component, responsible for rendering the fluid dynamics heatmap.
 */
interface SimulationCanvasProps {
  /** Reference to the underlying HTML canvas element for direct rendering access. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Canvas width in pixels. Default is 700. */
  width?: number;
  /** Canvas height in pixels. Default is 700. */
  height?: number;
  /** Indicates whether the simulation engine is actively updating the canvas. */
  isRunning?: boolean;
  /** Pointer event handler for interactive grid modification (drawing walls, entries, exits). */
  onPaint?: (event: PointerEvent<HTMLCanvasElement>) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  canvasRef,
  width = 700,
  height = 700,
  isRunning = false,
  onPaint,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.98, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 0.9, ease: 'power3.out' }
    );
  }, []);

  useEffect(() => {
    if (!statusRef.current) return;
    const pulse = gsap.to(statusRef.current, {
      boxShadow: '0 0 24px rgba(16, 185, 129, 0.35)',
      duration: 1.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    return () => {
      pulse.kill();
    };
  }, []);

  return (
    <div ref={containerRef} className="glass-card p-6 flex min-h-[720px] flex-col">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4 border-b border-indigo-glow/20 pb-4">
        <div>
          <p className="text-sm font-semibold text-text-secondary uppercase tracking-[0.35em] mb-2">
            Live Simulation Canvas
          </p>
          <h3 className="text-2xl font-bold text-text-primary">Operational Visualization</h3>
        </div>
        <div ref={statusRef} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${isRunning ? 'border-emerald-math/30 bg-emerald-math/10 text-emerald-math' : 'border-white/10 bg-white/5 text-text-secondary'}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${isRunning ? 'bg-emerald-math animate-pulse' : 'bg-text-muted'}`} />
          {isRunning ? 'Recording' : 'Idle'}
        </div>
      </div>

      <div className="flex-1 min-h-[28rem] overflow-hidden border border-indigo-glow/15 bg-obsdian-950/80 shadow-glow-lg">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={onPaint}
          onPointerMove={onPaint}
          className="block w-full h-full max-w-full max-h-full"
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-text-muted">
        <div className="rounded-3xl border border-white/5 bg-obsdian-950/85 p-4">
          <p className="uppercase tracking-[0.3em]">Grid Size</p>
          <strong className="mt-2 block text-lg text-text-primary">{width} × {height}</strong>
        </div>
        <div className="rounded-3xl border border-white/5 bg-obsdian-950/85 p-4">
          <p className="uppercase tracking-[0.3em]">Resolution</p>
          <strong className="mt-2 block text-lg text-text-primary">High Precision</strong>
        </div>
        <div className="rounded-3xl border border-white/5 bg-obsdian-950/85 p-4">
          <p className="uppercase tracking-[0.3em]">Refresh</p>
          <strong className="mt-2 block text-lg text-text-primary">60 fps</strong>
        </div>
      </div>
    </div>
  );
};
