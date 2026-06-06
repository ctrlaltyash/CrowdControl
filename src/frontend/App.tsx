/* ─────────────────────────────────────────────────────────────
   CrowdSim Premium Frontend — Elite Safety Analytics Platform
   ───────────────────────────────────────────────────────────── */

import { useRef, useEffect, useState, useCallback, type PointerEvent } from 'react';
import gsap from 'gsap';
import { renderHeatmapFluid } from '../backend/engine/colormap';
import { buildBottleneckScenario, buildStadiumScenario } from '../backend/engine/scenarios';
import { CellType, SimParams, SimStatus, SimulatorState, HazardAlert } from '../backend/engine/types';
import { CrowdSimulator } from '../backend/engine/simulator';
import {
  Header,
  Sidebar,
  Hero,
  FormulaShowcase,
  AnalyticsCards,
  AlertsPanel,
  SimulationCanvas,
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
  riskNormalization: 2.5,
  riskWeight: 1.0,
  mitigationResponsiveness: 1.0,
};

type DrawTool = 'wall' | 'entry' | 'exit' | 'erase';

const DRAW_TOOL_TO_CELL: Record<DrawTool, CellType> = {
  wall: CellType.WALL,
  entry: CellType.ENTRY,
  exit: CellType.EXIT,
  erase: CellType.EMPTY,
};

export default function App() {
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const simulatorRef = useRef<CrowdSimulator | null>(null);
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
  const [scenario, setScenario] = useState<'bottleneck' | 'stadium'>('bottleneck');
  const [activeSection, setActiveSection] = useState<string>('canvas');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const appRef = useRef<HTMLDivElement>(null);
  const viewModeRef = useRef(viewMode);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

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
    (nextScenario: 'bottleneck' | 'stadium') => {
      if (status === 'running' || status === 'initializing') return;
      const scen = nextScenario === 'bottleneck'
        ? buildBottleneckScenario(rows, cols)
        : buildStadiumScenario(rows, cols);
      const nextCells = new Uint8Array(scen.cells);
      setScenario(nextScenario);
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
    if (status === 'running' || status === 'initializing') return;
    loadScenario(scenario);
  }, [gridSize, loadScenario, scenario, status]);

  const handleSimUpdate = useCallback((state: SimulatorState) => {
    const canvas = liveCanvasRef.current;
    if (!canvas || !bgCanvasRef.current || !simulatorRef.current) return;

    const ctx = canvas.getContext('2d')!;
    const { rho, vx, vy, rows, cols, params, cells, stepCount, alerts } = state;

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

    setStep(stepCount);
    setAlerts([...alerts]);
    setElapsed(Math.round((performance.now() - startTimeRef.current) / 100) / 10);
  }, []);

  const handleStart = async () => {
    if (status === 'running') return;
    setStatus('initializing');
    const params = {
      ...DEFAULT_PARAMS,
      rows,
      cols,
      entryRate,
      exitDrain,
      pushFactor: pressureFactor,
      renderEvery: Math.max(1, Math.round(60 / fps)),
    };
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
    setStatus('idle');
    setStep(0);
    setElapsed(0);
    setAlerts([]);
  };

  const handleClearLayout = () => {
    if (status === 'running' || status === 'initializing') return;
    const cells = createCells(rows);
    setEditableCells(cells);
    setAlerts([]);
    setStep(0);
    setElapsed(0);
  };

  useEffect(() => {
    if (!appRef.current) return;
    const header = appRef.current.querySelector('[data-header]') as HTMLElement;
    const sidebar = appRef.current.querySelector('[data-sidebar]') as HTMLElement;
    const cards = appRef.current.querySelectorAll('[data-sidebar-card]');
    const mainCanvas = appRef.current.querySelector('[data-canvas-panel]') as HTMLElement;

    const timeline = gsap.timeline();

    timeline
      .from(header, { y: -100, opacity: 0, duration: 0.8, ease: 'power3.out' })
      .from(sidebar, { x: -260, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .from(cards, { x: -24, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'back.out(1.4)' }, '-=0.64')
      .from(mainCanvas, { opacity: 0, scale: 1.05, duration: 0.9, ease: 'power3.out' }, '-=0.6');
  }, []);

  return (
    <div ref={appRef} className="min-h-screen bg-obsdian-950 text-text-primary">
      <Header
        activeSection={activeSection}
        onSectionChange={(section) => {
          setActiveSection(section);
          setIsMenuOpen(false);
        }}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        isMenuOpen={isMenuOpen}
      />

      <Sidebar
        activeSection={activeSection}
        onSectionChange={(section) => {
          setActiveSection(section);
          setIsMenuOpen(false);
        }}
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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        drawTool={drawTool}
        onDrawToolChange={setDrawTool}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        scenario={scenario}
        onScenarioChange={loadScenario}
        onClearLayout={handleClearLayout}
        onPlay={handleStart}
        onPause={handleStop}
        onReset={handleReset}
        isRunning={status === 'running'}
        status={status}
        step={step}
        elapsed={elapsed}
      />

      <main className="lg:ml-72 pt-24 transition-all duration-300 ease-out">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {activeSection === 'canvas' && (
            <section data-canvas-panel className="space-y-6">
              <div className="glass-card p-6 border border-cyan-cyber/10 shadow-glow-lg">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-text-muted mb-3">
                      Live command center
                    </p>
                    <h2 className="text-3xl lg:text-4xl font-bold text-gradient-indigo leading-tight">
                      CrowdSim Live Simulation
                    </h2>
                    <p className="mt-3 max-w-2xl text-text-secondary">
                      Real-time density, risk, and emergency flow diagnostics in a precision control dashboard.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="status-pill bg-cyan-cyber/10 border border-cyan-cyber/20 text-cyan-cyber">
                      <span>Mode</span>
                      <strong>{viewMode === 'density' ? 'Density View' : 'Risk Overlay'}</strong>
                    </div>
                    <div className="status-pill bg-emerald-math/10 border border-emerald-math/20 text-emerald-math">
                      <span>AI Mitigation</span>
                      <strong>{preventionEnabled ? 'Enabled' : 'Disabled'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.95fr_1fr] gap-6">
                <SimulationCanvas
                  canvasRef={liveCanvasRef}
                  width={1120}
                  height={760}
                  isRunning={status === 'running'}
                />

                <div className="space-y-6">
                  <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
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
            </section>
          )}

          {activeSection === 'formulas' && (
            <div data-animate>
              <FormulaShowcase />
            </div>
          )}

          {activeSection === 'analytics' && (
            <div data-animate>
              <AnalyticsCards />
            </div>
          )}

          {activeSection === 'alerts' && (
            <div className="w-full py-12" data-animate>
              <AlertsPanel />
            </div>
          )}

          {activeSection === 'export' && (
            <div className="w-full py-12" data-animate>
              <div className="glass-card p-8">
                <h2 className="text-3xl font-bold text-gradient-indigo mb-4">Data Export</h2>
                <p className="text-text-secondary mb-6">
                  Generate reports and export simulation data for external analysis.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="btn-primary p-4 text-left flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Export Metrics</p>
                      <p className="text-sm text-text-secondary">CSV format</p>
                    </div>
                    <span className="text-2xl">↓</span>
                  </button>
                  <button className="btn-secondary p-4 text-left flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Export Report</p>
                      <p className="text-sm text-text-secondary">PDF format</p>
                    </div>
                    <span className="text-2xl">↓</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
