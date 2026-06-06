import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import { buildBottleneckScenario, buildStadiumScenario, ScenarioResult } from '../src/backend/engine/scenarios.ts';
import { runSimulationWithMetrics, SimulationMetrics } from '../src/backend/engine/metrics.ts';
import { DEFAULT_PARAMS } from '../src/shared/simParams.ts';

const RESULTS_DIR = path.join(process.cwd(), 'results');
const FIGURES_DIR = path.join(RESULTS_DIR, 'figures');

const scenarios: ScenarioResult[] = [
  buildBottleneckScenario(DEFAULT_PARAMS.rows, DEFAULT_PARAMS.cols),
  buildStadiumScenario(DEFAULT_PARAMS.rows, DEFAULT_PARAMS.cols),
];

type Rgb = [number, number, number];
type RgbStop = readonly [number, number, number];

const densityStops = [
  [5, 15, 35],
  [0, 120, 190],
  [50, 190, 240],
  [245, 170, 45],
  [220, 40, 40],
] as const;

const riskStops = [
  [60, 70, 110],
  [0, 150, 230],
  [255, 190, 90],
  [245, 100, 45],
  [230, 35, 35],
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sampleStops(stops: readonly RgbStop[], t: number): Rgb {
  const n = stops.length - 1;
  const scaled = clamp(t, 0, 1) * n;
  const lo = Math.floor(scaled);
  const hi = Math.min(n, lo + 1);
  const frac = scaled - lo;
  const [r1, g1, b1] = stops[lo];
  const [r2, g2, b2] = stops[hi];
  return [
    Math.round(r1 + (r2 - r1) * frac),
    Math.round(g1 + (g2 - g1) * frac),
    Math.round(b1 + (b2 - b1) * frac),
  ];
}

function densityColor(value: number): Rgb {
  return sampleStops(densityStops, clamp(value, 0, 1));
}

function riskColor(value: number): Rgb {
  return sampleStops(riskStops, clamp(value, 0, 1));
}

function velocityColor(value: number): Rgb {
  const gray = Math.round(clamp(value, 0, 1) * 255);
  return [gray, Math.max(0, 180 - Math.round(value * 80)), Math.max(0, 210 - Math.round(value * 120))];
}

function sanitizeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function ensureOutputDirectories() {
  await mkdir(FIGURES_DIR, { recursive: true });
}

function drawHeatmap(
  grid: Float64Array,
  rows: number,
  cols: number,
  canvasWidth: number,
  canvasHeight: number,
  palette: (t: number) => [number, number, number],
  title: string,
): Canvas {
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const margin = 100;
  const plotWidth = canvasWidth - margin * 2;
  const plotHeight = canvasHeight - margin * 2;
  const cellWidth = plotWidth / cols;
  const cellHeight = plotHeight / rows;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const value = clamp(grid[r * cols + c], 0, 1);
      const [rVal, gVal, bVal] = palette(value);
      ctx.fillStyle = `rgb(${rVal},${gVal},${bVal})`;
      ctx.fillRect(margin + c * cellWidth, margin + r * cellHeight, Math.ceil(cellWidth), Math.ceil(cellHeight));
    }
  }

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(margin, margin, plotWidth, plotHeight);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 48px Arial';
  ctx.fillText(title, margin, 70);
  ctx.font = '28px Arial';
  ctx.fillText('Grid: ' + cols + 'x' + rows, margin, 115);

  return canvas;
}

function drawLineChart(
  values: number[],
  width: number,
  height: number,
  title: string,
  yLabel: string,
): Canvas {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const margin = 120;
  const plotWidth = width - margin * 2;
  const plotHeight = height - margin * 2;

  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const valueRange = maxValue - minValue || 1;

  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  for (let y = 0; y <= 5; y += 1) {
    const yy = margin + (plotHeight * y) / 5;
    ctx.beginPath();
    ctx.moveTo(margin, yy);
    ctx.lineTo(margin + plotWidth, yy);
    ctx.stroke();
  }

  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, margin + plotHeight);
  ctx.lineTo(margin, margin);
  ctx.lineTo(margin + plotWidth, margin);
  ctx.stroke();

  if (values.length > 1) {
    ctx.strokeStyle = '#0057d9';
    ctx.lineWidth = 4;
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = margin + (plotWidth * index) / (values.length - 1);
      const y = margin + plotHeight - ((value - minValue) / valueRange) * plotHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 48px Arial';
  ctx.fillText(title, margin, 70);
  ctx.font = '28px Arial';
  ctx.fillText(yLabel, margin, 110);

  ctx.fillStyle = '#222222';
  ctx.font = '24px Arial';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i += 1) {
    const value = (valueRange * (5 - i)) / 5 + minValue;
    const y = margin + (plotHeight * i) / 5;
    ctx.fillText(value.toFixed(2), margin - 10, y + 8);
  }
  ctx.textAlign = 'left';
  ctx.fillText('Timestep →', margin + plotWidth - 40, margin + plotHeight + 50);

  return canvas;
}

function normalizedArray(values: Float64Array | number[], scale: number) {
  const result = new Float64Array(values.length);
  for (let i = 0; i < values.length; i += 1) {
    result[i] = values[i] / scale;
  }
  return result;
}

async function saveCanvas(canvas: Canvas, filePath: string) {
  const buffer = canvas.toBuffer('image/png');
  await writeFile(filePath, buffer);
}

async function saveCsv(rows: string[][], filePath: string) {
  const csv = rows.map(row => row.map(cell => String(cell).replace(/"/g, '""')).map(cell => `"${cell}"`).join(',')).join('\n');
  await writeFile(filePath, csv);
}

async function saveMarkdownTable(rows: string[][], filePath: string) {
  const header = rows[0];
  const separator = header.map(() => '---');
  const md = [header, separator, ...rows.slice(1)].map(row => `| ${row.join(' | ')} |`).join('\n');
  await writeFile(filePath, md);
}

async function renderScenario(scenario: ScenarioResult) {
  const scenarioKey = sanitizeFilename(scenario.label);
  const metrics = runSimulationWithMetrics(DEFAULT_PARAMS, new Uint8Array(scenario.cells), scenario.rows, scenario.cols, scenario.label, {
    riskThreshold: 0.65,
    stopWhenLowMass: false,
  });

  const densityNormInitial = normalizedArray(metrics.initialDensity, DEFAULT_PARAMS.rhoMax);
  const densityNormFinal = normalizedArray(metrics.finalDensity, DEFAULT_PARAMS.rhoMax);
  const riskNormFinal = normalizedArray(metrics.finalRisk, 1);
  const velocityNormFinal = normalizedArray(metrics.finalVelocityMagnitude, Math.max(...metrics.finalVelocityMagnitude, 1));

  await saveCanvas(
    drawHeatmap(densityNormInitial, scenario.rows, scenario.cols, 2400, 2400, densityColor, `${scenario.label} — Initial Density`),
    path.join(FIGURES_DIR, `${scenarioKey}_initial_density.png`),
  );
  await saveCanvas(
    drawHeatmap(densityNormFinal, scenario.rows, scenario.cols, 2400, 2400, densityColor, `${scenario.label} — Final Density`),
    path.join(FIGURES_DIR, `${scenarioKey}_final_density.png`),
  );
  await saveCanvas(
    drawHeatmap(riskNormFinal, scenario.rows, scenario.cols, 2400, 2400, riskColor, `${scenario.label} — Risk Heatmap`),
    path.join(FIGURES_DIR, `${scenarioKey}_risk_heatmap.png`),
  );
  await saveCanvas(
    drawHeatmap(velocityNormFinal, scenario.rows, scenario.cols, 2400, 2400, velocityColor, `${scenario.label} — Velocity Magnitude`),
    path.join(FIGURES_DIR, `${scenarioKey}_velocity_magnitude.png`),
  );
  await saveCanvas(
    drawLineChart(metrics.timeSeries.peakDensityPerStep, 3000, 1500, `${scenario.label} — Peak Density vs Time`, 'Peak Density'),
    path.join(FIGURES_DIR, `${scenarioKey}_peak_density_time.png`),
  );
  await saveCanvas(
    drawLineChart(metrics.timeSeries.meanRiskPerStep, 3000, 1500, `${scenario.label} — Mean Risk vs Time`, 'Mean Risk'),
    path.join(FIGURES_DIR, `${scenarioKey}_mean_risk_time.png`),
  );
  await saveCanvas(
    drawLineChart(metrics.timeSeries.highRiskAreaPctPerStep, 3000, 1500, `${scenario.label} — High-Risk Area % vs Time`, 'High-Risk Area %'),
    path.join(FIGURES_DIR, `${scenarioKey}_high_risk_area_time.png`),
  );

  return metrics;
}

function formatNumber(value: number, digits = 3) {
  return value.toFixed(digits);
}

async function run() {
  await ensureOutputDirectories();

  const summaryRows: string[][] = [[
    'Scenario Name',
    'Peak Density',
    'Peak Risk',
    'High-Risk Area Percentage',
    'Average Velocity',
    'Total Overshoot Count',
    'Total Overshoot Magnitude',
    'Max Overshoot Magnitude',
    'Total Evacuation Time (s)',
  ]];

  const csvRows: string[][] = [[
    'Scenario Name',
    'Rows',
    'Cols',
    'Max Density',
    'Mean Density',
    'Pct Cells > rhoCrit',
    'First Step Above rhoCrit',
    'Mean Velocity',
    'Min Velocity',
    'Total Evacuated Mass',
    'Max Risk',
    'Mean Risk',
    'Pct Cells > Risk Threshold',
    'Time of Peak Risk',
    'Total Overshoot Count',
    'Total Overshoot Magnitude',
    'Max Overshoot Magnitude',
    'Mass Conservation Error',
    'Runtime ms',
    'Num Timesteps',
    'Total Evacuation Time (s)',
  ]];

  const allMetrics: SimulationMetrics[] = [];

  for (const scenario of scenarios) {
    console.log(`Running simulation for ${scenario.label}...`);
    const metrics = await renderScenario(scenario);
    allMetrics.push(metrics);

    const summaryRow = [
      scenario.label,
      formatNumber(metrics.densityMetrics.maxDensity, 2),
      formatNumber(metrics.riskMetrics.maxRisk, 3),
      formatNumber(metrics.riskMetrics.percentageAboveThreshold, 2) + '%',
      formatNumber(metrics.velocityMetrics.meanVelocity, 3),
      String(metrics.densityDiagnostics.totalOvershootCount),
      formatNumber(metrics.densityDiagnostics.totalOvershootMagnitude, 4),
      formatNumber(metrics.densityDiagnostics.maxOvershootMagnitude, 4),
      formatNumber(metrics.numericalMetrics.numTimesteps * DEFAULT_PARAMS.dt, 2),
    ];
    summaryRows.push(summaryRow);

    csvRows.push([
      scenario.label,
      String(metrics.numericalMetrics.rows),
      String(metrics.numericalMetrics.cols),
      formatNumber(metrics.densityMetrics.maxDensity, 4),
      formatNumber(metrics.densityMetrics.meanDensity, 4),
      formatNumber(metrics.densityMetrics.percentageAboveCrit, 3),
      String(metrics.densityMetrics.firstStepAboveCrit ?? 0),
      formatNumber(metrics.velocityMetrics.meanVelocity, 4),
      formatNumber(metrics.velocityMetrics.minVelocity, 4),
      formatNumber(metrics.velocityMetrics.totalEvacuatedMass, 4),
      formatNumber(metrics.riskMetrics.maxRisk, 4),
      formatNumber(metrics.riskMetrics.meanRisk, 4),
      formatNumber(metrics.riskMetrics.percentageAboveThreshold, 3),
      String(metrics.riskMetrics.timeOfPeakRisk),
      String(metrics.densityDiagnostics.totalOvershootCount),
      formatNumber(metrics.densityDiagnostics.totalOvershootMagnitude, 6),
      formatNumber(metrics.densityDiagnostics.maxOvershootMagnitude, 6),
      formatNumber(metrics.numericalMetrics.massConservationError, 6),
      formatNumber(metrics.numericalMetrics.runtimeMs, 1),
      String(metrics.numericalMetrics.numTimesteps),
      formatNumber(metrics.numericalMetrics.numTimesteps * DEFAULT_PARAMS.dt, 3),
    ]);
  }

  await saveCsv(csvRows, path.join(RESULTS_DIR, 'results.csv'));
  await saveMarkdownTable(summaryRows, path.join(RESULTS_DIR, 'summary-table.md'));
  await saveCsv(summaryRows, path.join(RESULTS_DIR, 'summary-table.csv'));
  await writeFile(path.join(RESULTS_DIR, 'simulation-metrics.json'), JSON.stringify(allMetrics, null, 2));

  console.log('Export complete. Results written to:', RESULTS_DIR);
}

run().catch(error => {
  console.error('Failed to generate results:', error);
  process.exit(1);
});
