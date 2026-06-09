/* ─────────────────────────────────────────────────────────────
   Analytics Engine — Detects potential stampede precursors in the simulations
   This module evaluates density, speed and local pressure build-up to generate
   consistent early-warning hazard alerts.

   fr dis engine is the goat at spotting when ppl r about to get crushed.
   no cap, it checks if things r getting too sus in the crowd.
 ───────────────────────────────────────────────────────────── */

import { HazardAlert, SimParams } from './types';

// lowkey keeps values in check so they don't go wild, bet
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const NEIGHBOR_RADIUS = 2; // how far we lookin for ops
const MIN_SPEED_THRESHOLD = 0.12; // if u movin slower than dis, u mid

// main function that rizzes up the hazard detection
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
  const idx = (r: number, c: number) => r * cols + c; // standard mapping, no cap
  const baselineDensity = Math.max(params.rhoCrit * 0.6, params.rhoMax * 0.25);
  const motionThreshold = Math.max(MIN_SPEED_THRESHOLD, params.minSpeedFactor * 0.5);

  // loopin thru the grid, lookin for sus behavior
  for (let r = NEIGHBOR_RADIUS; r < rows - NEIGHBOR_RADIUS; r += 1) {
    for (let c = NEIGHBOR_RADIUS; c < cols - NEIGHBOR_RADIUS; c += 1) {
      const centerIndex = idx(r, c);
      const centerDensity = Math.max(0, rho[centerIndex]);
      // if it's empty, we chillin
      if (centerDensity < baselineDensity * 0.5) continue;

      let densitySum = 0;
      let speedSum = 0;
      let gradientSum = 0;
      let sampleCount = 0;

      // checkin the neighborhood for the vibe check
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

      if (sampleCount === 0) continue; // wat? how? sus.

      const avgDensity = densitySum / sampleCount;
      const avgSpeed = speedSum / sampleCount;
      const avgGradient = gradientSum / sampleCount;

      // math to see if we r cooked
      const densityScore = clamp(avgDensity / params.rhoMax, 0, 1);
      const compressionScore = clamp((avgDensity - params.rhoCrit) / Math.max(1, params.rhoMax - params.rhoCrit), 0, 1);
      const velocityPenalty = clamp(1 - avgSpeed / Math.max(0.001, motionThreshold), 0, 1);
      const pressureScore = clamp(avgGradient / Math.max(0.01, params.rhoCrit), 0, 1);

      // final danger score, fr fr
      const dangerScore = clamp(
        densityScore * 0.45 +
        compressionScore * 0.25 +
        velocityPenalty * 0.2 +
        pressureScore * 0.1,
        0,
        1,
      );

      // vibe checks for specific hazards
      const isDense = avgDensity >= baselineDensity;
      const isCompressed = avgDensity >= params.rhoCrit || compressionScore > 0.25;
      const isSlow = avgSpeed <= motionThreshold * 1.5;
      const isPressureSpike = pressureScore > 0.25;
      const isDangerous = dangerScore > 0.6 && (isDense || isCompressed || isSlow || isPressureSpike);

      if (!isDangerous) continue; // we safe for now, bet

      // adding an alert bc it's getting too spicy
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

  // send back the top 10 most cooked spots
  return alerts
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 10);
}
