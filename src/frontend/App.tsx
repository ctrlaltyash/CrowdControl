/* ─────────────────────────────────────────────────────────────
   CrowdSim Premium Frontend — Elite Safety Analytics Platform
   ───────────────────────────────────────────────────────────── */

import { useRef, useEffect, useState, useCallback, type PointerEvent } from 'react';
import { AlertTriangle, Layers3 } from 'lucide-react';
import { renderHeatmapFluid } from '../backend/engine/colormap';
import { buildBottleneckScenario, buildStadiumScenario } from '../backend/engine/scenarios';
import { CellType, SimParams, SimStatus, SimulatorState, HazardAlert } from '../backend/engine/types';
import { CrowdSimulator } from '../backend/engine/simulator';
import {
  ControlPanel,
  Header,
  LiveTelemetryCharts,
  Sidebar,
  SimulationCanvas,
  type LiveTelemetryPoint,
} from './components';

const DEFAULT_PARAMS: SimParams = {
  rows: 100,
  cols: 100,
  dt: 0.04,
  rhoMax: 6,
  rhoCrit: 2,
  spreadFactor: 0.1,
  pushFactor: 2.0,
  minSpeedFactor: 0.01,
  beta: 2.0,
  pressureA: 10.0,
  pressureK: 1.2,
  pressureN: 3.0,
  entryRate: 80.0,
  exitDrain: 0.35,
  renderEvery: 1,
  maxSteps: 10000,
  epsilon: 0.05,
  diffusivity: 0.1,
  riskAlpha: 0.8,
  riskDelta: 0.4,
  riskGamma: 0.25,
  riskEta: 1.0,
  camaraderieM: 1.0,
  camaraderieG: 0.4,
  camaraderieI: 0.6,
  riskWeight: 1.0,
  mitigationResponsiveness: 1.0,
};

type DrawTool = 'wall' | 'entry' | 'exit' | 'erase';
type ScenarioId = 'bottleneck' | 'stadium';
type LayoutCase = ScenarioId | 'custom';

const DRAW_TOOL_TO_CELL: Record<DrawTool, CellType> = {
  wall: CellType.WALL,
  entry: CellType.ENTRY,
  exit: CellType.EXIT,
  erase: CellType.EMPTY,
};

const SCENARIO_LABELS: Record<ScenarioId, string> = {
  bottleneck: 'Bottleneck',
  stadium: 'Festive Stampede',
};

const CUSTOM_CASE_LABEL = 'Custom Layout';
const HIGH_RISK_THRESHOLD = 0.65;

function getCaseLabel(layoutCase: LayoutCase): string {
  return layoutCase === 'custom' ? CUSTOM_CASE_LABEL : SCENARIO_LABELS[layoutCase];
}

/**
 * Aggregates the raw state vector into a single telemetry point for analytics tracking.
 * Calculates global maxima and spatial averages for both density and risk fields.
 */
function buildTelemetryPoint(state: SimulatorState, elapsed: number): LiveTelemetryPoint {
  let peakDensity = 0;
  let densityTotal = 0;
  let riskTotal = 0;
  let highRiskCells = 0;
  let activeCells = 0;
  let maxRisk = 0;
  let crowdMass = 0;

  for (let i = 0; i < state.rho.length; i += 1) {
    const cell = state.cells[i];
    // Ignore non-navigable cells during aggregation.
    if (cell === CellType.WALL || cell === CellType.MITIGATION) continue;

    const density = state.rho[i];
    const risk = state.risk[i];
    peakDensity = Math.max(peakDensity, density);
    maxRisk = Math.max(maxRisk, risk);
    densityTotal += density;
    riskTotal += risk;
    crowdMass += density;
    activeCells += 1;
    
    if (risk >= HIGH_RISK_THRESHOLD) highRiskCells += 1;
  }

  return {
    step: state.stepCount,
    elapsed,
    simTime: state.stepCount * state.params.dt,
    peakDensity,
    meanDensity: activeCells > 0 ? densityTotal / activeCells : 0,
    maxRisk,
    meanRisk: activeCells > 0 ? riskTotal / activeCells : 0,
    highRiskAreaPct: activeCells > 0 ? (highRiskCells / activeCells) * 100 : 0,
    crowdMass,
  };
}

export default function App() {
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const simulatorRef = useRef<CrowdSimulator | null>(null);
  const latestSimStateRef = useRef<SimulatorState | null>(null);
  const startTimeRef = useRef<number>(0);
  const editableCellsRef = useRef<Uint8Array | null>(null);
  const [status, setStatus] = useState<SimStatus>('idle');
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [alerts, setAlerts] = useState<HazardAlert[]>([]);
  const [preventionEnabled, setPreventionEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<'density' | 'risk'>('density');
  const [drawTool, setDrawTool] = useState<DrawTool>('wall');
  const [brushSize, setBrushSize] = useState(2);
  const [gridSize, setGridSize] = useState(100);
  const [fps, setFps] = useState(60);
  const [entryRate, setEntryRate] = useState(DEFAULT_PARAMS.entryRate);
  const [pressureFactor, setPressureFactor] = useState(DEFAULT_PARAMS.pushFactor);
  const [exitDrain, setExitDrain] = useState(DEFAULT_PARAMS.exitDrain);
  const [scenario, setScenario] = useState<ScenarioId>('bottleneck');
  const [layoutCase, setLayoutCase] = useState<LayoutCase>('bottleneck');
  const [telemetryCaseLabel, setTelemetryCaseLabel] = useState(getCaseLabel('bottleneck'));
  const [telemetryPoints, setTelemetryPoints] = useState<LiveTelemetryPoint[]>([]);
  const [telemetryHorizon, setTelemetryHorizon] = useState(DEFAULT_PARAMS.maxSteps * DEFAULT_PARAMS.dt);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const appRef = useRef<HTMLDivElement>(null);
  const previousGridSizeRef = useRef(gridSize);
  const viewModeRef = useRef(viewMode);

  const rows = gridSize;
  const cols = gridSize;

  const createCells = (size: number) => new Uint8Array(size * size);
  const [editableCells, setEditableCells] = useState<Uint8Array>(() => {
    const scen = buildBottleneckScenario(gridSize, gridSize);
    return new Uint8Array(scen.cells);
  });

  useEffect(() => {
    editableCellsRef.current = editableCells;
  }, [editableCells]);

  useEffect(() => {
    let activeCard: HTMLElement | null = null;
    let frameId = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const updateSpotlight = () => {
      if (!activeCard) {
        frameId = 0;
        return;
      }

      currentX += (targetX - currentX) * 0.22;
      currentY += (targetY - currentY) * 0.22;
      activeCard.style.setProperty('--spotlight-x', `${currentX.toFixed(1)}px`);
      activeCard.style.setProperty('--spotlight-y', `${currentY.toFixed(1)}px`);

      const isSettled = Math.abs(targetX - currentX) < 0.2 && Math.abs(targetY - currentY) < 0.2;
      frameId = isSettled ? 0 : requestAnimationFrame(updateSpotlight);
    };

    const startLoop = () => {
      if (frameId === 0) {
        frameId = requestAnimationFrame(updateSpotlight);
      }
    };

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const nextCard = event.target instanceof Element
        ? event.target.closest<HTMLElement>('.glass-card')
        : null;
      if (!nextCard) {
        activeCard = null;
        return;
      }

      const rect = nextCard.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;

      if (nextCard !== activeCard) {
        activeCard = nextCard;
        currentX = targetX;
        currentY = targetY;
        activeCard.style.setProperty('--spotlight-x', `${currentX.toFixed(1)}px`);
        activeCard.style.setProperty('--spotlight-y', `${currentY.toFixed(1)}px`);
      }

      startLoop();
    };

    const stopSpotlight = () => {
      activeCard = null;
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', stopSpotlight);
    window.addEventListener('blur', stopSpotlight);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', stopSpotlight);
      window.removeEventListener('blur', stopSpotlight);
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  const renderCellsPreview = useCallback((cells: Uint8Array, rows: number, cols: number) => {
    const canvas = liveCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const csx = canvas.width / cols;
    const csy = canvas.height / rows;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r * cols + c];
        if (cell === CellType.EMPTY) continue;

        if (cell === CellType.WALL) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
        } else if (cell === CellType.ENTRY) {
          ctx.fillStyle = 'rgba(0, 217, 255, 0.4)';
          ctx.fillRect(c * csx, r * csy, csx, csy);
        } else if (cell === CellType.EXIT) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.fillRect(c * csx, r * csy, csx, csy);
        } else if (cell === CellType.MITIGATION) {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
        }
      }
    }

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
    ctx.lineWidth = 1;
    const gridStep = 10;
    for (let c = 0; c <= cols; c += gridStep) {
      const x = c * csx;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r += gridStep) {
      const y = r * csy;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }, []);

  const prepareBackground = useCallback((cells: Uint8Array, rows: number, cols: number) => {
    const bg = document.createElement('canvas');
    bg.width = 10000;
    bg.height = 10000;
    const ctx = bg.getContext('2d')!;
    const csx = bg.width / cols;
    const csy = bg.height / rows;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, bg.width, bg.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r * cols + c];
        if (cell === CellType.WALL) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
        } else if (cell === CellType.ENTRY) {
          ctx.fillStyle = 'rgba(0, 217, 255, 0.18)';
          ctx.fillRect(c * csx, r * csy, csx, csy);
        } else if (cell === CellType.EXIT) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
          ctx.fillRect(c * csx, r * csy, csx, csy);
        }
      }
    }

    bgCanvasRef.current = bg;
  }, []);

  const loadScenario = useCallback(
    (nextScenario: ScenarioId) => {
      if (status === 'running' || status === 'initializing') return;
      const scen = nextScenario === 'bottleneck'
        ? buildBottleneckScenario(rows, cols)
        : buildStadiumScenario(rows, cols);
      const nextCells = new Uint8Array(scen.cells);
      setScenario(nextScenario);
      setLayoutCase(nextScenario);
      latestSimStateRef.current = null;
      setEditableCells(nextCells);
      setAlerts([]);
      setStep(0);
      setElapsed(0);
      prepareBackground(nextCells, scen.rows, scen.cols);
      requestAnimationFrame(() => renderCellsPreview(nextCells, scen.rows, scen.cols));
    },
    [prepareBackground, renderCellsPreview, rows, cols, status]
  );

  const paintCell = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (status === 'running' || status === 'initializing') return;
      if (event.type === 'pointermove' && event.buttons !== 1) return;
      const canvas = liveCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const c = Math.floor(((event.clientX - rect.left) / rect.width) * cols);
      const r = Math.floor(((event.clientY - rect.top) / rect.height) * rows);
      if (r < 0 || r >= rows || c < 0 || c >= cols) return;

      const radius = Math.max(0, brushSize - 1);
      const nextCells = new Uint8Array(editableCellsRef.current ?? editableCells);
      const targetCell = DRAW_TOOL_TO_CELL[drawTool];

      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (dr * dr + dc * dc > radius * radius + 0.5) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
          nextCells[rr * cols + cc] = targetCell;
        }
      }

      editableCellsRef.current = nextCells;
      setEditableCells(nextCells);
      setLayoutCase('custom');
      latestSimStateRef.current = null;
      renderCellsPreview(nextCells, rows, cols);
    },
    [brushSize, drawTool, editableCells, renderCellsPreview, status, rows, cols]
  );

  useEffect(() => {
    if (status === 'running' || status === 'initializing') return;
    prepareBackground(editableCells, rows, cols);
    renderCellsPreview(editableCells, rows, cols);
  }, [editableCells, prepareBackground, renderCellsPreview, status, rows, cols]);

  useEffect(() => {
    if (previousGridSizeRef.current === gridSize) return;
    previousGridSizeRef.current = gridSize;
    if (status === 'running' || status === 'initializing') return;
    loadScenario(scenario);
  }, [gridSize, loadScenario, scenario, status]);

  const drawSimulationState = useCallback((state: SimulatorState) => {
    const canvas = liveCanvasRef.current;
    if (!canvas || !bgCanvasRef.current) return false;

    const ctx = canvas.getContext('2d')!;
    const { rho, vx, vy, rows, cols, params, cells, alerts } = state;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgCanvasRef.current, 0, 0, canvas.width, canvas.height);

    const normRho = new Float64Array(rho.length);
    const normRisk = new Float64Array(rho.length);
    const invMax = 1 / params.rhoMax;
    for (let i = 0; i < rho.length; i++) {
      normRho[i] = rho[i] * invMax;
      normRisk[i] = state.risk[i];
    }

    renderHeatmapFluid(
      ctx,
      normRho,
      vx,
      vy,
      normRisk,
      rows,
      cols,
      canvas.width,
      canvas.height,
      viewModeRef.current,
    );

    const csx = canvas.width / cols;
    const csy = canvas.height / rows;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === CellType.MITIGATION) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
      }
    }

    for (const alert of alerts) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      const ax = alert.c * csx;
      const ay = alert.r * csy;
      const size = 40 * alert.intensity;
      ctx.strokeRect(ax - size / 2, ay - size / 2, size, size);
    }

    return true;
  }, []);

  useEffect(() => {
    viewModeRef.current = viewMode;
    if (latestSimStateRef.current) {
      drawSimulationState(latestSimStateRef.current);
    }
  }, [drawSimulationState, viewMode]);

  const handleSimUpdate = useCallback((state: SimulatorState) => {
    if (!drawSimulationState(state)) return;

    latestSimStateRef.current = state;
    const { stepCount, alerts } = state;
    const nextElapsed = Math.round((performance.now() - startTimeRef.current) / 100) / 10;
    setStep(stepCount);
    setAlerts([...alerts]);
    setElapsed(nextElapsed);
    setTelemetryPoints((points) => [...points, buildTelemetryPoint(state, nextElapsed)]);
  }, [drawSimulationState]);

  const handleStart = async () => {
    if (status === 'running') return;
    setStatus('initializing');
    setTelemetryCaseLabel(getCaseLabel(layoutCase));
    setTelemetryPoints([]);
    latestSimStateRef.current = null;
    const params = {
      ...DEFAULT_PARAMS,
      rows,
      cols,
      entryRate,
      exitDrain,
      pushFactor: pressureFactor,
      renderEvery: Math.max(1, Math.round(60 / fps)),
    };
    setTelemetryHorizon(params.maxSteps * params.dt);
    const simCells = new Uint8Array(editableCells);
    const sim = new CrowdSimulator(params, simCells, params.rows, params.cols);
    sim.preventionMode = preventionEnabled;
    sim.setCallbacks(handleSimUpdate, () => setStatus('finished'));
    simulatorRef.current = sim;
    prepareBackground(simCells, params.rows, params.cols);
    setStatus('running');
    startTimeRef.current = performance.now();
    sim.start();
  };

  const handleStop = () => {
    simulatorRef.current?.stop();
    setStatus('stopped');
  };

  const handleReset = () => {
    simulatorRef.current?.stop();
    simulatorRef.current = null;
    latestSimStateRef.current = null;
    setStatus('idle');
    setStep(0);
    setElapsed(0);
    setAlerts([]);
  };

  const handleClearLayout = () => {
    if (status === 'running' || status === 'initializing') return;
    const cells = createCells(rows);
    setEditableCells(cells);
    setLayoutCase('custom');
    latestSimStateRef.current = null;
    setAlerts([]);
    setStep(0);
    setElapsed(0);
  };

  return (
    <div ref={appRef} className="min-h-screen bg-obsdian-950 text-text-primary">
      <div
        role="presentation"
        onClick={() => setIsMenuOpen(false)}
        className={`fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ${isMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      <Header
        onSectionChange={() => setIsMenuOpen(false)}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        isMenuOpen={isMenuOpen}
      />

      <Sidebar
        isOpen={isMenuOpen}
        gridSize={gridSize}
        onGridSizeChange={setGridSize}
        fps={fps}
        onFpsChange={setFps}
        entryRate={entryRate}
        onEntryRateChange={setEntryRate}
        pressureFactor={pressureFactor}
        onPressureFactorChange={setPressureFactor}
        exitDrain={exitDrain}
        onExitDrainChange={setExitDrain}
        preventionEnabled={preventionEnabled}
        onPreventionChange={setPreventionEnabled}
        drawTool={drawTool}
        onDrawToolChange={setDrawTool}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        scenario={scenario}
        onScenarioChange={loadScenario}
        onClearLayout={handleClearLayout}
        isRunning={status === 'running'}
        status={status}
      />

      <main className="pt-24 transition-all duration-300 ease-out">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <section data-canvas-panel className="space-y-4">
            <div className="flex flex-col gap-4 rounded-[22px] border border-cyan-cyber/10 bg-white/[0.03] px-5 py-4 shadow-glow-lg backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.32em] text-text-muted">
                  Live command center
                </p>
                <h2 className="text-2xl font-bold text-gradient-indigo leading-tight lg:text-3xl">
                  CrowdSim Live Simulation
                </h2>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="status-pill bg-cyan-cyber/10 border border-cyan-cyber/20 text-cyan-cyber px-3 py-2">
                  <span className="block text-[10px] uppercase tracking-[0.28em]">Mode</span>
                  <strong className="block text-sm">{viewMode === 'density' ? 'Density View' : 'Risk Overlay'}</strong>
                </div>
                <div className="status-pill bg-emerald-math/10 border border-emerald-math/20 text-emerald-math px-3 py-2">
                  <span className="block text-[10px] uppercase tracking-[0.28em]">AI Mitigation</span>
                  <strong className="block text-sm">{preventionEnabled ? 'Enabled' : 'Disabled'}</strong>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border border-white/10 bg-obsdian-950/70 p-3 shadow-glow-lg sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-text-muted">Visualization Layer</p>
                <p className="mt-1 text-sm text-text-secondary">Switch the live canvas between density and risk fields.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-black/20 p-1">
                <button
                  type="button"
                  aria-pressed={viewMode === 'density'}
                  onClick={() => setViewMode('density')}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${viewMode === 'density' ? 'bg-accent text-white shadow-accent' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                >
                  <Layers3 size={16} />
                  Density
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'risk'}
                  onClick={() => setViewMode('risk')}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${viewMode === 'risk' ? 'bg-hazard-crit text-white shadow-glow-pink' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                >
                  <AlertTriangle size={16} />
                  Risk
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.95fr_1fr]">
              <SimulationCanvas
                canvasRef={liveCanvasRef}
                width={1120}
                height={760}
                isRunning={status === 'running'}
                onPaint={paintCell}
              />

              <div className="space-y-6">
                <ControlPanel
                  onPlay={handleStart}
                  onPause={handleStop}
                  onReset={handleReset}
                  isRunning={status === 'running'}
                  step={step}
                  elapsed={elapsed}
                />

                <div className="glass-card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm uppercase tracking-[0.3em] text-text-muted">System Metrics</p>
                    <span className="text-xs text-text-secondary">Live feed</span>
                  </div>
                  <div className="space-y-4">
                    <div className="metric-row">
                      <span>Iteration</span>
                      <strong>{step}</strong>
                    </div>
                    <div className="metric-row">
                      <span>Elapsed</span>
                      <strong>{Math.floor(elapsed / 60).toString().padStart(2, '0')}:{Math.floor(elapsed % 60).toString().padStart(2, '0')}</strong>
                    </div>
                    <div className="metric-row">
                      <span>Active Alerts</span>
                      <strong>{alerts.length}</strong>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <p className="text-sm uppercase tracking-[0.3em] text-text-muted mb-4">Command Console</p>
                  <div className="grid gap-3">
                    <div className="alert-chip bg-cyan-cyber/10 border border-cyan-cyber/20 text-cyan-cyber">
                      <span>Optimal throughput</span>
                      <strong>{Math.round(entryRate * 0.9)} ppl/min</strong>
                    </div>
                    <div className="alert-chip bg-emerald-math/10 border border-emerald-math/20 text-emerald-math">
                      <span>AI mitigation</span>
                      <strong>{preventionEnabled ? 'Reactive' : 'Standby'}</strong>
                    </div>
                    <div className="alert-chip bg-indigo-electric/10 border border-indigo-electric/20 text-indigo-electric">
                      <span>Target refresh</span>
                      <strong>{fps} fps</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <LiveTelemetryCharts
              points={telemetryPoints}
              caseLabel={telemetryCaseLabel}
              timeHorizon={telemetryHorizon}
              densityCritical={DEFAULT_PARAMS.rhoCrit}
              densityLimit={DEFAULT_PARAMS.rhoMax}
              riskThreshold={HIGH_RISK_THRESHOLD}
              isRunning={status === 'running'}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
