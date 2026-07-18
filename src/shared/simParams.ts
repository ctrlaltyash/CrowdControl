import type { SimParams } from '../backend/engine/types';

/**
 * Default simulation parameters based on established crowd dynamics literature.
 * Modifying these values will directly alter the behavior of the macroscopic crowd model.
 */
export const DEFAULT_PARAMS: Readonly<SimParams> = Object.freeze({
  rows: 100,
  cols: 100,
  dt: 0.01, // Stable dt for high-density compression

  // Table 1: Representative Model Parameters
  rhoMax: 8.0,      // \rho_{max} = 8 persons/m2
  rhoCrit: 4.0,     // \rho_{crit} = 4 persons/m2
  diffusivity: 0.02, // D = 0.02
  beta: 2.0,        // \beta = 2
  pressureK: 1.0,   // k = 1.0
  pressureN: 3.0,   // n = 3
  pressureA: 5.0,   // a = 5
  epsilon: 1e-3,    // \epsilon = 10^-3
  
  // Risk Functional Weights (Section 2.5)
  riskAlpha: 0.5, // \alpha
  riskDelta: 0.1, // \delta
  riskGamma: 0, // \gamma
  riskEta: 0.3,   // \eta
  
  // Camaraderie Term (Section 2.6)
  camaraderieM: 2.0, // m > 1
  camaraderieG: 0.5, // G (Group strength)
  camaraderieI: 0.2, // I (Independence factor)

  // Simulation Dynamics
  pushFactor: 1.5,
  minSpeedFactor: 0.01,
  entryRate: 40.0,
  exitDrain: 0.5,
  renderEvery: 1,
  maxSteps: 15000,

  // Legacy / Misc
  riskWeight: 1.0,
  mitigationResponsiveness: 1.0,
  spreadFactor: 0.02,
} satisfies SimParams);

/**
 * Factory function to instantiate simulation parameters, applying any provided overrides
 * to the default configuration set.
 *
 * @param overrides - Partial parameter set used to overwrite default values.
 * @returns A complete configuration object for the simulation engine.
 */
export function createSimParams(overrides: Partial<SimParams> = {}): SimParams {
  // Merge default parameters with the provided overrides.
  return { ...DEFAULT_PARAMS, ...overrides };
}
