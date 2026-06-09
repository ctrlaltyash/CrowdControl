// The Sidebar. This is where all the knobs and dials live. Big control panel energy.
import { useEffect, useRef } from 'react';
import { Settings2, Grid, Activity, Droplet, ShieldAlert } from 'lucide-react';
import gsap from 'gsap';
import type { SimStatus } from '../../backend/engine/types';

type DrawTool = 'wall' | 'entry' | 'exit' | 'erase';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isOpen: boolean;
  gridSize: number;
  onGridSizeChange: (value: number) => void;
  fps: number;
  onFpsChange: (value: number) => void;
  entryRate: number;
  onEntryRateChange: (value: number) => void;
  pressureFactor: number;
  onPressureFactorChange: (value: number) => void;
  exitDrain: number;
  onExitDrainChange: (value: number) => void;
  preventionEnabled: boolean;
  onPreventionChange: (value: boolean) => void;
  viewMode: 'density' | 'risk';
  onViewModeChange: (mode: 'density' | 'risk') => void;
  drawTool: DrawTool;
  onDrawToolChange: (tool: DrawTool) => void;
  brushSize: number;
  onBrushSizeChange: (value: number) => void;
  scenario: 'bottleneck' | 'stadium';
  onScenarioChange: (scenario: 'bottleneck' | 'stadium') => void;
  onClearLayout: () => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  isRunning: boolean;
  status: SimStatus;
  step: number;
  elapsed: number;
}

const DRAW_TOOLS: Array<[DrawTool, string]> = [
  ['wall', 'Wall'],
  ['entry', 'Spawner'],
  ['exit', 'Sink'],
  ['erase', 'Eraser'],
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  gridSize,
  onGridSizeChange,
  fps,
  onFpsChange,
  entryRate,
  onEntryRateChange,
  pressureFactor,
  onPressureFactorChange,
  exitDrain,
  onExitDrainChange,
  preventionEnabled,
  onPreventionChange,
  viewMode,
  onViewModeChange,
  drawTool,
  onDrawToolChange,
  brushSize,
  onBrushSizeChange,
  scenario,
  onScenarioChange,
  onClearLayout,
  isRunning,
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Sliding in from the left on load
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!sidebarRef.current) return;
      gsap.fromTo(
        sidebarRef.current,
        { x: -300, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      );
    }, sidebarRef);

    return () => ctx.revert();
  }, []);

  return (
    <aside
      data-sidebar
      ref={sidebarRef}
      className={`fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto bg-void-900 border-r border-white/5 transition-transform duration-300 pt-20 pb-10 custom-scrollbar ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="p-5 space-y-6">
        
        {/* Core Settings Block */}
        <div className="glass-card p-5" data-sidebar-card>
          <div className="flex items-center gap-2 mb-4 text-white font-display font-bold">
            <Settings2 size={18} className="text-neon-cyan" />
            <h3>Engine Params</h3>
          </div>
          
          <div className="space-y-5">
            {/* Grid Size Slider */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="slider-label">Resolution</label>
                <span className="text-xs text-neon-cyan font-mono font-bold">{gridSize}²</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                step="10"
                value={gridSize}
                onChange={(e) => onGridSizeChange(Number(e.target.value))}
                className="slider-input"
                disabled={isRunning}
              />
            </div>

            {/* FPS Slider */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="slider-label">Tick Rate</label>
                <span className="text-xs text-white font-mono font-bold">{fps} fps</span>
              </div>
              <input
                type="range"
                min="30"
                max="120"
                step="5"
                value={fps}
                onChange={(e) => onFpsChange(Number(e.target.value))}
                className="slider-input"
                disabled={isRunning}
              />
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="glass-card p-5" data-sidebar-card>
          <div className="flex items-center gap-2 mb-4 text-white font-display font-bold">
            <Activity size={18} className="text-neon-pink" />
            <h3>Lens Filter</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-2 bg-void-950 p-1.5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => onViewModeChange('density')}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'density' ? 'bg-neon-cyan text-white shadow-glow-cyan' : 'text-gray-500 hover:text-white'
              }`}
            >
              Density
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('risk')}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'risk' ? 'bg-neon-pink text-white shadow-glow-pink' : 'text-gray-500 hover:text-white'
              }`}
            >
              Risk Heat
            </button>
          </div>
        </div>

        {/* Physics Variables */}
        <div className="glass-card p-5" data-sidebar-card>
          <div className="flex items-center gap-2 mb-4 text-white font-display font-bold">
            <Droplet size={18} className="text-neon-green" />
            <h3>Fluid Dynamics</h3>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between mb-1">
                <label className="slider-label">Spawn Rate</label>
                <span className="text-xs text-neon-green font-mono font-bold">{entryRate}</span>
              </div>
              <input
                type="range"
                min="10"
                max="140"
                step="2"
                value={entryRate}
                onChange={(e) => onEntryRateChange(Number(e.target.value))}
                className="slider-input"
                disabled={isRunning}
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="slider-label">Panic Pressure</label>
                <span className="text-xs text-neon-pink font-mono font-bold">{pressureFactor.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="0.1"
                value={pressureFactor}
                onChange={(e) => onPressureFactorChange(Number(e.target.value))}
                className="slider-input"
                disabled={isRunning}
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <label className="slider-label">Drain Efficiency</label>
                <span className="text-xs text-white font-mono font-bold">{exitDrain.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={exitDrain}
                onChange={(e) => onExitDrainChange(Number(e.target.value))}
                className="slider-input"
                disabled={isRunning}
              />
            </div>
          </div>
        </div>

        {/* AI Defense */}
        <div className="glass-card p-5" data-sidebar-card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-display font-bold">
              <ShieldAlert size={18} className="text-neon-purple" />
              <h3>AI Defense</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={preventionEnabled}
                onChange={(e) => onPreventionChange(e.target.checked)}
              />
              <div className="w-11 h-6 bg-void-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-purple shadow-glow-pink"></div>
            </label>
          </div>
        </div>

        {/* Level Editor */}
        <div className="glass-card p-5" data-sidebar-card>
          <div className="flex items-center gap-2 mb-4 text-white font-display font-bold">
            <Grid size={18} className="text-gray-400" />
            <h3>Level Architect</h3>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {DRAW_TOOLS.map(([tool, label]) => (
              <button
                key={tool}
                onClick={() => onDrawToolChange(tool)}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  drawTool === tool 
                    ? 'bg-white text-void-950 shadow-glass' 
                    : 'bg-void-800 text-gray-400 hover:bg-void-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="slider-label">Brush Scale</label>
              <span className="text-xs text-white font-mono font-bold">{brushSize}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="slider-input"
              disabled={isRunning}
            />
          </div>

          <div className="space-y-2 pt-4 border-t border-white/5">
            <p className="slider-label mb-2">Scenarios</p>
            {['bottleneck', 'stadium'].map((option) => (
              <button
                key={option}
                onClick={() => onScenarioChange(option as 'bottleneck' | 'stadium')}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${
                  scenario === option 
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' 
                    : 'bg-void-800 text-gray-400 hover:bg-void-700 border border-transparent'
                }`}
              >
                {option} Matrix
              </button>
            ))}
            
            <button
              onClick={onClearLayout}
              className="w-full py-2.5 mt-2 rounded-xl text-sm font-bold bg-hazard-crit/10 text-hazard-crit border border-hazard-crit/30 hover:bg-hazard-crit/20 transition-all"
              disabled={isRunning}
            >
              Nuke Layout
            </button>
          </div>
        </div>

      </div>
    </aside>
  );
};
