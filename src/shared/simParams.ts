import type { SimParams } from '../backend/engine/types';

// yo dis is the default setup for the vibes
// if u dont change dis, the crowd gonna act mid
export const DEFAULT_PARAMS: Readonly<SimParams> = Object.freeze({
  rows: 100, // how many rows we got? 100 fr
  cols: 100, // 100 columns bc we keep it square
  dt: 0.04, // time step... blink and u miss it
  rhoMax: 6, // max density... it be gettin cramped
  rhoCrit: 2, // critical density... things start gettin sus
  spreadFactor: 0.1, // how much they spread out lol
  pushFactor: 2.0, // how much they be pushin... main character energy
  minSpeedFactor: 0.01, // slow poke speed
  beta: 2.0, // sum math stuff idk
  pressureA: 10.0, // pressure parameter... stay cool
  pressureK: 1.2, // another pressure thingy
  pressureN: 3.0, // pressure power... boom
  entryRate: 80.0, // how fast ppl walkin in... pullin up
  exitDrain: 0.35, // how fast they leavin... see ya
  renderEvery: 1, // draw it every time... no lag allowed
  maxSteps: 10000, // max steps... we dont do dis forever
  epsilon: 0.05, // tiny tiny number
  diffusivity: 0.1, // how much they drift
  riskAlpha: 0.8, // risk factor alpha... sounds cool
  riskDelta: 0.4, // delta risk... change is scary
  riskGamma: 0.25, // gamma risk... hulk smash?
  riskEta: 1.0, // eta risk... arrival time?
  riskNormalization: 2.5, // make it look normal
  riskWeight: 1.0, // how heavy is the risk
  mitigationResponsiveness: 1.0, // how fast we react... quick reflexes
} satisfies SimParams);

// dis function creates params but u can swap some out
// like a custom skin or smth
export function createSimParams(overrides: Partial<SimParams> = {}): SimParams {
  // spread it like butter
  return { ...DEFAULT_PARAMS, ...overrides };
}
