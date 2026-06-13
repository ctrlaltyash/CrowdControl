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
      className="glass-card p-10 max-h-[850px] overflow-y-auto custom-scrollbar"
    >
      <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
        <div>
          <h3 className="text-3xl font-display font-black text-white tracking-tight">Threat Log</h3>
          <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-[0.3em] font-black">Live Incident Stream</p>
        </div>
        {/* counting how many times we caught dem lacking */}
        <span className={`px-6 py-2.5 ${alerts.length > 0 ? 'bg-hazard-crit/10 text-hazard-crit border-hazard-crit/20 shadow-glow-pink' : 'bg-neon-green/5 text-neon-green border-neon-green/10'} border text-[10px] font-black rounded-full uppercase tracking-[0.2em] transition-all`}>
          {alerts.length} Detected
        </span>
      </div>

      <div className="space-y-6">
        {/* if it's empty, we chillin. sector clear energy */}
        {alerts.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center border border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
            <div className="w-20 h-20 rounded-full bg-neon-green/5 flex items-center justify-center mb-6 border border-neon-green/10">
              <ShieldCheck size={40} className="text-neon-green opacity-50" />
            </div>
            <p className="text-white font-display font-black text-xl mb-2 tracking-tight">Sector Nominal</p>
            <p className="text-gray-600 text-sm font-medium">No active kinetic hazards detected in current vector.</p>
          </div>
        ) : (
          /* mapping thru alerts like a boss */
          alerts.map((alert, index) => (
            <div
              key={alert.id}
              ref={(el) => { alertsRef.current[index] = el; }}
              className={`p-6 rounded-[1.5rem] border transition-all duration-500 ${getAlertBg(alert.type)} opacity-0 translate-x-8 group hover:bg-white/[0.02]`}
            >
              <div className="flex items-start gap-6">
                {/* icon block, keeping it flashy */}
                <div className={`mt-0.5 p-4 rounded-2xl bg-void-950 border border-white/5 shadow-glass ${getAlertColor(alert.type)} transition-transform group-hover:scale-110`}>
                  {getAlertIcon(alert.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                      {alert.type.replace('_', ' ')}
                    </p>
                    <span className="text-[9px] bg-void-950 px-3 py-1.5 rounded-full border border-white/5 text-gray-500 font-black uppercase tracking-widest">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {/* description based on type, real talk */}
                  <p className="text-sm text-gray-400 font-medium leading-relaxed mb-6">
                    {alert.type === 'CRUSH_RISK' ? 'Critical density threshold exceeded. Localized pressure surge in progress. Stampede risk is severe.' : 
                     alert.type === 'TURBULENCE' ? 'Unstable flow patterns detected. High risk of wave propagation.' :
                     'Static congestion identified. Flow optimization recommended.'}
                  </p>
                  
                  <div className="flex items-center flex-wrap gap-4">
                    {/* location of da drama */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-void-950 rounded-xl border border-white/5 text-[10px] text-neon-cyan font-black uppercase tracking-widest">
                      <MapPin size={12} />
                      <span>Vector: [{alert.r}, {alert.c}]</span>
                    </div>
                    
                    {/* if we fixed it, let 'em know */}
                    {alert.mitigated && (
                      <span className="px-4 py-2 bg-neon-pink/10 border border-neon-pink/20 text-neon-pink rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(217,70,239,0.1)]">
                        AI Neutralized
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
