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

gsap.registerPlugin(ScrollToPlugin);

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
}> = [
  { id: 'density', label: 'Density', icon: Layers3 },
  { id: 'risk', label: 'Risk', icon: AlertTriangle },
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
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (target: string) => {
    gsap.to(window, {
      duration: 0.9,
      ease: 'power3.out',
      scrollTo: { y: target, offsetY: 24 },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -18, filter: 'blur(10px)' }}
      transition={{ duration: 0.42, ease: easeOutExpo }}
      className="min-h-screen overflow-x-hidden"
    >
      <nav className="fixed left-0 right-0 top-0 z-30 border-b border-border-default bg-background-base/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <button
            type="button"
            onClick={() => scrollTo(0 as unknown as string)}
            className="flex items-center gap-3 rounded-lg"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-default bg-white/[0.05] shadow-accent">
              <Shield size={20} className="text-accent-bright" />
            </span>
            <span className="text-lg font-semibold text-white">CrowdControl</span>
          </button>
          <div className="hidden items-center gap-2 md:flex">
            <button className="px-4 py-2 text-sm font-semibold text-foreground-muted transition hover:text-white" onClick={() => scrollTo('#about')}>
              Methodology
            </button>
            <button className="px-4 py-2 text-sm font-semibold text-foreground-muted transition hover:text-white" onClick={() => scrollTo('#math')}>
              The Math
            </button>
            <button className="btn-primary px-5 py-2.5 text-sm" onClick={onEnterSimulation}>
              Enter Simulation
            </button>
          </div>
        </div>
      </nav>

      <section ref={heroRef} className="relative flex min-h-screen items-center overflow-hidden px-6 pb-24 pt-32">
        <div data-hero-content className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.5, ease: easeOutExpo }}
              className="mb-6 inline-flex items-center gap-3 rounded-full border border-border-accent bg-accent/10 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-accent-bright"
            >
              <Sparkles size={14} />
              Advanced Simulation Engine
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.62, ease: easeOutExpo }}
              className="gradient-heading text-5xl font-semibold leading-none sm:text-6xl lg:text-8xl"
            >
              Model crowds before pressure becomes panic.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.62, ease: easeOutExpo }}
              className="mt-7 max-w-2xl text-lg leading-relaxed text-foreground-muted lg:text-xl"
            >
              CrowdControl turns spatial layouts, behavioral parameters, and nonlinear crowd flow into a live command interface for safer events and smarter evacuation planning.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.5, ease: easeOutExpo }}
              className="mt-10 flex flex-col gap-4 sm:flex-row"
            >
              <button className="btn-primary px-7 py-4" onClick={onEnterSimulation}>
                Enter Simulation
                <ArrowRight size={18} />
              </button>
              <button className="btn-ghost px-7 py-4" onClick={() => scrollTo('#about')}>
                Explore Methodology
                <ChevronDown size={18} />
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.7, ease: easeOutExpo }}
            className="relative"
          >
            <div className="absolute inset-10 rounded-full bg-accent/20 blur-[110px]" />
            <div className="glass-card relative min-h-[460px] p-5">
              <div className="relative h-full min-h-[430px] overflow-hidden rounded-2xl border border-border-default bg-background-deep">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:42px_42px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(94,106,210,0.32),transparent_24%),radial-gradient(circle_at_35%_62%,rgba(255,92,114,0.16),transparent_18%),radial-gradient(circle_at_68%_58%,rgba(101,217,148,0.13),transparent_15%)]" />
                <div className="absolute left-6 top-6 rounded-full border border-border-default bg-black/30 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-foreground-muted">
                  Video / Live Preview Placeholder
                </div>
                <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 gap-3">
                  {['Density', 'Velocity', 'Risk'].map((item, index) => (
                    <div key={item} className="rounded-xl border border-border-default bg-white/[0.04] p-4 backdrop-blur-md">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-foreground-muted">{item}</p>
                      <p className="mt-3 font-mono text-2xl font-semibold text-white">{[72, 41, 18][index]}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="about" className="border-t border-border-default px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-4 text-xs font-mono font-bold uppercase tracking-widest text-accent-bright">Methodology</p>
            <h2 className="gradient-heading text-4xl font-semibold leading-tight lg:text-6xl">
              Geometry, flow, and human behavior in one loop.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-foreground-muted">
              The system evaluates density buildup, route bottlenecks, exit capacity, pressure activation, and cooperative crowd behavior as a single evolving field.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['Spatial Field', 'Walkable geometry, walls, entries, and exits become a harmonic navigation field.'],
              ['Pressure Model', 'Nonlinear pressure activates when density crosses critical thresholds.'],
              ['Risk Lens', 'Density, stagnation, turbulence, and distance-to-exit combine into an operational index.'],
              ['Mitigation Layer', 'AI blocks can redirect flow and test safer spatial interventions.'],
            ].map(([title, copy]) => (
              <BentoCard key={title} className="min-h-[230px] p-6" label="Diagram Placeholder" title={title}>
                <div className="mt-6 h-24 rounded-xl border border-border-default bg-[radial-gradient(circle_at_35%_40%,rgba(94,106,210,0.24),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />
                <p className="mt-5 text-sm leading-relaxed text-foreground-muted">{copy}</p>
              </BentoCard>
            ))}
          </div>
        </div>
      </section>

      <section id="math" className="border-t border-border-default px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="mb-4 text-xs font-mono font-bold uppercase tracking-widest text-accent-bright">The Math, Simplified</p>
            <h2 className="gradient-heading text-4xl font-semibold leading-tight lg:text-6xl">
              Beautiful equations, operational decisions.
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              ['Where should people go?', '∇²φ = 0', 'A smooth potential field points every agent toward exits while respecting walls.'],
              ['How fast can they move?', 'v(ρ) = (1 - ρ / ρmax)^β', 'Movement slows naturally as local density approaches maximum capacity.'],
              ['When does it become dangerous?', 'R = density + stagnation + pressure - cohesion', 'A readable risk score blends physics with social behavior.'],
            ].map(([question, formula, copy]) => (
              <BentoCard key={question} className="p-7" label="Model Primitive" title={question}>
                <div className="my-8 rounded-2xl border border-border-default bg-background-deep p-6 text-center font-mono text-2xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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

  return (
    <motion.div
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
        className="min-h-screen px-4 py-5 sm:px-6 lg:px-8"
      >
        <header className="mx-auto mb-5 flex max-w-[1800px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-default bg-white/[0.05] shadow-accent">
              <Radar size={23} className="text-accent-bright" />
            </span>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-accent-bright">Command Center</p>
              <h1 className="gradient-heading text-3xl font-semibold tracking-tight">CrowdControl Live Sim</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={status} />
            <button className="btn-ghost px-4 py-2.5 text-sm" onClick={onExit}>
              Exit
            </button>
          </div>
        </header>

        <main className="mx-auto grid max-w-[1800px] grid-cols-1 gap-4 lg:grid-cols-12">
          <BentoCard className="min-h-[620px] p-4 sm:p-5 lg:col-span-8 lg:row-span-4" label="Main Simulation" title="Live Flow Field">
            <div className="mt-4 flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-2xl border border-border-default bg-background-deep">
              <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
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
                  className="h-full min-h-[520px] w-full cursor-crosshair touch-none"
                  aria-label="Interactive crowd simulation canvas"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:34px_34px] opacity-50" />
                <div className="pointer-events-none absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
                  {[
                    ['Avg Density', metrics.averageDensity],
                    ['Peak Density', metrics.peakDensity],
                    ['Risk Index', `${metrics.averageRisk}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border-default bg-black/30 p-3 backdrop-blur-md">
                      <p className="text-[9px] font-mono uppercase tracking-widest text-foreground-muted">{label}</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </BentoCard>

          <BentoCard className="p-5 lg:col-span-4" label="Global Options" title="Initiate Sim">
            <div className="mt-5 grid grid-cols-4 gap-2">
              <IconButton icon={RotateCcw} label="Reset" onClick={onReset} />
              <IconButton icon={SkipForward} label="Step" onClick={onStep} />
              <button
                onClick={isRunning ? onPause : onPlay}
                className="btn-primary col-span-2 px-5 py-3 text-sm"
              >
                {isRunning ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
                {isRunning ? 'Pause' : 'Run'}
              </button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[30, 60, 120].map((rate) => (
                <div key={rate} className={`rounded-lg border px-3 py-2 text-center text-[10px] font-mono uppercase tracking-widest ${fps === rate ? 'border-border-accent bg-accent/[0.16] text-white' : 'border-border-default bg-white/[0.03] text-foreground-muted'}`}>
                  {rate} FPS
                </div>
              ))}
            </div>
          </BentoCard>

          <BentoCard className="p-5 lg:col-span-4" label="Lens Filter" title="Data Views">
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {LENS_OPTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onViewModeChange(id)}
                  className={`rounded-lg border p-4 text-left transition duration-200 hover:-translate-y-0.5 ${viewMode === id ? 'border-border-accent bg-accent/[0.16] text-white shadow-accent' : 'border-border-default bg-white/[0.03] text-foreground-muted hover:bg-white/[0.06]'}`}
                >
                  <Icon size={18} className="mb-4 text-accent-bright" />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </BentoCard>

          <BentoCard className="p-5 lg:col-span-4 lg:row-span-2" label="Map Architect" title="Environment Tools">
            <div className="mt-5 grid grid-cols-2 gap-2">
              {DRAW_TOOLS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onDrawToolChange(id)}
                  className={`rounded-lg border p-3 text-left transition duration-200 ${drawTool === id ? 'border-border-accent bg-accent/[0.16] text-white shadow-accent' : 'border-border-default bg-white/[0.03] text-foreground-muted hover:bg-white/[0.06]'}`}
                >
                  <Icon size={16} className="mb-3 text-accent-bright" />
                  <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {(['bottleneck', 'stadium'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => onScenarioChange(option)}
                  className={`rounded-lg border px-3 py-3 text-[10px] font-mono uppercase tracking-widest ${scenario === option ? 'border-border-accent bg-accent/[0.16] text-white' : 'border-border-default bg-white/[0.03] text-foreground-muted'}`}
                >
                  {option}
                </button>
              ))}
            </div>
            <button className="mt-3 w-full rounded-lg border border-hazard-crit/20 bg-hazard-crit/5 px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-hazard-crit transition hover:bg-hazard-crit/10" onClick={onClearLayout}>
              Clear Layout
            </button>
            <p className="mt-4 text-xs leading-relaxed text-foreground-muted">
              Brush size {brushSize}px. Use 1-4 keys to switch tools, drag on the canvas to edit while paused.
            </p>
          </BentoCard>

          <BentoCard className="p-5 lg:col-span-4 lg:row-span-2" label="Telemetry" title="Live Data Dump">
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Ticks" value={step.toLocaleString()} />
              <Metric label="Time" value={`${elapsed.toFixed(1)}s`} />
              <Metric label="Mitigation" value={metrics.mitigationBlocks.toString()} />
              <Metric label="Safety" value={metrics.safetyScore.toFixed(0)} />
            </div>
            <div className="mt-5 h-32 overflow-hidden rounded-xl border border-border-default bg-background-deep p-3 font-mono text-[10px] leading-relaxed text-foreground-muted">
              {[0, 1, 2, 3, 4, 5].map((line) => (
                <p key={line}>
                  <span className="text-accent-bright">[{String(step + line).padStart(5, '0')}]</span> rho stream normalized, risk packet {line % 2 ? 'stable' : 'queued'}
                </p>
              ))}
            </div>
          </BentoCard>

          <BentoCard className="p-5 lg:col-span-4" label="Threats" title="Monitoring">
            <div className="mt-5 space-y-3">
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-border-default bg-white/[0.03] p-4 text-sm text-foreground-muted">
                  No active threats. Sector nominal.
                </div>
              ) : (
                alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-hazard-crit/20 bg-hazard-crit/10 p-3">
                    <p className="text-xs font-semibold text-hazard-crit">{alert.type.replace('_', ' ')}</p>
                    <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-foreground-muted">Vector [{alert.r}, {alert.c}]</p>
                  </div>
                ))
              )}
            </div>
          </BentoCard>

          <BentoCard className="p-5 lg:col-span-4" label="HUD Legend" title="Visual Key">
            <div className="mt-5 grid grid-cols-2 gap-3">
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
        className="fixed right-3 top-1/2 z-30 flex h-14 w-10 -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-border-default bg-background-elevated/80 text-accent-bright shadow-glass backdrop-blur-xl"
        onClick={onOpenDrawer}
        animate={{ x: [0, -4, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
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
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(['engine', 'flow']));

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
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.32, ease: easeOutExpo }}
            className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-xl border-l border-border-default bg-background-base/92 shadow-[0_0_0_1px_rgba(255,255,255,0.06),-28px_0_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border-default p-6">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-accent-bright">Control Panel</p>
                  <h2 className="gradient-heading mt-2 text-3xl font-semibold">Slider Mechanisms</h2>
                </div>
                <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-default bg-white/[0.05] text-foreground-muted transition hover:text-white" onClick={onClose} aria-label="Close control panel">
                  <X size={18} />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
                <div className="rounded-2xl border border-border-default bg-white/[0.04] p-5">
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
                    <div key={group.id} className="rounded-2xl border border-border-default bg-white/[0.035]">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="flex w-full items-center justify-between gap-4 p-5 text-left"
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
                            <div className="space-y-5 border-t border-border-default p-5">
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
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
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
  label,
  title,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  title?: string;
}) {
  return (
    <motion.section
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
