/* ─────────────────────────────────────────────────────────────
   StampedePredictor — Type Definitions (Simplified Model)
   ───────────────────────────────────────────────────────────── */

/**
 * Defines the physical properties of cells within the simulation grid.
 * Ensure proper cell assignments to maintain simulation integrity.
 */
export enum CellType {
  EMPTY  = 0, /** Navigable free space */
  WALL   = 1, /** Impassable obstacle boundary */
  EXIT   = 2, /** Destination cell (sink for density) */
  ENTRY  = 3, /** Source cell (generates density) */
  MITIGATION = 4, /** Dynamically placed obstacle for flow control */
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

/** Represents the current operational state of the simulation engine */
export type SimStatus = 'idle' | 'initializing' | 'running' | 'finished' | 'stopped';

/** 
 * Represents an identified critical condition within the crowd dynamics, 
 * requiring monitoring or intervention.
 */
export interface HazardAlert {
  /** Unique identifier for the alert instance */
  id: string; 
  /** Row coordinate of the hazard centroid */
  r: number; 
  /** Column coordinate of the hazard centroid */
  c: number; 
  /** Severity metric based on local risk evaluation */
  intensity: number; 
  /** Simulation step when the hazard was detected */
  timestamp: number; 
  /** Classification of the observed instability */
  type: 'CRUSH_RISK' | 'STAGNANCY' | 'TURBULENCE'; 
  /** Indicates whether active mitigation successfully reduced risk below threshold */
  mitigated: boolean; 
}

/** V2: Simulator State Container */
/** Encapsulates the entire domain state, including scalar and vector fields for density, risk, and velocity */
export interface SimulatorState {
  /** Current density field mapping (rho) */
  rho: Float64Array; 
  /** Density field from the previous time step */
  rhoPrev: Float64Array; 
  /** Scalar field representing computed multi-factor risk */
  risk: Float64Array; 
  /** Horizontal velocity component field */
  vx: Float64Array; 
  /** Vertical velocity component field */
  vy: Float64Array; 
  /** Shortest path distance field to the nearest exit */
  distanceToExit: Float64Array; 
  /** Grid defining cell physical properties (walls, exits, etc.) */
  cells: Uint8Array; 
  /** Active simulation parameters */
  params: SimParams; 
  /** Cumulative number of simulation iterations executed */
  stepCount: number; 
  /** Indicates if the simulation engine is currently advancing time steps */
  running: boolean; 
  /** Number of grid rows */
  rows: number; 
  /** Number of grid columns */
  cols: number; 
  /** V4: Analytics & Mitigation */
  /** Active analytical alerts indicating localized instabilities */
  alerts: HazardAlert[]; 
}
