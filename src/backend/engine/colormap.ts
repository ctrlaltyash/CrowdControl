/*
   ColorMap V3 - Dynamic Fluid Palettes
   Reacts to density, velocity, and temporal oscillation.
*/

type RGB = [number, number, number];
type RGBA = [number, number, number, number];

type HeatmapCache = {
  gridCanvas: HTMLCanvasElement;
  gridCtx: CanvasRenderingContext2D;
  imageData: ImageData;
  field: Float32Array;
  speedField: Float32Array;
  scratchField: Float32Array;
  scratchSpeed: Float32Array;
  rows: number;
  cols: number;
  scale: number;
};

const heatmapCache = new WeakMap<CanvasRenderingContext2D, HeatmapCache>();

const SPECTRAL_STOPS: RGB[] = [
  [5, 15, 35],
  [0, 120, 190],
  [50, 190, 240],
  [245, 170, 45],
  [220, 40, 40],
];

// THis is the linear interpolation (LERP) function for the color stops,
//  it takes a value t between 0 and 1 and returns an RGB color by blending between the defined stops. The applyVelocityTint function then adds a velocity-based boost to the color, making faster-moving areas appear brighter. The densityToRGBAFluid and riskToRGBAFluid functions convert density and risk values into RGBA colors, applying both the color mapping and velocity tinting, as well as dynamically adjusting the alpha transparency based on the intensity of the value. Finally, the renderHeatmapFluid function renders the heatmap onto a canvas by first blurring the density and speed fields for smoother visualization, then mapping each pixel to its corresponding RGBA color based on either density or risk mode.
// lmao the AI autofill goes insane, imma use this for explain the code
function sampleStops(stops: RGB[], t: number): RGB {
  const n = stops.length - 1;
  const scaled = Math.max(0, Math.min(1, t)) * n;
  const lo = Math.floor(scaled);
  const hi = Math.min(n, lo + 1);
  const frac = scaled - lo;
  const a = stops[lo];
  const b = stops[hi];
  return [
    a[0] + (b[0] - a[0]) * frac,
    a[1] + (b[1] - a[1]) * frac,
    a[2] + (b[2] - a[2]) * frac,
  ];
}

function applyVelocityTint(rgb: RGB, v: number): RGB {
  const velocityBoost = Math.min(1, v * 1.5);
  return [
    Math.min(255, rgb[0] + velocityBoost * 40),
    Math.min(255, rgb[1] + velocityBoost * 45),
    Math.min(255, rgb[2] + velocityBoost * 50),
  ];
}

export function densityToRGBAFluid(t: number, v: number, alpha = 255): RGBA {
  if (t <= 0) return [0, 0, 0, 0];
  const colorIdx = Math.max(0, Math.min(1, t));
  const baseColor = sampleStops(SPECTRAL_STOPS, colorIdx);
  const [r, g, b] = applyVelocityTint(baseColor, v);
  const dynamicAlpha = Math.round(130 + 125 * Math.pow(colorIdx, 1.05));
  const blendedAlpha = Math.round((dynamicAlpha * alpha) / 255);
  return [Math.round(r), Math.round(g), Math.round(b), Math.min(255, blendedAlpha)];
}

export function riskToRGBAFluid(t: number, v: number, alpha = 255): RGBA {
  if (t <= 0) return [0, 0, 0, 0];
  const colorIdx = Math.max(0, Math.min(1, t));
  const [r, g, b] = sampleStops([
    [60, 70, 110],
    [0, 150, 230],
    [255, 190, 90],
    [245, 100, 45],
    [230, 35, 35],
  ], colorIdx);
  const velocityBoost = Math.min(1, v * 2);
  const boosted: RGB = [
    Math.min(255, r + velocityBoost * 30),
    Math.min(255, g + velocityBoost * 20),
    Math.min(255, b + velocityBoost * 20),
  ];
  const dynamicAlpha = Math.round(140 + 115 * Math.pow(colorIdx, 1.2));
  const blendedAlpha = Math.round((dynamicAlpha * alpha) / 255);
  return [Math.round(boosted[0]), Math.round(boosted[1]), Math.round(boosted[2]), Math.min(255, blendedAlpha)];
}

export function renderHeatmapFluid(
  ctx: CanvasRenderingContext2D,
  rho: Float64Array,
  vx: Float64Array,
  vy: Float64Array,
  risk: Float64Array,
  rows: number,
  cols: number,
  canvasW: number,
  canvasH: number,
  mode: 'density' | 'risk',
): void {
  const renderScale = 1;
  const renderCols = cols * renderScale;
  const renderRows = rows * renderScale;
  const cache = getHeatmapCache(ctx, rows, cols, renderScale);

  const pixels = cache.imageData.data;
  const field = cache.field;
  const speedField = cache.speedField;

  for (let i = 0; i < rows * cols; i++) {
    field[i] = mode === 'risk' ? risk[i] : rho[i];
    speedField[i] = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
  }

  blurField(field, cache.scratchField, renderCols, renderRows);
  blurField(speedField, cache.scratchSpeed, renderCols, renderRows);

  const totalPixels = renderCols * renderRows;
  for (let idx = 0; idx < totalPixels; idx++) {
    const value = Math.max(0, Math.min(1, field[idx]));
    const speed = Math.max(0, Math.min(1, speedField[idx]));
    const rgba = mode === 'risk'
      ? riskToRGBAFluid(value, speed)
      : densityToRGBAFluid(value, speed);

    const off = idx * 4;
    pixels[off] = rgba[0];
    pixels[off + 1] = rgba[1];
    pixels[off + 2] = rgba[2];
    pixels[off + 3] = rgba[3];
  }

  cache.gridCtx.putImageData(cache.imageData, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cache.gridCanvas, 0, 0, canvasW, canvasH);
}

function blurField(field: Float32Array, scratch: Float32Array, width: number, height: number) {
  scratch.set(field);
  const kernel = [0.0625, 0.25, 0.375, 0.25, 0.0625];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weight = 0;
      for (let k = -2; k <= 2; k++) {
        const nx = x + k;
        if (nx < 0 || nx >= width) continue;
        sum += scratch[y * width + nx] * kernel[k + 2];
        weight += kernel[k + 2];
      }
      field[y * width + x] = sum / weight;
    }
  }

  scratch.set(field);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weight = 0;
      for (let k = -2; k <= 2; k++) {
        const ny = y + k;
        if (ny < 0 || ny >= height) continue;
        sum += scratch[ny * width + x] * kernel[k + 2];
        weight += kernel[k + 2];
      }
      field[y * width + x] = sum / weight;
    }
  }
}

function getHeatmapCache(
  ctx: CanvasRenderingContext2D,
  rows: number,
  cols: number,
  renderScale: number,
): HeatmapCache {
  const cached = heatmapCache.get(ctx);
  if (cached && cached.rows === rows && cached.cols === cols && cached.scale === renderScale) return cached;
  const gridCanvas = document.createElement('canvas');
  gridCanvas.width = cols * renderScale;
  gridCanvas.height = rows * renderScale;
  const gridCtx = gridCanvas.getContext('2d')!;
  const imageData = gridCtx.createImageData(cols * renderScale, rows * renderScale);
  const size = cols * renderScale * rows * renderScale;

  const next: HeatmapCache = {
    gridCanvas,
    gridCtx,
    imageData,
    field: new Float32Array(size),
    speedField: new Float32Array(size),
    scratchField: new Float32Array(size),
    scratchSpeed: new Float32Array(size),
    rows,
    cols,
    scale: renderScale,
  };
  heatmapCache.set(ctx, next);
  return next;
}
