/* ─────────────────────────────────────────────────────────────
   Analytics Engine — Detects potential stampede precursors in the simulations
   This module evaluates density, speed and local pressure build-up to generate
   consistent early-warning hazard alerts.
 ───────────────────────────────────────────────────────────── */

import { HazardAlert, SimParams } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const NEIGHBOR_RADIUS = 2;
const MIN_SPEED_THRESHOLD = 0.12;

export function detectHazards(
  rho: Float64Array,
  vx: Float64Array,
  vy: Float64Array,
  rows: number,
  cols: number,
  params: SimParams,
  step: number,
): HazardAlert[] {
  const alerts: HazardAlert[] = [];
  const idx = (r: number, c: number) => r * cols + c;
  const baselineDensity = Math.max(params.rhoCrit * 0.6, params.rhoMax * 0.25);
  const motionThreshold = Math.max(MIN_SPEED_THRESHOLD, params.minSpeedFactor * 0.5);

  for (let r = NEIGHBOR_RADIUS; r < rows - NEIGHBOR_RADIUS; r += 1) {
    for (let c = NEIGHBOR_RADIUS; c < cols - NEIGHBOR_RADIUS; c += 1) {
      const centerIndex = idx(r, c);
      const centerDensity = Math.max(0, rho[centerIndex]);
      if (centerDensity < baselineDensity * 0.5) continue;

      let densitySum = 0;
      let speedSum = 0;
      let gradientSum = 0;
      let sampleCount = 0;

      for (let dr = -NEIGHBOR_RADIUS; dr <= NEIGHBOR_RADIUS; dr++) {
        for (let dc = -NEIGHBOR_RADIUS; dc <= NEIGHBOR_RADIUS; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
          const ii = idx(rr, cc);
          const localDensity = Math.max(0, rho[ii]);
          densitySum += localDensity;
          const speed = Math.hypot(vx[ii], vy[ii]);
          speedSum += speed;
          gradientSum += Math.abs(centerDensity - localDensity);
          sampleCount++;
        }
      }

      if (sampleCount === 0) continue;

      const avgDensity = densitySum / sampleCount;
      const avgSpeed = speedSum / sampleCount;
      const avgGradient = gradientSum / sampleCount;

      const densityScore = clamp(avgDensity / params.rhoMax, 0, 1);
      const compressionScore = clamp((avgDensity - params.rhoCrit) / Math.max(1, params.rhoMax - params.rhoCrit), 0, 1);
      const velocityPenalty = clamp(1 - avgSpeed / Math.max(0.001, motionThreshold), 0, 1);
      const pressureScore = clamp(avgGradient / Math.max(0.01, params.rhoCrit), 0, 1);

      const dangerScore = clamp(
        densityScore * 0.45 +
        compressionScore * 0.25 +
        velocityPenalty * 0.2 +
        pressureScore * 0.1,
        0,
        1,
      );

      const isDense = avgDensity >= baselineDensity;
      const isCompressed = avgDensity >= params.rhoCrit || compressionScore > 0.25;
      const isSlow = avgSpeed <= motionThreshold * 1.5;
      const isPressureSpike = pressureScore > 0.25;
      const isDangerous = dangerScore > 0.6 && (isDense || isCompressed || isSlow || isPressureSpike);

      if (!isDangerous) continue;

      alerts.push({
        id: `alert-${r}-${c}-${step}`,
        r,
        c,
        intensity: dangerScore,
        timestamp: step,
        type: velocityPenalty > 0.65 ? 'STAGNANCY' : 'CRUSH_RISK',
        mitigated: false,
      });
    }
  }

  return alerts
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 10);
}


