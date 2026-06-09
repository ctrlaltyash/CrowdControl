// Pumping out the raw numbers. We don't do vibes-based safety here, strictly data.
import { useEffect, useRef, useMemo } from 'react';
import { Activity, Shield, Users, Zap, AlertTriangle } from 'lucide-react';
import gsap from 'gsap';
import { SimulatorState } from '../../backend/engine/types';

interface AnalyticsCardsProps {
  state: SimulatorState | null;
}

export const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({ state }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Crunching the numbers from the simulation state array
  const metrics = useMemo(() => {
    if (!state) return [];
    
    // Summing up density to get the average
    const totalRho = state.rho.reduce((a, b) => a + b, 0);
    const avgDensity = totalRho / state.rho.length;
    
    // Finding the spiciest spot on the map
    const maxDensity = Math.max(...Array.from(state.rho));
    
    // Risk is calculated between 0 and 1, we turn it into a percentage
    const totalRisk = state.risk.reduce((a, b) => a + b, 0);
    const avgRisk = (totalRisk / state.risk.length) * 100;

    return [
      {
        label: 'Average Density',
        value: avgDensity.toFixed(2),
        unit: 'p/m²',
        icon: Users,
        color: 'text-neon-cyan',
        border: 'group-hover:border-neon-cyan',
        bg: 'bg-neon-cyan',
        progress: (avgDensity / state.params.rhoMax) * 100
      },
      {
        label: 'Peak Density',
        value: maxDensity.toFixed(2),
        unit: 'p/m²',
        icon: Activity,
        color: 'text-hazard-crit',
        border: 'group-hover:border-hazard-crit',
        bg: 'bg-hazard-crit',
        progress: (maxDensity / state.params.rhoMax) * 100
      },
      {
        label: 'Composite Risk',
        value: avgRisk.toFixed(1),
        unit: '%',
        icon: AlertTriangle,
        color: avgRisk > 60 ? 'text-hazard-crit' : avgRisk > 30 ? 'text-hazard-mid' : 'text-neon-green',
        border: avgRisk > 60 ? 'group-hover:border-hazard-crit' : avgRisk > 30 ? 'group-hover:border-hazard-mid' : 'group-hover:border-neon-green',
        bg: avgRisk > 60 ? 'bg-hazard-crit' : avgRisk > 30 ? 'bg-hazard-mid' : 'bg-neon-green',
        progress: avgRisk
      },
      {
        label: 'AI Mitigation Blocks',
        value: state.cells.filter(c => c === 4).length, // 4 is MITIGATION cell type
        unit: 'active',
        icon: Shield,
        color: 'text-neon-pink',
        border: 'group-hover:border-neon-pink',
        bg: 'bg-neon-pink',
        progress: 100 // Full bar if it exists
      },
      {
        label: 'Compute Cycles',
        value: state.stepCount,
        unit: 'ticks',
        icon: Zap,
        color: 'text-neon-purple',
        border: 'group-hover:border-neon-purple',
        bg: 'bg-neon-purple',
      },
      {
        label: 'Safety Score',
        value: Math.max(0, 100 - avgRisk).toFixed(0),
        unit: '/ 100',
        icon: Shield,
        color: 'text-neon-green',
        border: 'group-hover:border-neon-green',
        bg: 'bg-neon-green',
        progress: 100 - avgRisk
      }
    ];
  }, [state]);

  // Entrance animation and staggering the cards
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );

      gsap.to(cardsRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'back.out(1.5)',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []); // Only run once on mount

  return (
    <section ref={containerRef} className="w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-white mb-2">
          Telemetry Data
        </h2>
        <p className="text-gray-400 text-sm">
          Computational fluid dynamics (CFD) diagnostics streaming in real-time. No cap.
        </p>
      </div>

      {!state ? (
        <div className="glass-card p-12 text-center border-dashed border-white/20">
          <p className="text-gray-400 font-mono uppercase tracking-widest">
            Awaiting Simulation Data...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                ref={(el) => { cardsRef.current[index] = el; }}
                className={`glass-card p-6 border border-white/5 transition-all duration-300 group opacity-0 translate-y-4 hover:bg-void-800 ${metric.border}`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 rounded-xl bg-void-950 border border-white/5 transition-colors">
                    <Icon size={24} className={metric.color} />
                  </div>
                  {/* Subtle pulsing dot to show it's live data */}
                  <div className="flex items-center gap-2 bg-void-950 px-2 py-1 rounded-md border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse"></span>
                    <span className="text-[10px] font-mono text-gray-500 uppercase">Live</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    {metric.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-display font-black text-white">
                      {metric.value}
                    </span>
                    {metric.unit && (
                      <span className="text-sm font-medium text-gray-500">{metric.unit}</span>
                    )}
                  </div>
                </div>

                {metric.progress !== undefined && (
                  <div className="mt-6">
                    <div className="w-full h-1.5 bg-void-950 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${metric.bg}`}
                        style={{ width: `${Math.min(metric.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
