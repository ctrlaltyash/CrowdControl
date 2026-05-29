/* ─────────────────────────────────────────────────────────────
   StampedePredictor V6 — Safety Analytics & AI Prevention
   ───────────────────────────────────────────────────────────── */

import { useRef, useEffect, useState, useCallback, type PointerEvent } from 'react';
import { renderHeatmapFluid } from '../backend/engine/colormap';
import { buildBottleneckScenario, buildStadiumScenario } from '../backend/engine/scenarios';
import { CellType, SimParams, SimStatus, SimulatorState, HazardAlert } from '../backend/engine/types';
import { CrowdSimulator } from '../backend/engine/simulator';

const DEFAULT_PARAMS: SimParams = {
  rows: 100, cols: 100,
  dt: 0.04,
  rhoMax: 6, // Lowered to trigger effects earlier
  rhoCrit: 2.5, // Lowered to fill room faster
  spreadFactor: 0.1,
  pushFactor: 2.0,
  minSpeedFactor: 0.01,
  beta: 2.0,
  pressureA: 10.0,
  pressureK: 1.2,
  pressureN: 3.0,
  entryRate: 80.0, // Total crowd inflow across all entries
  exitDrain: 0.35, // Restricted exit to cause pile-up
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
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const editableCellsRef = useRef<Uint8Array | null>(null);
  const [status, setStatus] = useState<SimStatus>('idle');
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [alerts, setAlerts] = useState<HazardAlert[]>([]);
  const [preventionEnabled, setPreventionEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<'density' | 'risk'>('density');
  const [drawTool, setDrawTool] = useState<DrawTool>('wall');
  const [brushSize, setBrushSize] = useState(2);
  const viewModes: Array<'density' | 'risk'> = ['density', 'risk'];
  const [editableCells, setEditableCells] = useState<Uint8Array>(() => {
    const scen = buildBottleneckScenario(DEFAULT_PARAMS.rows, DEFAULT_PARAMS.cols);
    return new Uint8Array(scen.cells);
  });

  const [entryRate, setEntryRate] = useState(DEFAULT_PARAMS.entryRate);
  const [scenario, setScenario] = useState<'bottleneck' | 'stadium'>('bottleneck');

  const simulatorRef = useRef<CrowdSimulator | null>(null);
  const startTimeRef = useRef(0);
  const viewModeRef = useRef(viewMode);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);
  useEffect(() => { editableCellsRef.current = editableCells; }, [editableCells]);

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
          ctx.fillStyle = 'rgba(59, 130, 246, 0.65)';
          ctx.fillRect(c * csx, r * csy, csx, csy);
        } else if (cell === CellType.EXIT) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.75)';
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
    bg.width = 10000; bg.height = 10000;
    const ctx = bg.getContext('2d')!;
    const csx = bg.width / cols; const csy = bg.height / rows;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, bg.width, bg.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r * cols + c];
        if (cell === CellType.WALL) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
        } else if (cell === CellType.ENTRY) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.28)';
          ctx.fillRect(c * csx, r * csy, csx, csy);
        } else if (cell === CellType.EXIT) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.34)';
          ctx.fillRect(c * csx, r * csy, csx, csy);
        }
      }
    }
    bgCanvasRef.current = bg;
  }, []);

  const loadScenario = useCallback((nextScenario: 'bottleneck' | 'stadium') => {
    if (status === 'running' || status === 'initializing') return;
    const scen = nextScenario === 'bottleneck'
      ? buildBottleneckScenario(DEFAULT_PARAMS.rows, DEFAULT_PARAMS.cols)
      : buildStadiumScenario(DEFAULT_PARAMS.rows, DEFAULT_PARAMS.cols);
    const nextCells = new Uint8Array(scen.cells);
    setScenario(nextScenario);
    setEditableCells(nextCells);
    setAlerts([]);
    setStep(0);
    setElapsed(0);
    prepareBackground(nextCells, scen.rows, scen.cols);
    requestAnimationFrame(() => renderCellsPreview(nextCells, scen.rows, scen.cols));
  }, [prepareBackground, renderCellsPreview, status]);

  const paintCell = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    if (status === 'running' || status === 'initializing') return;
    const canvas = liveCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const c = Math.floor(((event.clientX - rect.left) / rect.width) * DEFAULT_PARAMS.cols);
    const r = Math.floor(((event.clientY - rect.top) / rect.height) * DEFAULT_PARAMS.rows);
    if (r < 0 || r >= DEFAULT_PARAMS.rows || c < 0 || c >= DEFAULT_PARAMS.cols) return;

    const radius = Math.max(0, brushSize - 1);
    const nextCells = new Uint8Array(editableCellsRef.current ?? editableCells);
    const targetCell = DRAW_TOOL_TO_CELL[drawTool];

    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dr * dr + dc * dc > radius * radius + 0.5) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= DEFAULT_PARAMS.rows || cc < 0 || cc >= DEFAULT_PARAMS.cols) continue;
        nextCells[rr * DEFAULT_PARAMS.cols + cc] = targetCell;
      }
    }

    editableCellsRef.current = nextCells;
    setEditableCells(nextCells);
    renderCellsPreview(nextCells, DEFAULT_PARAMS.rows, DEFAULT_PARAMS.cols);
  }, [brushSize, drawTool, editableCells, renderCellsPreview, status]);

  useEffect(() => {
    if (status === 'running' || status === 'initializing') return;
    prepareBackground(editableCells, DEFAULT_PARAMS.rows, DEFAULT_PARAMS.cols);
    renderCellsPreview(editableCells, DEFAULT_PARAMS.rows, DEFAULT_PARAMS.cols);
  }, [editableCells, prepareBackground, renderCellsPreview, status]);

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
            const r = Math.floor(i / cols); const c = i % cols;
            ctx.fillStyle = '#f59e0b'; // Distinct Orange for AI barriers
            ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
        }
    }

    for (const alert of alerts) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        const ax = alert.c * csx;
        const ay = alert.r * csy;
        const size = 40 * alert.intensity;
        ctx.strokeRect(ax - size/2, ay - size/2, size, size);
    }

    setStep(stepCount);
    setAlerts([...alerts]);
    setElapsed(Math.round((performance.now() - startTimeRef.current) / 100) / 10);
  }, []);

  const handleStart = async () => {
    if (status === 'running') return;
    setStatus('initializing');
    const params = { ...DEFAULT_PARAMS, entryRate };
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

  const handleStop = () => { simulatorRef.current?.stop(); setStatus('stopped'); };
  const handleReset = () => { simulatorRef.current?.stop(); simulatorRef.current = null; setStatus('idle'); setStep(0); setElapsed(0); setAlerts([]); };
  const handleClearLayout = () => {
    if (status === 'running' || status === 'initializing') return;
    const cells = new Uint8Array(DEFAULT_PARAMS.rows * DEFAULT_PARAMS.cols);
    setEditableCells(cells);
    setAlerts([]);
    setStep(0);
    setElapsed(0);
  };

  return (
    <div className="app-root cyber-theme v4">
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">⚠️</div>
          <div>
            <h1 className="brand-title">CrowdControl</h1>
            <p className="brand-sub">Prediction and Mitigation of Stampede Risks</p>
          </div>
        </div>
        <div className="header-status">
            <div className="stat-box">
                <span className="label">ALERTS</span>
                <span className="value neon-pink">{alerts.length}</span>
            </div>
            <div className="stat-box">
                <span className="label">PREVENTION</span>
                <span className="value" style={{color: preventionEnabled ? '#10b981' : '#64748b'}}>{preventionEnabled ? 'ON' : 'OFF'}</span>
            </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <section className="sidebar-section">
            <h2 className="section-title">AI_CONTROL</h2>
            <div className="toggle-box" onClick={() => setPreventionEnabled(!preventionEnabled)}>
                <div className={`toggle-track ${preventionEnabled ? 'on' : ''}`}><div className="toggle-thumb" /></div>
                <span>MITIGATION_ENABLED</span>
            </div>
          </section>

          <section className="sidebar-section">
            <h2 className="section-title">Scenario</h2>
            <div className="scenario-btns">
              {['bottleneck', 'stadium'].map(sc => (
                <button
                  key={sc}
                  onClick={() => loadScenario(sc as 'bottleneck' | 'stadium')}
                  disabled={status === 'running' || status === 'initializing'}
                  className={`cyber-btn ${scenario === sc ? 'active' : ''}`}
                >
                  {sc.toUpperCase()}
                </button>
              ))}
            </div>
          </section>

          <section className="sidebar-section">
            <h2 className="section-title">Draw Tools</h2>
            <div className="draw-tool-grid">
              {([
                ['wall', 'WALL'],
                ['entry', 'ENTRY'],
                ['exit', 'EXIT'],
                ['erase', 'ERASE'],
              ] as const).map(([tool, label]) => (
                <button
                  key={tool}
                  onClick={() => setDrawTool(tool)}
                  disabled={status === 'running' || status === 'initializing'}
                  className={`draw-tool ${drawTool === tool ? 'active' : ''} ${tool}`}
                >
                  <span className="draw-swatch" />
                  {label}
                </button>
              ))}
            </div>
            <div className="param-group brush-group">
              <label className="param-label">BRUSH <span className="param-val neon-cyan">{brushSize}</span></label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={brushSize}
                disabled={status === 'running' || status === 'initializing'}
                onChange={e => setBrushSize(+e.target.value)}
                className="cyber-slider"
              />
            </div>
            <button
              onClick={handleClearLayout}
              disabled={status === 'running' || status === 'initializing'}
              className="cyber-btn clear-layout-btn"
            >
              CLEAR LAYOUT
            </button>
          </section>

          <section className="sidebar-section">
            <h2 className="section-title">INFLOW</h2>
            <div className="param-group">
                <label className="param-label">ENTRY FLOW <span className="param-val neon-cyan">{entryRate.toFixed(1)} / sec</span></label>
                <input type="range" min="0" max="200" step="1" value={entryRate} onChange={e => setEntryRate(+e.target.value)} className="cyber-slider" />
                <p className="param-hint">Total crowd inflow distributed across all entry zones.</p>
            </div>
          </section>

          <section className="sidebar-section">
            <h2 className="section-title">Graph type</h2>
            <div className="scenario-btns">
              {viewModes.map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`cyber-btn ${viewMode === mode ? 'active' : ''}`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </section>

          <section className="sidebar-section controls">
            <button onClick={handleStart} disabled={status === 'running'} className="launch-btn primary">Start</button>
            <div className="secondary-btns">
                <button onClick={handleStop} className="cyber-btn-alt">stop</button>
                <button onClick={handleReset} className="cyber-btn-alt">Reset</button>
            </div>
          </section>
        </aside>

        <main className="canvas-area">
          <div className="canvas-frame">
            <div className="canvas-container">
              <canvas
                ref={liveCanvasRef}
                width={1000}
                height={1000}
                className={`sim-canvas ${status === 'running' || status === 'initializing' ? '' : 'editable'}`}
                onPointerDown={event => {
                  isDrawingRef.current = true;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  paintCell(event);
                }}
                onPointerMove={event => {
                  if (isDrawingRef.current) paintCell(event);
                }}
                onPointerUp={event => {
                  isDrawingRef.current = false;
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onPointerLeave={() => {
                  isDrawingRef.current = false;
                }}
              />
            </div>
          </div>
        </main>
      </div>

      <style>{`
        .cyber-theme { background: #020617; color: #94a3b8; font-family: 'JetBrains Mono', monospace; height: 100vh; }
        .app-header { display: flex; justify-content: space-between; padding: 15px 30px; background: #0f172a; border-bottom: 1px solid #1e293b; }
        .stat-box { display: flex; flex-direction: column; align-items: flex-end; margin-left: 30px; }
        .stat-box .label { font-size: 9px; color: #64748b; }
        .stat-box .value { font-size: 18px; font-weight: bold; }
        .app-body { display: flex; height: calc(100vh - 70px); }
        .sidebar { width: 300px; background: #0f172a; border-right: 1px solid #1e293b; padding: 20px; }
        .section-title { font-size: 10px; color: #64748b; margin-bottom: 10px; border-left: 2px solid #00f2ff; padding-left: 10px; }
        .sidebar-section { marginBottom: 30px; }
        .toggle-box { display: flex; align-items: center; gap: 10px; font-size: 10px; cursor: pointer; }
        .toggle-track { width: 34px; height: 18px; background: #1e293b; border-radius: 9px; position: relative; }
        .toggle-track.on { background: #10b981; }
        .toggle-thumb { width: 14px; height: 14px; background: #fff; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: 0.2s; }
        .toggle-track.on .toggle-thumb { left: 18px; }
        .launch-btn { background: #00f2ff; color: #000; border: none; padding: 15px; width: 100%; font-weight: bold; cursor: pointer; margin-bottom: 10px; }
        .canvas-area { flex: 1; padding: 20px; display: flex; align-items: center; justify-content: center; background: #000; }
        .canvas-frame { border: 1px solid #1e293b; }
        .sim-canvas { max-width: 100%; height: auto; display: block; touch-action: none; }
        .sim-canvas.editable { cursor: crosshair; }
        .cyber-slider { width: 100%; margin: 10px 0; }
        .param-hint { margin: 4px 0 0; font-size: 10px; color: #94a3b8; line-height: 1.2; }
        .cyber-btn { background: transparent; border: 1px solid #1e293b; color: #64748b; padding: 8px 12px; font-size: 10px; cursor: pointer; margin-right: 5px; }
        .cyber-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .cyber-btn.active { background: #1e293b; color: #00f2ff; border-color: #00f2ff; }
        .draw-tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
        .draw-tool { display: flex; align-items: center; gap: 7px; background: #020617; border: 1px solid #1e293b; color: #94a3b8; padding: 8px; font-size: 10px; cursor: pointer; }
        .draw-tool.active { border-color: #00f2ff; color: #e2e8f0; background: #111827; }
        .draw-tool:disabled { opacity: 0.35; cursor: not-allowed; }
        .draw-swatch { width: 12px; height: 12px; border-radius: 2px; background: #020617; border: 1px solid #334155; }
        .draw-tool.wall .draw-swatch { background: #1e293b; }
        .draw-tool.entry .draw-swatch { background: #3b82f6; }
        .draw-tool.exit .draw-swatch { background: #10b981; }
        .draw-tool.erase .draw-swatch { background: #020617; }
        .brush-group { margin-top: 6px; }
        .clear-layout-btn { width: 100%; margin-right: 0; }
        .neon-pink { color: #ff0078; }
        .neon-cyan { color: #00f2ff; }
      `}</style>
    </div>
  );
}
