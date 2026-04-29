/* ─────────────────────────────────────────────────────────────
   StampedePredictor — Type Definitions (Simplified Model)
   ───────────────────────────────────────────────────────────── */

/** Cell type enum: 0=empty, 1=wall, 2=exit, 3=entry */
export enum CellType {
  EMPTY  = 0,
  WALL   = 1,
  EXIT   = 2,
  ENTRY  = 3,
  MITIGATION = 4,
}

/** Simulation parameters — V2 Physics Model */
export interface SimParams {
  rows: number;
  cols: number;
  dt: number;
  rhoMax: number;
  rhoCrit: number;
  spreadFactor: number;
  pushFactor: number;
  minSpeedFactor: number;
  entryRate: number;
  exitDrain: number;
  renderEvery: number;
  maxSteps: number;
  epsilon: number;
  /** V2: Turbulence/Risk factor */
  riskWeight: number;
  /** AI mitigation responsiveness: 0=passive, 1=balanced, 2=aggressive */
  mitigationResponsiveness: number;
}

/** Simulation status */
export type SimStatus = 'idle' | 'initializing' | 'running' | 'finished' | 'stopped';

/** Hazard types for analytics */
export interface HazardAlert {
  id: string;
  r: number;
  c: number;
  intensity: number;
  timestamp: number;
  type: 'CRUSH_RISK' | 'STAGNANCY' | 'TURBULENCE';
  mitigated: boolean;
}

/** V2: Simulator State Container */
export interface SimulatorState {
  rho: Float64Array;
  rhoPrev: Float64Array;
  risk: Float64Array;
  vx: Float64Array;
  vy: Float64Array;
  cells: Uint8Array;
  params: SimParams;
  stepCount: number;
  running: boolean;
  rows: number;
  cols: number;
  /** V4: Analytics & Mitigation */
  alerts: HazardAlert[];
}
