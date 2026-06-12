// Da snitch panel fr. Tells u exactly where da sim is failing, no cap.
import { useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, Info, MapPin, ShieldCheck } from 'lucide-react';
import gsap from 'gsap';
import { HazardAlert } from '../../backend/engine/types';

// props for da alerts panel, keeping it 100
interface AlertsPanelProps {
  alerts: HazardAlert[];
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<(HTMLDivElement | null)[]>([]);

  // sliding in from da right like a DM, real smooth energy
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }
      );
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  // new alerts popping off, we love to see it
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(alertsRef.current, {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: 'back.out(1.2)',
      });
    }, containerRef);

    return () => ctx.revert();
  }, [alerts]);

  // picking da icon vibe for each alert type
  const getAlertIcon = (type: HazardAlert['type']) => {
    if (type === 'CRUSH_RISK') return <AlertCircle size={20} />;
    if (type === 'TURBULENCE') return <AlertTriangle size={20} />;
    return <Info size={20} />;
  };

  // danger levels be trippin, color coding it fr
  const getAlertColor = (type: HazardAlert['type']) => {
    if (type === 'CRUSH_RISK') return 'text-hazard-crit';
    if (type === 'TURBULENCE') return 'text-hazard-high';
    return 'text-hazard-mid';
  };

  // background tint for da alert cards, aesthetics matter
  const getAlertBg = (type: HazardAlert['type']) => {
    if (type === 'CRUSH_RISK') return 'bg-hazard-crit/10 border-hazard-crit/30 shadow-[inset_4px_0_0_0_#ef4444]';
    if (type === 'TURBULENCE') return 'bg-hazard-high/10 border-hazard-high/30 shadow-[inset_4px_0_0_0_#f97316]';
    return 'bg-hazard-mid/10 border-hazard-mid/30 shadow-[inset_4px_0_0_0_#eab308]';
  };

  return (
    <div
      ref={containerRef}
      className="glass-card p-6 md:p-8 max-h-[800px] overflow-y-auto custom-scrollbar"
    >
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <div>
          <h3 className="text-2xl font-display font-bold text-white">Threat Log</h3>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-mono">Live Incident Stream</p>
        </div>
        {/* counting how many times we caught dem lacking */}
        <span className={`px-4 py-2 ${alerts.length > 0 ? 'bg-hazard-crit/20 text-hazard-crit border-hazard-crit/50 shadow-glow-pink' : 'bg-neon-green/10 text-neon-green border-neon-green/30'} border text-xs font-bold rounded-xl uppercase tracking-widest transition-all`}>
          {alerts.length} Detected
        </span>
      </div>

      <div className="space-y-4">
        {/* if it's empty, we chillin. sector clear energy */}
        {alerts.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl bg-void-950/50">
            <div className="w-16 h-16 rounded-full bg-neon-green/10 flex items-center justify-center mb-4">
              <ShieldCheck size={32} className="text-neon-green" />
            </div>
            <p className="text-white font-display font-bold text-lg mb-1">Sector Clear</p>
            <p className="text-gray-500 text-sm">No active hazards detected in the current matrix.</p>
          </div>
        ) : (
          /* mapping thru alerts like a boss */
          alerts.map((alert, index) => (
            <div
              key={alert.id}
              ref={(el) => { alertsRef.current[index] = el; }}
              className={`p-5 rounded-2xl border transition-all duration-300 ${getAlertBg(alert.type)} opacity-0 translate-x-8 group`}
            >
              <div className="flex items-start gap-5">
                {/* icon block, keeping it flashy */}
                <div className={`mt-0.5 p-3 rounded-xl bg-void-950 border border-white/5 shadow-glass ${getAlertColor(alert.type)}`}>
                  {getAlertIcon(alert.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-bold text-white uppercase tracking-wider">
                      {alert.type.replace('_', ' ')}
                    </p>
                    <span className="text-[10px] bg-void-950 px-2 py-1 rounded-md border border-white/10 text-gray-400 font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {/* description based on type, real talk */}
                  <p className="text-sm text-gray-300 leading-relaxed mb-4">
                    {alert.type === 'CRUSH_RISK' ? 'Critical density threshold exceeded. Localized pressure surge in progress. Stampede risk is highkey severe.' : 
                     alert.type === 'TURBULENCE' ? 'Unstable flow patterns detected. High risk of stumbling and wave propagation.' :
                     'Static congestion identified. Flow optimization heavily recommended.'}
                  </p>
                  
                  <div className="flex items-center flex-wrap gap-3">
                    {/* location of da drama */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-void-950 rounded-lg border border-white/5 text-xs text-neon-cyan font-mono">
                      <MapPin size={12} />
                      <span>Grid: [{alert.r}, {alert.c}]</span>
                    </div>
                    
                    {/* if we fixed it, let 'em know */}
                    {alert.mitigated && (
                      <span className="px-3 py-1.5 bg-neon-pink/10 border border-neon-pink/30 text-neon-pink rounded-lg text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(217,70,239,0.2)]">
                        AI Mitigated
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
