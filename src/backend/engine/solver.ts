/* ─────────────────────────────────────────────────────────────
   Direction Field V6 — Harmonic Potential + Exact Gradient
   Solves Laplace's equation over empty space and walls to produce
   a smooth, physically consistent travel direction field.
   ───────────────────────────────────────────────────────────── */

// lowkey importing cell types bc we need dat logic
import { CellType } from './types';

// dis interface is a whole vibe fr
export interface DirectionField {
  vx: Float64Array;
  vy: Float64Array;
  dist: Float64Array;
}

// main function to compute da field, no cap
export function computeDirectionField(
  cells: Uint8Array,
  rows: number,
  cols: number,
): DirectionField {
  const N = rows * cols;
  const idx = (r: number, c: number) => r * cols + c;
  const phi = new Float64Array(N);

  // initializing phi, exit is zero, others are one. trust the process
  for (let i = 0; i < N; i++) {
    phi[i] = cells[i] === CellType.EXIT ? 0 : 1;
  }

  // grinding thru 1200 iters max, we stay on dat grind
  const maxIters = 1200;
  for (let iter = 0; iter < maxIters; iter++) {
    let maxDelta = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = idx(r, c);
        // if it's an exit or wall, it's mid, we skip
        if (cells[i] === CellType.EXIT || cells[i] === CellType.WALL || cells[i] === CellType.MITIGATION) {
          continue;
        }

        let sum = 0;
        let count = 0;

        // checking neighbors, they lowkey sus
        const neighbors = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ];

        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
            sum += phi[i];
          } else {
            const ni = idx(nr, nc);
            if (cells[ni] === CellType.WALL || cells[ni] === CellType.MITIGATION) {
              sum += phi[i];
            } else {
              sum += phi[ni];
            }
          }
          count += 1;
        }

        // averaging stuff out, keepin it chill
        const nextPhi = sum / count;
        maxDelta = Math.max(maxDelta, Math.abs(nextPhi - phi[i]));
        phi[i] = nextPhi;
      }
    }

    // if delta is smol, we out. facts.
    if (maxDelta < 1e-8) {
      break;
    }
  }

  const vx = new Float64Array(N);
  const vy = new Float64Array(N);

  // time to calculate gradients, real rizz energy here
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = idx(r, c);
      if (cells[i] === CellType.WALL || cells[i] === CellType.MITIGATION) continue;

      const left = c > 0 ? idx(r, c - 1) : i;
      const right = c < cols - 1 ? idx(r, c + 1) : i;
      const up = r > 0 ? idx(r - 1, c) : i;
      const down = r < rows - 1 ? idx(r + 1, c) : i;

      const phiLeft = (c > 0 && cells[left] !== CellType.WALL && cells[left] !== CellType.MITIGATION)
        ? phi[left]
        : phi[i];
      const phiRight = (c < cols - 1 && cells[right] !== CellType.WALL && cells[right] !== CellType.MITIGATION)
        ? phi[right]
        : phi[i];
      const phiUp = (r > 0 && cells[up] !== CellType.WALL && cells[up] !== CellType.MITIGATION)
        ? phi[up]
        : phi[i];
      const phiDown = (r < rows - 1 && cells[down] !== CellType.WALL && cells[down] !== CellType.MITIGATION)
        ? phi[down]
        : phi[i];

      // math goes brrr
      const gx = -(phiRight - phiLeft) * 0.5;
      const gy = -(phiDown - phiUp) * 0.5;
      const length = Math.hypot(gx, gy);
      if (length > 1e-8) {
        vx[i] = gx / length;
        vy[i] = gy / length;
      }
    }
  }

  // setting up distance field, BFS is da goat
  const dist = new Float64Array(N).fill(1e9);
  const queue: number[] = [];
  for (let i = 0; i < N; i++) {
    if (cells[i] === CellType.EXIT) {
      dist[i] = 0;
      queue.push(i);
    }
  }

  let head = 0;
  const dr = [-1, 1, 0, 0];
  const dc = [0, 0, -1, 1];

  // running BFS like a boss
  while (head < queue.length) {
    const cur = queue[head++];
    const cr = Math.floor(cur / cols);
    const cc = cur % cols;

    for (let k = 0; k < 4; k++) {
      const nr = cr + dr[k];
      const nc = cc + dc[k];
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const ni = idx(nr, nc);
      if (cells[ni] === CellType.WALL || cells[ni] === CellType.MITIGATION) continue;
      if (dist[ni] > dist[cur] + 1) {
        dist[ni] = dist[cur] + 1;
        queue.push(ni);
      }
    }
  }

  // returning everything, we ate dat
  return { vx, vy, dist };
}
