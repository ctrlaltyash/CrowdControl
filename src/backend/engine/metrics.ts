import { SimParams, CellType } from './types';
import { computeDirectionField } from './solver';
import { stepDensityV3, computeRiskV3 } from './density';

export interface DensityMetrics {
  maxDensity: number;
  meanDensity: number;
  percentageAboveCrit: number;
  firstStepAboveCrit: number | null;
}

export interface VelocityMetrics {
  meanVelocity: number;
  minVelocity: number;
  totalEvacuatedMass: number;
  exitFlowRatePerStep: number[];
}

export interface RiskMetrics {
  maxRisk: number;
  meanRisk: number;
  percentageAboveThreshold: number;
  timeOfPeakRisk: number;
}

export interface NumericalMetrics {
  massConservationError: number;
  runtimeMs: number;
  rows: number;
  cols: number;
  numTimesteps: number;
}

export interface TimeSeriesMetrics {
  peakDensityPerStep: number[];
  meanRiskPerStep: number[];
  highRiskAreaPctPerStep: number[];
  exitFlowRatePerStep: number[];
}

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
}

const DEFAULT_HIGH_RISK_THRESHOLD = 0.65;

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

export function runSimulationWithMetrics(
  params: SimParams,
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
  const riskThreshold = options?.riskThreshold ?? DEFAULT_HIGH_RISK_THRESHOLD;
  const dir = computeDirectionField(cells, rows, cols);

  let rho = options?.initialDensity ? new Float64Array(options.initialDensity) : new Float64Array(N);
  let rhoPrev = new Float64Array(N);
  const risk = new Float64Array(N);
  const vx = dir.vx.slice();
  const vy = dir.vy.slice();
  const distanceToExit = dir.dist.slice();

  const initialDensityState = new Float64Array(rho);
  const peakDensityPerStep: number[] = [];
  const meanRiskPerStep: number[] = [];
  const highRiskAreaPctPerStep: number[] = [];
  const exitFlowRatePerStep: number[] = [];

  let totalEntryMass = 0;
  let totalExitMass = 0;
  let sumMeanDensity = 0;
  let maxDensityOverTime = 0;
  let firstStepAboveCrit: number | null = null;
  let stepCount = 0;
  let stepOfPeakRisk = 0;
  let peakMeanRisk = 0;

  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const isActiveCell = (index: number) => cells[index] !== CellType.WALL && cells[index] !== CellType.MITIGATION;
  const initialMass = Array.from(initialDensityState).reduce((carry, value) => carry + value, 0);

  for (let step = 1; step <= params.maxSteps; step += 1) {
    stepDensityV3(rho, rhoPrev, vx, vy, cells, params);
    computeRiskV3(rhoPrev, vx, vy, distanceToExit, cells, risk, params);

    const currentMaxDensity = Math.max(...rhoPrev);
    let activeDensitySum = 0;
    let activeRiskSum = 0;
    let activeCount = 0;
    let highRiskAreaCount = 0;

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

    const temp = rho;
    rho = rhoPrev;
    rhoPrev = temp;

    if (options?.stopWhenLowMass) {
      const totalMass = Array.from(rho).reduce((carry, value) => carry + value, 0);
      if (totalMass < 1e-4) break;
    }
  }

  const finalVelocityMagnitude = velocityMagnitude(vx, vy, cells);
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
  const finalMinVelocity = finalVelocityCount > 0
    ? Array.from(finalVelocityMagnitude)
        .filter((value, index) => isActiveCell(index))
        .reduce((min, v) => Math.min(min, v), Infinity)
    : 0;

  const finalMeanRisk = finalVelocityCount > 0 ? finalRiskSum / finalVelocityCount : 0;
  const finalHighRiskPct = finalVelocityCount > 0 ? (finalHighRiskCount / finalVelocityCount) * 100 : 0;

  const finalMass = Array.from(rho).reduce((carry, value) => carry + value, 0);
  const massConservationError = Math.abs(initialMass + totalEntryMass - totalExitMass - finalMass);
  const runtimeMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

  const activeFinalCellCount = Array.from(cells).reduce((count, value, index) => {
    return count + (isActiveCell(index) ? 1 : 0);
  }, 0);

  const densityMetrics: DensityMetrics = {
    maxDensity: maxDensityOverTime,
    meanDensity: stepCount > 0 ? sumMeanDensity / stepCount : 0,
    percentageAboveCrit: activeFinalCellCount > 0
      ? (Array.from(rho).filter((value, index) => isActiveCell(index) && value > params.rhoCrit).length / activeFinalCellCount) * 100
      : 0,
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
