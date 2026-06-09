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

/** Simulation parameters — V2 Physics Model */
// big list of numbers dat make the magic happen
export interface SimParams {
  rows: number; // rows fr
  cols: number; // cols fr
  dt: number; // time zoom
  rhoMax: number; // max peeps in a spot
  rhoCrit: number; // when it gets scary
  spreadFactor: number; // chill factor
  pushFactor: number; // aggressive factor
  minSpeedFactor: number; // slow walk
  beta: number; // beta... not alpha?
  pressureA: number; // pressure A
  pressureK: number; // pressure K
  pressureN: number; // pressure N
  entryRate: number; // spawn rate
  exitDrain: number; // despawn rate
  renderEvery: number; // frame skip?
  maxSteps: number; // game over
  epsilon: number; // smol math
  diffusivity: number; // drift
  riskAlpha: number; // risk A
  riskDelta: number; // risk D
  riskGamma: number; // risk G
  riskEta: number; // risk E
  riskNormalization: number; // normal vibes
  /** V2: Turbulence/Risk factor */
  riskWeight: number; // how much risk we feelin
  /** AI mitigation responsiveness: 0=passive, 1=balanced, 2=aggressive */
  mitigationResponsiveness: number; // how fast the ai acts... no cap
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
