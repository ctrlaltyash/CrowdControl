/* ─────────────────────────────────────────────────────────────
   Direction Field V5 — Continuous Geodesic Gradient
   Ensures smooth steering even in large open spaces.
   ───────────────────────────────────────────────────────────── */

import { CellType } from './types';

export interface DirectionField {
  vx: Float64Array;
  vy: Float64Array;
  dist: Float64Array;
}

export function computeDirectionField(
  cells: Uint8Array,
  rows: number,
  cols: number,
): DirectionField {
  const N = rows * cols;
  const dist = new Float64Array(N).fill(10000);
  const queue: number[] = [];
  const idx = (r: number, c: number) => r * cols + c;

  // 1. BFS to get raw distance
  for (let i = 0; i < N; i++) {
    if (cells[i] === CellType.EXIT) {
      dist[i] = 0;
      queue.push(i);
    }
  }

  let head = 0;
  const dr = [-1, 1, 0, 0];
  const dc = [0, 0, -1, 1];

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

  // 2. Multi-pass smoothing to ensure continuous gradients
  const smoothed = new Float64Array(dist);
  for (let p = 0; p < 8; p++) {
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const i = idx(r, c);
        if (cells[i] === CellType.WALL || cells[i] === CellType.MITIGATION || dist[i] === 0) continue;
        
        let sum = 0; let count = 0;
        const neighbors = [i-1, i+1, i-cols, i+cols];
        for (const ni of neighbors) {
            if (cells[ni] !== CellType.WALL && cells[ni] !== CellType.MITIGATION && dist[ni] < 10000) {
                sum += smoothed[ni];
                count++;
            }
        }
        if (count > 0) {
            smoothed[i] = (smoothed[i] + sum / count) / 2;
        }
      }
    }
  }

  // 3. Compute Unit Vectors from Gradient
  const vx = new Float64Array(N);
  const vy = new Float64Array(N);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = idx(r, c);
      if (cells[i] === CellType.WALL || cells[i] === CellType.MITIGATION) continue;

      let dx = 0; let dy = 0;
      if (c > 0 && c < cols - 1) dx = smoothed[i - 1] - smoothed[i + 1];
      if (r > 0 && r < rows - 1) dy = smoothed[i - cols] - smoothed[i + cols];

      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0.0001) {
        vx[i] = dx / len;
        vy[i] = dy / len;
      }
    }
  }

  return { vx, vy, dist: smoothed };
}
