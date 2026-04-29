/* ─────────────────────────────────────────────────────────────
   Density Evolution V5 — High-Density Pressure Solver
   Fixes the 'Blue Dead Zone' by enabling true flow accumulation.
   ───────────────────────────────────────────────────────────── */

import { CellType, SimParams } from './types';
let negatives = 0;

export function stepDensityV3(
  curr: Float64Array,
  next: Float64Array,
  baseVx: Float64Array,
  baseVy: Float64Array,
  cells: Uint8Array,
  p: SimParams,
): void {
  const { rows, cols, dt, rhoMax, rhoCrit, pushFactor, minSpeedFactor, entryRate, exitDrain } = p;
  const N = rows * cols;
  const idx = (r: number, c: number) => r * cols + c;

  // Pre-calculate Pressure Field
  const pressure = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    if (curr[i] > rhoCrit) {
      pressure[i] = Math.pow((curr[i] - rhoCrit) / rhoMax, 2) * pushFactor * 20;
    }
  }

  // 1. FLUX-BASED ADVECTION
  next.fill(0);
  for (let i = 0; i < N; i++) {
    if (cells[i] === CellType.WALL || cells[i] === CellType.MITIGATION || curr[i] <= 0) continue;

    const r = Math.floor(i / cols);
    const c = i % cols;
    const ri = curr[i];

    const speedFactor = Math.max(minSpeedFactor, 1.0 - ri / (rhoMax * 1.2));

    let pGradX = 0;
    let pGradY = 0;
    if (c > 0 && c < cols - 1) pGradX = (pressure[i - 1] - pressure[i + 1]) * 0.6;
    if (r > 0 && r < rows - 1) pGradY = (pressure[i - cols] - pressure[i + cols]) * 0.6;

    const vx = baseVx[i] * speedFactor + pGradX * dt;
    const vy = baseVy[i] * speedFactor + pGradY * dt;

    let targetX = c + vx * dt * 3.5;
    let targetY = r + vy * dt * 3.5;

    if (targetX < 0) targetX = 0;
    if (targetX > cols - 1) targetX = cols - 1;
    if (targetY < 0) targetY = 0;
    if (targetY > rows - 1) targetY = rows - 1;

    const tx = Math.min(cols - 1, Math.max(0, Math.floor(targetX + 0.5)));
    const ty = Math.min(rows - 1, Math.max(0, Math.floor(targetY + 0.5)));
    const targetCell = cells[ty * cols + tx];
    if (targetCell === CellType.WALL || targetCell === CellType.MITIGATION) {
      targetX = c;
      targetY = r;
    }

    const x0 = Math.min(cols - 1, Math.max(0, Math.floor(targetX)));
    const y0 = Math.min(rows - 1, Math.max(0, Math.floor(targetY)));
    const x1 = Math.min(cols - 1, x0 + 1);
    const y1 = Math.min(rows - 1, y0 + 1);
    const fx = targetX - x0;
    const fy = targetY - y0;

    next[idx(y0, x0)] += ri * (1 - fx) * (1 - fy);
    next[idx(y0, x1)] += ri * fx * (1 - fy);
    next[idx(y1, x0)] += ri * (1 - fx) * fy;
    next[idx(y1, x1)] += ri * fx * fy;
  }

  // 1.5 Diffusion / pressure spreading to prevent overcrowded lockups
  const diffused = new Float64Array(N);
  const diffusion = 0.2;
  for (let i = 0; i < N; i++) {
    const cell = cells[i];
    if (cell === CellType.WALL || cell === CellType.MITIGATION) {
      diffused[i] = next[i];
      continue;
    }

    const r = Math.floor(i / cols);
    const c = i % cols;
    let sum = next[i] * (1 - diffusion);
    let weight = 1 - diffusion;

    const neighbors = [
      i - cols,
      i + cols,
      i - 1,
      i + 1,
    ];

    for (const ni of neighbors) {
      const nr = Math.floor(ni / cols);
      const nc = ni % cols;
      if (ni < 0 || ni >= N) continue;
      if (cells[ni] === CellType.WALL || cells[ni] === CellType.MITIGATION) continue;
      if (Math.abs(nr - r) + Math.abs(nc - c) !== 1) continue;

      sum += next[ni] * (diffusion * 0.25);
      weight += diffusion * 0.25;
    }

    diffused[i] = sum / weight;
  }
  next.set(diffused);

  let entryCount = 0;
  for (let i = 0; i < N; i++) {
    if (cells[i] === CellType.ENTRY) entryCount++;
  }
  const perEntryFlow = entryCount > 0 ? (entryRate * dt) / entryCount : 0;

  // 2. CONSERVATION & SOURCES
  for (let i = 0; i < N; i++) {
    const cell = cells[i];
    if (cell === CellType.EXIT) {
      const densityFactor = Math.min(1, next[i] / rhoMax + 0.2);
      next[i] *= Math.max(0, 1 - exitDrain * densityFactor);
    } else if (cell === CellType.ENTRY) {
      const cap = Math.max(0, rhoMax * 1.15 - next[i]);
      next[i] += Math.min(perEntryFlow, cap);
    }

    if (next[i] < 0) {
    negatives++;
    next[i] = 1;
    }
  }
}

export function computeRiskV3(
  rho: Float64Array,
  vx: Float64Array,
  vy: Float64Array,
  risk: Float64Array,
  p: SimParams,
): void {
  const { rhoMax, rhoCrit } = p;
  for (let i = 0; i < rho.length; i++) {
    const r = rho[i];
    if (r < 0.1) { risk[i] = 0; continue; }
    
    // Risk is purely a function of density saturation in V5
    const saturation = r / rhoMax;
    const compression = r > rhoCrit ? Math.pow((r - rhoCrit) / rhoMax, 1.2) : 0;
    
    risk[i] = Math.min(1.0, saturation + compression);
  }
}
console.log("Negative cells:", negatives);