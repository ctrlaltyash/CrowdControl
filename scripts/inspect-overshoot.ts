import { buildBottleneckScenario } from '../src/backend/engine/scenarios.ts';
import { runSimulationWithMetrics } from '../src/backend/engine/metrics.ts';
import { DEFAULT_PARAMS } from '../src/shared/simParams.ts';

// Run a single diagnostic instance of the bottleneck scenario using default parameters.
const scenario = buildBottleneckScenario(DEFAULT_PARAMS.rows, DEFAULT_PARAMS.cols);
// Execute the simulation synchronously and collect comprehensive metric data.
const metrics = runSimulationWithMetrics(DEFAULT_PARAMS, new Uint8Array(scenario.cells), scenario.rows, scenario.cols, scenario.label, {
  riskThreshold: 0.65,
  stopWhenLowMass: false,
});

// Filter the full metrics object to expose only the relevant numerical and diagnostic summaries.
const output = {
  label: scenario.label,
  densityMetrics: metrics.densityMetrics,
  densityDiagnostics: metrics.densityDiagnostics,
  numericalMetrics: metrics.numericalMetrics,
};

console.log(JSON.stringify(output, null, 2));
