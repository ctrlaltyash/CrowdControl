/// This module provides functions to run the simulation and compute various metrics related to density, velocity, and risk over time. It includes a main function `runSimulationWithMetrics` that executes the simulation loop and collects metrics at each step, as well as final metrics at the end of the simulation.
//  The metrics include maximum and mean density, velocity statistics, risk levels, and numerical properties like mass conservation error and runtime. The module also defines interfaces for the structure of these metrics, making it easy to analyze and visualize the results of different scenarios.


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
  },
): SimulationMetrics {
  const N = rows * cols;
  const riskThreshold = options?.riskThreshold ?? DEFAULT_HIGH_RISK_THRESHOLD;
  const dir = computeDirectionField(cells, rows, cols);

  let rho = new Float64Array(N);
  let rhoPrev = new Float64Array(N);
  const risk = new Float64Array(N);
  const vx = dir.vx.slice();
  const vy = dir.vy.slice();

  const initialDensity = new Float64Array(rho);
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

  const initialMass = Array.from(initialDensity).reduce((carry, value) => carry + value, 0);

  for (let step = 1; step <= params.maxSteps; step += 1) {
    stepDensityV3(rho, rhoPrev, vx, vy, cells, params);
    computeRiskV3(rhoPrev, vx, vy, risk, params);

    const currentMaxDensity = Math.max(...rhoPrev);
    const currentMeanDensity = Array.from(rhoPrev).reduce((sum, value) => sum + value, 0) / N;
    const currentMeanRisk = Array.from(risk).reduce((sum, value) => sum + value, 0) / N;
    const highRiskAreaCount = Array.from(risk).filter(value => value > riskThreshold).length;
    const highRiskAreaPct = (highRiskAreaCount / N) * 100;
 
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
  const finalMeanVelocity = Array.from(finalVelocityMagnitude).reduce((sum, value) => sum + value, 0) / N;
  const nonEmptyVelocities = Array.from(finalVelocityMagnitude).filter((value, index) => cells[index] !== CellType.WALL && cells[index] !== CellType.MITIGATION);
  const finalMinVelocity = nonEmptyVelocities.length > 0 ? Math.min(...nonEmptyVelocities) : 0;

  const finalMaxRisk = Math.max(...risk);
  const finalMeanRisk = Array.from(risk).reduce((sum, value) => sum + value, 0) / N;
  const finalHighRiskCount = Array.from(risk).filter(value => value > riskThreshold).length;
  const finalHighRiskPct = (finalHighRiskCount / N) * 100;

  const finalMass = Array.from(rho).reduce((carry, value) => carry + value, 0);
  const massConservationError = Math.abs(initialMass + totalEntryMass - totalExitMass - finalMass);
  const runtimeMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

  const densityMetrics: DensityMetrics = {
    maxDensity: maxDensityOverTime,
    meanDensity: stepCount > 0 ? sumMeanDensity / stepCount : 0,
    percentageAboveCrit: (Array.from(rho).filter(value => value > params.rhoCrit).length / N) * 100,
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
    initialDensity,
    finalDensity: rho.slice(),
    finalRisk: risk.slice(),
    finalVelocityMagnitude,
  };
}
