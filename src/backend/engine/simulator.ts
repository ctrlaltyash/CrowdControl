/* ─────────────────────────────────────────────────────────────
   Simulator V4 Controller — Analytics & Mitigation Integration
   ───────────────────────────────────────────────────────────── */

import { SimParams, SimulatorState } from './types';
import { computeDirectionField } from './solver';
import { stepDensityV3, computeRiskV3 } from './density';
import { detectHazards } from './analytics';
import { calculateIntervention } from './mitigation';
import { createSimParams } from '../../shared/simParams';

export type SimulatorUpdateCallback = (state: SimulatorState) => void;
export class CrowdSimulator {
  public state: SimulatorState;
  public displayBuffer: Float64Array;
  public preventionMode: boolean = false;
  
  private animId: number = 0;
  private onUpdate: SimulatorUpdateCallback | null = null;
  private onFinished: (() => void) | null = null;

  constructor(paramsInput: Partial<SimParams>, cells: Uint8Array, rows?: number, cols?: number) {
    const params = createSimParams(paramsInput);
    const resolvedRows = rows ?? params.rows;
    const resolvedCols = cols ?? params.cols;
    const N = resolvedRows * resolvedCols;
    if (cells.length !== N) {
      throw new Error(`Cell grid size ${cells.length} does not match ${resolvedRows}x${resolvedCols}`);
    }

    const resolvedParams = { ...params, rows: resolvedRows, cols: resolvedCols };
    const dir = computeDirectionField(cells, resolvedRows, resolvedCols);
    
    this.state = {
      rho: new Float64Array(N),
      rhoPrev: new Float64Array(N),
      risk: new Float64Array(N),
      vx: dir.vx,
      vy: dir.vy,
      distanceToExit: dir.dist,
      cells: new Uint8Array(cells),
      params: resolvedParams,
      stepCount: 0,
      running: false,
      rows: resolvedRows,
      cols: resolvedCols,
      alerts: [],
    };

    this.displayBuffer = new Float64Array(N);
  }

  public setCallbacks(onUpdate: SimulatorUpdateCallback, onFinished: () => void) {
    this.onUpdate = onUpdate;
    this.onFinished = onFinished;
  }

  public start() {
    if (this.state.running) return;
    this.state.running = true;
    this.loop();
  }

  public stop() {
    this.state.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
  }

  private loop = () => {
    if (!this.state.running) return;

    try {
      const STEPS = 8;
      for (let i = 0; i < STEPS; i++) {
        if (this.state.stepCount >= this.state.params.maxSteps) {
          this.state.running = false;
          break;
        }

        const current = this.state.rho;
        const next = this.state.rhoPrev;
        stepDensityV3(current, next, this.state.vx, this.state.vy, this.state.cells, this.state.params);
        this.state.rho = next;
        this.state.rhoPrev = current;
        this.state.stepCount++;

        // ─── Analytics Pass (Every 20 steps) ───
        if (this.state.stepCount % 20 === 0) {
          const newHazards = detectHazards(
            this.state.rho,
            this.state.vx,
            this.state.vy,
            this.state.rows,
            this.state.cols,
            this.state.params,
            this.state.stepCount,
          );

          const activeAlerts = this.state.alerts.filter(a => !a.mitigated);
          const filteredNew = newHazards.filter(nh => {
            return !activeAlerts.some(ea => {
              const dr = ea.r - nh.r;
              const dc = ea.c - nh.c;
              return dr * dr + dc * dc < 64;
            });
          });
          this.state.alerts = [...filteredNew, ...this.state.alerts].slice(0, 15);

          if (this.preventionMode) {
            const unmitigated = this.state.alerts.filter(a => !a.mitigated);
            const interventions = calculateIntervention(
              unmitigated,
              this.state.cells,
              this.state.vx,
              this.state.vy,
              this.state.rows,
              this.state.cols,
              this.state.rho,
              { responsiveness: this.state.params.mitigationResponsiveness },
            );

            if (interventions.length > 0) {
              for (const mod of interventions) {
                this.state.cells[mod.r * this.state.cols + mod.c] = mod.type;
              }

              const dir = computeDirectionField(this.state.cells, this.state.rows, this.state.cols);
              this.state.vx = dir.vx;
              this.state.vy = dir.vy;
              this.state.distanceToExit = dir.dist;
            }
          }
        }
      }

      computeRiskV3(
        this.state.rho,
        this.state.vx,
        this.state.vy,
        this.state.distanceToExit,
        this.state.cells,
        this.state.risk,
        this.state.params,
      );

      if (this.onUpdate) this.onUpdate(this.state);
      if (this.state.running) {
        this.animId = requestAnimationFrame(this.loop);
      } else if (this.onFinished) {
        this.onFinished();
      }
    } catch (err) {
      console.error('Simulator Error:', err);
      this.stop();
      if (this.onFinished) this.onFinished();
    }
  };
}
