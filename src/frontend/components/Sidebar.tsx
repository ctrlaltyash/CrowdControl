/* ─────────────────────────────────────────────────────────────
   Sidebar Component - Navigation & Control Center
   ───────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import {
  Activity,
  Zap,
  BarChart3,
  AlertTriangle,
  Settings,
  Download,
  ChevronRight,
} from 'lucide-react';
import gsap from 'gsap';
import { ControlPanel } from './ControlPanel';
import { setupButtonRipple, setupMagneticHover, setupCardHoverAnimation } from '../utils/gsapAnimations';
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

const SECTIONS = [
  { id: 'canvas', label: 'Simulation', icon: Activity },
  { id: 'formulas', label: 'Formulas', icon: Zap },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'export', label: 'Export', icon: Download },
];

const DRAW_TOOLS: Array<[DrawTool, string]> = [
  ['wall', 'Wall'],
  ['entry', 'Entry'],
  ['exit', 'Exit'],
  ['erase', 'Erase'],
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
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
  onPlay,
  onPause,
  onReset,
  isRunning,
  status,
  step,
  elapsed,
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const entryLabelRef = useRef<HTMLSpanElement>(null);
  const pressureLabelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!sidebarRef.current) return;
    gsap.fromTo(
      sidebarRef.current,
      { x: -280, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.85, ease: 'power3.out' }
    );
  }, []);

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    buttonRefs.current.forEach((button) => {
      if (!button) return;
      setupButtonRipple(button);
      cleanups.push(setupMagneticHover(button, 16));
    });

    cardRefs.current.forEach((card) => {
      if (!card) return;
      setupCardHoverAnimation(card);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  useEffect(() => {
    const tween = { value: entryRate };
    gsap.to(tween, {
      value: entryRate,
      duration: 0.45,
      ease: 'power1.out',
      onUpdate: () => {
        if (entryLabelRef.current) {
          entryLabelRef.current.textContent = `${Math.round(tween.value)} p/min`;
        }
      },
    });
  }, [entryRate]);

  useEffect(() => {
    const tween = { value: pressureFactor };
    gsap.to(tween, {
      value: pressureFactor,
      duration: 0.45,
      ease: 'power1.out',
      onUpdate: () => {
        if (pressureLabelRef.current) {
          pressureLabelRef.current.textContent = `${tween.value.toFixed(1)}×`;
        }
      },
    });
  }, [pressureFactor]);

  return (
    <aside
      data-sidebar
      ref={sidebarRef}
      className={`fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-indigo-glow/20 bg-obsdian-900/70 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
    >
      <div className="px-5 py-6 space-y-6">
        <ControlPanel
          onPlay={onPlay}
          onPause={onPause}
          onReset={onReset}
          isRunning={isRunning}
          step={step}
          elapsed={elapsed}
        />

        <div className="glass-card p-5" data-sidebar-card ref={(el) => { cardRefs.current[0] = el; }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Core Controls</p>
              <h3 className="mt-2 text-lg font-bold text-text-primary">Simulation Details</h3>
            </div>
            <div className="p-2 rounded-2xl bg-obsdian-950/80 border border-cyan-cyber/15 text-cyan-cyber text-xs font-semibold">
              {status === 'running' ? 'Active' : 'Standby'}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 rounded-3xl border border-white/5 bg-obsdian-800/80 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Grid</p>
                <p className="font-semibold text-text-primary">{gridSize} × {gridSize}</p>
              </div>
              <span className="text-sm text-text-secondary">Resolution</span>
            </div>

            <div>
              <label className="slider-label">Grid Size</label>
              <input
                type="range"
                min="50"
                max="150"
                step="10"
                value={gridSize}
                onChange={(event) => onGridSizeChange(Number(event.target.value))}
                className="slider-input"
                disabled={isRunning}
              />
              <p className="slider-value">{gridSize} cells</p>
            </div>

            <div>
              <label className="slider-label">Target FPS</label>
              <input
                type="range"
                min="30"
                max="120"
                step="5"
                value={fps}
                onChange={(event) => onFpsChange(Number(event.target.value))}
                className="slider-input"
                disabled={isRunning}
              />
              <p className="slider-value">{fps} fps</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5" data-sidebar-card ref={(el) => { cardRefs.current[1] = el; }}>
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Flow Parameters</p>
            <h3 className="mt-2 text-lg font-bold text-text-primary">Risk & Pressure</h3>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="slider-label">Entry Rate</label>
                <span ref={entryLabelRef} className="font-semibold text-cyan-cyber">{Math.round(entryRate)} p/min</span>
              </div>
              <input
                type="range"
                min="10"
                max="140"
                step="2"
                value={entryRate}
                onChange={(event) => onEntryRateChange(Number(event.target.value))}
                className="slider-input"
                disabled={isRunning}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="slider-label">Pressure Factor</label>
                <span ref={pressureLabelRef} className="font-semibold text-emerald-math">{pressureFactor.toFixed(1)}×</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="0.1"
                value={pressureFactor}
                onChange={(event) => onPressureFactorChange(Number(event.target.value))}
                className="slider-input"
                disabled={isRunning}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="slider-label">Exit Drain</label>
                <span className="font-semibold text-text-primary">{exitDrain.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={exitDrain}
                onChange={(event) => onExitDrainChange(Number(event.target.value))}
                className="slider-input"
                disabled={isRunning}
              />
            </div>
          </div>
        </div>

        <div className="glass-card p-5" data-sidebar-card ref={(el) => { cardRefs.current[2] = el; }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-text-muted">AI Control</p>
              <h3 className="mt-2 text-lg font-bold text-text-primary">Mitigation Engine</h3>
            </div>
            <div className={`toggle-switch ${preventionEnabled ? 'active' : ''}`} onClick={() => onPreventionChange(!preventionEnabled)}>
              <input type="checkbox" checked={preventionEnabled} readOnly />
              <span className="toggle-thumb" />
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            When enabled, the AI mitigation layer dynamically shapes crowd flow and emergency barriers in real time.
          </p>
        </div>

        <div className="glass-card p-5" data-sidebar-card ref={(el) => { cardRefs.current[3] = el; }}>
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Drawing Tools</p>
            <h3 className="mt-2 text-lg font-bold text-text-primary">Layout Builder</h3>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {DRAW_TOOLS.map(([tool, label], index) => (
              <button
                key={tool}
                ref={(el) => { buttonRefs.current[index] = el; }}
                type="button"
                onClick={() => onDrawToolChange(tool)}
                className={`p-3 rounded-2xl text-sm font-semibold transition-all ${drawTool === tool ? 'bg-cyan-cyber/20 text-cyan-cyber border border-cyan-cyber/30' : 'bg-obsdian-800 text-text-secondary hover:bg-obsdian-700'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="slider-label">Brush Size</label>
            <input
              type="range"
              min="1"
              max="10"
              value={brushSize}
              onChange={(event) => onBrushSizeChange(Number(event.target.value))}
              className="slider-input"
              disabled={isRunning}
            />
            <p className="slider-value">{brushSize} px radius</p>
          </div>
        </div>

        <div className="glass-card p-5" data-sidebar-card ref={(el) => { cardRefs.current[4] = el; }}>
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Scenario</p>
            <h3 className="mt-2 text-lg font-bold text-text-primary">Deploy Layout</h3>
          </div>

          <div className="space-y-3 mb-4">
            {['bottleneck', 'stadium'].map((option) => (
              <button
                key={option}
                ref={(el) => { buttonRefs.current[DRAW_TOOLS.length + (option === 'stadium' ? 1 : 0)] = el; }}
                type="button"
                onClick={() => onScenarioChange(option as 'bottleneck' | 'stadium')}
                className={`w-full rounded-2xl px-4 py-3 text-left font-semibold text-sm transition-all ${scenario === option ? 'bg-cyan-cyber/20 text-cyan-cyber border border-cyan-cyber/30' : 'bg-obsdian-800 text-text-secondary hover:bg-obsdian-700'}`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)} layout
              </button>
            ))}
          </div>

          <button
            ref={(el) => { buttonRefs.current[buttonRefs.current.length] = el; }}
            onClick={onClearLayout}
            type="button"
            className="btn-secondary w-full"
            disabled={isRunning}
          >
            Clear Layout
          </button>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Active navigation</p>
              <h3 className="mt-2 text-lg font-bold text-text-primary">Quick Access</h3>
            </div>
            <ChevronRight size={20} className="text-cyan-cyber" />
          </div>

          <div className="grid gap-3">
            {SECTIONS.map((section, index) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  ref={(el) => { buttonRefs.current[buttonRefs.current.length + index] = el; }}
                  onClick={() => onSectionChange(section.id)}
                  type="button"
                  className={`w-full rounded-2xl px-4 py-3 flex items-center justify-between text-sm font-medium transition-all ${activeSection === section.id ? 'bg-indigo-electric/15 border border-indigo-electric/30 text-indigo-electric' : 'bg-obsdian-800 text-text-secondary hover:bg-obsdian-700'}`}
                >
                  <span>{section.label}</span>
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
