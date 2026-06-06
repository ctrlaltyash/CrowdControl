/* ─────────────────────────────────────────────────────────────
   Alerts Panel Component - Real-time Hazard Notifications
   ───────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import gsap from 'gsap';
import { MOCK_ALERTS, getAlertColor, getAlertBgColor, formatTimestamp } from '../utils/mockData';

interface AlertsPanelProps {
  title?: string;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  title = 'System Alerts',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Animate container
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }
    );
  }, []);

  useEffect(() => {
    // Stagger alerts
    gsap.to(alertsRef.current, {
      opacity: 1,
      x: 0,
      duration: 0.5,
      stagger: 0.08,
      ease: 'back.out',
    });
  }, []);

  const getAlertIcon = (level: string) => {
    if (level === 'critical') return <AlertCircle size={18} />;
    if (level === 'warning') return <AlertTriangle size={18} />;
    return <Info size={18} />;
  };

  return (
    <div
      ref={containerRef}
      className="card-premium p-6 max-h-96 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-indigo-glow/20">
        <h3 className="text-lg font-bold text-text-primary">{title}</h3>
        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded">
          {MOCK_ALERTS.length} Active
        </span>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {MOCK_ALERTS.map((alert, index) => (
          <div
            key={alert.id}
            ref={(el) => { alertsRef.current[index] = el; }}
            className={`p-4 rounded-lg border transition-all duration-300 ${getAlertBgColor(
              alert.level
            )} opacity-0 translate-x-4 cursor-pointer hover:translate-x-1 group`}
          >
            {/* Alert Header */}
            <div className="flex items-start gap-3 mb-2">
              <div className={`mt-0.5 ${getAlertColor(alert.level)}`}>
                {getAlertIcon(alert.level)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">
                  {alert.message}
                </p>
                {alert.location && (
                  <p className="text-xs text-text-muted mt-1">
                    Location: <span className="text-indigo-glow">{alert.location}</span>
                  </p>
                )}
              </div>
              <button className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Timestamp */}
            <div className="pl-6 text-xs text-text-muted">
              {formatTimestamp(alert.timestamp)}
            </div>
          </div>
        ))}
      </div>

      {/* Clear All Button */}
      {MOCK_ALERTS.length > 0 && (
        <button className="w-full mt-4 pt-4 border-t border-indigo-glow/20 text-xs text-indigo-glow hover:text-indigo-electric transition-colors font-semibold tracking-wider">
          CLEAR ALL
        </button>
      )}
    </div>
  );
};
