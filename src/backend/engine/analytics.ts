/* ─────────────────────────────────────────────────────────────
   Analytics Engine — Detects potential stampede precursors in the simulations
   This is the main Brain of the early warning system, analyzing the density and motion fields to identify emerging hazards.
   prob thd most important file in the entire project ngl, this is where the magic happens. 
 ───────────────────────────────────────────────────────────── */

import { HazardAlert, SimParams } from './types';

/**
 * Scan the simulation state for potential stampede precursors.
 */
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
  const warningDensity = params.rhoMax * 0.2; // Early warning level.
  const compressionDensity = Math.max(params.rhoCrit * 0.55, params.rhoMax * 0.18);
  
  // Scan the grid for local high-density clusters and motion collapse
  const stepSize = 1; // Finer scan
  const radius = 2;

  for (let r = 3; r < rows - 3; r += stepSize) {
    for (let c = 3; c < cols - 3; c += stepSize) {
      const i = idx(r, c);
      const centerDensity = rho[i];
      if (centerDensity < warningDensity * 0.4) continue; // Very permissive early filter

      let densitySum = 0;
      let speedSum = 0;
      let gradientSum = 0;
      let sampleCount = 0;

      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          const ii = idx(rr, cc);
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
          if (rho[ii] <= 0) continue;
          densitySum += rho[ii];
          speedSum += Math.sqrt(vx[ii] * vx[ii] + vy[ii] * vy[ii]);
          gradientSum += Math.abs(centerDensity - rho[ii]);
          sampleCount++;
        }
      }

      if (sampleCount === 0) continue;

      const avgDensity = densitySum / sampleCount;
      const avgSpeed = speedSum / sampleCount;
      const avgGradient = gradientSum / sampleCount;
      const densityScore = avgDensity / params.rhoMax;
      const compressionScore = Math.max(0, (avgDensity - compressionDensity) / params.rhoMax);
      const pressureScore = Math.min(1, avgGradient / Math.max(0.001, params.rhoCrit));
      const dangerScore = Math.min(1, densityScore + compressionScore + pressureScore * 0.35);

      // base vx/vy is a route vector, not the actual speed of a dense crowd.
      // So exits should not suppress alerts just because the field has direction, that's what a harmonic potential fiield is lol... its not a real-life thing, but like, thats how the math is set up
      const isDense = avgDensity > warningDensity;
      const isCompressed = avgDensity > compressionDensity || centerDensity > params.rhoCrit * 0.5;
      const isMotionlessField = avgSpeed < params.minSpeedFactor * 3;
      const isPressureSpike = avgGradient > params.rhoCrit * 0.18;

      if (isDense && (isCompressed || isPressureSpike || isMotionlessField)) {
        alerts.push({
          id: `alert-${r}-${c}-${step}`,
          r,
          c,
          intensity: Math.min(1, dangerScore * 1.25),
          timestamp: step,
          type: isMotionlessField ? 'STAGNANCY' : 'CRUSH_RISK',
          mitigated: false,
        });
      }
    }
  }

  return alerts
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 8);
}


