import { SimParams, CellType } from './types';
import { computeDirectionField } from './solver';
import { stepDensityV3, computeRiskV3, type DensityStepDiagnostics } from './density';
import { createSimParams } from '../../shared/simParams';

/** Metrics tracking density statistics throughout the simulation. */
export interface DensityMetrics {
  maxDensity: number;
  meanDensity: number;
  percentageAboveCrit: number;
  firstStepAboveCrit: number | null;
}

/** Metrics tracking velocity and evacuation flow rates. */
export interface VelocityMetrics {
  meanVelocity: number;
  minVelocity: number;
  totalEvacuatedMass: number;
  exitFlowRatePerStep: number[];
}

/** Metrics evaluating safety and hazard risks during the simulation. */
export interface RiskMetrics {
  maxRisk: number;
  meanRisk: number;
  percentageAboveThreshold: number;
  timeOfPeakRisk: number;
}

/** Metrics tracking numerical stability, conservation errors, and performance. */
export interface NumericalMetrics {
  massConservationError: number;
  runtimeMs: number;
  rows: number;
  cols: number;
  numTimesteps: number;
}

/** Time series data tracking key variables at each simulation step. */
export interface TimeSeriesMetrics {
  peakDensityPerStep: number[];
  meanRiskPerStep: number[];
  highRiskAreaPctPerStep: number[];
  exitFlowRatePerStep: number[];
}

/** Diagnostics tracking localized density overshoots beyond physical limits. */
export interface DensityDiagnostics {
  totalOvershootCount: number;
  totalOvershootMagnitude: number;
  maxOvershootMagnitude: number;
  overshootCountPerStep: number[];
}

/** Comprehensive simulation metrics payload. */
export interface SimulationMetrics {
  scenarioName: string;
  densityMetrics: DensityMetrics;
  velocityMetrics: VelocityMetrics;
  riskMetrics: RiskMetrics;
  numericalMetrics: NumericalMetrics;
  timeSeries: TimeSeriesMetrics;
  initialDensity: Float64Array;
  finalDensity: Float64Array;
  finalRisk: Float64Array;
  finalVelocityMagnitude: Float64Array;
  densityDiagnostics: DensityDiagnostics;
}

const DEFAULT_HIGH_RISK_THRESHOLD = 0.65; // Threshold indicating severe risk conditions

/** Computes the scalar magnitude of the velocity field. */
function velocityMagnitude(vx: Float64Array, vy: Float64Array, mask?: Uint8Array): Float64Array {
  const result = new Float64Array(vx.length);
  for (let i = 0; i < vx.length; i += 1) {
    if (mask && (mask[i] === CellType.WALL || mask[i] === CellType.MITIGATION)) {
      result[i] = 0;
    } else {
      result[i] = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
    }
  }
  return result;
}

/** Main entry point for executing a complete, headless simulation run. */
export function runSimulationWithMetrics(
  paramsInput: Partial<SimParams>,
  cells: Uint8Array,
  rows: number,
  cols: number,
  scenarioName: string,
  options?: {
    riskThreshold?: number;
    stopWhenLowMass?: boolean;
    initialDensity?: Float64Array;
  },
): SimulationMetrics {
  const N = rows * cols;
  const params = createSimParams({ ...paramsInput, rows, cols });
  const riskThreshold = options?.riskThreshold ?? DEFAULT_HIGH_RISK_THRESHOLD;
  const dir = computeDirectionField(cells, rows, cols);

  // Initialize simulation state buffers
  let rho = options?.initialDensity ? new Float64Array(options.initialDensity) : new Float64Array(N);
  let rhoPrev = new Float64Array(N);
  const risk = new Float64Array(N);
  const distanceToExit = dir.dist.slice();
  const actualVx = new Float64Array(N);
  const actualVy = new Float64Array(N);
  const push = Math.max(0, params.pushFactor);
  for (let i = 0; i < N; i++) {
    actualVx[i] = dir.vx[i] * push;
    actualVy[i] = dir.vy[i] * push;
  }

  const initialDensityState = new Float64Array(rho);
  const peakDensityPerStep: number[] = [];
  const meanRiskPerStep: number[] = [];
  const highRiskAreaPctPerStep: number[] = [];
  const exitFlowRatePerStep: number[] = [];
  const overshootCountPerStep: number[] = [];

  let totalEntryMass = 0;
  let totalExitMass = 0;
  let sumMeanDensity = 0;
  let maxDensityOverTime = 0;
  let firstStepAboveCrit: number | null = null;
  let stepCount = 0;
  let stepOfPeakRisk = 0;
  let peakMeanRisk = 0;
  let totalOvershootCount = 0;
  let totalOvershootMagnitude = 0;
  let maxOvershootMagnitude = 0;

  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const isActiveCell = (index: number) => cells[index] !== CellType.WALL && cells[index] !== CellType.MITIGATION;
  let initialMass = 0;
  for (let i = 0; i < initialDensityState.length; i++) {
    initialMass += initialDensityState[i];
  }

  // Execute time steps
  for (let step = 1; step <= params.maxSteps; step += 1) {
    const diagnostics: DensityStepDiagnostics = {
      overshootCount: 0,
      totalOvershootMagnitude: 0,
      maxOvershootMagnitude: 0,
    };
    stepDensityV3(rho, rhoPrev, dir.vx, dir.vy, cells, params, diagnostics, actualVx, actualVy);
    computeRiskV3(rhoPrev, actualVx, actualVy, distanceToExit, cells, risk, params);

    const currentMaxDensity = Math.max(...rhoPrev);
    let activeDensitySum = 0;
    let activeRiskSum = 0;
    let activeCount = 0;
    let highRiskAreaCount = 0;

    // Accumulate step statistics for active computational cells
    for (let i = 0; i < N; i += 1) {
      if (!isActiveCell(i)) continue;
      activeDensitySum += rhoPrev[i];
      activeRiskSum += risk[i];
      activeCount += 1;
      if (risk[i] > riskThreshold) highRiskAreaCount += 1;
    }

    const currentMeanDensity = activeCount > 0 ? activeDensitySum / activeCount : 0;
    const currentMeanRisk = activeCount > 0 ? activeRiskSum / activeCount : 0;
    const highRiskAreaPct = activeCount > 0 ? (highRiskAreaCount / activeCount) * 100 : 0;

    peakDensityPerStep.push(currentMaxDensity);
    meanRiskPerStep.push(currentMeanRisk);
    highRiskAreaPctPerStep.push(highRiskAreaPct);

    if (currentMeanRisk > peakMeanRisk) {
      peakMeanRisk = currentMeanRisk;
      stepOfPeakRisk = step;
    }

    if (currentMaxDensity > maxDensityOverTime) maxDensityOverTime = currentMaxDensity;

    if (firstStepAboveCrit === null && currentMaxDensity > params.rhoCrit) {
      firstStepAboveCrit = step;
    }

    overshootCountPerStep.push(diagnostics.overshootCount);
    totalOvershootCount += diagnostics.overshootCount;
    totalOvershootMagnitude += diagnostics.totalOvershootMagnitude;
    maxOvershootMagnitude = Math.max(maxOvershootMagnitude, diagnostics.maxOvershootMagnitude);

    // Compute mass flux at entry and exit boundaries
    const exitFlow = rhoPrev.reduce((sum, _value, index) => {
      if (cells[index] !== CellType.EXIT) return sum;
      const diff = rho[index] - rhoPrev[index];
      return sum + Math.max(0, diff);
    }, 0);

    const entryFlow = rhoPrev.reduce((sum, _value, index) => {
      if (cells[index] !== CellType.ENTRY) return sum;
      const diff = rhoPrev[index] - rho[index];
      return sum + Math.max(0, diff);
    }, 0);

    exitFlowRatePerStep.push(exitFlow);
    totalExitMass += exitFlow;
    totalEntryMass += entryFlow;
    sumMeanDensity += currentMeanDensity;
    stepCount += 1;

    // Swap state buffers for the next time step
    const temp = rho;
    rho = rhoPrev;
    rhoPrev = temp;

    // Early termination condition: all mass evacuated
    if (options?.stopWhenLowMass) {
      let totalCurrentMass = 0;
      for (let i = 0; i < rho.length; i++) {
        totalCurrentMass += rho[i];
      }
      if (totalCurrentMass < 1e-4) break;
    }
  }

  // Compute final aggregated statistics and diagnostics
  const finalVelocityMagnitude = velocityMagnitude(actualVx, actualVy, cells);
  let finalVelocitySum = 0;
  let finalVelocityCount = 0;
  let finalMaxRisk = 0;
  let finalRiskSum = 0;
  let finalHighRiskCount = 0;

  for (let i = 0; i < N; i += 1) {
    if (!isActiveCell(i)) continue;
    finalVelocitySum += finalVelocityMagnitude[i];
    finalVelocityCount += 1;
    finalMaxRisk = Math.max(finalMaxRisk, risk[i]);
    finalRiskSum += risk[i];
    if (risk[i] > riskThreshold) finalHighRiskCount += 1;
  }

  const finalMeanVelocity = finalVelocityCount > 0 ? finalVelocitySum / finalVelocityCount : 0;
  let finalMinVelocity = Infinity;
  if (finalVelocityCount > 0) {
    for (let i = 0; i < N; i++) {
      if (isActiveCell(i)) {
        finalMinVelocity = Math.min(finalMinVelocity, finalVelocityMagnitude[i]);
      }
    }
  } else { finalMinVelocity = 0; }

  const finalMeanRisk = finalVelocityCount > 0 ? finalRiskSum / finalVelocityCount : 0;
  const finalHighRiskPct = finalVelocityCount > 0 ? (finalHighRiskCount / finalVelocityCount) * 100 : 0;

  const finalMass = Array.from(rho).reduce((carry, value) => carry + value, 0);
  const massConservationError = Math.abs(initialMass + totalEntryMass - totalExitMass - finalMass);
  const runtimeMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

  const activeFinalCellCount = Array.from(cells).reduce((count, _, index) => {
    return count + (isActiveCell(index) ? 1 : 0);
  }, 0);

  let cellsAboveCrit = 0;
  for (let i = 0; i < N; i++) {
    if (isActiveCell(i) && rho[i] > params.rhoCrit) cellsAboveCrit++;
  }

  // Construct and return final metrics payload
  const densityMetrics: DensityMetrics = {
    maxDensity: maxDensityOverTime,
    meanDensity: stepCount > 0 ? sumMeanDensity / stepCount : 0,
    percentageAboveCrit: activeFinalCellCount > 0 ? (cellsAboveCrit / activeFinalCellCount) * 100 : 0,
    firstStepAboveCrit,
  };

  const velocityMetrics: VelocityMetrics = {
    meanVelocity: finalMeanVelocity,
    minVelocity: finalMinVelocity,
    totalEvacuatedMass: totalExitMass,
    exitFlowRatePerStep,
  };

  const riskMetrics: RiskMetrics = {
    maxRisk: finalMaxRisk,
    meanRisk: finalMeanRisk,
    percentageAboveThreshold: finalHighRiskPct,
    timeOfPeakRisk: stepOfPeakRisk,
  };

  const numericalMetrics: NumericalMetrics = {
    massConservationError,
    runtimeMs,
    rows,
    cols,
    numTimesteps: stepCount,
  };

  return {
    scenarioName,
    densityMetrics,
    velocityMetrics,
    riskMetrics,
    numericalMetrics,
    densityDiagnostics: {
      totalOvershootCount,
      totalOvershootMagnitude,
      maxOvershootMagnitude,
      overshootCountPerStep,
    },
    timeSeries: {
      peakDensityPerStep,
      meanRiskPerStep,
      highRiskAreaPctPerStep,
      exitFlowRatePerStep,
    },
    initialDensity: initialDensityState,
    finalDensity: rho.slice(),
    finalRisk: risk.slice(),
    finalVelocityMagnitude,
  };
}
