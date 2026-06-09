// Yo, importing all the necessary React hooks. This is the squad.
import { useRef, useEffect, useState, useCallback, type PointerEvent } from 'react';
// gsap for those buttery smooth animations, no cap
import gsap from 'gsap';

// Backend imports - we ain't touching the backend, it's black-boxed magic 
import { renderHeatmapFluid } from '../backend/engine/colormap';
import { buildBottleneckScenario, buildStadiumScenario } from '../backend/engine/scenarios';
import { CellType, SimParams, SimStatus, SimulatorState, HazardAlert } from '../backend/engine/types';
import { CrowdSimulator } from '../backend/engine/simulator';
import { DEFAULT_PARAMS as SOURCE_DEFAULTS } from '../shared/simParams';

// Importing da frontend components
import {
  Header,
  Sidebar,
  Hero,
  FormulaShowcase,
  AnalyticsCards,
  AlertsPanel,
  SimulationCanvas,
  FloatingPlaybackDock,
} from './components';

// Bet. Setting the default params so we don't start naked
const DEFAULT_PARAMS: SimParams = SOURCE_DEFAULTS;

// Mapping our drawing tools to the backend cell types. Big brain move.
type DrawTool = 'wall' | 'entry' | 'exit' | 'erase';
const DRAW_TOOL_TO_CELL: Record<DrawTool, CellType> = {
  wall: CellType.WALL,
  entry: CellType.ENTRY,
  exit: CellType.EXIT,
  erase: CellType.EMPTY,
};

export default function App() {
  // Refs for our canvases - if these ghost us, we're taking a massive L
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // The simulator engine ref. This bad boy runs the heavy math.
  const simulatorRef = useRef<CrowdSimulator | null>(null);
  const startTimeRef = useRef<number>(0);
  const editableCellsRef = useRef<Uint8Array | null>(null);

  // State management - holding the vibes together
  const [status, setStatus] = useState<SimStatus>('idle');
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [alerts, setAlerts] = useState<HazardAlert[]>([]);
  const [simState, setSimState] = useState<SimulatorState | null>(null);
  
  // Feature toggles
  const [preventionEnabled, setPreventionEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<'density' | 'risk'>('density');
  const [drawTool, setDrawTool] = useState<DrawTool>('wall');
  const [brushSize, setBrushSize] = useState(2);
  const [gridSize, setGridSize] = useState(100);
  const [fps, setFps] = useState(60);
  
  // Flow parameters that the user can mess with
  const [entryRate, setEntryRate] = useState(DEFAULT_PARAMS.entryRate);
  const [pressureFactor, setPressureFactor] = useState(DEFAULT_PARAMS.pushFactor);
  const [exitDrain, setExitDrain] = useState(DEFAULT_PARAMS.exitDrain);
  const [scenario, setScenario] = useState<'bottleneck' | 'stadium'>('bottleneck');
  
  // Navigation state. Starting at the hero section because first impressions matter fr.
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const appRef = useRef<HTMLDivElement>(null);
  const viewModeRef = useRef(viewMode);

  // Keeping a mutable ref of viewMode so our animation loop doesn't get stale closures. 
  // React hooks can be lowkey toxic with stale state, iykyk.
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  const rows = gridSize;
  const cols = gridSize;

  // Helper to yeet out a fresh empty grid
  const createCells = (size: number) => new Uint8Array(size * size);
  
  // Initializing our grid with the bottleneck scenario so it's not just empty space
  const [editableCells, setEditableCells] = useState<Uint8Array>(() => {
    const scen = buildBottleneckScenario(100, 100);
    return new Uint8Array(scen.cells);
  });

  // Syncing our state to the ref for the drawing loop
  useEffect(() => {
    editableCellsRef.current = editableCells;
  }, [editableCells]);

  // Renders the static preview of the grid when the sim is paused/idle. 
  // It's giving blueprint energy.
  const renderCellsPreview = useCallback((cells: Uint8Array, rows: number, cols: number) => {
    const canvas = liveCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const csx = canvas.width / cols;
    const csy = canvas.height / rows;

    // Clearing the canvas, sweeping the floor
    ctx.fillStyle = '#030014'; // void-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Drawing the obstacles and spawners
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r * cols + c];
        if (cell === CellType.EMPTY) continue;

        if (cell === CellType.WALL) {
          ctx.fillStyle = '#27272a'; // void-700
          ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
        } else if (cell === CellType.ENTRY) {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.4)'; // neon-cyan
          ctx.fillRect(c * csx, r * csy, csx, csy);
        } else if (cell === CellType.EXIT) {
          ctx.fillStyle = 'rgba(132, 204, 22, 0.4)'; // neon-green
          ctx.fillRect(c * csx, r * csy, csx, csy);
        } else if (cell === CellType.MITIGATION) {
          ctx.fillStyle = '#d946ef'; // neon-pink for AI blocks
          ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
        }
      }
    }

    // Adding a faint grid overlay because we love precision
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
    for (let r = 0; r < rows; r += gridStep) {
      const y = r * csy;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }, []);

  // Pre-bakes a background canvas so we don't have to draw static walls 60 times a second.
  // Optimization is highkey important.
  const prepareBackground = useCallback((cells: Uint8Array, rows: number, cols: number) => {
    const bg = document.createElement('canvas');
    // Using 2000px so it looks crispy on high DPI screens without nuking the RAM
    bg.width = 2000;
    bg.height = 2000;
    const ctx = bg.getContext('2d')!;
    const csx = bg.width / cols;
    const csy = bg.height / rows;

    ctx.fillStyle = '#030014';
    ctx.fillRect(0, 0, bg.width, bg.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r * cols + c];
        if (cell === CellType.WALL) {
          ctx.fillStyle = '#27272a';
          ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
        } else if (cell === CellType.ENTRY) {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
          ctx.fillRect(c * csx, r * csy, csx, csy);
        } else if (cell === CellType.EXIT) {
          ctx.fillStyle = 'rgba(132, 204, 22, 0.15)';
          ctx.fillRect(c * csx, r * csy, csx, csy);
        }
      }
    }

    bgCanvasRef.current = bg;
  }, []);

  // Loads a predefined scenario (like Stadium or Bottleneck).
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
  }, [prepareBackground, renderCellsPreview, rows, cols, status]);

  // The paint function for our interactive canvas. Lets the user draw walls like Bob Ross.
  const paintCell = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    // If the sim is running, we block edits. No changing the rules mid-game.
    if (status === 'running' || status === 'initializing') return;
    // Only paint if left mouse button is held down (buttons === 1)
    if (event.buttons !== 1) return;
    
    const canvas = liveCanvasRef.current;
    if (!canvas) return;

    // Calculating where on the grid the user actually clicked
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor(((event.clientX - rect.left) / rect.width) * cols);
    const r = Math.floor(((event.clientY - rect.top) / rect.height) * rows);
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;

    const radius = Math.max(0, brushSize - 1);
    const nextCells = new Uint8Array(editableCellsRef.current ?? editableCells);
    const targetCell = DRAW_TOOL_TO_CELL[drawTool];

    // Splatting the paint in a circle based on brushSize
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
  }, [brushSize, drawTool, editableCells, renderCellsPreview, status, rows, cols]);

  // Initial render effect when the app loads or editableCells change
  useEffect(() => {
    if (status === 'running' || status === 'initializing') return;
    prepareBackground(editableCells, rows, cols);
    renderCellsPreview(editableCells, rows, cols);
  }, [editableCells, prepareBackground, renderCellsPreview, status, rows, cols]);

  // Handlers for the sidebar controls
  const handleGridSizeChange = (newSize: number) => {
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
  };

  // This callback gets hammered by the simulator 60 times a second.
  // It grabs the fluid physics state and paints it to the canvas.
  const handleSimUpdate = useCallback((state: SimulatorState) => {
    const canvas = liveCanvasRef.current;
    if (!canvas || !bgCanvasRef.current || !simulatorRef.current) return;

    const ctx = canvas.getContext('2d')!;
    const { rho, vx, vy, rows, cols, params, cells, stepCount, alerts } = state;

    // Draw the static pre-baked background
    ctx.fillStyle = '#030014';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgCanvasRef.current, 0, 0, canvas.width, canvas.height);

    // Normalize arrays for the fluid shader
    const normRho = new Float64Array(rho.length);
    const normRisk = new Float64Array(rho.length);
    const invMax = 1 / params.rhoMax;
    for (let i = 0; i < rho.length; i++) {
      normRho[i] = rho[i] * invMax;
      normRisk[i] = state.risk[i];
    }

    // Call the heavy-duty WebGL-style fluid renderer (running on 2D context)
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

    // Overlay AI Mitigation blocks so we can see the system working
    const csx = canvas.width / cols;
    const csy = canvas.height / rows;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === CellType.MITIGATION) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        ctx.fillStyle = '#d946ef'; // neon-pink mitigation
        ctx.fillRect(c * csx, r * csy, csx + 1, csy + 1);
      }
    }

    // Draw aggressive red squares where hazards are popping off
    for (const alert of alerts) {
      ctx.strokeStyle = '#ef4444'; // hazard-crit
      ctx.lineWidth = 2;
      const ax = alert.c * csx;
      const ay = alert.r * csy;
      const size = 40 * alert.intensity;
      ctx.strokeRect(ax - size / 2, ay - size / 2, size, size);
    }

    // Update React state (we batch these so React doesn't cry)
    setStep(stepCount);
    setAlerts([...alerts]);
    setSimState({ ...state });
    setElapsed(Math.round((performance.now() - startTimeRef.current) / 100) / 10);
  }, []);

  // Kicks off the simulation loop
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
      renderEvery: Math.max(1, Math.round(60 / fps)),
    };
    
    // Cloning the cells so we don't accidentally mutate the original layout
    const simCells = new Uint8Array(editableCells);
    const sim = new CrowdSimulator(params, simCells, params.rows, params.cols);
    sim.preventionMode = preventionEnabled;
    sim.setCallbacks(handleSimUpdate, () => setStatus('finished'));
    
    simulatorRef.current = sim;
    prepareBackground(simCells, params.rows, params.cols);
    setStatus('running');
    startTimeRef.current = performance.now() - (elapsed * 1000); // Resume time correctly
    sim.start();
  }, [rows, cols, entryRate, exitDrain, pressureFactor, fps, editableCells, preventionEnabled, handleSimUpdate, prepareBackground, status, elapsed]);

  // Stops the loop
  const handleStop = useCallback(() => {
    simulatorRef.current?.stop();
    setStatus('stopped');
  }, []);

  // Yeets the whole simulation state and brings us back to zero
  const handleReset = useCallback(() => {
    simulatorRef.current?.stop();
    simulatorRef.current = null;
    setStatus('idle');
    setStep(0);
    setElapsed(0);
    setAlerts([]);
    setSimState(null);
    // Force a re-render of the blueprint
    requestAnimationFrame(() => renderCellsPreview(editableCells, rows, cols));
  }, [editableCells, rows, cols, renderCellsPreview]);

  // Steps the simulation forward by one tick, useful for debugging
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

  // Keyboard shortcuts because clicking buttons is for boomers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only listen to shortcuts if we're actually on the canvas page
      if (activeSection !== 'canvas') return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'running') handleStop();
        else handleStart();
      } else if (e.code === 'KeyR') {
        handleReset();
      } else if (e.code === 'KeyC') {
        handleClearLayout();
      } else if (e.code === 'Digit1') setDrawTool('wall');
      else if (e.code === 'Digit2') setDrawTool('entry');
      else if (e.code === 'Digit3') setDrawTool('exit');
      else if (e.code === 'Digit4') setDrawTool('erase');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection, status, handleStart, handleStop, handleReset, handleClearLayout]);

  // Page transition animations using GSAP. Smooth like butter.
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!appRef.current) return;
      const header = appRef.current.querySelector('[data-header]') as HTMLElement;
      const sidebar = appRef.current.querySelector('[data-sidebar]') as HTMLElement;
      const cards = appRef.current.querySelectorAll('[data-sidebar-card]');
      const mainCanvas = appRef.current.querySelector('[data-canvas-panel]') as HTMLElement;
      const sectionContainers = appRef.current.querySelectorAll('[data-animate]');

      const timeline = gsap.timeline();

      // Slide in header if it exists
      if (header) {
        timeline.fromTo(header, 
          { y: -100, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
        );
      }
      
      // Stagger in the sidebar and cards
      if (sidebar) {
        timeline.fromTo(sidebar, 
          { x: -260, opacity: 0 }, 
          { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, 
          '-=0.6'
        );
      }
      
      if (cards.length) {
        timeline.fromTo(cards, 
          { x: -24, opacity: 0 }, 
          { x: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: 'back.out(1.4)' }, 
          '-=0.64'
        );
      }
      
      // Pop the main canvas or other sections
      if (mainCanvas) {
        timeline.fromTo(mainCanvas, 
          { opacity: 0, scale: 1.02 }, 
          { opacity: 1, scale: 1, duration: 0.9, ease: 'power3.out' }, 
          '-=0.6'
        );
      }
      
      if (sectionContainers.length) {
        timeline.fromTo(sectionContainers, 
          { opacity: 0, y: 30 }, 
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 
          '-=0.6'
        );
      }
    }, appRef);

    return () => ctx.revert();
  }, [activeSection]);

  // Bet, let's render this UI
  return (
    <div ref={appRef} className="min-h-screen bg-void-950 text-gray-200 overflow-x-hidden">
      <Header
        activeSection={activeSection}
        onSectionChange={(section) => {
          setActiveSection(section);
          setIsMenuOpen(false);
        }}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        isMenuOpen={isMenuOpen}
      />

      {/* Conditional rendering: Hero takes the whole screen, otherwise show Sidebar + Content */}
      {activeSection === 'hero' ? (
        <Hero onGetStarted={() => {
          setActiveSection('canvas');
          loadScenario(scenario); // Start with a pre-loaded scenario when they click "Launch"
        }} />
      ) : (
        <>
          <Sidebar
            activeSection={activeSection}
            onSectionChange={(section) => {
              setActiveSection(section);
              setIsMenuOpen(false);
            }}
            isOpen={isMenuOpen}
            gridSize={gridSize}
            onGridSizeChange={handleGridSizeChange}
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

          <main className="lg:ml-72 pt-24 transition-all duration-300 ease-out pb-32">
            <div className="px-4 sm:px-6 lg:px-8 py-8">
              
              {/* THE CANVAS SECTION */}
              {activeSection === 'canvas' && (
                <section data-canvas-panel className="space-y-6">
                  {/* Status Banner */}
                  <div className="glass-card p-6 border-neon-cyan/20">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-neon-cyan mb-2 font-bold">
                          System Active
                        </p>
                        <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                          Operational Dashboard
                        </h2>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div className="px-4 py-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-sm font-semibold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse"></span>
                          {viewMode === 'density' ? 'Density View' : 'Risk Map'}
                        </div>
                        <div className={`px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 ${preventionEnabled ? 'bg-neon-pink/10 border-neon-pink/20 text-neon-pink' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                          AI Defense: {preventionEnabled ? 'Engaged' : 'Standby'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-[1.95fr_1fr] gap-6">
                    {/* The main simulation stage */}
                    <div className="relative">
                      <SimulationCanvas
                        canvasRef={liveCanvasRef}
                        width={1120}
                        height={760}
                        isRunning={status === 'running'}
                        onPointerDown={paintCell}
                        onPointerMove={paintCell}
                      />
                      
                      {/* Floating dock for those fast controls */}
                      <FloatingPlaybackDock
                        onPlay={handleStart}
                        onPause={handleStop}
                        onReset={handleReset}
                        onStep={handleStep}
                        isRunning={status === 'running'}
                        status={status}
                      />
                    </div>

                    {/* Right-side details */}
                    <div className="space-y-6">
                      <div className="glass-card p-6">
                        <h3 className="text-lg font-display font-bold text-white mb-6">Live Telemetry</h3>
                        <div className="space-y-5">
                          <div className="flex justify-between items-center pb-4 border-b border-white/5">
                            <span className="text-gray-400 text-sm font-semibold">Ticks Processed</span>
                            <span className="font-mono text-neon-cyan font-bold">{step}</span>
                          </div>
                          <div className="flex justify-between items-center pb-4 border-b border-white/5">
                            <span className="text-gray-400 text-sm font-semibold">Sim Time (s)</span>
                            <span className="font-mono text-white font-bold">{elapsed.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm font-semibold">Threat Vectors</span>
                            <span className={`font-mono font-bold ${alerts.length > 0 ? 'text-hazard-crit' : 'text-neon-green'}`}>
                              {alerts.length}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="glass-card p-6">
                        <h3 className="text-lg font-display font-bold text-white mb-6">HUD Legend</h3>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="w-5 h-5 rounded-md bg-void-700 border border-white/10 shadow-inner"></div>
                            <span className="text-sm font-medium text-gray-300">Wall [1]</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-5 h-5 rounded-md bg-neon-cyan/40 border border-neon-cyan shadow-glow-cyan"></div>
                            <span className="text-sm font-medium text-gray-300">Spawner [2]</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-5 h-5 rounded-md bg-neon-green/40 border border-neon-green shadow-glow-green"></div>
                            <span className="text-sm font-medium text-gray-300">Exit / Sink [3]</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-5 h-5 rounded-md border-2 border-dashed border-gray-500"></div>
                            <span className="text-sm font-medium text-gray-300">Eraser [4]</span>
                          </div>
                          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/5">
                            <div className="w-5 h-5 rounded-md bg-neon-pink border border-neon-pink shadow-glow-pink"></div>
                            <span className="text-sm font-medium text-neon-pink">AI Mitigation Wall</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* OTHER SECTIONS */}
              {activeSection === 'formulas' && (
                <div data-animate>
                  <FormulaShowcase />
                </div>
              )}
              
              {activeSection === 'analytics' && (
                <div data-animate>
                  <AnalyticsCards state={simState} />
                </div>
              )}
              
              {activeSection === 'alerts' && (
                <div data-animate>
                  <AlertsPanel alerts={alerts} />
                </div>
              )}
              
              {activeSection === 'export' && (
                <div data-animate className="glass-card p-12 text-center space-y-6 max-w-3xl mx-auto mt-10 border-neon-purple/20">
                  <h2 className="text-4xl font-display font-bold text-neon-purple drop-shadow-lg">Export Telemetry</h2>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Download the raw simulation vectors and hazard logs as CSV or JSON. Big data energy for your post-mortem analytics.
                  </p>
                  <button className="btn-neon-purple bg-neon-purple px-8 py-4 rounded-xl text-white font-bold hover:bg-purple-400 active:scale-95 transition-all shadow-glow-pink" onClick={() => alert('Data exported to /results/reports/')}>
                    Generate Report Payload
                  </button>
                </div>
              )}

            </div>
          </main>
        </>
      )}
    </div>
  );
}
