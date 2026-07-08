import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  Eraser,
  Eye,
  Layers3,
  Pause,
  Play,
  Radar,
  RotateCcw,
  Shield,
  SkipForward,
  Sparkles,
  Square,
  Users,
  X,
} from 'lucide-react';

import { renderHeatmapFluid } from '../backend/engine/colormap';
import { buildBottleneckScenario, buildStadiumScenario } from '../backend/engine/scenarios';
import { CellType, type HazardAlert, type SimParams, type SimStatus, type SimulatorState } from '../backend/engine/types';
import { CrowdSimulator } from '../backend/engine/simulator';
import { DEFAULT_PARAMS as SOURCE_DEFAULTS } from '../shared/simParams';

gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);

const DEFAULT_PARAMS: SimParams = SOURCE_DEFAULTS;
const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

type CurrentView = 'landing' | 'sim';
type DrawTool = 'wall' | 'entry' | 'exit' | 'erase';

const DRAW_TOOL_TO_CELL: Record<DrawTool, CellType> = {
  wall: CellType.WALL,
  entry: CellType.ENTRY,
  exit: CellType.EXIT,
  erase: CellType.EMPTY,
};

const DRAW_TOOLS: Array<{
  id: DrawTool;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'wall', label: 'Wall', icon: Square },
  { id: 'entry', label: 'Entry', icon: Users },
  { id: 'exit', label: 'Exit', icon: ArrowRight },
  { id: 'erase', label: 'Erase', icon: Eraser },
];

const LENS_OPTIONS: Array<{
  id: 'density' | 'risk';
  label: string;
  icon: React.ElementType;
  color: string;
}> = [
  { id: 'density', label: 'Density', icon: Layers3, color: 'from-cyan-400/20 via-accent/15 to-transparent text-cyan-200 border-cyan-300/25' },
  { id: 'risk', label: 'Risk', icon: AlertTriangle, color: 'from-rose-400/20 via-hazard-crit/15 to-transparent text-rose-200 border-rose-300/25' },
];

const LANDING_OUTCOMES = [
  {
    title: 'Detect pressure early',
    label: 'Risk Radar',
    copy: 'Surface dangerous crowd density and stagnation before the floor plan becomes a trap.',
    color: 'from-rose-500/24 via-hazard-crit/12 to-transparent',
    chip: 'text-rose-200 border-rose-300/30 bg-rose-400/10',
  },
  {
    title: 'Test spatial changes',
    label: 'Map Lab',
    copy: 'Sketch walls, entries, exits, and AI mitigation barriers against the same live model.',
    color: 'from-cyan-400/22 via-accent/12 to-transparent',
    chip: 'text-cyan-200 border-cyan-300/30 bg-cyan-400/10',
  },
  {
    title: 'The Math',
    label: 'Model Lens',
    copy: 'Convert nonlinear transport, pressure, and cohesion into readable operational signals.',
    color: 'from-emerald-400/20 via-neon-green/10 to-transparent',
    chip: 'text-emerald-200 border-emerald-300/30 bg-emerald-400/10',
  },
];

interface SliderDefinition {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  disabled?: boolean;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}

interface SliderGroup {
  id: string;
  title: string;
  description: string;
  sliders: SliderDefinition[];
}

export default function App() {
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const simulatorRef = useRef<CrowdSimulator | null>(null);
  const startTimeRef = useRef<number>(0);
  const editableCellsRef = useRef<Uint8Array | null>(null);
  const viewModeRef = useRef<'density' | 'risk'>('density');

  const [currentView, setCurrentView] = useState<CurrentView>('landing');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [status, setStatus] = useState<SimStatus>('idle');
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [alerts, setAlerts] = useState<HazardAlert[]>([]);
  const [simState, setSimState] = useState<SimulatorState | null>(null);

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

  const [rhoMax, setRhoMax] = useState(DEFAULT_PARAMS.rhoMax);
  const [rhoCrit, setRhoCrit] = useState(DEFAULT_PARAMS.rhoCrit);
  const [beta, setBeta] = useState(DEFAULT_PARAMS.beta);
  const [pressureK, setPressureK] = useState(DEFAULT_PARAMS.pressureK);
  const [pressureN, setPressureN] = useState(DEFAULT_PARAMS.pressureN);
  const [diffusivity, setDiffusivity] = useState(DEFAULT_PARAMS.diffusivity);
  const [camaraderieG, setCamaraderieG] = useState(DEFAULT_PARAMS.camaraderieG);
  const [camaraderieI, setCamaraderieI] = useState(DEFAULT_PARAMS.camaraderieI);
  const [camaraderieM, setCamaraderieM] = useState(DEFAULT_PARAMS.camaraderieM);

  const rows = gridSize;
  const cols = gridSize;
  const isRunning = status === 'running';

  const [editableCells, setEditableCells] = useState<Uint8Array>(() => {
    const scen = buildBottleneckScenario(100, 100);
    return new Uint8Array(scen.cells);
  });

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    editableCellsRef.current = editableCells;
  }, [editableCells]);

  useEffect(() => {
    const handleSpotlightMove = (event: globalThis.PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const card = target?.closest<HTMLElement>('.glass-card');
      if (!card) return;

      const rect = card.getBoundingClientRect();
      card.style.setProperty('--spotlight-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--spotlight-y', `${event.clientY - rect.top}px`);
    };

    window.addEventListener('pointermove', handleSpotlightMove);
    return () => window.removeEventListener('pointermove', handleSpotlightMove);
  }, []);

  const createCells = (size: number) => new Uint8Array(size * size);

  const renderCellsPreview = useCallback((cells: Uint8Array, rows: number, cols: number) => {
    const canvas = liveCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const csx = canvas.width / cols;
    const csy = canvas.height / rows;

    ctx.fillStyle = '#050506';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r * cols + c];
        if (cell === CellType.EMPTY) continue;

        if (cell === CellType.WALL) {
          ctx.fillStyle = '#23242b';
          ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
        } else if (cell === CellType.ENTRY) {
          ctx.fillStyle = 'rgba(94, 106, 210, 0.45)';
          ctx.fillRect(c * csx, r * csy, csx, csy);
        } else if (cell === CellType.EXIT) {
          ctx.fillStyle = 'rgba(101, 217, 148, 0.42)';
          ctx.fillRect(c * csx, r * csy, csx, csy);
        } else if (cell === CellType.MITIGATION) {
          ctx.fillStyle = '#6872D9';
          ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
        }
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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
    bg.width = 2000;
    bg.height = 2000;
    const ctx = bg.getContext('2d')!;
    const csx = bg.width / cols;
    const csy = bg.height / rows;

    ctx.fillStyle = '#050506';
    ctx.fillRect(0, 0, bg.width, bg.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r * cols + c];
        if (cell === CellType.WALL) {
          ctx.fillStyle = '#23242b';
          ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
        } else if (cell === CellType.ENTRY) {
          ctx.fillStyle = 'rgba(94, 106, 210, 0.16)';
          ctx.fillRect(c * csx, r * csy, csx, csy);
        } else if (cell === CellType.EXIT) {
          ctx.fillStyle = 'rgba(101, 217, 148, 0.16)';
          ctx.fillRect(c * csx, r * csy, csx, csy);
        }
      }
    }

    bgCanvasRef.current = bg;
  }, []);

  const loadScenario = useCallback((nextScenario: 'bottleneck' | 'stadium') => {
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
  }, [cols, prepareBackground, renderCellsPreview, rows, status]);

  const handleGridSizeChange = useCallback((newSize: number) => {
    setGridSize(newSize);
    if (status === 'running' || status === 'initializing') return;

    const scen = scenario === 'bottleneck'
      ? buildBottleneckScenario(newSize, newSize)
      : buildStadiumScenario(newSize, newSize);
    const nextCells = new Uint8Array(scen.cells);

    setEditableCells(nextCells);
    setAlerts([]);
    setStep(0);
    setElapsed(0);
    prepareBackground(nextCells, newSize, newSize);
    requestAnimationFrame(() => renderCellsPreview(nextCells, newSize, newSize));
  }, [prepareBackground, renderCellsPreview, scenario, status]);

  const paintCell = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (status === 'running' || status === 'initializing') return;
    if (event.buttons !== 1) return;

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
  }, [brushSize, cols, drawTool, editableCells, renderCellsPreview, rows, status]);

  useEffect(() => {
    if (currentView !== 'sim') return;
    if (status === 'running' || status === 'initializing') return;

    const frame = requestAnimationFrame(() => {
      prepareBackground(editableCells, rows, cols);
      renderCellsPreview(editableCells, rows, cols);
    });

    return () => cancelAnimationFrame(frame);
  }, [cols, currentView, editableCells, prepareBackground, renderCellsPreview, rows, status]);

  const handleSimUpdate = useCallback((state: SimulatorState) => {
    const canvas = liveCanvasRef.current;
    if (!canvas || !bgCanvasRef.current || !simulatorRef.current) return;

    const ctx = canvas.getContext('2d')!;
    const { rho, vx, vy, rows, cols, params, cells, stepCount, alerts } = state;

    ctx.fillStyle = '#050506';
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
        ctx.fillStyle = '#6872D9';
        ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
      }
    }

    for (const alert of alerts) {
      ctx.strokeStyle = '#FF5C72';
      ctx.lineWidth = 2;
      const ax = alert.c * csx;
      const ay = alert.r * csy;
      const size = 40 * alert.intensity;
      ctx.strokeRect(ax - size / 2, ay - size / 2, size, size);
    }

    setStep(stepCount);
    setAlerts([...alerts]);
    setSimState({ ...state });
    setElapsed(Math.round((performance.now() - startTimeRef.current) / 100) / 10);
  }, []);

  const handleStart = useCallback(() => {
    if (status === 'running') return;
    setStatus('initializing');

    const params = {
      ...DEFAULT_PARAMS,
      rows,
      cols,
      entryRate,
      exitDrain,
      pushFactor: pressureFactor,
      rhoMax,
      rhoCrit,
      beta,
      pressureK,
      pressureN,
      diffusivity,
      camaraderieG,
      camaraderieI,
      camaraderieM,
      renderEvery: Math.max(1, Math.round(60 / fps)),
    };

    const simCells = new Uint8Array(editableCells);
    const sim = new CrowdSimulator(params, simCells, params.rows, params.cols);
    sim.preventionMode = preventionEnabled;
    sim.setCallbacks(handleSimUpdate, () => setStatus('finished'));

    simulatorRef.current = sim;
    prepareBackground(simCells, params.rows, params.cols);
    setStatus('running');
    startTimeRef.current = performance.now() - (elapsed * 1000);
    sim.start();
  }, [
    beta,
    camaraderieG,
    camaraderieI,
    camaraderieM,
    cols,
    diffusivity,
    editableCells,
    elapsed,
    entryRate,
    exitDrain,
    fps,
    handleSimUpdate,
    prepareBackground,
    pressureFactor,
    pressureK,
    pressureN,
    preventionEnabled,
    rhoCrit,
    rhoMax,
    rows,
    status,
  ]);

  const handleStop = useCallback(() => {
    simulatorRef.current?.stop();
    setStatus('stopped');
  }, []);

  const handleReset = useCallback(() => {
    simulatorRef.current?.stop();
    simulatorRef.current = null;
    setStatus('idle');
    setStep(0);
    setElapsed(0);
    setAlerts([]);
    setSimState(null);
    requestAnimationFrame(() => renderCellsPreview(editableCells, rows, cols));
  }, [cols, editableCells, renderCellsPreview, rows]);

  const handleStep = useCallback(() => {
    if (status === 'running') {
      handleStop();
      return;
    }
    if (!simulatorRef.current) {
      handleStart();
      setTimeout(() => simulatorRef.current?.stop(), 50);
      return;
    }
    simulatorRef.current.step();
  }, [handleStart, handleStop, status]);

  const handleClearLayout = useCallback(() => {
    if (status === 'running' || status === 'initializing') return;
    const cells = createCells(rows);
    setEditableCells(cells);
    setAlerts([]);
    setStep(0);
    setElapsed(0);
  }, [rows, status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (currentView !== 'sim' || isDrawerOpen) return;

      if (event.code === 'Space') {
        event.preventDefault();
        if (status === 'running') handleStop();
        else handleStart();
      } else if (event.code === 'KeyR') {
        handleReset();
      } else if (event.code === 'KeyC') {
        handleClearLayout();
      } else if (event.code === 'Digit1') setDrawTool('wall');
      else if (event.code === 'Digit2') setDrawTool('entry');
      else if (event.code === 'Digit3') setDrawTool('exit');
      else if (event.code === 'Digit4') setDrawTool('erase');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, handleClearLayout, handleReset, handleStart, handleStop, isDrawerOpen, status]);

  const sliderGroups = useMemo<SliderGroup[]>(() => {
    const disabled = isRunning;
    return [
      {
        id: 'engine',
        title: 'Engine Clock',
        description: 'Global resolution, render cadence, and brush scale.',
        sliders: [
          { id: 'gridSize', label: 'Grid Resolution', value: gridSize, min: 50, max: 150, step: 10, unit: 'cells', disabled, onChange: handleGridSizeChange },
          { id: 'fps', label: 'Render Cadence', value: fps, min: 30, max: 120, step: 5, unit: 'fps', disabled, onChange: setFps },
          { id: 'brushSize', label: 'Architect Brush', value: brushSize, min: 1, max: 10, step: 1, unit: 'px', disabled, onChange: setBrushSize },
        ],
      },
      {
        id: 'flow',
        title: 'Flow Dynamics',
        description: 'How people enter, compress, and leave the environment.',
        sliders: [
          { id: 'entryRate', label: 'Entry Rate', value: entryRate, min: 10, max: 140, step: 2, unit: 'p/min', disabled, onChange: setEntryRate },
          { id: 'pressureFactor', label: 'Push Factor', value: pressureFactor, min: 1, max: 6, step: 0.1, unit: 'x', disabled, format: (value) => value.toFixed(1), onChange: setPressureFactor },
          { id: 'exitDrain', label: 'Exit Drain', value: exitDrain, min: 0.1, max: 0.8, step: 0.05, disabled, format: (value) => value.toFixed(2), onChange: setExitDrain },
        ],
      },
      {
        id: 'model',
        title: 'Nonlinear Model',
        description: 'Density thresholds and pressure-law coefficients.',
        sliders: [
          { id: 'rhoMax', label: 'Maximum Density', value: rhoMax, min: 4, max: 12, step: 0.5, unit: 'p/m2', disabled, format: (value) => value.toFixed(1), onChange: setRhoMax },
          { id: 'rhoCrit', label: 'Critical Density', value: rhoCrit, min: 1, max: 6, step: 0.2, unit: 'p/m2', disabled, format: (value) => value.toFixed(1), onChange: setRhoCrit },
          { id: 'beta', label: 'Mobility Beta', value: beta, min: 1, max: 4, step: 0.1, disabled, format: (value) => value.toFixed(1), onChange: setBeta },
          { id: 'pressureK', label: 'Pressure k', value: pressureK, min: 0, max: 5, step: 0.1, disabled, format: (value) => value.toFixed(1), onChange: setPressureK },
          { id: 'pressureN', label: 'Pressure n', value: pressureN, min: 2, max: 6, step: 0.1, disabled, format: (value) => value.toFixed(1), onChange: setPressureN },
          { id: 'diffusivity', label: 'Diffusivity D', value: diffusivity, min: 0, max: 0.1, step: 0.005, disabled, format: (value) => value.toFixed(3), onChange: setDiffusivity },
        ],
      },
      {
        id: 'social',
        title: 'Social Cohesion',
        description: 'Cooperation, independence, and crowd experience terms.',
        sliders: [
          { id: 'camaraderieG', label: 'Coordination G', value: camaraderieG, min: 0, max: 1, step: 0.05, disabled, format: (value) => value.toFixed(2), onChange: setCamaraderieG },
          { id: 'camaraderieI', label: 'Independence I', value: camaraderieI, min: 0, max: 1, step: 0.05, disabled, format: (value) => value.toFixed(2), onChange: setCamaraderieI },
          { id: 'camaraderieM', label: 'Crowd Experience m', value: camaraderieM, min: 1, max: 3, step: 0.1, disabled, format: (value) => value.toFixed(1), onChange: setCamaraderieM },
        ],
      },
    ];
  }, [
    beta,
    brushSize,
    camaraderieG,
    camaraderieI,
    camaraderieM,
    diffusivity,
    entryRate,
    exitDrain,
    fps,
    gridSize,
    handleGridSizeChange,
    isRunning,
    pressureFactor,
    pressureK,
    pressureN,
    rhoCrit,
    rhoMax,
  ]);

  const handleEnterSimulation = () => {
    setCurrentView('sim');
    setTimeout(() => loadScenario(scenario), 320);
  };

  const handleExitSimulation = () => {
    handleStop();
    setIsDrawerOpen(false);
    setCurrentView('landing');
  };

  return (
    <div className="ambient-shell min-h-screen bg-background-base text-foreground">
      <AnimatePresence mode="wait">
        {currentView === 'landing' ? (
          <LandingView key="landing" onEnterSimulation={handleEnterSimulation} />
        ) : (
          <SimCommandCenter
            key="sim"
            alerts={alerts}
            brushSize={brushSize}
            canvasRef={liveCanvasRef}
            drawTool={drawTool}
            elapsed={elapsed}
            fps={fps}
            isDrawerOpen={isDrawerOpen}
            isRunning={isRunning}
            onClearLayout={handleClearLayout}
            onCloseDrawer={() => setIsDrawerOpen(false)}
            onDrawToolChange={setDrawTool}
            onExit={handleExitSimulation}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onPause={handleStop}
            onPlay={handleStart}
            onPointerDown={paintCell}
            onPointerMove={paintCell}
            onPreventionChange={setPreventionEnabled}
            onReset={handleReset}
            onScenarioChange={loadScenario}
            onStep={handleStep}
            onViewModeChange={setViewMode}
            preventionEnabled={preventionEnabled}
            scenario={scenario}
            simState={simState}
            sliderGroups={sliderGroups}
            status={status}
            step={step}
            viewMode={viewMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LandingView({ onEnterSimulation }: { onEnterSimulation: () => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-gsap="landing-nav"]',
        { y: -28, opacity: 0, filter: 'blur(10px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, ease: 'expo.out' },
      );

      gsap.fromTo(
        '[data-landing-reveal]',
        { y: 34, opacity: 0, filter: 'blur(12px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', stagger: 0.085 },
      );

      gsap.utils.toArray<HTMLElement>('[data-scroll-reveal]').forEach((element, index) => {
        gsap.fromTo(
          element,
          { y: 48, opacity: 0, filter: 'blur(12px)' },
          {
            y: 0,
            opacity: 1,
            filter: 'blur(0px)',
            duration: 0.9,
            delay: (index % 4) * 0.06,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: element,
              start: 'top 82%',
              once: true,
            },
          },
        );
      });

      gsap.to('[data-orbit]', {
        rotate: 360,
        duration: 34,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%',
      });

      gsap.to('[data-preview-card]', {
        y: (index) => [-10, -16, -12][index % 3],
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: 0.18,
      });

      gsap.fromTo(
        '[data-scan-line]',
        { yPercent: -120, opacity: 0 },
        { yPercent: 520, opacity: 0.6, duration: 3.2, repeat: -1, ease: 'power1.inOut' },
      );
    }, rootRef);

    const handleScroll = () => {
      const hero = heroRef.current;
      if (!hero) return;
      const progress = Math.min(window.scrollY / Math.max(hero.offsetHeight * 0.7, 1), 1);
      gsap.to(hero.querySelector('[data-hero-content]'), {
        y: progress * 64,
        scale: 1 - progress * 0.035,
        opacity: 1 - progress * 0.28,
        duration: 0.18,
        ease: 'power2.out',
        overwrite: true,
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      ctx.revert();
    };
  }, []);

  const scrollTo = (target: string | number) => {
    gsap.to(window, {
      duration: 0.9,
      ease: 'power3.out',
      scrollTo: { y: target, offsetY: 24 },
    });
  };

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0, y: 22, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -18, filter: 'blur(10px)' }}
      transition={{ duration: 0.42, ease: easeOutExpo }}
      className="min-h-screen overflow-x-hidden"
    >
      <nav data-gsap="landing-nav" className="fixed left-0 right-0 top-0 z-30 border-b border-border-default bg-background-base/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-24 max-w-[1500px] items-center justify-between px-6 lg:px-10">
          <button
            type="button"
            onClick={() => scrollTo(0)}
            className="flex items-center gap-4 rounded-lg"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-default bg-white/[0.05] shadow-accent">
              <Shield size={20} className="text-accent-bright" />
            </span>
            <span className="text-lg font-semibold text-white">CrowdControl</span>
          </button>
          <div className="hidden items-center gap-4 md:flex">
            <button className="px-5 py-3 text-sm font-semibold text-foreground-muted transition hover:text-white" onClick={() => scrollTo('#outcomes')}>
              Outcomes
            </button>
            <button className="px-5 py-3 text-sm font-semibold text-foreground-muted transition hover:text-white" onClick={() => scrollTo('#about')}>
              Methodology
            </button>
            <button className="px-5 py-3 text-sm font-semibold text-foreground-muted transition hover:text-white" onClick={() => scrollTo('#math')}>
              The Math
            </button>
            <button className="btn-primary px-6 py-3 text-sm" onClick={onEnterSimulation}>
              Enter Simulation
            </button>
          </div>
        </div>
      </nav>

      <section ref={heroRef} className="relative flex min-h-[112vh] items-center overflow-hidden px-6 pb-32 pt-44 lg:px-10">
        <div data-hero-content className="mx-auto flex w-full max-w-[1500px] flex-col items-center text-center">
          <motion.div
            data-landing-reveal
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5, ease: easeOutExpo }}
            className="mb-8 inline-flex items-center gap-3 rounded-full border border-border-accent bg-accent/10 px-5 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-accent-bright"
          >
            <Sparkles size={14} />
            Safety intelligence for dense spaces
          </motion.div>

          <motion.h1
            data-landing-reveal
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.62, ease: easeOutExpo }}
            className="mx-auto max-w-5xl text-5xl font-semibold leading-[0.95] sm:text-6xl lg:text-8xl xl:text-9xl"
          >
            Model crowds before <span className="gradient-danger-text">pressure</span> becomes panic.
          </motion.h1>

          <motion.p
            data-landing-reveal
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.62, ease: easeOutExpo }}
            className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-foreground-muted lg:text-xl"
          >
            CrowdControl turns spatial layouts, behavior, and flow into a compact command surface for safer venues and faster mitigation decisions.
          </motion.p>

          <motion.div
            data-landing-reveal
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.5, ease: easeOutExpo }}
            className="mt-12 flex flex-col items-center gap-4 sm:flex-row"
          >
            <button className="btn-primary min-h-14 px-8 py-[18px]" onClick={onEnterSimulation}>
              Enter Simulation
              <ArrowRight size={18} />
            </button>
            <button className="btn-ghost px-8 py-4 min-h-14" onClick={() => scrollTo('#about')}>
              Explore Methodology
              <ChevronDown size={18} />
            </button>
          </motion.div>

          <motion.div
            data-landing-reveal
            initial={{ opacity: 0, scale: 0.96, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.7, ease: easeOutExpo }}
            className="mt-16 w-full max-w-6xl"
          >
            <div data-orbit className="absolute inset-x-0 top-32 mx-auto h-64 w-[78%] rounded-full bg-[conic-gradient(from_180deg,transparent,rgba(94,106,210,0.24),rgba(0,224,255,0.16),transparent,rgba(255,92,114,0.18),transparent,rgba(101,217,148,0.14),transparent)] blur-[130px]" />
            <div className="glass-card relative overflow-hidden rounded-[28px] p-4 sm:p-6 lg:p-8">
              <div className="relative overflow-hidden rounded-[24px] border border-border-default bg-background-deep p-6 sm:p-8">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:42px_42px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(94,106,210,0.34),transparent_26%),radial-gradient(circle_at_28%_62%,rgba(255,92,114,0.2),transparent_18%),radial-gradient(circle_at_70%_58%,rgba(101,217,148,0.18),transparent_15%),radial-gradient(circle_at_64%_24%,rgba(0,224,255,0.16),transparent_16%)]" />
                <div data-scan-line className="absolute left-0 right-0 top-0 h-20 bg-gradient-to-b from-accent/0 via-accent/20 to-accent/0 opacity-0" />
                <div className="relative z-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-2xl border border-border-default bg-black/30 p-6 text-left backdrop-blur">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-hazard-crit" />
                      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-foreground-muted">Live flow summary</p>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {[
                        ['Density', '72%'],
                        ['Velocity', '41%'],
                        ['Risk', '18%'],
                      ].map(([label, value]) => (
                        <div key={label} data-preview-card className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
                          <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-100/80">{label}</p>
                          <p className="mt-3 font-mono text-2xl font-semibold">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border-default bg-white/[0.03] p-6 text-left backdrop-blur">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-accent-bright">What it helps with</p>
                    <ul className="mt-6 space-y-3 text-sm leading-relaxed text-foreground-muted">
                      <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-hazard-crit/15 text-[11px] font-semibold text-hazard-crit">01</span>
                        <span>Spot pressure pockets before they spill into queues.</span>
                      </li>
                      <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent-bright">02</span>
                        <span>Route mitigation blocks and compare layouts in seconds.</span>
                      </li>
                      <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 text-[11px] font-semibold text-emerald-300">03</span>
                        <span>Show operators a clear story behind each recommendation.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="outcomes" className="border-t border-border-default px-6 py-32 lg:px-10 lg:py-40">
        <div className="mx-auto max-w-[1500px]">
          <div data-scroll-reveal className="mb-16 flex flex-col items-center text-center">
            <p className="mb-7 text-xs font-mono font-bold uppercase tracking-widest text-accent-bright">Operational Outcomes</p>
            <h2 className="gradient-heading max-w-4xl text-4xl font-semibold leading-tight lg:text-6xl">
              From simulation to decision support.
            </h2>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-foreground-muted">
              The interface is organized around the work operators actually do: discover risk, test interventions, and explain why a recommendation is trustworthy.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {LANDING_OUTCOMES.map((item) => (
              <BentoCard key={item.title} className="min-h-[330px] p-9" dataReveal>
                <span className={`inline-flex rounded-full border px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest ${item.chip}`}>
                  {item.label}
                </span>
                <div className={`mt-10 h-28 rounded-2xl border border-border-default bg-gradient-to-br ${item.color}`} />
                <h3 className="mt-9 text-2xl font-semibold text-white">{item.title}</h3>
                <p className="mt-5 text-sm leading-relaxed text-foreground-muted">{item.copy}</p>
              </BentoCard>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="border-t border-border-default px-6 py-36 lg:px-10 lg:py-44">
        <div className="mx-auto flex max-w-[1500px] flex-col items-center text-center">
          <div data-scroll-reveal className="max-w-4xl">
            <p className="mb-7 text-xs font-mono font-bold uppercase tracking-widest text-accent-bright">Methodology</p>
            <h2 className="gradient-heading text-4xl font-semibold leading-tight lg:text-6xl">
              Geometry, flow, and human behavior in one loop.
            </h2>
            <p className="mx-auto mt-9 max-w-2xl text-lg leading-relaxed text-foreground-muted">
              The system evaluates density buildup, route bottlenecks, exit capacity, pressure activation, and cooperative crowd behavior as a single evolving field.
            </p>
          </div>

          <div className="mt-16 grid w-full gap-6 md:grid-cols-2">
            {[
              ['Spatial Field', 'Walkable geometry, walls, entries, and exits become a harmonic navigation field.'],
              ['Pressure Model', 'Nonlinear pressure activates when density crosses critical thresholds.'],
              ['Risk Lens', 'Density, stagnation, turbulence, and distance-to-exit combine into an operational index.'],
              ['Mitigation Layer', 'AI blocks can redirect flow and test safer spatial interventions.'],
            ].map(([title, copy]) => (
              <BentoCard key={title} className="min-h-[290px] p-8" label="Diagram Placeholder" title={title} dataReveal>
                <div className="mt-8 h-32 rounded-xl border border-border-default bg-[radial-gradient(circle_at_35%_40%,rgba(94,106,210,0.24),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />
                <p className="mt-7 text-sm leading-relaxed text-foreground-muted">{copy}</p>
              </BentoCard>
            ))}
          </div>
        </div>
      </section>

      <section id="math" className="border-t border-border-default px-6 py-36 lg:px-10 lg:py-44">
        <div className="mx-auto max-w-[1500px]">
          <div data-scroll-reveal className="mb-20 flex flex-col items-center text-center">
            <p className="mb-7 text-xs font-mono font-bold uppercase tracking-widest text-accent-bright">The Math, Simplified</p>
            <h2 className="gradient-heading max-w-4xl text-4xl font-semibold leading-tight lg:text-6xl">
              Beautiful equations, operational decisions.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              ['Where should people go?', '∇²φ = 0', 'A smooth potential field points every agent toward exits while respecting walls.'],
              ['How fast can they move?', 'v(ρ) = (1 - ρ / ρmax)^β', 'Movement slows naturally as local density approaches maximum capacity.'],
              ['When does it become dangerous?', 'R = density + stagnation + pressure - cohesion', 'A readable risk score blends physics with social behavior.'],
            ].map(([question, formula, copy]) => (
              <BentoCard key={question} className="min-h-[360px] p-9" label="Model Primitive" title={question} dataReveal>
                <div className="my-10 rounded-2xl border border-border-default bg-background-deep p-8 text-center font-mono text-2xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  {formula}
                </div>
                <p className="text-sm leading-relaxed text-foreground-muted">{copy}</p>
              </BentoCard>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

interface SimCommandCenterProps {
  alerts: HazardAlert[];
  brushSize: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  drawTool: DrawTool;
  elapsed: number;
  fps: number;
  isDrawerOpen: boolean;
  isRunning: boolean;
  onClearLayout: () => void;
  onCloseDrawer: () => void;
  onDrawToolChange: (tool: DrawTool) => void;
  onExit: () => void;
  onOpenDrawer: () => void;
  onPause: () => void;
  onPlay: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPreventionChange: (value: boolean) => void;
  onReset: () => void;
  onScenarioChange: (scenario: 'bottleneck' | 'stadium') => void;
  onStep: () => void;
  onViewModeChange: (mode: 'density' | 'risk') => void;
  preventionEnabled: boolean;
  scenario: 'bottleneck' | 'stadium';
  simState: SimulatorState | null;
  sliderGroups: SliderGroup[];
  status: SimStatus;
  step: number;
  viewMode: 'density' | 'risk';
}

function SimCommandCenter({
  alerts,
  brushSize,
  canvasRef,
  drawTool,
  elapsed,
  fps,
  isDrawerOpen,
  isRunning,
  onClearLayout,
  onCloseDrawer,
  onDrawToolChange,
  onExit,
  onOpenDrawer,
  onPause,
  onPlay,
  onPointerDown,
  onPointerMove,
  onPreventionChange,
  onReset,
  onScenarioChange,
  onStep,
  onViewModeChange,
  preventionEnabled,
  scenario,
  simState,
  sliderGroups,
  status,
  step,
  viewMode,
}: SimCommandCenterProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const metrics = useMemo(() => {
    if (!simState) {
      return {
        averageDensity: '0.00',
        peakDensity: '0.00',
        averageRisk: '0.0',
        mitigationBlocks: 0,
        safetyScore: 100,
      };
    }

    const totalDensity = simState.rho.reduce((sum, value) => sum + value, 0);
    const totalRisk = simState.risk.reduce((sum, value) => sum + value, 0);
    const averageDensity = totalDensity / simState.rho.length;
    const peakDensity = Math.max(...Array.from(simState.rho));
    const averageRisk = (totalRisk / simState.risk.length) * 100;
    let mitigationBlocks = 0;
    for (const cell of simState.cells) {
      if (cell === CellType.MITIGATION) mitigationBlocks++;
    }

    return {
      averageDensity: averageDensity.toFixed(2),
      peakDensity: peakDensity.toFixed(2),
      averageRisk: averageRisk.toFixed(1),
      mitigationBlocks,
      safetyScore: Math.max(0, 100 - averageRisk),
    };
  }, [simState]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-sim-reveal]',
        { y: 24, opacity: 0, filter: 'blur(10px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.72, ease: 'expo.out', stagger: 0.07 },
      );

      gsap.fromTo(
        '[data-bento-card]',
        { y: 30, opacity: 0, filter: 'blur(12px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.78, ease: 'expo.out', stagger: { each: 0.055, from: 'start' } },
      );

      gsap.to('[data-hud-scan]', {
        xPercent: 120,
        duration: 2.8,
        repeat: -1,
        ease: 'power1.inOut',
      });

      gsap.to('[data-canvas-breath]', {
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 90px rgba(94,106,210,0.09), 0 0 80px rgba(94,106,210,0.08)',
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to('[data-log-line]', {
        opacity: (index) => 0.28 + index * 0.1,
        x: (index) => (index % 2 === 0 ? 4 : -2),
        duration: 1.4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: 0.12,
      });

      gsap.to('[data-drawer-trigger]', {
        x: -7,
        duration: 1.15,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, shellRef);

    return () => ctx.revert();
  }, []);

  return (
    <motion.div
      ref={shellRef}
      initial={{ opacity: 0, y: 22, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
      transition={{ duration: 0.38, ease: easeOutExpo }}
      className="relative min-h-screen overflow-hidden"
    >
      <motion.div
        animate={{
          filter: isDrawerOpen ? 'blur(8px)' : 'blur(0px)',
          scale: isDrawerOpen ? 0.985 : 1,
          opacity: isDrawerOpen ? 0.72 : 1,
        }}
        transition={{ duration: 0.28, ease: easeOutExpo }}
        className="min-h-screen px-5 py-8 sm:px-8 lg:px-10 xl:px-12"
      >
        <header data-sim-reveal className="mx-auto mb-9 flex max-w-[1860px] flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-border-default bg-white/[0.05] shadow-accent">
              <Radar size={23} className="text-accent-bright" />
            </span>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-accent-bright">Command Center</p>
              <h1 className="gradient-heading mt-1 text-4xl font-semibold tracking-tight">CrowdControl Live Sim</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <StatusPill status={status} />
            <button className="btn-ghost px-5 py-3 text-sm" onClick={onExit}>
              Exit
            </button>
          </div>
        </header>

        <main data-sim-reveal className="mx-auto grid max-w-[1860px] grid-cols-1 gap-6 xl:gap-7 lg:grid-cols-12">
          <BentoCard className="min-h-[760px] p-5 sm:p-6 lg:col-span-8 lg:row-span-4 xl:p-7" label="Main Simulation" title="Live Flow Field">
            <div data-canvas-breath className="mt-7 flex min-h-[650px] flex-1 flex-col overflow-hidden rounded-2xl border border-border-default bg-background-deep">
              <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
                <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-foreground-muted">
                  <span className={`h-2 w-2 rounded-full ${isRunning ? 'bg-neon-green shadow-[0_0_12px_rgba(101,217,148,0.8)]' : 'bg-foreground-muted/40'}`} />
                  {isRunning ? 'Streaming simulation' : 'Blueprint editable'}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-foreground-muted">
                  <Eye size={12} className="text-accent-bright" />
                  {viewMode} lens
                </div>
              </div>

              <div className="relative flex-1">
                <canvas
                  ref={canvasRef}
                  width={1120}
                  height={760}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  className="h-full min-h-[650px] w-full cursor-crosshair touch-none"
                  aria-label="Interactive crowd simulation canvas"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:34px_34px] opacity-50" />
                <div data-hud-scan className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
                <div className="pointer-events-none absolute bottom-6 left-6 right-6 grid gap-4 sm:grid-cols-3">
                  {[
                    ['Avg Density', metrics.averageDensity],
                    ['Peak Density', metrics.peakDensity],
                    ['Risk Index', `${metrics.averageRisk}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border-default bg-black/30 p-4 backdrop-blur-md">
                      <p className="text-[9px] font-mono uppercase tracking-widest text-foreground-muted">{label}</p>
                      <p className="mt-2 font-mono text-xl font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </BentoCard>

          <BentoCard className="p-7 lg:col-span-4" label="Global Options" title="Initiate Sim">
            <div className="mt-7 grid grid-cols-4 gap-3">
              <IconButton icon={RotateCcw} label="Reset" onClick={onReset} />
              <IconButton icon={SkipForward} label="Step" onClick={onStep} />
              <button
                onClick={isRunning ? onPause : onPlay}
                className="btn-primary col-span-2 min-h-[52px] px-5 py-3 text-sm"
              >
                {isRunning ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
                {isRunning ? 'Pause' : 'Run'}
              </button>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[30, 60, 120].map((rate) => (
                <div key={rate} className={`rounded-lg border px-3 py-3 text-center text-[10px] font-mono uppercase tracking-widest ${fps === rate ? 'border-border-accent bg-accent/[0.16] text-white' : 'border-border-default bg-white/[0.03] text-foreground-muted'}`}>
                  {rate} FPS
                </div>
              ))}
            </div>
          </BentoCard>

          <BentoCard className="p-7 lg:col-span-4" label="Lens Filter" title="Data Views">
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {LENS_OPTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onViewModeChange(id)}
                  className={`rounded-lg border p-5 text-left transition duration-200 hover:-translate-y-0.5 ${viewMode === id ? 'border-border-accent bg-accent/[0.16] text-white shadow-accent' : 'border-border-default bg-white/[0.03] text-foreground-muted hover:bg-white/[0.06]'}`}
                >
                  <Icon size={18} className="mb-6 text-accent-bright" />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </BentoCard>

          <BentoCard className="p-7 lg:col-span-4 lg:row-span-2" label="Map Architect" title="Environment Tools">
            <div className="mt-7 grid grid-cols-2 gap-4">
              {DRAW_TOOLS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onDrawToolChange(id)}
                  className={`rounded-lg border p-5 text-left transition duration-200 ${drawTool === id ? 'border-border-accent bg-accent/[0.16] text-white shadow-accent' : 'border-border-default bg-white/[0.03] text-foreground-muted hover:bg-white/[0.06]'}`}
                >
                  <Icon size={16} className="mb-5 text-accent-bright" />
                  <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
                </button>
              ))}
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3">
              {(['bottleneck', 'stadium'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => onScenarioChange(option)}
                  className={`rounded-lg border px-4 py-4 text-[10px] font-mono uppercase tracking-widest ${scenario === option ? 'border-border-accent bg-accent/[0.16] text-white' : 'border-border-default bg-white/[0.03] text-foreground-muted'}`}
                >
                  {option}
                </button>
              ))}
            </div>
            <button className="mt-4 w-full rounded-lg border border-hazard-crit/20 bg-hazard-crit/5 px-4 py-4 text-[10px] font-mono font-bold uppercase tracking-widest text-hazard-crit transition hover:bg-hazard-crit/10" onClick={onClearLayout}>
              Clear Layout
            </button>
            <p className="mt-6 text-xs leading-relaxed text-foreground-muted">
              Brush size {brushSize}px. Use 1-4 keys to switch tools, drag on the canvas to edit while paused.
            </p>
          </BentoCard>

          <BentoCard className="p-7 lg:col-span-4 lg:row-span-2" label="Telemetry" title="Live Data Dump">
            <div className="mt-7 grid grid-cols-2 gap-4">
              <Metric label="Ticks" value={step.toLocaleString()} />
              <Metric label="Time" value={`${elapsed.toFixed(1)}s`} />
              <Metric label="Mitigation" value={metrics.mitigationBlocks.toString()} />
              <Metric label="Safety" value={metrics.safetyScore.toFixed(0)} />
            </div>
            <div className="mt-7 h-40 overflow-hidden rounded-xl border border-border-default bg-background-deep p-4 font-mono text-[10px] leading-relaxed text-foreground-muted">
              {[0, 1, 2, 3, 4, 5].map((line) => (
                <p key={line} data-log-line>
                  <span className="text-accent-bright">[{String(step + line).padStart(5, '0')}]</span> rho stream normalized, risk packet {line % 2 ? 'stable' : 'queued'}
                </p>
              ))}
            </div>
          </BentoCard>

          <BentoCard className="p-7 lg:col-span-4" label="Threats" title="Monitoring">
            <div className="mt-7 space-y-4">
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-border-default bg-white/[0.03] p-5 text-sm text-foreground-muted">
                  No active threats. Sector nominal.
                </div>
              ) : (
                alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-hazard-crit/20 bg-hazard-crit/10 p-4">
                    <p className="text-xs font-semibold text-hazard-crit">{alert.type.replace('_', ' ')}</p>
                    <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-foreground-muted">Vector [{alert.r}, {alert.c}]</p>
                  </div>
                ))
              )}
            </div>
          </BentoCard>

          <BentoCard className="p-7 lg:col-span-4" label="HUD Legend" title="Visual Key">
            <div className="mt-7 grid grid-cols-2 gap-5">
              {[
                ['Wall', 'bg-void-700'],
                ['Entry', 'bg-accent/60'],
                ['Exit', 'bg-neon-green/60'],
                ['AI Block', 'bg-accent-bright'],
              ].map(([label, swatch]) => (
                <div key={label} className="flex items-center gap-3 text-sm text-foreground-muted">
                  <span className={`h-4 w-4 rounded border border-white/10 ${swatch}`} />
                  {label}
                </div>
              ))}
            </div>
          </BentoCard>
        </main>
      </motion.div>

      <motion.button
        data-drawer-trigger
        className="fixed right-4 top-1/2 z-30 flex h-16 w-11 -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-border-default bg-background-elevated/80 text-accent-bright shadow-glass backdrop-blur-xl"
        onClick={onOpenDrawer}
        aria-label="Open control panel"
      >
        <ChevronLeft size={20} />
      </motion.button>

      <ControlPanelDrawer open={isDrawerOpen} onClose={onCloseDrawer} sliderGroups={sliderGroups} preventionEnabled={preventionEnabled} onPreventionChange={onPreventionChange} />
    </motion.div>
  );
}

function ControlPanelDrawer({
  open,
  onClose,
  sliderGroups,
  preventionEnabled,
  onPreventionChange,
}: {
  open: boolean;
  onClose: () => void;
  sliderGroups: SliderGroup[];
  preventionEnabled: boolean;
  onPreventionChange: (value: boolean) => void;
}) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(['engine', 'flow']));

  useEffect(() => {
    if (!open || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-drawer-reveal]',
        { x: 24, opacity: 0, filter: 'blur(10px)' },
        { x: 0, opacity: 1, filter: 'blur(0px)', duration: 0.58, ease: 'expo.out', stagger: 0.055 },
      );

      gsap.fromTo(
        '[data-slider-row]',
        { x: 18, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.45, ease: 'expo.out', stagger: 0.035 },
      );
    }, drawerRef);

    return () => ctx.revert();
  }, [open]);

  const toggleGroup = (id: string) => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            className="fixed inset-0 z-40 cursor-default bg-black/48 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: easeOutExpo }}
            onClick={onClose}
            aria-label="Close control panel backdrop"
          />
          <motion.aside
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.32, ease: easeOutExpo }}
            className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-2xl border-l border-border-default bg-background-base/92 shadow-[0_0_0_1px_rgba(255,255,255,0.06),-28px_0_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          >
            <div className="flex h-full flex-col">
              <div data-drawer-reveal className="flex items-center justify-between border-b border-border-default p-8">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-accent-bright">Control Panel</p>
                  <h2 className="gradient-heading mt-2 text-3xl font-semibold">Slider Mechanisms</h2>
                </div>
                <button className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-default bg-white/[0.05] text-foreground-muted transition hover:text-white" onClick={onClose} aria-label="Close control panel">
                  <X size={18} />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-8">
                <div data-drawer-reveal className="rounded-2xl border border-border-default bg-white/[0.04] p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">AI Mitigation Layer</p>
                      <p className="mt-1 text-xs leading-relaxed text-foreground-muted">Enable adaptive barriers during the active simulation loop.</p>
                    </div>
                    <button
                      onClick={() => onPreventionChange(!preventionEnabled)}
                      className={`h-7 w-12 rounded-full border p-1 transition ${preventionEnabled ? 'border-border-accent bg-accent' : 'border-border-default bg-white/[0.06]'}`}
                      aria-pressed={preventionEnabled}
                    >
                      <span className={`block h-5 w-5 rounded-full bg-white transition ${preventionEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {sliderGroups.map((group) => {
                  const isOpen = openGroups.has(group.id);
                  return (
                    <div key={group.id} data-drawer-reveal className="rounded-2xl border border-border-default bg-white/[0.035]">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="flex w-full items-center justify-between gap-5 p-6 text-left"
                        aria-expanded={isOpen}
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{group.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-foreground-muted">{group.description}</p>
                        </div>
                        <ChevronDown className={`shrink-0 text-foreground-muted transition ${isOpen ? 'rotate-180' : ''}`} size={18} />
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.26, ease: easeOutExpo }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-7 border-t border-border-default p-6">
                              {group.sliders.map((slider) => (
                                <SliderMechanism key={slider.id} slider={slider} />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function SliderMechanism({ slider }: { slider: SliderDefinition }) {
  const progress = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  const value = slider.format ? slider.format(slider.value) : String(slider.value);

  return (
    <div data-slider-row>
      <div className="mb-3 flex items-center justify-between gap-5">
        <label htmlFor={slider.id} className="text-[10px] font-mono font-bold uppercase tracking-widest text-foreground-muted">
          {slider.label}
        </label>
        <span className="font-mono text-xs font-semibold text-accent-bright">
          {value}{slider.unit ? ` ${slider.unit}` : ''}
        </span>
      </div>
      <input
        id={slider.id}
        type="range"
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={slider.value}
        disabled={slider.disabled}
        onChange={(event) => slider.onChange(Number(event.target.value))}
        className="sci-slider-input"
        style={{
          background: `linear-gradient(90deg, rgba(94,106,210,0.48) ${progress}%, transparent ${progress}%)`,
        }}
      />
    </div>
  );
}

function BentoCard({
  children,
  className = '',
  dataReveal = false,
  label,
  title,
}: {
  children: ReactNode;
  className?: string;
  dataReveal?: boolean;
  label?: string;
  title?: string;
}) {
  return (
    <motion.section
      data-bento-card
      data-scroll-reveal={dataReveal ? '' : undefined}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.22, ease: easeOutExpo }}
      className={`glass-card ${className}`}
    >
      {(label || title) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {label && <p className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-accent-bright">{label}</p>}
            {title && <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">{title}</h3>}
          </div>
        </div>
      )}
      {children}
    </motion.section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-background-deep p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-foreground-muted">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function IconButton({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      className="flex h-12 items-center justify-center rounded-lg border border-border-default bg-white/[0.04] text-foreground-muted transition hover:border-border-hover hover:bg-white/[0.08] hover:text-white"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Icon size={17} />
    </button>
  );
}

function StatusPill({ status }: { status: SimStatus }) {
  const active = status === 'running';
  return (
    <div className={`flex items-center gap-3 rounded-full border px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest ${active ? 'border-neon-green/20 bg-neon-green/10 text-neon-green' : 'border-border-default bg-white/[0.04] text-foreground-muted'}`}>
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-neon-green shadow-[0_0_12px_rgba(101,217,148,0.75)]' : 'bg-foreground-muted/40'}`} />
      {status}
    </div>
  );
}
