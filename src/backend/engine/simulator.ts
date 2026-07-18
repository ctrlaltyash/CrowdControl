/* ─────────────────────────────────────────────────────────────
   Simulator V4 Controller — Analytics & Mitigation Integration

   Core orchestrator for the simulation engine. Integrates the 
   direction field solver, density evolution, hazard analytics, 
   and dynamic mitigation modules into a cohesive lifecycle.
   ───────────────────────────────────────────────────────────── */

import { SimParams, SimulatorState } from './types';
import { computeDirectionField } from './solver';
import { stepDensityV3, computeRiskV3 } from './density';
import { detectHazards as detectAnalyticsHazards } from './analytics';
import { calculateIntervention, detectMitigationHazards, type Intervention } from './mitigation';
import { createSimParams } from '../../shared/simParams';

export type SimulatorUpdateCallback = (state: SimulatorState) => void;

/** Primary execution controller for crowd dynamics simulation */
export class CrowdSimulator {
  public state: SimulatorState;
  public displayBuffer: Float64Array;
  public preventionMode: boolean = false; /** Enables dynamic mitigation interventions */
  private directionVx: Float64Array;
  private directionVy: Float64Array;
  
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
    // Compute static potential field and resulting velocity vectors
    const dir = computeDirectionField(cells, resolvedRows, resolvedCols);
    this.directionVx = dir.vx;
    this.directionVy = dir.vy;
    
    const actualVx = new Float64Array(N);
    const actualVy = new Float64Array(N);
    const push = Math.max(0, resolvedParams.pushFactor);
    for (let i = 0; i < N; i++) {
      actualVx[i] = dir.vx[i] * push;
      actualVy[i] = dir.vy[i] * push;
    }

    // Initialize global simulation state container
    this.state = {
      rho: new Float64Array(N),
      rhoPrev: new Float64Array(N),
      risk: new Float64Array(N),
      vx: actualVx,
      vy: actualVy,
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

  /** Registers external callbacks for state updates and termination events */
  public setCallbacks(onUpdate: SimulatorUpdateCallback, onFinished: () => void) {
    this.onUpdate = onUpdate;
    this.onFinished = onFinished;
  }

  private mergeAlerts(newHazards: SimulatorState['alerts']) {
    const activeAlerts = this.state.alerts.filter(a => !a.mitigated);
    const filteredNew = newHazards.filter(nh => {
      return !activeAlerts.some(ea => {
        const dr = ea.r - nh.r;
        const dc = ea.c - nh.c;
        return dr * dr + dc * dc < 64 && ea.type === nh.type;
      });
    });
    this.state.alerts = [...filteredNew, ...this.state.alerts].slice(0, 15);
  }

  private applyInterventions(interventions: Intervention[]) {
    if (interventions.length === 0) return;

    for (const mod of interventions) {
      const k = mod.r * this.state.cols + mod.c;
      this.state.cells[k] = mod.type;
      this.state.rho[k] = 0;
      this.state.rhoPrev[k] = 0;
      this.state.risk[k] = 0;
    }

    const dir = computeDirectionField(this.state.cells, this.state.rows, this.state.cols);
    this.directionVx = dir.vx;
    this.directionVy = dir.vy;
    this.state.distanceToExit = dir.dist;

    const push = Math.max(0, this.state.params.pushFactor);
    for (let i = 0; i < this.state.vx.length; i++) {
      this.state.vx[i] = this.directionVx[i] * push;
      this.state.vy[i] = this.directionVy[i] * push;
    }
  }

  /** Initiates the main simulation loop */
  public start() {
    if (this.state.running) return;
    this.state.running = true;
    this.loop();
  }

  /** Halts simulation execution and cancels pending animation frames */
  public stop() {
    this.state.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
  }

  /** Advances the simulation state by one full time step */
  public step() {
    try {
      const STEPS = 8; // Number of fractional time steps for numerical stability
      for (let i = 0; i < STEPS; i++) {
        if (this.state.stepCount >= this.state.params.maxSteps) {
          this.state.running = false; // Terminate if maximum step count is reached
          break;
        }

        const current = this.state.rho;
        const next = this.state.rhoPrev;
        // Evolve density field using upwind advection-diffusion scheme
        stepDensityV3(
          current,
          next,
          this.directionVx,
          this.directionVy,
          this.state.cells,
          this.state.params,
          undefined,
          this.state.vx,
          this.state.vy,
        );
        this.state.rho = next;
        this.state.rhoPrev = current;
        this.state.stepCount++;

        // ─── Analytics Pass (Every 20 steps) ───
        // Evaluate active grid for emergent hazard conditions
        if (this.state.stepCount % 20 === 0) {
          const newHazards = detectAnalyticsHazards(
            this.state.rho,
            this.state.vx,
            this.state.vy,
            this.state.rows,
            this.state.cols,
            this.state.params,
            this.state.stepCount,
          );

          this.mergeAlerts(newHazards);
        }
      }

      // Evaluate comprehensive risk functional based on current density and velocity
      computeRiskV3(
        this.state.rho,
        this.state.vx,
        this.state.vy,
        this.state.distanceToExit,
        this.state.cells,
        this.state.risk,
        this.state.params,
      );

      if (this.preventionMode && this.state.stepCount > 0 && this.state.stepCount % 40 === 0) {
        const mitigationHazards = detectMitigationHazards(
          this.state.rho,
          this.state.vx,
          this.state.vy,
          this.state.risk,
          this.state.rows,
          this.state.cols,
          this.state.cells,
          this.state.params,
          this.state.stepCount,
          {
            responsiveness: this.state.params.mitigationResponsiveness,
            riskThreshold: 0.62,
          },
        );

        const interventions = calculateIntervention(
          mitigationHazards,
          this.state.cells,
          this.state.vx,
          this.state.vy,
          this.state.rows,
          this.state.cols,
          this.state.rho,
          { responsiveness: this.state.params.mitigationResponsiveness },
        );

        this.applyInterventions(interventions);
        this.mergeAlerts(mitigationHazards);

        if (interventions.length > 0) {
          computeRiskV3(
            this.state.rho,
            this.state.vx,
            this.state.vy,
            this.state.distanceToExit,
            this.state.cells,
            this.state.risk,
            this.state.params,
          );
        }
      }

      if (this.onUpdate) this.onUpdate(this.state);
      return true;
    } catch (err) {
      console.error('Simulator Error:', err); // Log execution failure details
      this.stop();
      if (this.onFinished) this.onFinished();
      return false;
    }
  }

  /** Recursive execution frame driver */
  private loop = () => {
    if (!this.state.running) return;
    const success = this.step();
    
    if (success && this.state.running) {
      this.animId = requestAnimationFrame(this.loop);
    } else if (this.onFinished) {
      this.onFinished();
    }
  };
}
