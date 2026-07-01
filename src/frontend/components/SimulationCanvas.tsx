// The main stage where the simulation goes crazy. 
// We attach the canvas here and let the WebGL/2D context go brrr.
// Lowkey where the magic happens, fr.
import { useRef, useEffect, type RefObject } from 'react';
import gsap from 'gsap';

// Props for the canvas, no cap. We need these to make it work.
interface SimulationCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  width?: number;
  height?: number;
  isRunning?: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLCanvasElement>) => void;
}

// The SimulationCanvas component. It's giving "high fidelity".
export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  canvasRef,
  width = 700,
  height = 700,
  isRunning = false,
  onPointerDown,
  onPointerMove,
}) => {
  // Refs for the container and status, so we can animate 'em.
  const containerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // Popping the canvas in with some swagger. Total rizz.
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!containerRef.current) return;
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.98, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.9, ease: 'power3.out' }
      );
    }, containerRef);

    // Clean up or it's mid.
    return () => ctx.revert();
  }, []);

  // Make the status indicator pulse when running. It's giving heartbeat.
  // This is lowkey satisfying to watch.
  useEffect(() => {
    if (!statusRef.current) return;
    const pulse = gsap.to(statusRef.current, {
      boxShadow: '0 0 24px rgba(132, 204, 22, 0.5)', // neon-green glow
      duration: 1.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      paused: !isRunning
    });

    if (isRunning) {
      pulse.play();
    } else {
      pulse.pause();
      // reset the glow when it stops so it doesn't look stuck
      gsap.to(statusRef.current, { boxShadow: 'none', duration: 0.1 });
    }

    // Kill it when we're done. No ghosting.
    return () => {
      pulse.kill();
    };
  }, [isRunning]);

  return (
    // The main wrapper for the canvas. It's a glass-card, very chic.
    <div ref={containerRef} className="glass-card p-4 sm:p-6 lg:p-8 flex min-h-[540px] lg:min-h-[760px] flex-col relative group">
      
      {/* The actual canvas wrapper - rounding the corners because sharp corners are an L */}
      <div className="flex-1 min-h-[28rem] overflow-hidden rounded-2xl border border-border-default bg-background-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_60px_rgba(94,106,210,0.05)] relative">
        
        {/* The canvas itself. This is where the pixels live. */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          className="block w-full h-full max-w-full max-h-full touch-none cursor-crosshair transition-opacity duration-1000"
          style={{ display: 'block', width: '100%', height: '100%' }}
          aria-label="Interactive crowd simulation grid"
        />
        
        {/* Subtle grid overlay to make it look techy. It's giving cyberpunk. */}
        <div className="absolute inset-0 pointer-events-none opacity-40 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      </div>

      {/* Some aesthetic specs at the bottom. No cap, it just looks cool. */}
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between text-[10px] text-foreground-muted font-mono font-bold uppercase tracking-[0.18em] px-1 sm:px-2">
        <div className="flex flex-wrap gap-5 lg:gap-10">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 bg-accent-bright rounded-full shadow-[0_0_12px_rgba(94,106,210,0.6)]"></div>
             <span>Resolution: {width}x{height}</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 bg-neon-purple rounded-full shadow-[0_0_12px_rgba(124,131,230,0.5)]"></div>
             <span>Engine: CFD Core V4.2</span>
          </div>
        </div>
        <div className="flex w-fit items-center gap-3 bg-background-base px-4 py-2 rounded-full border border-border-default">
          {/* Status dot. Green means go, gray means no. */}
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-neon-green animate-pulse shadow-[0_0_8px_rgba(101,217,148,0.75)]' : 'bg-gray-700'}`}></div>
          <span className={isRunning ? 'text-foreground' : 'text-foreground-muted'}>{isRunning ? 'Simulating Matrix' : 'Engine Standby'}</span>
        </div>
      </div>
    </div>
  );
};
