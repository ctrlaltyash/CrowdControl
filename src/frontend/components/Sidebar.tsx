// The Sidebar. This is where all the knobs and dials live. Big control panel energy.
// Lowkey the brain of the operation. Don't touch if u don't know the vibes.
import { useEffect, useRef, useState } from 'react';
import { Settings2, Grid, Activity, Droplet, ShieldAlert, ChevronDown } from 'lucide-react';
import gsap from 'gsap';
import type { SimStatus } from '../../backend/engine/types';

// Types for our drawin' tools. Pick your weapon.
type DrawTool = 'wall' | 'entry' | 'exit' | 'erase';

// Props interface, no cap. Everything we need to talk to the rest of the app.
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

  // Yashvardhan 2026 Model
  rhoMax: number;
  onRhoMaxChange: (value: number) => void;
  rhoCrit: number;
  onRhoCritChange: (value: number) => void;
  beta: number;
  onBetaChange: (value: number) => void;
  pressureK: number;
  onPressureKChange: (value: number) => void;
  pressureN: number;
  onPressureNChange: (value: number) => void;
  diffusivity: number;
  onDiffusivityChange: (value: number) => void;
  camaraderieG: number;
  onCamaraderieGChange: (value: number) => void;
  camaraderieI: number;
  onCamaraderieIChange: (value: number) => void;
  camaraderieM: number;
  onCamaraderieMChange: (value: number) => void;

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

// All the tools we can use to mess with the map.
const DRAW_TOOLS: Array<[DrawTool, string]> = [
  ['wall', 'Wall'],
  ['entry', 'Spawner'],
  ['exit', 'Sink'],
  ['erase', 'Eraser'],
];

interface SectionHeaderProps {
  id: string;
  icon: React.ElementType;
  title: string;
  colorClass?: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

const SectionHeader = ({ id, icon: Icon, title, colorClass = "text-neon-cyan", isExpanded, onToggle }: SectionHeaderProps) => (
  <button
    type="button"
    onClick={() => onToggle(id)}
    className="flex items-center justify-between w-full mb-4 text-foreground font-display font-semibold group rounded-lg"
    aria-expanded={isExpanded}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-background-base border border-border-default group-hover:border-border-hover transition-colors ${colorClass}`}>
        <Icon size={16} />
      </div>
      <h3 className="text-sm tracking-tight">{title}</h3>
    </div>
    <ChevronDown 
      size={14} 
      className={`text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
    />
  </button>
);

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

  rhoMax,
  onRhoMaxChange,
  rhoCrit,
  onRhoCritChange,
  beta,
  onBetaChange,
  pressureK,
  onPressureKChange,
  pressureN,
  onPressureNChange,
  diffusivity,
  onDiffusivityChange,
  camaraderieG,
  onCamaraderieGChange,
  camaraderieI,
  onCamaraderieIChange,
  camaraderieM,
  onCamaraderieMChange,

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
  const [expandedSection, setExpandedSection] = useState<string | null>('engine');

  // Sliding in from the left on load. Buttery smooth, fr.
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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <aside
      data-sidebar
      ref={sidebarRef}
      className={`fixed inset-y-0 left-0 z-40 w-80 overflow-y-auto bg-background-base/84 backdrop-blur-3xl border-r border-border-default transition-transform duration-300 pt-24 pb-12 custom-scrollbar ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="p-6 space-y-8">

        {/* Core Settings Block */}
        <div className="glass-card p-6" data-sidebar-card>
          <SectionHeader 
            id="engine" 
            icon={Settings2} 
            title="Engine Dynamics" 
            isExpanded={expandedSection === 'engine'} 
            onToggle={toggleSection} 
          />

          <div className={`space-y-6 overflow-hidden transition-all duration-500 ${expandedSection === 'engine' ? 'max-h-[500px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
            <div>
              <div className="flex justify-between mb-2">
                <label className="slider-label uppercase">Resolution</label>
                <span className="text-[10px] text-neon-cyan font-mono font-black">{gridSize}²</span>
              </div>
              <input
                type="range" min="50" max="150" step="10"
                value={gridSize}
                onChange={(e) => onGridSizeChange(Number(e.target.value))}
                className="sci-slider-input"
                disabled={isRunning}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="slider-label uppercase">Tick Rate</label>
                <span className="text-[10px] text-white font-mono font-black">{fps} FPS</span>
              </div>
              <input
                type="range" min="30" max="120" step="5"
                value={fps}
                onChange={(e) => onFpsChange(Number(e.target.value))}
                className="sci-slider-input"
                disabled={isRunning}
              />
            </div>

            <div className="pt-4 border-t border-white/5">
              <label className="slider-label uppercase mb-3">Lens Filter</label>
              <div className="grid grid-cols-2 gap-2 bg-background-base/60 p-1 rounded-lg border border-border-default">
                <button
                  type="button"
                  onClick={() => onViewModeChange('density')}
                  className={`py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewMode === 'density' ? 'bg-accent text-white shadow-accent' : 'text-foreground-muted hover:text-white'
                  }`}
                >
                  Density
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange('risk')}
                  className={`py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewMode === 'risk' ? 'bg-accent-bright text-white shadow-accent' : 'text-foreground-muted hover:text-white'
                  }`}
                >
                  Risk
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Yashvardhan 2026 Model Section */}
        <div className="glass-card p-6" data-sidebar-card>
          <SectionHeader 
            id="model" 
            icon={Activity} 
            title="Nonlinear Model" 
            colorClass="text-neon-purple" 
            isExpanded={expandedSection === 'model'} 
            onToggle={toggleSection} 
          />

          <div className={`space-y-6 overflow-hidden transition-all duration-500 ${expandedSection === 'model' ? 'max-h-[800px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
            {[
              { label: 'Max Density (ρₘₐₓ)', val: rhoMax, min: 4, max: 12, step: 0.5, fn: onRhoMaxChange },
              { label: 'Crit Density (ρ꜀ᵣᵢₜ)', val: rhoCrit, min: 1, max: 6, step: 0.2, fn: onRhoCritChange },
              { label: 'Mobility (β)', val: beta, min: 1, max: 4, step: 0.1, fn: onBetaChange },
              { label: 'Pressure (k)', val: pressureK, min: 0, max: 5, step: 0.1, fn: onPressureKChange },
              { label: 'Pressure (n)', val: pressureN, min: 2, max: 6, step: 0.1, fn: onPressureNChange },
              { label: 'Diffusion (D)', val: diffusivity.toFixed(3), min: 0, max: 0.1, step: 0.005, fn: (v: number) => onDiffusivityChange(v) },
            ].map((p, i) => (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <label className="slider-label uppercase">{p.label}</label>
                  <span className="text-[10px] text-neon-purple font-mono font-black">{p.val}</span>
                </div>
                <input
                  type="range" min={p.min} max={p.max} step={p.step}
                  value={Number(p.val)} onChange={(e) => p.fn(Number(e.target.value))}
                  className="sci-slider-input" disabled={isRunning}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Camaraderie & Risk Section */}
        <div className="glass-card p-6" data-sidebar-card>
          <SectionHeader 
            id="social" 
            icon={ShieldAlert} 
            title="Social Dynamics" 
            colorClass="text-neon-pink" 
            isExpanded={expandedSection === 'social'} 
            onToggle={toggleSection} 
          />

          <div className={`space-y-6 overflow-hidden transition-all duration-500 ${expandedSection === 'social' ? 'max-h-[500px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
            {[
              { label: 'Coordination (G)', val: camaraderieG, min: 0, max: 1, step: 0.05, fn: onCamaraderieGChange },
              { label: 'Independence (I)', val: camaraderieI, min: 0, max: 1, step: 0.05, fn: onCamaraderieIChange },
              { label: 'Crowd Exp (m)', val: camaraderieM, min: 1, max: 3, step: 0.1, fn: onCamaraderieMChange },
            ].map((p, i) => (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <label className="slider-label uppercase">{p.label}</label>
                  <span className="text-[10px] text-neon-pink font-mono font-black">{p.val}</span>
                </div>
                <input
                  type="range" min={p.min} max={p.max} step={p.step}
                  value={p.val} onChange={(e) => p.fn(Number(e.target.value))}
                  className="sci-slider-input pink-accent" disabled={isRunning}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Fluid Dynamics */}
        <div className="glass-card p-6" data-sidebar-card>
          <SectionHeader 
            id="fluid" 
            icon={Droplet} 
            title="Fluid Physics" 
            colorClass="text-neon-green" 
            isExpanded={expandedSection === 'fluid'} 
            onToggle={toggleSection} 
          />

          <div className={`space-y-6 overflow-hidden transition-all duration-500 ${expandedSection === 'fluid' ? 'max-h-[500px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
            <div>
              <div className="flex justify-between mb-2">
                <label className="slider-label uppercase">Spawn Rate</label>
                <span className="text-[10px] text-neon-green font-mono font-black">{entryRate}</span>
              </div>
              <input
                type="range" min="10" max="140" step="2"
                value={entryRate} onChange={(e) => onEntryRateChange(Number(e.target.value))}
                className="sci-slider-input" disabled={isRunning}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="slider-label uppercase">Panic Factor</label>
                <span className="text-[10px] text-neon-pink font-mono font-black">{pressureFactor.toFixed(1)}x</span>
              </div>
              <input
                type="range" min="1" max="6" step="0.1"
                value={pressureFactor} onChange={(e) => onPressureFactorChange(Number(e.target.value))}
                className="sci-slider-input pink-accent" disabled={isRunning}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="slider-label uppercase">Efficiency</label>
                <span className="text-[10px] text-white font-mono font-black">{exitDrain.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0.1" max="0.8" step="0.05"
                value={exitDrain} onChange={(e) => onExitDrainChange(Number(e.target.value))}
                className="sci-slider-input" disabled={isRunning}
              />
            </div>
          </div>
        </div>

        {/* AI Defense */}
        <div className="glass-card p-6" data-sidebar-card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background-base border border-border-default text-accent-bright shadow-accent">
                <ShieldAlert size={16} />
              </div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">AI Defense</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={preventionEnabled}
                onChange={(e) => onPreventionChange(e.target.checked)}
              />
              <div className="w-11 h-6 bg-white/[0.08] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"></div>
            </label>
          </div>
        </div>

        {/* Map Architech */}
        <div className="glass-card p-6" data-sidebar-card>
          <SectionHeader 
            id="editor" 
            icon={Grid} 
            title="Map Architect" 
            colorClass="text-gray-400" 
            isExpanded={expandedSection === 'editor'} 
            onToggle={toggleSection} 
          />

          <div className={`space-y-6 overflow-hidden transition-all duration-500 ${expandedSection === 'editor' ? 'max-h-[800px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
            <div className="grid grid-cols-2 gap-2">
              {DRAW_TOOLS.map(([tool, label]) => (
                <button
                  key={tool}
                  onClick={() => onDrawToolChange(tool)}
                  className={`py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                    drawTool === tool 
                      ? 'bg-accent text-white border-border-accent shadow-accent' 
                      : 'bg-white/[0.04] text-foreground-muted border-border-default hover:border-border-hover hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="slider-label uppercase">Brush Scale</label>
                <span className="text-[10px] text-white font-mono font-black">{brushSize}PX</span>
              </div>
              <input
                type="range" min="1" max="10"
                value={brushSize} onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                className="sci-slider-input" disabled={isRunning}
              />
            </div>

            <div className="space-y-3 pt-6 border-t border-white/5">
              <label className="slider-label uppercase">Templates</label>
              {['bottleneck', 'stadium'].map((option) => (
                <button
                  key={option}
                  onClick={() => onScenarioChange(option as 'bottleneck' | 'stadium')}
                  className={`w-full py-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                    scenario === option 
                      ? 'bg-accent/[0.16] text-white border-border-accent shadow-accent' 
                      : 'bg-white/[0.04] text-foreground-muted border-border-default hover:border-border-hover hover:text-white'
                  }`}
                >
                  {option} Matrix
                </button>
              ))}

              <button
                onClick={onClearLayout}
                className="w-full py-4 mt-4 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] bg-hazard-crit/5 text-hazard-crit border border-hazard-crit/20 hover:bg-hazard-crit/10 transition-all"
                disabled={isRunning}
              >
                Reset Canvas
              </button>
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
};
