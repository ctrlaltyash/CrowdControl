import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSimParams, DEFAULT_PARAMS } from '../../shared/simParams.ts';
import { stepDensityV3 } from './density.ts';
import { computeDirectionField } from './solver.ts';
import { CellType, type SimParams } from './types.ts';

const INVARIANT_GRID = Object.freeze({
  rows: 12,
  cols: 14,
});

const MASS_CONSERVATION_STEPS = 48;
const BOUNDS_STEPS = 80;
const DETERMINISM_STEPS = 64;

const MASS_RELATIVE_TOLERANCE = 1e-10;
const DENSITY_BOUND_TOLERANCE = 1e-12;
const DETERMINISM_TOLERANCE = 0;

const INITIAL_DENSITY_BASE_FRACTION = 0.08;
const INITIAL_DENSITY_VARIATION_FRACTION = 0.05;
const DENSITY_PATTERN_PERIOD = 11;

function createEmptyCells(rows: number, cols: number): Uint8Array {
  return new Uint8Array(rows * cols);
}

function createFlowCells(rows: number, cols: number): Uint8Array {
  const cells = createEmptyCells(rows, cols);
  const midRow = Math.floor(rows / 2);
  cells[midRow * cols + 1] = CellType.ENTRY;
  cells[midRow * cols + cols - 2] = CellType.EXIT;
  return cells;
}

function createControlledDensity(rows: number, cols: number, rhoMax: number): Float64Array {
  const rho = new Float64Array(rows * cols);
  const baseDensity = rhoMax * INITIAL_DENSITY_BASE_FRACTION;
  const densityVariation = rhoMax * INITIAL_DENSITY_VARIATION_FRACTION;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const patternValue = ((r * 3 + c * 5) % DENSITY_PATTERN_PERIOD) / DENSITY_PATTERN_PERIOD;
      rho[r * cols + c] = baseDensity + densityVariation * patternValue;
    }
  }

  return rho;
}

function sumDensity(rho: Float64Array): number {
  let total = 0;
  for (const value of rho) total += value;
  return total;
}

function stepMany(
  initialDensity: Float64Array,
  cells: Uint8Array,
  vx: Float64Array,
  vy: Float64Array,
  params: SimParams,
  steps: number,
  onStep?: (rho: Float64Array, step: number) => void,
): Float64Array {
  let curr = new Float64Array(initialDensity);
  let next = new Float64Array(initialDensity.length);

  for (let step = 1; step <= steps; step += 1) {
    stepDensityV3(curr, next, vx, vy, cells, params);
    onStep?.(next, step);

    const swap = curr;
    curr = next;
    next = swap;
  }

  return curr;
}

function assertDensityBounds(rho: Float64Array, params: SimParams, step: number): void {
  for (let i = 0; i < rho.length; i += 1) {
    const value = rho[i];
    assert.ok(Number.isFinite(value), `Non-finite density at step ${step}, index ${i}: ${value}`);
    assert.ok(
      value >= -DENSITY_BOUND_TOLERANCE,
      `Negative density at step ${step}, index ${i}: ${value}`,
    );
    assert.ok(
      value <= params.rhoMax + DENSITY_BOUND_TOLERANCE,
      `Density exceeds rhoMax at step ${step}, index ${i}: value=${value}, rhoMax=${params.rhoMax}`,
    );
  }
}

function assertFieldsClose(actual: Float64Array, expected: Float64Array, tolerance: number): void {
  assert.equal(actual.length, expected.length);

  for (let i = 0; i < actual.length; i += 1) {
    const diff = Math.abs(actual[i] - expected[i]);
    assert.ok(
      diff <= tolerance,
      `Density field mismatch at index ${i}: actual=${actual[i]}, expected=${expected[i]}, diff=${diff}, tolerance=${tolerance}`,
    );
  }
}

describe('density stepping invariants', () => {
  it('approximately conserves mass without entries, exits, mitigation, or active flow sources', () => {
    const params = createSimParams({
      rows: INVARIANT_GRID.rows,
      cols: INVARIANT_GRID.cols,
      entryRate: 0,
      exitDrain: 0,
      pushFactor: 0,
      pressureK: 0,
    });
    const cells = createEmptyCells(params.rows, params.cols);
    const vx = new Float64Array(cells.length);
    const vy = new Float64Array(cells.length);
    const initialDensity = createControlledDensity(params.rows, params.cols, DEFAULT_PARAMS.rhoMax);

    const initialMass = sumDensity(initialDensity);
    const finalDensity = stepMany(initialDensity, cells, vx, vy, params, MASS_CONSERVATION_STEPS);
    const finalMass = sumDensity(finalDensity);
    const absoluteError = Math.abs(finalMass - initialMass);
    const relativeError = absoluteError / Math.max(initialMass, Number.EPSILON);
    const errorPercent = relativeError * 100;

    assert.ok(
      relativeError <= MASS_RELATIVE_TOLERANCE,
      [
        `Mass conservation failed after ${MASS_CONSERVATION_STEPS} steps.`,
        `initialMass=${initialMass.toPrecision(16)}`,
        `finalMass=${finalMass.toPrecision(16)}`,
        `absoluteError=${absoluteError.toExponential(6)}`,
        `errorPercent=${errorPercent.toExponential(6)}%`,
        `tolerancePercent=${(MASS_RELATIVE_TOLERANCE * 100).toExponential(6)}%`,
      ].join('\n'),
    );
  });

  it('keeps density finite, non-negative, and bounded by rhoMax', () => {
    const params = createSimParams({
      rows: INVARIANT_GRID.rows,
      cols: INVARIANT_GRID.cols,
    });
    const cells = createFlowCells(params.rows, params.cols);
    const direction = computeDirectionField(cells, params.rows, params.cols);
    const initialDensity = createControlledDensity(params.rows, params.cols, DEFAULT_PARAMS.rhoMax);

    assertDensityBounds(initialDensity, params, 0);
    stepMany(initialDensity, cells, direction.vx, direction.vy, params, BOUNDS_STEPS, (rho, step) => {
      assertDensityBounds(rho, params, step);
    });
  });

  it('spreads isolated pressure spikes instead of reinforcing them', () => {
    const params = createSimParams({
      rows: 9,
      cols: 9,
      entryRate: 0,
      exitDrain: 0,
      diffusivity: 0,
      spreadFactor: 0,
      pushFactor: 0,
      pressureA: 0,
      pressureK: 1.2,
      pressureN: 2,
      rhoCrit: 1,
    });
    const cells = createEmptyCells(params.rows, params.cols);
    const vx = new Float64Array(cells.length);
    const vy = new Float64Array(cells.length);
    const initialDensity = new Float64Array(cells.length);
    const nextDensity = new Float64Array(cells.length);
    const center = Math.floor(params.rows / 2) * params.cols + Math.floor(params.cols / 2);

    initialDensity[center] = params.rhoCrit * 3;
    const initialMass = sumDensity(initialDensity);
    stepDensityV3(initialDensity, nextDensity, vx, vy, cells, params);

    assert.ok(
      nextDensity[center] < initialDensity[center],
      `Pressure spike was not relaxed: before=${initialDensity[center]}, after=${nextDensity[center]}`,
    );

    for (const neighbor of [center - params.cols, center + params.cols, center - 1, center + 1]) {
      assert.ok(nextDensity[neighbor] > 0, `Pressure did not spread into neighbor ${neighbor}`);
    }

    const finalMass = sumDensity(nextDensity);
    assert.ok(
      Math.abs(finalMass - initialMass) <= MASS_RELATIVE_TOLERANCE,
      `Pressure spreading changed mass: initial=${initialMass}, final=${finalMass}`,
    );
  });

  it('accepts a diagnostics object and reports overshoot stats during density stepping', () => {
    const params = createSimParams({
      rows: INVARIANT_GRID.rows,
      cols: INVARIANT_GRID.cols,
      entryRate: 0,
      exitDrain: 0,
      diffusivity: 0,
      pushFactor: 0,
      pressureK: 0,
      pressureA: 0,
      pressureN: 1,
      rhoCrit: 1,
      dt: 0.1,
    });
    const cells = createEmptyCells(params.rows, params.cols);
    const direction = computeDirectionField(cells, params.rows, params.cols);
    const initialDensity = createControlledDensity(params.rows, params.cols, DEFAULT_PARAMS.rhoMax * 0.1);
    const diagnostics = {
      overshootCount: 0,
      totalOvershootMagnitude: 0,
      maxOvershootMagnitude: 0,
    };

    const nextDensity = new Float64Array(initialDensity.length);
    stepDensityV3(initialDensity, nextDensity, direction.vx, direction.vy, cells, params, diagnostics);

    assert.equal(diagnostics.overshootCount, 0);
    assert.equal(diagnostics.totalOvershootMagnitude, 0);
    assert.equal(diagnostics.maxOvershootMagnitude, 0);
  });

  it('is deterministic for identical params, cells, and initial density', () => {
    const params = createSimParams({
      rows: INVARIANT_GRID.rows,
      cols: INVARIANT_GRID.cols,
    });
    const cells = createFlowCells(params.rows, params.cols);
    const direction = computeDirectionField(cells, params.rows, params.cols);
    const initialDensity = createControlledDensity(params.rows, params.cols, DEFAULT_PARAMS.rhoMax);

    const firstRun = stepMany(initialDensity, cells, direction.vx, direction.vy, params, DETERMINISM_STEPS);
    const secondRun = stepMany(initialDensity, cells, direction.vx, direction.vy, params, DETERMINISM_STEPS);

    assertFieldsClose(firstRun, secondRun, DETERMINISM_TOLERANCE);
  });
});
