/* ─────────────────────────────────────────────────────────────
   StampedePredictor — Type Definitions (Simplified Model)
   ───────────────────────────────────────────────────────────── */

// yo dis enum defines wat each block is
// dont mix em up or it'll be a whole mess
export enum CellType {
  EMPTY  = 0, // just air lol
  WALL   = 1, // u cant go here... rip
  EXIT   = 2, // the way out... finally
  ENTRY  = 3, // where everyone pulls up
  MITIGATION = 4, // ai fixin things
}

/** Simulation parameters — V3 Research Model (Yashvardhan 2026) */
export interface SimParams {
  rows: number;
  cols: number;

  dt: number;
  
  // 2.2 Density-Dependent Velocity
  rhoMax: number; // \rho_{max}
  beta: number;   // \beta
  pushFactor: number; // Magnitude of -\nabla\phi

  // 2.3 & 2.4 Density Evolution & Pressure Law
  rhoCrit: number;     // \rho_{crit}
  diffusivity: number; // D
  pressureK: number;   // k
  pressureN: number;   // n (must be > 2)
  pressureA: number;   // a (Activation steepness)

  // 2.5 Risk Functional
  riskAlpha: number; // \alpha (Density weight)
  riskDelta: number; // \delta (Distance weight)
  riskGamma: number; // \gamma (Velocity weight)
  riskEta: number;   // \eta (Pressure/Psi weight)
  epsilon: number;   // \epsilon (Regularization)

  // 2.6 Camaraderie Term
  camaraderieM: number; // m (Crowding exponent)
  camaraderieG: number; // G (Group strength)
  camaraderieI: number; // I (Independence factor)

  // Simulation Control
  entryRate: number;
  exitDrain: number;
  renderEvery: number;
  maxSteps: number;
  
  // Legacy / Misc
  riskWeight: number;
  mitigationResponsiveness: number;
  spreadFactor: number; // often same as D
  minSpeedFactor: number;
}

/** Simulation status */
// wat is the sim doin rn?
export type SimStatus = 'idle' | 'initializing' | 'running' | 'finished' | 'stopped';

/** Hazard types for analytics */
// when things go south
export interface HazardAlert {
  id: string; // unique tag
  r: number; // row loc
  c: number; // col loc
  intensity: number; // how bad is it?
  timestamp: number; // when it happened
  type: 'CRUSH_RISK' | 'STAGNANCY' | 'TURBULENCE'; // the bad stuff
  mitigated: boolean; // did we fix it tho?
}

/** V2: Simulator State Container */
// the whole world state... big brain energy
export interface SimulatorState {
  rho: Float64Array; // density map
  rhoPrev: Float64Array; // last frame
  risk: Float64Array; // risk map... scary
  vx: Float64Array; // velocity x
  vy: Float64Array; // velocity y
  distanceToExit: Float64Array; // how far to the door
  cells: Uint8Array; // the map layout
  params: SimParams; // current settings
  stepCount: number; // how many ticks
  running: boolean; // is it zoomin?
  rows: number; // rows again
  cols: number; // cols again
  /** V4: Analytics & Mitigation */
  alerts: HazardAlert[]; // all the current issues
}
