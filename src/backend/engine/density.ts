/* ─────────────────────────────────────────────────────────────
   Density Evolution V6 — Nonlinear Degenerate Advection-Diffusion
   Implements the paper's crowd instability model directly.
   ───────────────────────────────────────────────────────────── */

import { CellType, SimParams } from './types';

export function stepDensityV3(
  curr: Float64Array,
  next: Float64Array,
  baseVx: Float64Array,
  baseVy: Float64Array,
  cells: Uint8Array,
  p: SimParams,
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

  const pressure = new Float64Array(N);
  const dPdx = new Float64Array(N);
  const dPdy = new Float64Array(N);
  const velocityX = new Float64Array(N);
  const velocityY = new Float64Array(N);

  for (let i = 0; i < N; i++) {
    if (cells[i] === CellType.WALL || cells[i] === CellType.MITIGATION) {
      continue;
    }

    const density = Math.max(0, curr[i]);
    const mobility = Math.max(0, Math.pow(Math.max(0, 1 - density / rhoMax), beta));
    velocityX[i] = baseVx[i] * mobility * push;
    velocityY[i] = baseVy[i] * mobility * push;

    const activation = pressureA === 0 ? 0.5 : 1 / (1 + Math.exp(-pressureA * (density - rhoCrit)));
    const scaledDensity = rhoCrit > 0 ? density / rhoCrit : 0;
    pressure[i] = pressureK * Math.pow(scaledDensity, pressureN) * activation;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = idx(r, c);
      if (cells[i] === CellType.WALL || cells[i] === CellType.MITIGATION) {
        dPdx[i] = 0;
        dPdy[i] = 0;
        continue;
      }

      const left = c > 0 ? idx(r, c - 1) : i;
      const right = c < cols - 1 ? idx(r, c + 1) : i;
      const up = r > 0 ? idx(r - 1, c) : i;
      const down = r < rows - 1 ? idx(r + 1, c) : i;

      const pLeft = c > 0 && cells[left] !== CellType.WALL && cells[left] !== CellType.MITIGATION
        ? pressure[left]
        : pressure[i];
      const pRight = c < cols - 1 && cells[right] !== CellType.WALL && cells[right] !== CellType.MITIGATION
        ? pressure[right]
        : pressure[i];
      const pUp = r > 0 && cells[up] !== CellType.WALL && cells[up] !== CellType.MITIGATION
        ? pressure[up]
        : pressure[i];
      const pDown = r < rows - 1 && cells[down] !== CellType.WALL && cells[down] !== CellType.MITIGATION
        ? pressure[down]
        : pressure[i];

      dPdx[i] = (pRight - pLeft) * 0.5;
      dPdy[i] = (pDown - pUp) * 0.5;
    }
  }

  next.fill(0);

  const isBlocked = (index: number) => cells[index] === CellType.WALL || cells[index] === CellType.MITIGATION;
  const inBounds = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;

  for (let i = 0; i < N; i++) {
    const cell = cells[i];
    const density = Math.max(0, curr[i]);
    if (cell === CellType.WALL || cell === CellType.MITIGATION) {
      next[i] = 0;
      continue;
    }

    const r = Math.floor(i / cols);
    const c = i % cols;

    let FxEast = 0;
    let FxWest = 0;
    let FySouth = 0;
    let FyNorth = 0;

    if (c < cols - 1) {
      const right = i + 1;
      if (!isBlocked(i) && !isBlocked(right)) {
        const faceV = 0.5 * (velocityX[i] + velocityX[right]);
        FxEast = faceV >= 0 ? density * faceV : Math.max(0, curr[right]) * faceV;
      }
    }

    if (c > 0) {
      const left = i - 1;
      if (!isBlocked(i) && !isBlocked(left)) {
        const faceV = 0.5 * (velocityX[i] + velocityX[left]);
        FxWest = faceV >= 0 ? Math.max(0, curr[left]) * faceV : density * faceV;
      }
    }

    if (r < rows - 1) {
      const down = i + cols;
      if (!isBlocked(i) && !isBlocked(down)) {
        const faceV = 0.5 * (velocityY[i] + velocityY[down]);
        FySouth = faceV >= 0 ? density * faceV : Math.max(0, curr[down]) * faceV;
      }
    }

    if (r > 0) {
      const up = i - cols;
      if (!isBlocked(i) && !isBlocked(up)) {
        const faceV = 0.5 * (velocityY[i] + velocityY[up]);
        FyNorth = faceV >= 0 ? Math.max(0, curr[up]) * faceV : density * faceV;
      }
    }

    const advection = -(FxEast - FxWest + FySouth - FyNorth);

    let neighborSum = 0;
    let neighborCount = 0;
    const neighbors = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];

    for (const [nr, nc] of neighbors) {
      if (!inBounds(nr, nc)) {
        neighborSum += density;
      } else {
        const ni = idx(nr, nc);
        neighborSum += isBlocked(ni) ? density : Math.max(0, curr[ni]);
      }
      neighborCount += 1;
    }

    const diffusion = D * (neighborSum - neighborCount * density);

    const fluxPx = density * dPdx[i];
    const fluxPy = density * dPdy[i];
    let PxEast = 0;
    let PxWest = 0;
    let PySouth = 0;
    let PyNorth = 0;

    if (c < cols - 1) {
      const right = i + 1;
      if (!isBlocked(i) && !isBlocked(right)) {
        const neighborFlux = Math.max(0, curr[right]) * dPdx[right];
        PxEast = 0.5 * (fluxPx + neighborFlux);
      }
    }

    if (c > 0) {
      const left = i - 1;
      if (!isBlocked(i) && !isBlocked(left)) {
        const neighborFlux = Math.max(0, curr[left]) * dPdx[left];
        PxWest = 0.5 * (fluxPx + neighborFlux);
      }
    }

    if (r < rows - 1) {
      const down = i + cols;
      if (!isBlocked(i) && !isBlocked(down)) {
        const neighborFlux = Math.max(0, curr[down]) * dPdy[down];
        PySouth = 0.5 * (fluxPy + neighborFlux);
      }
    }

    if (r > 0) {
      const up = i - cols;
      if (!isBlocked(i) && !isBlocked(up)) {
        const neighborFlux = Math.max(0, curr[up]) * dPdy[up];
        PyNorth = 0.5 * (fluxPy + neighborFlux);
      }
    }

    const compression = -(PxEast - PxWest + PySouth - PyNorth);
    let updated = density + dt * (advection + diffusion + compression);

    if (cell === CellType.EXIT) {
      updated = Math.max(0, updated - exitDrain * updated * dt);
    }

    next[i] = Math.max(0, Math.min(updated, rhoMax));
  }

  let entryCount = 0;
  for (let i = 0; i < N; i++) {
    if (cells[i] === CellType.ENTRY) entryCount++;
  }
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
    epsilon,
    riskAlpha,
    riskDelta,
    riskGamma,
    riskEta,
    riskNormalization,
    riskWeight,
  } = p;

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

    const congestion = r >= rhoCrit ? Math.pow((r - rhoCrit) / rhoMax, 2) : 0;
    const termDensity = riskAlpha * (r / rhoMax);
    const termDistance = d < 1e8 ? riskDelta / (d + epsilon) : 0;
    const termSpeed = riskGamma / (speed + epsilon);
    const rawRisk = ((termDensity + termDistance + termSpeed + riskEta * congestion) / riskNormalization) * riskWeight;

    risk[i] = Math.min(1, Math.max(0, Number.isFinite(rawRisk) ? rawRisk : 0));
  }
}
