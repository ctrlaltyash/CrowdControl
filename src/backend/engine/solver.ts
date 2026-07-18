/* ─────────────────────────────────────────────────────────────
   Direction Field V6 — Harmonic Potential + Exact Gradient
   Solves Laplace's equation over empty space and walls to produce
   a smooth, physically consistent travel direction field.
   ───────────────────────────────────────────────────────────── */

import { CellType } from './types';

/**
 * Encapsulates the computed potential field gradients and shortest-path distances.
 * Represents the fundamental navigation field guiding crowd entities.
 */
export interface DirectionField {
  vx: Float64Array;
  vy: Float64Array;
  dist: Float64Array;
}

/**
 * Computes a smooth, physically consistent travel direction field by solving
 * Laplace's equation for harmonic potential over the grid. 
 * Also computes the shortest path distance to the nearest exit using BFS traversal.
 */
export function computeDirectionField(
  cells: Uint8Array,
  rows: number,
  cols: number,
): DirectionField {
  const N = rows * cols;
  const idx = (r: number, c: number) => r * cols + c;
  const phi = new Float64Array(N);

  // Initialize potential field phi: exits act as sinks (0), other regions as 1
  for (let i = 0; i < N; i++) {
    phi[i] = cells[i] === CellType.EXIT ? 0 : 1;
  }

  // Solve Laplace's equation using Jacobi iteration scheme
  const maxIters = 1200;
  for (let iter = 0; iter < maxIters; iter++) {
    let maxDelta = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = idx(r, c);
        // Skip boundary conditions (walls, active mitigation, and exits)
        if (cells[i] === CellType.EXIT || cells[i] === CellType.WALL || cells[i] === CellType.MITIGATION) {
          continue;
        }

        let sum = 0;
        let count = 0;

        // Apply 4-point stencil for the discrete Laplacian
        const neighbors = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ];

        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
            sum += phi[i]; // Neumann boundary condition at domain edges
          } else {
            const ni = idx(nr, nc);
            if (cells[ni] === CellType.WALL || cells[ni] === CellType.MITIGATION) {
              sum += phi[i]; // Neumann boundary condition at internal obstacles
            } else {
              sum += phi[ni];
            }
          }
          count += 1;
        }

        // Compute local average and evaluate residual for convergence
        const nextPhi = sum / count;
        maxDelta = Math.max(maxDelta, Math.abs(nextPhi - phi[i]));
        phi[i] = nextPhi;
      }
    }

    // Terminate iteration early if convergence criteria are met
    if (maxDelta < 1e-8) {
      break;
    }
  }

  const vx = new Float64Array(N);
  const vy = new Float64Array(N);

  // Derive normalized gradient field to establish travel directions
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

      // Compute central differences to extract local gradient vectors
      const gx = -(phiRight - phiLeft) * 0.5;
      const gy = -(phiDown - phiUp) * 0.5;
      const length = Math.hypot(gx, gy);
      if (length > 1e-8) {
        vx[i] = gx / length;
        vy[i] = gy / length;
      }
    }
  }

  // Compute shortest path distance field via BFS traversal
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

  // Iterative BFS expansion from exit nodes
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

  return { vx, vy, dist };
}
