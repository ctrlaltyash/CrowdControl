/* ─────────────────────────────────────────────────────────────
   Mock Data - Client-side Data for Premium UI Display
   ───────────────────────────────────────────────────────────── */

export interface MetricData {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'stable';
  trendPercent?: number;
}

export interface Formula {
  id: string;
  title: string;
  latex: string;
  category: 'fluid-dynamics' | 'risk-assessment' | 'mitigation' | 'density';
  description: string;
  variables?: Array<{
    symbol: string;
    meaning: string;
  }>;
  explanation: string;
}

export interface AnalyticsSnapshot {
  timestamp: string;
  metrics: MetricData[];
  alerts: AlertItem[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertItem {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  location?: string;
}

export interface SimulationState {
  status: 'idle' | 'running' | 'paused' | 'completed';
  step: number;
  elapsed: number;
  progress: number;
}

/* ───────────────────────────────────────────────────────────── */
/* FORMULAS DATA - Complex Mathematical Representations */
/* ───────────────────────────────────────────────────────────── */

export const FORMULAS: Formula[] = [
  {
    id: 'continuity-eq',
    title: 'Continuity Equation',
    latex: '\\frac{\\partial \\rho}{\\partial t} + \\nabla \\cdot (\\rho \\mathbf{v}) = 0',
    category: 'fluid-dynamics',
    description: 'Conservation of mass in fluid flow',
    variables: [
      { symbol: '\\rho', meaning: 'Density' },
      { symbol: '\\mathbf{v}', meaning: 'Velocity vector' },
      { symbol: 't', meaning: 'Time' },
    ],
    explanation:
      'Fundamental principle stating that mass cannot be created or destroyed. The rate of density change plus the divergence of mass flux equals zero.',
  },
  {
    id: 'momentum-eq',
    title: 'Momentum Equation',
    latex: '\\rho \\frac{D\\mathbf{v}}{Dt} = -\\nabla p + \\mu \\nabla^2 \\mathbf{v} + \\mathbf{f}',
    category: 'fluid-dynamics',
    description: "Newton's second law applied to fluid elements",
    variables: [
      { symbol: 'p', meaning: 'Pressure' },
      { symbol: '\\mu', meaning: 'Dynamic viscosity' },
      { symbol: '\\mathbf{f}', meaning: 'Body forces' },
    ],
    explanation:
      "Expresses Newton's second law for fluids. Acceleration equals pressure gradient, viscous forces, and external forces normalized by density.",
  },
  {
    id: 'risk-assessment',
    title: 'Risk Assessment Model',
    latex: 'R(x,y,t) = \\alpha \\rho + \\delta \\partial_t \\rho + \\gamma \\|\\nabla v\\| + \\eta p',
    category: 'risk-assessment',
    description: 'Multi-factor crowd safety risk quantification',
    variables: [
      { symbol: 'R', meaning: 'Risk index' },
      { symbol: '\\alpha, \\delta, \\gamma, \\eta', meaning: 'Weighting parameters' },
    ],
    explanation:
      'Combines density, density acceleration, velocity gradient, and pressure into a composite risk metric for predicting dangerous crowd behavior.',
  },
  {
    id: 'vorticity',
    title: 'Vorticity Tensor',
    latex: '\\omega_{ij} = \\frac{1}{2}\\left(\\frac{\\partial v_j}{\\partial x_i} - \\frac{\\partial v_i}{\\partial x_j}\\right)',
    category: 'fluid-dynamics',
    description: 'Rotation and shear in fluid flow',
    variables: [
      { symbol: '\\omega_{ij}', meaning: 'Vorticity components' },
      { symbol: 'v_i, v_j', meaning: 'Velocity components' },
    ],
    explanation:
      'Quantifies local rotational motion in the fluid. Essential for understanding flow patterns and identifying areas of high shear.',
  },
  {
    id: 'energy-conservation',
    title: 'Energy Conservation',
    latex: '\\frac{\\partial E}{\\partial t} + \\nabla \\cdot (E\\mathbf{v}) = -\\nabla \\cdot \\mathbf{q} - p(\\nabla \\cdot \\mathbf{v})',
    category: 'fluid-dynamics',
    description: 'First law of thermodynamics for fluid systems',
    variables: [
      { symbol: 'E', meaning: 'Total energy' },
      { symbol: '\\mathbf{q}', meaning: 'Heat flux' },
    ],
    explanation:
      'Energy equation governing heat transfer and work done by pressure forces in the crowd dynamics simulation.',
  },
  {
    id: 'pressure-surge',
    title: 'Pressure Surge Model',
    latex: 'p_{surge} = A e^{-k \\Delta \\rho} \\left(1 + N \\left(\\frac{\\|\\nabla v\\|}{v_{max}}\\right)^N\\right)',
    category: 'mitigation',
    description: 'Pressure buildup from crowd density and velocity gradients',
    variables: [
      { symbol: 'A, k, N', meaning: 'Material constants' },
      { symbol: '\\Delta \\rho', meaning: 'Density deviation' },
    ],
    explanation:
      'Models localized pressure surges that emerge from high density regions combined with steep velocity gradients.',
  },
];

/* ───────────────────────────────────────────────────────────── */
/* ANALYTICS METRICS - Real-time Simulation Statistics */
/* ───────────────────────────────────────────────────────────── */

export const MOCK_METRICS: MetricData[] = [
  {
    label: 'Current Density',
    value: '3.2',
    unit: 'p/m²',
    trend: 'up',
    trendPercent: 12,
  },
  {
    label: 'Risk Level',
    value: 'Medium',
    unit: 'Index',
    trend: 'stable',
  },
  {
    label: 'Flow Velocity',
    value: '1.8',
    unit: 'm/s',
    trend: 'down',
    trendPercent: -8,
  },
  {
    label: 'Pressure Points',
    value: '7',
    unit: 'zones',
    trend: 'up',
    trendPercent: 2,
  },
  {
    label: 'Exit Flow Rate',
    value: '45',
    unit: 'p/min',
    trend: 'down',
    trendPercent: -15,
  },
  {
    label: 'Safety Score',
    value: '78',
    unit: '%',
    trend: 'down',
    trendPercent: -3,
  },
];

/* ───────────────────────────────────────────────────────────── */
/* ALERTS - Real-time System Notifications */
/* ───────────────────────────────────────────────────────────── */

export const MOCK_ALERTS: AlertItem[] = [
  {
    id: 'alert-1',
    level: 'critical',
    message: 'High pressure zone detected near exit A',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    location: 'Exit A',
  },
  {
    id: 'alert-2',
    level: 'warning',
    message: 'Density approaching critical threshold in corridor B3',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    location: 'Corridor B3',
  },
  {
    id: 'alert-3',
    level: 'info',
    message: 'Mitigation system activated: Flow optimization engaged',
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    location: 'System',
  },
  {
    id: 'alert-4',
    level: 'warning',
    message: 'Velocity gradient spike detected in bottleneck zone',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    location: 'Bottleneck',
  },
];

/* ───────────────────────────────────────────────────────────── */
/* SIMULATION STATE - Current Execution Status */
/* ───────────────────────────────────────────────────────────── */

export const MOCK_SIMULATION_STATE: SimulationState = {
  status: 'running',
  step: 2847,
  elapsed: 113.88,
  progress: 42,
};

/* ───────────────────────────────────────────────────────────── */
/* DASHBOARD CARDS - Feature Highlights */
/* ───────────────────────────────────────────────────────────── */

export const DASHBOARD_FEATURES = [
  {
    id: 'canvas',
    title: 'Live Simulation Canvas',
    description: 'Real-time density and risk heatmaps with interactive cell drawing',
    icon: 'Activity',
    color: 'indigo',
  },
  {
    id: 'formulas',
    title: 'Mathematical Framework',
    description: 'Core equations powering fluid dynamics and risk assessment',
    icon: 'Zap',
    color: 'cyan',
  },
  {
    id: 'analytics',
    title: 'Real-time Analytics',
    description: 'Live metrics tracking density, flow, and safety indices',
    icon: 'BarChart3',
    color: 'emerald',
  },
  {
    id: 'alerts',
    title: 'Hazard Alerts',
    description: 'Multi-level threat detection and mitigation recommendations',
    icon: 'AlertTriangle',
    color: 'emerald',
  },
  {
    id: 'controls',
    title: 'Simulation Controls',
    description: 'Precise parameter adjustment and scenario management',
    icon: 'Settings',
    color: 'indigo',
  },
  {
    id: 'export',
    title: 'Data Export',
    description: 'Generate reports and export simulation data for analysis',
    icon: 'Download',
    color: 'cyan',
  },
];

/* ───────────────────────────────────────────────────────────── */
/* HELPER FUNCTIONS */
/* ───────────────────────────────────────────────────────────── */

export const getAlertColor = (level: AlertItem['level']) => {
  const colors = {
    info: 'text-cyan-cyber',
    warning: 'text-yellow-500',
    critical: 'text-red-500',
  };
  return colors[level];
};

export const getAlertBgColor = (level: AlertItem['level']) => {
  const colors = {
    info: 'bg-cyan-cyber/10 border-cyan-cyber/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    critical: 'bg-red-500/10 border-red-500/30',
  };
  return colors[level];
};

export const getRiskColor = (level: string) => {
  const colors = {
    low: 'text-emerald-math',
    medium: 'text-yellow-500',
    high: 'text-orange-500',
    critical: 'text-red-500',
  };
  return colors[level as keyof typeof colors] || colors.low;
};

export const formatTimestamp = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};
