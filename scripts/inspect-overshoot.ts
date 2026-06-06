import { buildBottleneckScenario } from '../src/backend/engine/scenarios.ts';
import { runSimulationWithMetrics } from '../src/backend/engine/metrics.ts';
import { DEFAULT_PARAMS } from '../src/shared/simParams.ts';

const scenario = buildBottleneckScenario(DEFAULT_PARAMS.rows, DEFAULT_PARAMS.cols);
const metrics = runSimulationWithMetrics(DEFAULT_PARAMS, new Uint8Array(scenario.cells), scenario.rows, scenario.cols, scenario.label, {
  riskThreshold: 0.65,
  stopWhenLowMass: false,
});

const output = {
  label: scenario.label,
  densityMetrics: metrics.densityMetrics,
  densityDiagnostics: metrics.densityDiagnostics,
  numericalMetrics: metrics.numericalMetrics,
};

console.log(JSON.stringify(output, null, 2));
