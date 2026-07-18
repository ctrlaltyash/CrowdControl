/* ─────────────────────────────────────────────────────────────
   Component Exports - Centralized module for UI components.
   ───────────────────────────────────────────────────────────── */

// Exporting core application components to facilitate module resolution.

export { Header } from './Header'; // Fixed top navigation bar.
export { Sidebar } from './Sidebar'; // Primary configuration and control panel.
export { Hero } from './Hero'; // Landing page hero section.
export { FormulaShowcase } from './FormulaShowcase'; // Presentation layer for mathematical models.
export { AnalyticsCards } from './AnalyticsCards'; // Real-time statistical metrics dashboard.
export { AlertsPanel } from './AlertsPanel'; // Active hazard and risk notification center.
export { SimulationCanvas } from './SimulationCanvas'; // Live heatmap and flow visualization canvas.
export { ControlPanel } from './ControlPanel'; // Simulation execution controls.
export { LiveTelemetryCharts, type LiveTelemetryPoint } from './LiveTelemetryCharts';
export { FloatingPlaybackDock } from './FloatingPlaybackDock'; // Bottom toolbar for quick playback actions.
