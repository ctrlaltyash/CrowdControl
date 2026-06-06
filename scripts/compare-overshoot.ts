import { buildBottleneckScenario } from '../src/backend/engine/scenarios.ts';
import { runSimulationWithMetrics } from '../src/backend/engine/metrics.ts';
import { createSimParams, DEFAULT_PARAMS } from '../src/shared/simParams.ts';
import { writeFileSync } from 'node:fs';

const scenario = buildBottleneckScenario(DEFAULT_PARAMS.rows, DEFAULT_PARAMS.cols);

const configs = [
  { label: 'default', params: DEFAULT_PARAMS },
  { label: 'dt-0.02', params: createSimParams({ dt: 0.02 }) },
  { label: 'dt-0.01', params: createSimParams({ dt: 0.01 }) },
];

const results = configs.map(({ label, params }) => {
  const metrics = runSimulationWithMetrics(params, new Uint8Array(scenario.cells), scenario.rows, scenario.cols, `${scenario.label}-${label}`, {
    riskThreshold: 0.65,
    stopWhenLowMass: false,
  });
  const { densityDiagnostics, densityMetrics, numericalMetrics } = metrics;
  return {
    label,
    densityMetrics,
    densityDiagnostics: {
      totalOvershootCount: densityDiagnostics.totalOvershootCount,
      totalOvershootMagnitude: densityDiagnostics.totalOvershootMagnitude,
      maxOvershootMagnitude: densityDiagnostics.maxOvershootMagnitude,
      stepsAt100: densityDiagnostics.overshootCountPerStep.filter(v => v >= 100).length,
      firstStepWithOvershoot: densityDiagnostics.overshootCountPerStep.findIndex(v => v > 0) + 1,
    },
    numericalMetrics,
  };
});

writeFileSync('results/overshoot-compare.json', JSON.stringify(results, null, 2));
console.log('Wrote results/overshoot-compare.json');
