import type { SimParams } from '../backend/engine/types';

export const DEFAULT_PARAMS: Readonly<SimParams> = Object.freeze({
  rows: 100,
  cols: 100,
  dt: 0.04,
  rhoMax: 6,
  rhoCrit: 2,
  spreadFactor: 0.1,
  pushFactor: 2.0,
  minSpeedFactor: 0.01,
  beta: 2.0,
  pressureA: 10.0,
  pressureK: 1.2,
  pressureN: 3.0,
  entryRate: 80.0,
  exitDrain: 0.35,
  renderEvery: 1,
  maxSteps: 10000,
  epsilon: 0.05,
  diffusivity: 0.1,
  riskAlpha: 0.8,
  riskDelta: 0.4,
  riskGamma: 0.25,
  riskEta: 1.0,
  riskNormalization: 2.5,
  riskWeight: 1.0,
  mitigationResponsiveness: 1.0,
} satisfies SimParams);

export function createSimParams(overrides: Partial<SimParams> = {}): SimParams {
  return { ...DEFAULT_PARAMS, ...overrides };
}
