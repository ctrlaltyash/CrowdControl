// The main stage where the simulation goes crazy. 
// We attach the canvas here and let the WebGL/2D context go brrr.
import { useRef, useEffect, type RefObject } from 'react';
import gsap from 'gsap';

interface SimulationCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  width?: number;
  height?: number;
  isRunning?: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLCanvasElement>) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  canvasRef,
  width = 700,
  height = 700,
  isRunning = false,
  onPointerDown,
  onPointerMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // Popping the canvas in with some swagger
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!containerRef.current) return;
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.98, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.9, ease: 'power3.out' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Make the status indicator pulse when running. It's giving heartbeat.
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

    return () => {
      pulse.kill();
    };
  }, [isRunning]);

  return (
    <div ref={containerRef} className="glass-card p-6 flex min-h-[720px] flex-col border-white/5 relative group">
      
      {/* The actual canvas wrapper - rounding the corners because sharp corners are an L */}
      <div className="flex-1 min-h-[28rem] overflow-hidden rounded-[1.25rem] border border-white/10 bg-void-950 shadow-inner relative">
        
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          className="block w-full h-full max-w-full max-h-full touch-none cursor-crosshair"
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
        
        {/* Subtle grid overlay to make it look techy */}
        <div className="absolute inset-0 pointer-events-none opacity-1 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      {/* Some aesthetic specs at the bottom. No cap, it just looks cool. */}
      <div className="mt-5 flex items-center justify-between text-xs text-gray-500 font-mono uppercase tracking-widest px-2">
        <div className="flex gap-6">
          <span>Res: {width}x{height}</span>
          <span>Engine: CFD V4</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-neon-green animate-pulse' : 'bg-gray-600'}`}></div>
          <span>{isRunning ? 'Rendering' : 'Standby'}</span>
        </div>
      </div>
    </div>
  );
};
