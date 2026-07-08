/* ─────────────────────────────────────────────────────────────
   Density Evolution V6 — Nonlinear Degenerate Advection-Diffusion
   Implements the paper's crowd instability model directly.
   ───────────────────────────────────────────────────────────── */

import { CellType, SimParams } from './types';

export interface DensityStepDiagnostics {
  overshootCount: number;
  totalOvershootMagnitude: number;
  maxOvershootMagnitude: number;
}

const SCRATCH_BUFFERS = new WeakMap<Float64Array, {
  pressure: Float64Array;
  velocityX: Float64Array;
  velocityY: Float64Array;
  scratch1: Float64Array;
  scratch2: Float64Array;
}>();

export function stepDensityV3(
  curr: Float64Array,
  next: Float64Array,
  baseVx: Float64Array,
  baseVy: Float64Array,
  cells: Uint8Array,
  p: SimParams,
  diagnostics?: DensityStepDiagnostics,
  actualVx?: Float64Array,
  actualVy?: Float64Array,
): void {
  const {
    rows,
    cols,
    dt,
    rhoMax,
    rhoCrit,
    spreadFactor,
    entryRate,
    exitDrain,
    beta,
    pressureA,
    pressureK,
    pressureN,
    pushFactor,
    diffusivity,
  } = p;

  const N = rows * cols;
  const idx = (r: number, c: number) => r * cols + c;
  const D = typeof diffusivity === 'number' && diffusivity >= 0 ? diffusivity : spreadFactor;
  const push = typeof pushFactor === 'number' ? Math.max(0, pushFactor) : 1;

  let buffers = SCRATCH_BUFFERS.get(curr);
  if (!buffers || buffers.pressure.length !== N) {
    buffers = {
      pressure: new Float64Array(N),
      velocityX: new Float64Array(N),
      velocityY: new Float64Array(N),
      scratch1: new Float64Array(N),
      scratch2: new Float64Array(N),
    };
    SCRATCH_BUFFERS.set(curr, buffers);
  }

  const { pressure, velocityX, velocityY, scratch1, scratch2 } = buffers;

  const isBlocked = (index: number) => cells[index] === CellType.WALL || cells[index] === CellType.MITIGATION;
  const inBounds = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;

  const computePressureAndVelocity = (source: Float64Array) => {
    for (let i = 0; i < N; i++) {
      if (isBlocked(i)) {
        velocityX[i] = 0;
        velocityY[i] = 0;
        pressure[i] = 0;
        if (actualVx) actualVx[i] = 0;
        if (actualVy) actualVy[i] = 0;
        continue;
      }

      const density = Math.max(0, source[i]);
      const mobility = Math.max(0, Math.pow(Math.max(0, 1 - density / rhoMax), beta));
      velocityX[i] = baseVx[i] * mobility * push;
      velocityY[i] = baseVy[i] * mobility * push;
      if (actualVx) actualVx[i] = velocityX[i];
      if (actualVy) actualVy[i] = velocityY[i];

      const activation = pressureA === 0 ? 0.5 : 1 / (1 + Math.exp(-pressureA * (density - rhoCrit)));
      const scaledDensity = rhoCrit > 0 ? density / rhoCrit : 0;
      pressure[i] = pressureK * Math.pow(scaledDensity, pressureN) * activation;
    }
  };

  const performStep = (source: Float64Array, dest: Float64Array, localDt: number) => {
    computePressureAndVelocity(source);
    dest.fill(0);

    for (let i = 0; i < N; i++) {
      const cell = cells[i];
      const density = Math.max(0, source[i]);
      if (isBlocked(i)) {
        dest[i] = density;
        continue;
      }

      const r = Math.floor(i / cols);
      const c = i % cols;

      let FxEast = 0, FxWest = 0, FySouth = 0, FyNorth = 0;

      if (c < cols - 1) {
        const right = i + 1;
        if (!isBlocked(right)) {
          const faceV = 0.5 * (velocityX[i] + velocityX[right]);
          FxEast = faceV >= 0 ? density * faceV : Math.max(0, source[right]) * faceV;
        }
      }
      if (c > 0) {
        const left = i - 1;
        if (!isBlocked(left)) {
          const faceV = 0.5 * (velocityX[i] + velocityX[left]);
          FxWest = faceV >= 0 ? Math.max(0, source[left]) * faceV : density * faceV;
        }
      }
      if (r < rows - 1) {
        const down = i + cols;
        if (!isBlocked(down)) {
          const faceV = 0.5 * (velocityY[i] + velocityY[down]);
          FySouth = faceV >= 0 ? density * faceV : Math.max(0, source[down]) * faceV;
        }
      }
      if (r > 0) {
        const up = i - cols;
        if (!isBlocked(up)) {
          const faceV = 0.5 * (velocityY[i] + velocityY[up]);
          FyNorth = faceV >= 0 ? Math.max(0, source[up]) * faceV : density * faceV;
        }
      }

      const advection = -(FxEast - FxWest + FySouth - FyNorth);

      let neighborSum = 0, neighborCount = 0;
      const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
      for (const [nr, nc] of neighbors) {
        if (!inBounds(nr, nc)) {
          neighborSum += density;
        } else {
          const ni = idx(nr, nc);
          neighborSum += isBlocked(ni) ? density : Math.max(0, source[ni]);
        }
        neighborCount++;
      }
      const diffusion = D * (neighborSum - neighborCount * density);

      let PxEast = 0, PxWest = 0, PySouth = 0, PyNorth = 0;
      if (c < cols - 1) {
        const right = i + 1;
        if (!isBlocked(right)) {
          const faceVelocity = -(pressure[right] - pressure[i]);
          PxEast = faceVelocity >= 0 ? density * faceVelocity : Math.max(0, source[right]) * faceVelocity;
        }
      }
      if (c > 0) {
        const left = i - 1;
        if (!isBlocked(left)) {
          const faceVelocity = -(pressure[i] - pressure[left]);
          PxWest = faceVelocity >= 0 ? Math.max(0, source[left]) * faceVelocity : density * faceVelocity;
        }
      }
      if (r < rows - 1) {
        const down = i + cols;
        if (!isBlocked(down)) {
          const faceVelocity = -(pressure[down] - pressure[i]);
          PySouth = faceVelocity >= 0 ? density * faceVelocity : Math.max(0, source[down]) * faceVelocity;
        }
      }
      if (r > 0) {
        const up = i - cols;
        if (!isBlocked(up)) {
          const faceVelocity = -(pressure[i] - pressure[up]);
          PyNorth = faceVelocity >= 0 ? Math.max(0, source[up]) * faceVelocity : density * faceVelocity;
        }
      }

      const compression = -(PxEast - PxWest + PySouth - PyNorth);
      let updated = density + localDt * (advection + diffusion + compression);

      if (cell === CellType.EXIT) {
        updated = Math.max(0, updated - exitDrain * updated * localDt);
      }

      const clamped = Math.max(0, Math.min(updated, rhoMax));
      if (diagnostics && updated > rhoMax) {
        const overshoot = updated - rhoMax;
        diagnostics.overshootCount++;
        diagnostics.totalOvershootMagnitude += overshoot;
        diagnostics.maxOvershootMagnitude = Math.max(diagnostics.maxOvershootMagnitude, overshoot);
      }
      dest[i] = clamped;
    }
  };

  const effectiveDt = Math.max(0, dt);
  if (effectiveDt === 0) {
    next.set(curr);
    return;
  }

  const stableDt = Math.min(effectiveDt, 0.01);
  const substeps = Math.max(1, Math.ceil(effectiveDt / stableDt));
  const stepDt = effectiveDt / substeps;
  let source = curr;

  for (let step = 0; step < substeps; step++) {
    const isLast = step === substeps - 1;
    const target = isLast ? next : (step % 2 === 0 ? scratch1 : scratch2);
    performStep(source, target, stepDt);
    if (!isLast) source = target;
  }

  let entryCount = 0;
  for (let i = 0; i < N; i++) if (cells[i] === CellType.ENTRY) entryCount++;
  const perEntryFlow = entryCount > 0 ? (entryRate * dt) / entryCount : 0;

  for (let i = 0; i < N; i++) {
    if (cells[i] === CellType.ENTRY) {
      const cap = Math.max(0, rhoMax * 1.15 - next[i]);
      next[i] = Math.max(0, Math.min(next[i] + Math.min(perEntryFlow, cap), rhoMax));
    }
  }
}

export function computeRiskV3(
  rho: Float64Array,
  vx: Float64Array,
  vy: Float64Array,
  distanceToExit: Float64Array,
  cells: Uint8Array,
  risk: Float64Array,
  p: SimParams,
): void {
  const {
    rhoMax,
    rhoCrit,
    riskAlpha,
    riskDelta,
    riskGamma,
    riskEta,
    epsilon,
    camaraderieG,
    camaraderieI,
    camaraderieM,
  } = p;

  const maxDistance = Math.max(1, p.rows + p.cols);
  const maxSpeed = Math.max(1e-6, p.pushFactor);
  const eps = typeof epsilon === 'number' ? Math.max(1e-12, epsilon) : 1e-3;

  for (let i = 0; i < rho.length; i++) {
    const cell = cells[i];
    if (cell === CellType.WALL || cell === CellType.MITIGATION) {
      risk[i] = 0;
      continue;
    }

    const r = Math.max(0, rho[i]);
    if (r <= 1e-8) {
      risk[i] = 0;
      continue;
    }

    const speed = Math.hypot(vx[i], vy[i]);
    const d = distanceToExit[i];

    // Term 1: density normalized
    const densityTerm = riskAlpha * (r / rhoMax);

    // Term 2: proximity to exits / constrictions -> 1 / (d + eps)
    const distanceTerm = riskDelta * (1 / (d + eps));

    // Term 3: reduced mobility -> 1 / (|v| + eps)
    const speedTerm = riskGamma * (1 / (speed + eps));

    // Term 4: Psi(ρ) as defined in the paper
    let psi = 0;
    if (r >= rhoCrit) {
      const numer = (r - rhoCrit) / Math.max(1e-9, rhoMax);
      psi = Math.pow(numer, 2);
    }
    const psiTerm = riskEta * psi;

    // Camaraderie / cohesion term c(x,t): use local neighborhood to approximate N_local
    // c(x,t) = G / N_local * (1 - I) * (1 - rho/rhoMax)^m
    let nLocal = 0;
    const cols = p.cols;
    const rows = p.rows;
    const rIdx = Math.floor(i / cols);
    const cIdx = i % cols;
    for (let rr = Math.max(0, rIdx - 1); rr <= Math.min(rows - 1, rIdx + 1); rr++) {
      for (let cc = Math.max(0, cIdx - 1); cc <= Math.min(cols - 1, cIdx + 1); cc++) {
        const ni = rr * cols + cc;
        if (cells[ni] !== CellType.WALL && cells[ni] !== CellType.MITIGATION) nLocal++;
      }
    }
    if (nLocal <= 0) nLocal = 1;
    const localFactor = (1 - camaraderieI);
    const cohesion = camaraderieG / nLocal * localFactor * Math.pow(Math.max(0, 1 - (r / rhoMax)), camaraderieM);

    const rawRisk = densityTerm + distanceTerm + speedTerm + psiTerm - cohesion;

    risk[i] = Math.min(1, Math.max(0, Number.isFinite(rawRisk) ? rawRisk : 0));
  }
}
