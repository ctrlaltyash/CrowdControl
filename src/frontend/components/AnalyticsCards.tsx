/* ─────────────────────────────────────────────────────────────
   Analytics Cards Component - Real-time Metrics Display
   ───────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import gsap from 'gsap';
import { MOCK_METRICS } from '../utils/mockData';

interface AnalyticsCardsProps {
  title?: string;
}

export const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({
  title = 'Live Metrics',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Animate container
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    );
  }, []);

  useEffect(() => {
    // Stagger cards
    gsap.to(cardsRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'back.out',
    });
  }, []);

  useEffect(() => {
    // Setup hover animations
    cardsRef.current.forEach((card) => {
      if (card) {
        card.addEventListener('mouseenter', () => {
          gsap.to(card, {
            scale: 1.05,
            y: -8,
            duration: 0.3,
            ease: 'power2.out',
          });
        });

        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            scale: 1,
            y: 0,
            duration: 0.3,
            ease: 'power2.out',
          });
        });
      }
    });
  }, []);

  const getTrendColor = (trend?: string) => {
    if (trend === 'up') return 'text-red-500';
    if (trend === 'down') return 'text-emerald-math';
    return 'text-text-muted';
  };

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') return <TrendingUp size={16} className="text-red-500" />;
    if (trend === 'down')
      return <TrendingDown size={16} className="text-emerald-math" />;
    return <Minus size={16} className="text-text-muted" />;
  };

  return (
    <section ref={containerRef} className="w-full py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gradient-emerald mb-2">
            {title}
          </h2>
          <p className="text-text-muted text-sm">
            Real-time statistics from active simulation
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_METRICS.map((metric, index) => (
            <div
              key={metric.label}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="card-premium p-6 cursor-pointer transition-all duration-300"
            >
              {/* Header with Trend */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                    {metric.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-text-primary">
                      {metric.value}
                    </span>
                    {metric.unit && (
                      <span className="text-sm text-text-muted">{metric.unit}</span>
                    )}
                  </div>
                </div>
                {metric.trend && (
                  <div
                    className={`flex items-center gap-1 ${getTrendColor(metric.trend)}`}
                  >
                    {getTrendIcon(metric.trend)}
                    {metric.trendPercent && (
                      <span className="text-sm font-semibold">
                        {Math.abs(metric.trendPercent)}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {typeof metric.value === 'number' && metric.value < 100 && (
                <div className="w-full h-1.5 bg-obsdian-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-electric to-cyan-cyber rounded-full"
                    style={{
                      width: `${Math.min(metric.value as number, 100)}%`,
                    }}
                  ></div>
                </div>
              )}

              {/* Status Indicator */}
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-math animate-pulse"></div>
                <span className="text-xs text-text-muted">Live</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
