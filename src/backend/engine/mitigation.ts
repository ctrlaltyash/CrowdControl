/* ─────────────────────────────────────────────────────────────
   Crowd Control Engine — Flow-Aware Hazard Detection + Mitigation
   ----------------------------------------------------------------
   This module replaces hard "block the bottleneck" logic with a
   closed-loop control system:

   1) Detect compression / stagnation / throughput imbalance
   2) Score hazards using density, low flux, and local pressure
   3) Choose interventions that steer flow instead of sealing it
   4) Validate the intervention against the local field

   Assumptions:
   - Grid is rows x cols
   - rho holds normalized density [0..1+]
   - vx / vy hold velocity components
   - cells uses CellType enum values from ./types
   - ENTRY / EXIT / WALL / MITIGATION / EMPTY exist in CellType
   - HazardAlert is mutable enough to set `mitigated = true`

   Drop-in goal:
   - Keep the API familiar
   - Make mitigation smarter and less destructive
   ---------------------------------------------------------------- */

import { CellType, HazardAlert } from './types';

export type Intervention = {
  r: number;
  c: number;
  type: CellType;
};

export type HazardScore = {
  density: number;
  flux: number;
  pressure: number;
  stagnation: number;
  score: number;
};

export type MitigationOptions = {
  responsiveness?: number;
};

type ScoredHazard = HazardAlert & {
  density?: number;
  flux?: number;
  pressure?: number;
  stagnation?: number;
  severity?: number;
};

const EPS = 1e-9;
const SAFE_ENTRY_RADIUS = 1;

type MitigationTuning = {
  responsiveness: number;
  safeExitRadius: number;
  cooldownRadius: number;
  maxInterventionsPerPass: number;
  maxHazardsPerPass: number;
  maxInterventionsPerHazard: number;
  aggressionBase: number;
  aggressionScale: number;
  allowSideGuide: boolean;
};

function getMitigationTuning(options?: MitigationOptions): MitigationTuning {
  const responsiveness = clamp(options?.responsiveness ?? 1, 0, 2);
  const passiveToAggressive = responsiveness / 2;

  return {
    responsiveness,
    safeExitRadius: Math.round(4 - passiveToAggressive * 2),
    cooldownRadius: Math.round(9 - passiveToAggressive * 5),
    maxInterventionsPerPass: Math.round(6 + passiveToAggressive * 14),
    maxHazardsPerPass: Math.round(1 + passiveToAggressive * 3),
    maxInterventionsPerHazard: Math.round(2 + passiveToAggressive * 4),
    aggressionBase: 0.18 + passiveToAggressive * 0.22,
    aggressionScale: 0.32 + passiveToAggressive * 0.36,
    allowSideGuide: responsiveness >= 1.2,
  };
}

function idx(r: number, c: number, cols: number): number {
  return r * cols + c;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function isBlocked(cell: CellType): boolean {
  return cell === CellType.WALL || cell === CellType.MITIGATION;
}

function isBuildable(cell: CellType): boolean {
  return cell === CellType.EMPTY;
}

function hypot2(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function meanFieldAt(
  fieldX: Float64Array,
  fieldY: Float64Array,
  r: number,
  c: number,
  rows: number,
  cols: number,
  radius = 1,
): { x: number; y: number } {
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
      const k = idx(rr, cc, cols);
      sumX += fieldX[k];
      sumY += fieldY[k];
      count++;
    }
  }

  if (count === 0) return { x: 0, y: 0 };
  return { x: sumX / count, y: sumY / count };
}

function sampleDensity(
  rho: Float64Array,
  r: number,
  c: number,
  rows: number,
  cols: number,
  radius = 1,
): number {
  let sum = 0;
  let count = 0;

  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
      sum += rho[idx(rr, cc, cols)];
      count++;
    }
  }

  return count ? sum / count : 0;
}

function localFlux(
  rho: Float64Array,
  vx: Float64Array,
  vy: Float64Array,
  r: number,
  c: number,
  rows: number,
  cols: number,
  radius = 1,
): number {
  let sum = 0;
  let count = 0;

  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
      const k = idx(rr, cc, cols);
      sum += rho[k] * hypot2(vx[k], vy[k]);
      count++;
    }
  }

  return count ? sum / count : 0;
}

function localStagnation(
  vx: Float64Array,
  vy: Float64Array,
  r: number,
  c: number,
  rows: number,
  cols: number,
  radius = 1,
): number {
  let sumSpeed = 0;
  let count = 0;

  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
      const k = idx(rr, cc, cols);
      sumSpeed += hypot2(vx[k], vy[k]);
      count++;
    }
  }

  const meanSpeed = count ? sumSpeed / count : 0;
  // Higher means more stagnation.
  return 1 / (meanSpeed + 0.05);
}

function localPressure(
  rho: Float64Array,
  r: number,
  c: number,
  rows: number,
  cols: number,
): number {
  const center = rho[idx(r, c, cols)];
  const north = r > 0 ? rho[idx(r - 1, c, cols)] : center;
  const south = r < rows - 1 ? rho[idx(r + 1, c, cols)] : center;
  const west = c > 0 ? rho[idx(r, c - 1, cols)] : center;
  const east = c < cols - 1 ? rho[idx(r, c + 1, cols)] : center;

  const grad = Math.abs(center - north) + Math.abs(center - south) + Math.abs(center - west) + Math.abs(center - east);
  return center + 0.35 * grad;
}

function scoreHazard(
  rho: Float64Array,
  vx: Float64Array,
  vy: Float64Array,
  r: number,
  c: number,
  rows: number,
  cols: number,
): HazardScore {
  const density = sampleDensity(rho, r, c, rows, cols, 1);
  const flux = localFlux(rho, vx, vy, r, c, rows, cols, 1);
  const pressure = localPressure(rho, r, c, rows, cols);
  const stagnation = localStagnation(vx, vy, r, c, rows, cols, 1);

  // High density + high pressure + low flux + high stagnation = bad.
  const score =
    density * 0.45 +
    pressure * 0.25 +
    (1 / (flux + 0.05)) * 0.2 +
    stagnation * 0.1;

  return { density, flux, pressure, stagnation, score };
}

function findExitDirection(
  cells: Uint8Array,
  rho: Float64Array,
  vx: Float64Array,
  vy: Float64Array,
  r: number,
  c: number,
  rows: number,
  cols: number,
): { dx: number; dy: number } {
  // Search nearby for the least congested traversable neighbor.
  let bestScore = Number.POSITIVE_INFINITY;
  let bestDx = 0;
  let bestDy = 0;

  for (let dr = -4; dr <= 4; dr++) {
    for (let dc = -4; dc <= 4; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
      const t = cells[idx(rr, cc, cols)];
      if (isBlocked(t)) continue;

      const d = sampleDensity(rho, rr, cc, rows, cols, 1);
      const f = localFlux(rho, vx, vy, rr, cc, rows, cols, 1);
      const s = d - f * 0.65;

      if (s < bestScore) {
        bestScore = s;
        bestDx = cc - c;
        bestDy = rr - r;
      }
    }
  }

  const mag = Math.hypot(bestDx, bestDy);
  if (mag < EPS) return { dx: 0, dy: 0 };
  return { dx: bestDx / mag, dy: bestDy / mag };
}

function nearestCellTypeDistance(
  cells: Uint8Array,
  r: number,
  c: number,
  rows: number,
  cols: number,
  type: CellType,
  maxRadius: number,
): number {
  let best = Number.POSITIVE_INFINITY;
  for (let dr = -maxRadius; dr <= maxRadius; dr++) {
    for (let dc = -maxRadius; dc <= maxRadius; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
      if (cells[idx(rr, cc, cols)] !== type) continue;
      best = Math.min(best, Math.abs(dr) + Math.abs(dc));
    }
  }
  return best;
}

function countBlockedCardinalNeighbors(
  cells: Uint8Array,
  r: number,
  c: number,
  rows: number,
  cols: number,
  pending: Set<number>,
): number {
  let blocked = 0;
  const offsets = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (const [dr, dc] of offsets) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) {
      blocked++;
      continue;
    }
    const k = idx(rr, cc, cols);
    if (isBlocked(cells[k] as CellType) || pending.has(k)) blocked++;
  }

  return blocked;
}

function wouldCreateSolidBlock(
  cells: Uint8Array,
  r: number,
  c: number,
  rows: number,
  cols: number,
  pending: Set<number>,
): boolean {
  for (let ar = r - 1; ar <= r; ar++) {
    for (let ac = c - 1; ac <= c; ac++) {
      if (ar < 0 || ac < 0 || ar + 1 >= rows || ac + 1 >= cols) continue;

      let blocked = 0;
      for (let dr = 0; dr <= 1; dr++) {
        for (let dc = 0; dc <= 1; dc++) {
          const rr = ar + dr;
          const cc = ac + dc;
          const k = idx(rr, cc, cols);
          if ((rr === r && cc === c) || isBlocked(cells[k] as CellType) || pending.has(k)) {
            blocked++;
          }
        }
      }
      if (blocked === 4) return true;
    }
  }
  return false;
}

function keepsEntryReachable(
  cells: Uint8Array,
  rows: number,
  cols: number,
  pending: Set<number>,
  totalEntries: number,
  candidate: number,
): boolean {
  if (totalEntries <= 0) return true;

  const queue: number[] = [];
  const seen = new Uint8Array(rows * cols);

  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== CellType.EXIT) continue;
    queue.push(i);
    seen[i] = 1;
  }

  if (queue.length === 0) return true;

  let reachableEntries = 0;
  
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    if (cells[cur] === CellType.ENTRY) reachableEntries++;
    if (reachableEntries === totalEntries) return true;

    const r = Math.floor(cur / cols);
    const c = cur % cols;
    const neighbors = [cur - cols, cur + cols, cur - 1, cur + 1];
    for (const ni of neighbors) {
      if (ni < 0 || ni >= cells.length || seen[ni]) continue;
      const nr = Math.floor(ni / cols);
      const nc = ni % cols;
      if (Math.abs(nr - r) + Math.abs(nc - c) !== 1) continue;
      if (ni === candidate || pending.has(ni) || isBlocked(cells[ni] as CellType)) continue;
      seen[ni] = 1;
      queue.push(ni);
    }
  }

  return false;
}

function canPlaceMitigation(
  cells: Uint8Array,
  r: number,
  c: number,
  rows: number,
  cols: number,
  pending: Set<number>,
  totalEntries: number,
  tuning: MitigationTuning,
): boolean {
  if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
  const k = idx(r, c, cols);
  if (pending.has(k)) return false;
  if (!isBuildable(cells[k] as CellType)) return false;
  if (nearestCellTypeDistance(cells, r, c, rows, cols, CellType.EXIT, tuning.safeExitRadius) <= tuning.safeExitRadius) return false;
  if (nearestCellTypeDistance(cells, r, c, rows, cols, CellType.ENTRY, SAFE_ENTRY_RADIUS) <= SAFE_ENTRY_RADIUS) return false;
  if (countBlockedCardinalNeighbors(cells, r, c, rows, cols, pending) >= 3) return false;
  if (wouldCreateSolidBlock(cells, r, c, rows, cols, pending)) return false;
  return keepsEntryReachable(cells, rows, cols, pending, totalEntries, k);
}

function placeDeflectorLine(
  cells: Uint8Array,
  r0: number,
  c0: number,
  dirX: number,
  dirY: number,
  rows: number,
  cols: number,
  length: number,
  width: number,
): Intervention[] {
  const mods: Intervention[] = [];

  // Perpendicular vector for a light funnel / guide rail.
  const px = -dirY;
  const py = dirX;

  for (let i = 1; i <= length; i++) {
    const rr = Math.round(r0 + dirY * i);
    const cc = Math.round(c0 + dirX * i);
    if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;

    for (let w = -width; w <= width; w++) {
      // Offset along the perpendicular to create a soft V-shape.
      const ar = Math.round(rr + py * w);
      const ac = Math.round(cc + px * w);
      if (ar < 0 || ar >= rows || ac < 0 || ac >= cols) continue;
      const k = idx(ar, ac, cols);
      if (isBuildable(cells[k] as CellType)) {
        mods.push({ r: ar, c: ac, type: CellType.MITIGATION });
      }
    }
  }

  return mods;
}

function placeMeteringGate(
  cells: Uint8Array,
  r: number,
  c: number,
  rows: number,
  cols: number,
  dirX: number,
  dirY: number,
): Intervention[] {
  const mods: Intervention[] = [];

  // Small diagonal guide, not a wall blob.
  const orthX = -dirY;
  const orthY = dirX;
  const halfSpan = 1;
  const forward = 1;

  for (let step = 1; step <= forward; step++) {
    for (let o = -halfSpan; o <= halfSpan; o++) {
      const rr = Math.round(r + dirY * step + orthY * o);
      const cc = Math.round(c + dirX * step + orthX * o);
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
      const k = idx(rr, cc, cols);
      if (isBuildable(cells[k] as CellType)) {
        mods.push({ r: rr, c: cc, type: CellType.MITIGATION });
      }
    }
  }

  return mods;
}

function hasMitigationNearby(
  cells: Uint8Array,
  r: number,
  c: number,
  rows: number,
  cols: number,
  radius = 2,
  pending?: Set<number>,
): boolean {
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
      const k = idx(rr, cc, cols);
      if (cells[k] === CellType.MITIGATION || pending?.has(k)) return true;
    }
  }
  return false;
}

/**
 * Hazard detection: find cells that are in a bad state *before* full collapse.
 */
export function detectHazards(
  rho: Float64Array,
  vx: Float64Array,
  vy: Float64Array,
  rows: number,
  cols: number,
  cells: Uint8Array,
): HazardAlert[] {
  const hazards: HazardAlert[] = [];

  // Dynamic thresholds: allow the engine to adapt to scene scale.
  let rhoSum = 0;
  let activeCount = 0;
  for (let i = 0; i < rho.length; i++) {
    if (cells[i] !== CellType.WALL) {
      rhoSum += rho[i];
      activeCount++;
    }
  }
  const meanRho = activeCount ? rhoSum / activeCount : 0;
  const rhoThreshold = Math.max(0.28, meanRho * 1.35);
  const fluxThreshold = 0.02;

  // Sample every cell; later you can downsample if needed.
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const k = idx(r, c, cols);
      const cell = cells[k];
      if (isBlocked(cell)) continue;

      const sc = scoreHazard(rho, vx, vy, r, c, rows, cols);

      const isCompression = sc.density >= rhoThreshold;
      const isJammed = sc.flux <= fluxThreshold;
      const isStalled = sc.stagnation > 6.5;
      const isDangerous = sc.score > 0.95 || (isCompression && isJammed) || (isCompression && isStalled);

      if (!isDangerous) continue;

      hazards.push({
        id: `mitigation-${r}-${c}`,
        r,
        c,
        intensity: clamp((sc.score - 0.8) / 1.5, 0, 1),
        timestamp: 0,
        type: isJammed || isStalled ? 'STAGNANCY' : 'CRUSH_RISK',
        mitigated: false,
        density: sc.density,
        flux: sc.flux,
        pressure: sc.pressure,
        stagnation: sc.stagnation,
        severity: clamp((sc.score - 0.8) / 1.5, 0, 1),
      } as ScoredHazard);
    }
  }

  return hazards.sort((a, b) => b.intensity - a.intensity).slice(0, 12);
}

/**
 * Choose interventions for each hazard.
 *
 * Strategy:
 * - Prefer soft deflectors over hard blocks
 * - Aim downstream of a hazard to create a bypass/funnel
 * - Use small guide rails rather than solid square blobs
 * - If a local hotspot has no direction, apply metering around entry
 */
export function calculateIntervention(
  hazards: HazardAlert[],
  cells: Uint8Array,
  vx: Float64Array,
  vy: Float64Array,
  rows: number,
  cols: number,
  rho?: Float64Array,
  options?: MitigationOptions,
): Intervention[] {
  const tuning = getMitigationTuning(options);
  const modifications: Intervention[] = [];
  const pending = new Set<number>();
  const prioritizedHazards = [...hazards]
    .filter(hazard => !hazard.mitigated)
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, tuning.maxHazardsPerPass);

  let totalEntries = 0;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === CellType.ENTRY) totalEntries++;
  }

  const addMod = (m: Intervention, hazardStartCount: number): boolean => {
    if (modifications.length >= tuning.maxInterventionsPerPass) return false;
    if (modifications.length - hazardStartCount >= tuning.maxInterventionsPerHazard) return false;
    if (!canPlaceMitigation(cells, m.r, m.c, rows, cols, pending, totalEntries, tuning)) return false;
    const key = idx(m.r, m.c, cols);
    pending.add(key);
    modifications.push(m);
    return true;
  };

  for (const hazard of prioritizedHazards) {
    const beforeCount = modifications.length;
    if (hasMitigationNearby(cells, hazard.r, hazard.c, rows, cols, tuning.cooldownRadius, pending)) {
      hazard.mitigated = true;
      continue;
    }

    // Use local average field instead of a single noisy cell when possible.
    const avg = meanFieldAt(vx, vy, hazard.r, hazard.c, rows, cols, 2);
    let dirX = avg.x;
    let dirY = avg.y;
    let dirMag = Math.hypot(dirX, dirY);

    if (dirMag < 0.08) {
      // If the crowd has jammed and the local field is useless,
      // search for a lower-density outlet.
      const outlet = rho
        ? findExitDirection(cells, rho, vx, vy, hazard.r, hazard.c, rows, cols)
        : { dx: 1, dy: 0 };
      dirX = outlet.dx;
      dirY = outlet.dy;
      dirMag = Math.hypot(dirX, dirY);
    }

    if (dirMag < EPS) {
      // Last resort: create a small metering gate aligned horizontally.
      const gate = placeMeteringGate(cells, hazard.r, hazard.c, rows, cols, 1, 0);
      for (const m of gate) addMod(m, beforeCount);
      hazard.mitigated = modifications.length > beforeCount;
      continue;
    }

    dirX /= dirMag;
    dirY /= dirMag;

    // Choose intervention style based on severity and local motion.
    const scored = hazard as ScoredHazard;
    const severity = clamp(scored.severity ?? hazard.intensity ?? 0.5, 0, 1);
    const density = clamp(scored.density ?? (rho ? sampleDensity(rho, hazard.r, hazard.c, rows, cols, 1) : 0), 0, 2);
    const aggression = clamp(tuning.aggressionBase + severity * tuning.aggressionScale, 0.15, 1);

    // Meter upstream first. Exit-driven hazards happen near the door,
    // but barriers should sit before the crush zone, not on the exit mouth.
    const upstreamMeter = placeMeteringGate(cells, hazard.r, hazard.c, rows, cols, -dirX, -dirY);
    for (const m of upstreamMeter) addMod(m, beforeCount);

    if (modifications.length === beforeCount) {
      const upstreamGuide = placeDeflectorLine(
        cells,
        hazard.r,
        hazard.c,
        -dirX,
        -dirY,
        rows,
        cols,
        2 + Math.round(2 * aggression),
        0,
      );
      for (const m of upstreamGuide) addMod(m, beforeCount);
    }

    if (tuning.allowSideGuide && modifications.length === beforeCount && density > 0.7) {
      const sideGuide = placeDeflectorLine(cells, hazard.r, hazard.c, -dirY, dirX, rows, cols, 2, 0);
      for (const m of sideGuide) addMod(m, beforeCount);
    }

    hazard.mitigated = modifications.length > beforeCount;
  }

  return modifications;
}

/**
 * Apply modifications to the cell grid.
 * Useful if your simulation expects a direct mutation step.
 */
export function applyInterventions(
  cells: Uint8Array,
  interventions: Intervention[],
  rows: number,
  cols: number,
): void {
  for (const m of interventions) {
    if (m.r < 0 || m.r >= rows || m.c < 0 || m.c >= cols) continue;
    const k = idx(m.r, m.c, cols);
    if (cells[k] === CellType.EMPTY) {
      cells[k] = m.type;
    }
  }
}

/**
 * Closed-loop mitigation step.
 * Call this once per simulation tick.
 */
export function mitigationStep(
  rho: Float64Array,
  vx: Float64Array,
  vy: Float64Array,
  cells: Uint8Array,
  rows: number,
  cols: number,
  options?: MitigationOptions,
): { hazards: HazardAlert[]; interventions: Intervention[] } {
  const hazards = detectHazards(rho, vx, vy, rows, cols, cells);
  const interventions = calculateIntervention(hazards, cells, vx, vy, rows, cols, rho, options);
  applyInterventions(cells, interventions, rows, cols);
  return { hazards, interventions };
}

/**
 * Optional utility: clear old mitigation cells if your system needs reset.
 */
export function clearMitigation(cells: Uint8Array, rows: number, cols: number): void {
  for (let i = 0; i < rows * cols; i++) {
    if (cells[i] === CellType.MITIGATION) cells[i] = CellType.EMPTY;
  }
}
