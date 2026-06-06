import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeRiskV3 } from './density.ts';
import { CellType, type SimParams } from './types.ts';
import { createSimParams } from '../../shared/simParams.ts';

function createArrays(size: number) {
  const rho = new Float64Array(size);
  const vx = new Float64Array(size);
  const vy = new Float64Array(size);
  const distance = new Float64Array(size);
  const cells = new Uint8Array(size);
  const risk = new Float64Array(size);
  return { rho, vx, vy, distance, cells, risk };
}

describe('computeRiskV3', () => {
  it('produces zero risk for empty or wall/mitigation cells', () => {
    const params: SimParams = createSimParams({ rows: 5, cols: 5 });
    const { rho, vx, vy, distance, cells, risk } = createArrays(25);
    for (let i = 0; i < 25; i++) {
      cells[i] = i % 2 === 0 ? CellType.WALL : CellType.MITIGATION;
      rho[i] = 5;
      vx[i] = 0.5;
      vy[i] = 0.5;
      distance[i] = 10;
    }
    computeRiskV3(rho, vx, vy, distance, cells, risk, params);
    for (let i = 0; i < 25; i += 1) {
      assert.equal(risk[i], 0);
    }
  });

  it('makes risk increase with distance when density and speed are fixed', () => {
    const params: SimParams = createSimParams({ rows: 10, cols: 10 });
    const { rho, vx, vy, distance, cells, risk } = createArrays(25);
    for (let i = 0; i < 25; i++) {
      cells[i] = CellType.EMPTY;
      rho[i] = 3;
      vx[i] = 0.8;
      vy[i] = 0.2;
    }

    distance[0] = 1;
    distance[1] = 5;
    distance[2] = 10;

    computeRiskV3(rho, vx, vy, distance, cells, risk, params);
    assert(risk[0] <= risk[1], `Expected risk[0] <= risk[1], got ${risk[0]} > ${risk[1]}`);
    assert(risk[1] <= risk[2], `Expected risk[1] <= risk[2], got ${risk[1]} > ${risk[2]}`);
  });

  it('makes risk increase as speed decreases for fixed density and distance', () => {
    const params: SimParams = createSimParams({ rows: 10, cols: 10, pushFactor: 2.0 });
    const { rho, vx, vy, distance, cells, risk } = createArrays(25);
    for (let i = 0; i < 25; i++) {
      cells[i] = CellType.EMPTY;
      rho[i] = 4;
      distance[i] = 15;
    }

    vx[0] = 1; vy[0] = 0;
    vx[1] = 0.5; vy[1] = 0;
    vx[2] = 0.1; vy[2] = 0;

    computeRiskV3(rho, vx, vy, distance, cells, risk, params);
    assert(risk[0] <= risk[1], `Expected risk[0] <= risk[1], got ${risk[0]} > ${risk[1]}`);
    assert(risk[1] <= risk[2], `Expected risk[1] <= risk[2], got ${risk[1]} > ${risk[2]}`);
  });

  it('produces higher risk for unreachable cells via distance sentinel', () => {
    const params: SimParams = createSimParams({ rows: 10, cols: 10 });
    const { rho, vx, vy, distance, cells, risk } = createArrays(25);
    for (let i = 0; i < 25; i++) {
      cells[i] = CellType.EMPTY;
      rho[i] = 2.5;
      vx[i] = 0.5;
      vy[i] = 0.5;
      distance[i] = 100000000;
    }

    computeRiskV3(rho, vx, vy, distance, cells, risk, params);
    assert(risk[0] > 0, `Expected nonzero risk for unreachable cell, got ${risk[0]}`);
  });
});
