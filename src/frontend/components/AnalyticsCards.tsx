// Pumping out dem raw numbers fr. We don't do vibes-based safety here, strictly data. No cap.
import { useEffect, useRef, useMemo } from 'react';
import { Activity, Shield, Users, Zap, AlertTriangle } from 'lucide-react';
import gsap from 'gsap';
import { SimulatorState } from '../../backend/engine/types';

// props for da analytics cards
interface AnalyticsCardsProps {
  state: SimulatorState | null;
}

export const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({ state }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  // crunching da numbers from da simulation state array, real big brain energy
  const metrics = useMemo(() => {
    if (!state) return [];
    
    // summing up density juice to get da average
    const totalRho = state.rho.reduce((a, b) => a + b, 0);
    const avgDensity = totalRho / state.rho.length;
    
    // finding da spiciest spot on da map, it's wilding
    const maxDensity = Math.max(...Array.from(state.rho));
    
    // risk is 0 to 1, turning it into a percentage fr
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
        value: state.cells.filter(c => c === 4).length, // 4 is MITIGATION cell type, AI doing its thing
        unit: 'active',
        icon: Shield,
        color: 'text-neon-pink',
        border: 'group-hover:border-neon-pink',
        bg: 'bg-neon-pink',
        progress: 100 // full bar if it exists
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

  // making dem cards pop off with animations
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
        ease: 'expo.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []); // only run once on mount

  return (
    <section ref={containerRef} className="w-full">
      <div className="mb-12">
        <h2 className="text-4xl font-display font-semibold gradient-heading mb-3 tracking-tight">
          Telemetry Data
        </h2>
        <p className="text-foreground-muted text-sm font-medium tracking-wide">
          Computational fluid dynamics (CFD) diagnostics streaming in real-time.
        </p>
      </div>

      {/* if no state, we waiting for dat juice */}
      {!state ? (
        <div className="glass-card p-20 text-center border-dashed border-border-default bg-white/[0.01]">
          <div className="w-12 h-12 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-foreground-muted font-mono font-bold uppercase tracking-[0.24em] text-xs">
            Synchronizing Matrix...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
          {/* mapping thru metrics like a boss */}
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                ref={(el) => { cardsRef.current[index] = el; }}
                className={`glass-card p-8 border border-border-default transition-all duration-300 group opacity-0 translate-y-4 hover:-translate-y-1 hover:bg-white/[0.03] hover:border-border-hover ${metric.border}`}
              >
                <div className="flex items-start justify-between mb-10">
                  <div className="p-4 rounded-xl bg-background-base border border-border-default transition-all group-hover:scale-[1.02]">
                    <Icon size={28} className={metric.color} />
                  </div>
                  {/* subtle pulsing dot for dat live energy */}
                  <div className="flex items-center gap-3 bg-background-base px-4 py-2 rounded-full border border-border-default">
                    <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse shadow-[0_0_10px_rgba(101,217,148,0.7)]"></span>
                    <span className="text-[10px] font-mono font-bold tracking-[0.18em] text-foreground-muted uppercase">Live</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                    {metric.label}
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl lg:text-5xl font-display font-semibold text-white tracking-normal">
                      {metric.value}
                    </span>
                    {metric.unit && (
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">{metric.unit}</span>
                    )}
                  </div>
                </div>

                {/* progress bars for dat extra rizz */}
                {metric.progress !== undefined && (
                  <div className="mt-10">
                    <div className="w-full h-1 bg-background-base rounded-full overflow-hidden border border-border-default">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${metric.bg}`}
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
