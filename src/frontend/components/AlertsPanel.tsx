// Displays real-time hazard alerts identified by the simulation engine, detailing location and severity.
import { useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, Info, MapPin, ShieldCheck } from 'lucide-react';
import gsap from 'gsap';
import { HazardAlert } from '../../backend/engine/types';

// Properties for the AlertsPanel, expecting an array of active hazard alerts.
interface AlertsPanelProps {
  alerts: HazardAlert[];
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize the container's slide-in entrance animation upon mounting.
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

  // Trigger staggered animations for incoming alerts as they are added to the list.
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(alertsRef.current, {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: 'expo.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, [alerts]);

  // Map specific hazard types to their corresponding visual iconography.
  const getAlertIcon = (type: HazardAlert['type']) => {
    if (type === 'CRUSH_RISK') return <AlertCircle size={20} />;
    if (type === 'TURBULENCE') return <AlertTriangle size={20} />;
    return <Info size={20} />;
  };

  // Assign severity-based text color coding for different hazard types.
  const getAlertColor = (type: HazardAlert['type']) => {
    if (type === 'CRUSH_RISK') return 'text-hazard-crit';
    if (type === 'TURBULENCE') return 'text-hazard-high';
    return 'text-hazard-mid';
  };

  // Assign severity-based background and border styling for the alert cards.
  const getAlertBg = (type: HazardAlert['type']) => {
    if (type === 'CRUSH_RISK') return 'bg-hazard-crit/10 border-hazard-crit/30 shadow-[inset_4px_0_0_0_#FF5C72]';
    if (type === 'TURBULENCE') return 'bg-hazard-high/10 border-hazard-high/30 shadow-[inset_4px_0_0_0_#F59F52]';
    return 'bg-hazard-mid/10 border-hazard-mid/30 shadow-[inset_4px_0_0_0_#E6C662]';
  };

  return (
    <div
      ref={containerRef}
      className="glass-card p-6 sm:p-8 max-h-[850px] overflow-y-auto custom-scrollbar"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10 pb-6 border-b border-border-default">
        <div>
          <h3 className="text-3xl font-display font-semibold gradient-heading tracking-tight">Threat Log</h3>
          <p className="text-[10px] text-foreground-muted mt-2 uppercase tracking-[0.22em] font-mono font-bold">Live Incident Stream</p>
        </div>
        <span className={`px-5 py-2.5 ${alerts.length > 0 ? 'bg-hazard-crit/10 text-hazard-crit border-hazard-crit/20 shadow-[0_0_24px_rgba(255,92,114,0.12)]' : 'bg-neon-green/5 text-neon-green border-neon-green/10'} border text-[10px] font-mono font-bold rounded-full uppercase tracking-[0.18em] transition-all`}>
          {alerts.length} Detected
        </span>
      </div>

      <div className="space-y-6">
        {/* Display an empty state if no kinetic hazards are currently detected. */}
        {alerts.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center border border-dashed border-border-default rounded-2xl bg-white/[0.01]">
            <div className="w-20 h-20 rounded-2xl bg-neon-green/5 flex items-center justify-center mb-6 border border-neon-green/10">
              <ShieldCheck size={40} className="text-neon-green opacity-50" />
            </div>
            <p className="text-white font-display font-semibold text-xl mb-2 tracking-tight">Sector Nominal</p>
            <p className="text-foreground-muted text-sm font-medium">No active kinetic hazards detected in current vector.</p>
          </div>
        ) : (
          /* Iterate through active alerts and render their details. */
          alerts.map((alert, index) => (
            <div
              key={alert.id}
              ref={(el) => { alertsRef.current[index] = el; }}
              className={`p-6 rounded-2xl border transition-all duration-300 ${getAlertBg(alert.type)} opacity-0 translate-x-8 group hover:bg-white/[0.02]`}
            >
              <div className="flex items-start gap-6">
                {/* Visual indicator representing the hazard category. */}
                <div className={`mt-0.5 p-4 rounded-xl bg-background-base border border-border-default shadow-glass ${getAlertColor(alert.type)} transition-transform group-hover:scale-[1.02]`}>
                  {getAlertIcon(alert.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <p className="text-[10px] font-mono font-bold text-white uppercase tracking-[0.18em]">
                      {alert.type.replace('_', ' ')}
                    </p>
                    <span className="text-[9px] bg-background-base px-3 py-1.5 rounded-full border border-border-default text-foreground-muted font-mono font-bold uppercase tracking-widest">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {/* Detailed description based on the specific hazard type. */}
                  <p className="text-sm text-foreground-muted font-medium leading-relaxed mb-6">
                    {alert.type === 'CRUSH_RISK' ? 'Critical density threshold exceeded. Localized pressure surge in progress. Stampede risk is severe.' : 
                     alert.type === 'TURBULENCE' ? 'Unstable flow patterns detected. High risk of wave propagation.' :
                     'Static congestion identified. Flow optimization recommended.'}
                  </p>
                  
                  <div className="flex items-center flex-wrap gap-4">
                    {/* Spatial coordinates where the hazard was detected. */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-background-base rounded-lg border border-border-default text-[10px] text-accent-bright font-mono font-bold uppercase tracking-widest">
                      <MapPin size={12} />
                      <span>Vector: [{alert.r}, {alert.c}]</span>
                    </div>
                    
                    {/* Indicate whether the AI mitigation layer has resolved the hazard. */}
                    {alert.mitigated && (
                      <span className="px-4 py-2 bg-accent/[0.12] border border-border-accent text-accent-bright rounded-lg text-[9px] font-mono font-bold uppercase tracking-[0.18em] shadow-[0_0_18px_rgba(94,106,210,0.12)]">
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
