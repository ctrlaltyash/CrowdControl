import { useMemo } from 'react';

/**
 * Structure representing a single point in the telemetry time-series.
 */
export interface LiveTelemetryPoint {
  step: number;
  elapsed: number;
  simTime: number;
  peakDensity: number;
  meanDensity: number;
  maxRisk: number;
  meanRisk: number;
  highRiskAreaPct: number;
  crowdMass: number;
}

type ChartMetricKey = 'peakDensity' | 'meanDensity' | 'maxRisk' | 'highRiskAreaPct';

/**
 * Properties for the LiveTelemetryCharts component.
 */
interface LiveTelemetryChartsProps {
  /** Array of collected telemetry data points. */
  points: LiveTelemetryPoint[];
  /** Display label for the current simulation scenario. */
  caseLabel: string;
  /** Total duration of the simulation to represent on the x-axis. */
  timeHorizon: number;
  /** Density threshold marking a critical state. */
  densityCritical: number;
  /** Maximum representable density. */
  densityLimit: number;
  /** Risk threshold marking a hazardous state. */
  riskThreshold: number;
  /** Indicates if the simulation is currently active. */
  isRunning: boolean;
}

interface ChartDefinition {
  key: ChartMetricKey;
  title: string;
  symbol: string;
  unit: string;
  color: string;
  softColor: string;
  axisFloor: number;
  axisCeiling: number;
  referenceValue?: number;
  referenceLabel?: string;
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
}

interface ChartGeometry {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  plotWidth: number;
  plotHeight: number;
  baselineY: number;
  axisMaxX: number;
  axisMaxY: number;
  coords: string;
  area: string;
  latestPoint?: {
    x: number;
    y: number;
  };
}

function formatTime(value: number): string {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const normalized = value / base;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * base;
}

function buildChartDefinitions(
  densityCritical: number,
  densityLimit: number,
  riskThreshold: number,
): ChartDefinition[] {
  return [
    {
      key: 'peakDensity',
      title: 'Peak Density',
      symbol: 'max rho(t)',
      unit: 'persons / m2',
      color: '#5E6AD2',
      softColor: 'rgba(94, 106, 210, 0.18)',
      axisFloor: 0,
      axisCeiling: densityLimit,
      referenceValue: densityCritical,
      referenceLabel: 'rho crit',
      formatValue: (value) => value.toFixed(2),
      formatTick: (value) => value.toFixed(value >= 10 ? 0 : 1),
    },
    {
      key: 'meanDensity',
      title: 'Mean Density',
      symbol: 'mean rho(t)',
      unit: 'persons / m2',
      color: '#00D9FF',
      softColor: 'rgba(0, 217, 255, 0.16)',
      axisFloor: 0,
      axisCeiling: densityCritical,
      referenceValue: densityCritical,
      referenceLabel: 'rho crit',
      formatValue: (value) => value.toFixed(2),
      formatTick: (value) => value.toFixed(value >= 10 ? 0 : 1),
    },
    {
      key: 'maxRisk',
      title: 'Max Risk',
      symbol: 'max R(t)',
      unit: '0-1 score',
      color: '#FF5C72',
      softColor: 'rgba(255, 92, 114, 0.16)',
      axisFloor: 0,
      axisCeiling: 1,
      referenceValue: riskThreshold,
      referenceLabel: 'alert threshold',
      formatValue: (value) => value.toFixed(3),
      formatTick: (value) => value.toFixed(2),
    },
    {
      key: 'highRiskAreaPct',
      title: 'High-Risk Area',
      symbol: 'A(R >= threshold)',
      unit: '% of active cells',
      color: '#F59F52',
      softColor: 'rgba(245, 159, 82, 0.16)',
      axisFloor: 0,
      axisCeiling: 100,
      referenceValue: 10,
      referenceLabel: '10% area',
      formatValue: (value) => value.toFixed(1),
      formatTick: (value) => value.toFixed(0),
    },
  ];
}

function buildChartGeometry(
  points: LiveTelemetryPoint[],
  chart: ChartDefinition,
  timeHorizon: number,
): ChartGeometry {
  const width = 560;
  const height = 320;
  const left = 70;
  const right = 22;
  const top = 24;
  const bottom = 58;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const latestTime = points.at(-1)?.simTime ?? 0;
  const axisMaxX = Math.max(timeHorizon, latestTime, 1);
  const maxObserved = Math.max(chart.axisCeiling, ...points.map((point) => point[chart.key]));
  const axisMaxY = niceCeiling(Math.max(chart.axisCeiling, maxObserved * 1.08));

  const toX = (time: number) => left + (Math.max(0, Math.min(time, axisMaxX)) / axisMaxX) * plotWidth;
  const toY = (value: number) => {
    const clamped = Math.max(chart.axisFloor, Math.min(value, axisMaxY));
    return top + plotHeight - ((clamped - chart.axisFloor) / (axisMaxY - chart.axisFloor || 1)) * plotHeight;
  };

  const coords = points
    .map((point) => `${toX(point.simTime).toFixed(2)},${toY(point[chart.key]).toFixed(2)}`)
    .join(' ');

  const area = points.length > 0
    ? `${left},${top + plotHeight} ${coords} ${toX(points.at(-1)?.simTime ?? 0).toFixed(2)},${top + plotHeight}`
    : '';

  const latest = points.at(-1);

  return {
    width,
    height,
    left,
    right,
    top,
    bottom,
    plotWidth,
    plotHeight,
    baselineY: top + plotHeight,
    axisMaxX,
    axisMaxY,
    coords,
    area,
    latestPoint: latest
      ? {
          x: toX(latest.simTime),
          y: toY(latest[chart.key]),
        }
      : undefined,
  };
}

export const LiveTelemetryCharts: React.FC<LiveTelemetryChartsProps> = ({
  points,
  caseLabel,
  timeHorizon,
  densityCritical,
  densityLimit,
  riskThreshold,
  isRunning,
}) => {
  const latestPoint = points.at(-1);
  const sampleCount = points.length;
  const charts = useMemo(
    () => buildChartDefinitions(densityCritical, densityLimit, riskThreshold),
    [densityCritical, densityLimit, riskThreshold],
  );
  const geometries = useMemo(() => {
    return charts.reduce<Record<ChartMetricKey, ChartGeometry>>((acc, chart) => {
      acc[chart.key] = buildChartGeometry(points, chart, timeHorizon);
      return acc;
    }, {} as Record<ChartMetricKey, ChartGeometry>);
  }, [charts, points, timeHorizon]);

  const latestTime = latestPoint?.simTime ?? 0;
  const progressPct = Math.min(100, (latestTime / Math.max(timeHorizon, 1)) * 100);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 border-t border-white/10 pt-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.32em] text-text-muted">Case Telemetry</p>
          <h3 className="text-2xl font-bold text-text-primary">Scientific Time-Series</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="status-pill border-accent/20 bg-accent/10 px-3 py-2 text-accent-bright">
            <span className="block text-[10px] uppercase tracking-[0.28em]">Case</span>
            <strong className="block text-sm">{caseLabel}</strong>
          </div>
          <div className={`status-pill px-3 py-2 ${isRunning ? 'border-neon-green/20 bg-neon-green/10 text-neon-green' : 'border-white/10 bg-white/5 text-text-secondary'}`}>
            <span className="block text-[10px] uppercase tracking-[0.28em]">Time Domain</span>
            <strong className="block text-sm">0-{formatTime(timeHorizon)} s</strong>
          </div>
          <div className="status-pill border-white/10 bg-white/5 px-3 py-2 text-text-secondary">
            <span className="block text-[10px] uppercase tracking-[0.28em]">Samples</span>
            <strong className="block text-sm">{sampleCount}</strong>
          </div>
        </div>
      </div>

      <div className="h-1 overflow-hidden bg-white/5">
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {charts.map((chart) => {
          const geometry = geometries[chart.key];
          const latestValue = latestPoint?.[chart.key] ?? 0;
          const values = points.map((point) => point[chart.key]);
          const minValue = values.length > 0 ? Math.min(...values) : 0;
          const maxValue = values.length > 0 ? Math.max(...values) : 0;
          const gradientId = `chart-fill-${chart.key}`;
          const xTicks = [0, geometry.axisMaxX / 2, geometry.axisMaxX];
          const yTicks = [0, geometry.axisMaxY / 2, geometry.axisMaxY];
          const referenceY = chart.referenceValue !== undefined
            ? geometry.top + geometry.plotHeight - (Math.max(0, Math.min(chart.referenceValue, geometry.axisMaxY)) / geometry.axisMaxY) * geometry.plotHeight
            : undefined;

          return (
            <article key={chart.key} className="glass-card p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-text-muted">{chart.symbol}</p>
                  <h4 className="mt-2 text-lg font-semibold text-text-primary">{chart.title}</h4>
                  <p className="mt-1 text-xs text-text-secondary">{chart.unit}</p>
                </div>
                <div className="text-right">
                  <strong className="block text-2xl font-semibold text-text-primary">{chart.formatValue(latestValue)}</strong>
                  <span className="text-[10px] uppercase tracking-[0.24em] text-text-muted">current</span>
                </div>
              </div>

              <div className="aspect-[16/10] w-full overflow-hidden border border-white/5 bg-obsdian-950/70">
                <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="h-full w-full" role="img" aria-label={`${caseLabel} ${chart.title} from t0 to tend`}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={chart.softColor} />
                      <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>
                  </defs>

                  <rect
                    x={geometry.left}
                    y={geometry.top}
                    width={geometry.plotWidth}
                    height={geometry.plotHeight}
                    fill="rgba(255,255,255,0.015)"
                    stroke="rgba(255,255,255,0.08)"
                  />

                  {yTicks.map((tick) => {
                    const y = geometry.top + geometry.plotHeight - (tick / geometry.axisMaxY) * geometry.plotHeight;
                    return (
                      <g key={`y-${tick}`}>
                        <line
                          x1={geometry.left}
                          x2={geometry.width - geometry.right}
                          y1={y}
                          y2={y}
                          stroke="rgba(255,255,255,0.06)"
                          strokeWidth="1"
                        />
                        <text x={geometry.left - 10} y={y + 4} fill="rgba(237,237,240,0.58)" textAnchor="end" fontSize="11" fontWeight="700">
                          {chart.formatTick(tick)}
                        </text>
                      </g>
                    );
                  })}

                  {xTicks.map((tick) => {
                    const x = geometry.left + (tick / geometry.axisMaxX) * geometry.plotWidth;
                    return (
                      <g key={`x-${tick}`}>
                        <line
                          x1={x}
                          x2={x}
                          y1={geometry.top}
                          y2={geometry.baselineY}
                          stroke="rgba(255,255,255,0.045)"
                          strokeWidth="1"
                        />
                        <text x={x} y={geometry.baselineY + 22} fill="rgba(237,237,240,0.58)" textAnchor="middle" fontSize="11" fontWeight="700">
                          {formatTime(tick)}s
                        </text>
                      </g>
                    );
                  })}

                  {referenceY !== undefined && (
                    <g>
                      <line
                        x1={geometry.left}
                        x2={geometry.width - geometry.right}
                        y1={referenceY}
                        y2={referenceY}
                        stroke="rgba(255,255,255,0.34)"
                        strokeDasharray="5 5"
                        strokeWidth="1.25"
                      />
                      <text x={geometry.width - geometry.right - 6} y={referenceY - 6} fill="rgba(237,237,240,0.64)" textAnchor="end" fontSize="10" fontWeight="700">
                        {chart.referenceLabel}
                      </text>
                    </g>
                  )}

                  {sampleCount > 0 ? (
                    <>
                      <polygon points={geometry.area} fill={`url(#${gradientId})`} />
                      <polyline
                        points={geometry.coords}
                        fill="none"
                        stroke={chart.color}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                      />
                      {geometry.latestPoint && (
                        <circle
                          cx={geometry.latestPoint.x}
                          cy={geometry.latestPoint.y}
                          r="4"
                          fill={chart.color}
                          stroke="#050506"
                          strokeWidth="2"
                        />
                      )}
                    </>
                  ) : (
                    <text x="300" y="158" fill="rgba(237,237,240,0.45)" textAnchor="middle" fontSize="12" fontWeight="700">
                      Start a simulation to stream telemetry
                    </text>
                  )}

                  <text x={geometry.left + geometry.plotWidth / 2} y={geometry.height - 16} fill="rgba(237,237,240,0.58)" textAnchor="middle" fontSize="11" fontWeight="800">
                    simulation time t (s)
                  </text>
                </svg>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                <span>min {chart.formatValue(minValue)}</span>
                <span className="text-center">max {chart.formatValue(maxValue)}</span>
                <span className="text-right">t {formatTime(latestTime)}s</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
