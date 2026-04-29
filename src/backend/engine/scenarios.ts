/* ─────────────────────────────────────────────────────────────
   Scenario Builder
   Constructs meaningful grid layouts with entries, exits, walls
   ───────────────────────────────────────────────────────────── */

import { CellType } from './types';

export interface ScenarioResult {
  cells: Uint8Array;
  rows: number;
  cols: number;
  label: string;
  description: string;
}

/** Bottleneck / hallway scenario: crowd flows from left entry through narrow corridor */
export function buildBottleneckScenario(rows = 100, cols = 100): ScenarioResult {
  const cells = new Uint8Array(rows * cols);
  const set = (r: number, c: number, t: CellType) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols)
      cells[r * cols + c] = t;
  };

  // Outer walls (border)
  for (let c = 0; c < cols; c++) {
    set(0, c, CellType.WALL);
    set(rows - 1, c, CellType.WALL);
  }
  for (let r = 0; r < rows; r++) {
    set(r, 0, CellType.WALL);
    set(r, cols - 1, CellType.WALL);
  }

  // Central dividing wall with narrow bottleneck
  const midC = Math.floor(cols / 2);
  const gapStart = Math.floor(rows * 0.42);
  const gapEnd   = Math.floor(rows * 0.58);

  for (let r = 1; r < rows - 1; r++) {
    if (r >= gapStart && r <= gapEnd) continue; // gap = bottleneck opening
    set(r, midC, CellType.WALL);
    set(r, midC - 1, CellType.WALL);
    set(r, midC + 1, CellType.WALL);
  }

  // Entry region: left side columns 2–4, middle rows
  for (let r = 5; r <= rows - 6; r++) {
    for (let c = 2; c <= 4; c++) {
      set(r, c, CellType.ENTRY);
    }
  }

  // Exit region: right side, middle
  for (let r = Math.floor(rows * 0.3); r <= Math.floor(rows * 0.7); r++) {
    set(r, cols - 2, CellType.EXIT);
    set(r, cols - 3, CellType.EXIT);
  }

  // Obstacle pillars on right side
  const pillarR = Math.floor(rows / 2);
  const pillarC = Math.floor(cols * 0.75);
  for (let dr = -3; dr <= 3; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      set(pillarR + dr, pillarC + dc, CellType.WALL);
    }
  }

  return {
    cells, rows, cols,
    label: 'Festival Bottleneck',
    description: 'Crowd flows left→right through narrow corridor — classic crush scenario',
  };
}

/** Stadium exit scenario: crowd converging on multiple exits */
export function buildStadiumScenario(rows = 100, cols = 100): ScenarioResult {
  const cells = new Uint8Array(rows * cols);
  const set = (r: number, c: number, t: CellType) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols)
      cells[r * cols + c] = t;
  };

  // Border
  for (let c = 0; c < cols; c++) { set(0, c, CellType.WALL); set(rows - 1, c, CellType.WALL); }
  for (let r = 0; r < rows; r++) { set(r, 0, CellType.WALL); set(r, cols - 1, CellType.WALL); }

  // Inner walls forming corridors
  // Horizontal barrier top-third
  const h1 = Math.floor(rows * 0.33);
  for (let c = 5; c < cols - 5; c++) {
    if (c < cols * 0.35 || c > cols * 0.65) {
      set(h1, c, CellType.WALL);
      set(h1 + 1, c, CellType.WALL);
    }
  }

  // Horizontal barrier bottom-third
  const h2 = Math.floor(rows * 0.67);
  for (let c = 5; c < cols - 5; c++) {
    if (c < cols * 0.35 || c > cols * 0.65) {
      set(h2, c, CellType.WALL);
      set(h2 + 1, c, CellType.WALL);
    }
  }

  // Entries: multiple around edges
  const entryPositions = [
    [Math.floor(rows * 0.15), 2],
    [Math.floor(rows * 0.5),  2],
    [Math.floor(rows * 0.85), 2],
    [Math.floor(rows * 0.15), cols - 3],
    [Math.floor(rows * 0.5),  cols - 3],
    [Math.floor(rows * 0.85), cols - 3],
  ];
  for (const [er, ec] of entryPositions) {
    for (let dr = -4; dr <= 4; dr++) {
      set(er + dr, ec, CellType.ENTRY);
      set(er + dr, ec + (ec < cols / 2 ? 1 : -1), CellType.ENTRY);
    }
  }

  // One narrow central exit
  const exitC = Math.floor(cols / 2);
  for (let r = Math.floor(rows * 0.45); r <= Math.floor(rows * 0.55); r++) {
    set(r, exitC, CellType.EXIT);
    set(r, exitC + 1, CellType.EXIT);
  }

  return {
    cells, rows, cols,
    label: 'Stadium Rush',
    description: 'Crowd from multiple entry points converges on a single central exit',
  };
}
