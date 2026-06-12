/*
   ColorMap V3 - Dynamic Fluid Palettes
   Reacts to density, velocity, and temporal oscillation.

   dis file is pure rizz, makin everything look aesthetic.
   lowkey makin colors pop fr fr.
*/

type RGB = [number, number, number];
type RGBA = [number, number, number, number];

// cache for the heatmap, no cap, so we don't lag
type HeatmapCache = {
  gridCanvas: HTMLCanvasElement;
  gridCtx: CanvasRenderingContext2D;
  imageData: ImageData;
  cellField: Float32Array;
  cellSpeed: Float32Array;
  field: Float32Array;
  speedField: Float32Array;
  scratchField: Float32Array;
  scratchSpeed: Float32Array;
  rows: number;
  cols: number;
  scale: number;
};

const heatmapCache = new WeakMap<CanvasRenderingContext2D, HeatmapCache>();
const MAX_RENDER_SCALE = 4; // limit dat scale or it's too much
const TARGET_SCREEN_PIXELS_PER_TEXEL = 2.5;
const VISIBILITY_FLOOR = 0.012; // if it's below dis, it's mid, don't show it

// spectral stops for the vibe check
const SPECTRAL_STOPS: RGB[] = [
  [5, 15, 35],
  [0, 120, 190],
  [50, 190, 240],
  [245, 170, 45],
  [220, 40, 40],
];

// sampling the stops like a DJ, bet
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

// adding some spicy velocity tint
function applyVelocityTint(rgb: RGB, v: number): RGB {
  const velocityBoost = Math.min(1, v * 1.5);
  return [
    Math.min(255, rgb[0] + velocityBoost * 40),
    Math.min(255, rgb[1] + velocityBoost * 45),
    Math.min(255, rgb[2] + velocityBoost * 50),
  ];
}

// density to RGBA fluid - dis is where the magic happens
export function densityToRGBAFluid(t: number, v: number, alpha = 255): RGBA {
  if (t <= VISIBILITY_FLOOR) return [0, 0, 0, 0]; // too mid to show
  const colorIdx = Math.max(0, Math.min(1, t));
  const baseColor = sampleStops(SPECTRAL_STOPS, colorIdx);
  const [r, g, b] = applyVelocityTint(baseColor, v);
  const opacityT = Math.max(0, Math.min(1, (colorIdx - VISIBILITY_FLOOR) / (1 - VISIBILITY_FLOOR)));
  const dynamicAlpha = Math.round(28 + 227 * Math.pow(opacityT, 0.9));
  const blendedAlpha = Math.round((dynamicAlpha * alpha) / 255);
  return [Math.round(r), Math.round(g), Math.round(b), Math.min(255, blendedAlpha)];
}

// risk to RGBA fluid - red is sus
export function riskToRGBAFluid(t: number, v: number, alpha = 255): RGBA {
  const colorIdx = Math.max(0, Math.min(1, Math.pow(t, 0.75) * 1.4));
  if (colorIdx <= 0.002) return [0, 0, 0, 0]; // safe vibe
  const [r, g, b] = sampleStops([
    [50, 60, 100],
    [30, 140, 210],
    [245, 150, 50],
    [220, 80, 40],
    [200, 25, 25], // major danger, fr
  ], colorIdx);
  const velocityBoost = Math.min(1, v * 2);
  const boosted: RGB = [
    Math.min(255, r + velocityBoost * 40),
    Math.min(255, g + velocityBoost * 30),
    Math.min(255, b + velocityBoost * 25),
  ];
  const opacityT = Math.max(0, Math.min(1, colorIdx));
  const dynamicAlpha = Math.round(64 + 190 * Math.pow(opacityT, 0.7));
  const blendedAlpha = Math.round((dynamicAlpha * alpha) / 255);
  return [Math.round(boosted[0]), Math.round(boosted[1]), Math.round(boosted[2]), Math.min(255, blendedAlpha)];
}

// main render function... it's daaa goat
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
  const renderScale = chooseRenderScale(rows, cols, canvasW, canvasH);
  const renderCols = cols * renderScale;
  const renderRows = rows * renderScale;
  const cache = getHeatmapCache(ctx, rows, cols, renderScale);

  const pixels = cache.imageData.data;
  const cellField = cache.cellField;
  const cellSpeed = cache.cellSpeed;
  const field = cache.field;
  const speedField = cache.speedField;

  // populate dat grid, no cap
  for (let i = 0; i < rows * cols; i++) {
    cellField[i] = mode === 'risk' ? risk[i] : rho[i];
    cellSpeed[i] = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
  }

  // scale it up for that smooth look
  upsampleField(cellField, field, rows, cols, renderScale);
  upsampleField(cellSpeed, speedField, rows, cols, renderScale);

  // blur it bc we want it fluid
  const blurRadius = Math.max(2, Math.round(renderScale * 1.25));
  blurField(field, cache.scratchField, renderCols, renderRows, blurRadius);
  blurField(speedField, cache.scratchSpeed, renderCols, renderRows, blurRadius);

  const totalPixels = renderCols * renderRows;
  // loop thru pixels and color them, bet
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

  // put it on the canvas, lowkey aesthetic
  cache.gridCtx.putImageData(cache.imageData, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cache.gridCanvas, 0, 0, canvasW, canvasH);
}

// pickin the scale so it's not mid
function chooseRenderScale(rows: number, cols: number, canvasW: number, canvasH: number): number {
  const cellPixelSize = Math.max(
    canvasW / Math.max(1, cols),
    canvasH / Math.max(1, rows),
  );
  return Math.max(1, Math.min(MAX_RENDER_SCALE, Math.ceil(cellPixelSize / TARGET_SCREEN_PIXELS_PER_TEXEL)));
}

// upsampling field, no cap, makin it bigger
function upsampleField(
  source: Float32Array,
  dest: Float32Array,
  rows: number,
  cols: number,
  scale: number,
) {
  if (scale === 1) {
    dest.set(source);
    return;
  }

  const width = cols * scale;
  const height = rows * scale;

  for (let y = 0; y < height; y++) {
    const sourceY = Math.max(0, Math.min(rows - 1, (y + 0.5) / scale - 0.5));
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(rows - 1, y0 + 1);
    const wy = sourceY - y0;
    const row0 = y0 * cols;
    const row1 = y1 * cols;

    for (let x = 0; x < width; x++) {
      const sourceX = Math.max(0, Math.min(cols - 1, (x + 0.5) / scale - 0.5));
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(cols - 1, x0 + 1);
      const wx = sourceX - x0;

      const a = source[row0 + x0] * (1 - wx) + source[row0 + x1] * wx;
      const b = source[row1 + x0] * (1 - wx) + source[row1 + x1] * wx;
      dest[y * width + x] = a * (1 - wy) + b * wy;
    }
  }
}

// blur function, fr fr, gaussian vibes
function blurField(
  field: Float32Array,
  scratch: Float32Array,
  width: number,
  height: number,
  radius: number,
) {
  scratch.set(field);
  const kernel = createGaussianKernel(radius);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weight = 0;
      for (let k = -radius; k <= radius; k++) {
        const nx = x + k;
        if (nx < 0 || nx >= width) continue;
        const kernelWeight = kernel[k + radius];
        sum += scratch[y * width + nx] * kernelWeight;
        weight += kernelWeight;
      }
      field[y * width + x] = sum / weight;
    }
  }

  scratch.set(field);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weight = 0;
      for (let k = -radius; k <= radius; k++) {
        const ny = y + k;
        if (ny < 0 || ny >= height) continue;
        const kernelWeight = kernel[k + radius];
        sum += scratch[ny * width + x] * kernelWeight;
        weight += kernelWeight;
      }
      field[y * width + x] = sum / weight;
    }
  }
}

// kernel for the blur, no cap
function createGaussianKernel(radius: number): number[] {
  const sigma = Math.max(1, radius / 2);
  const kernel: number[] = [];

  for (let k = -radius; k <= radius; k++) {
    kernel.push(Math.exp(-(k * k) / (2 * sigma * sigma)));
  }

  return kernel;
}

// cache it or we r cooked
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
  const cellCount = rows * cols;

  const next: HeatmapCache = {
    gridCanvas,
    gridCtx,
    imageData,
    cellField: new Float32Array(cellCount),
    cellSpeed: new Float32Array(cellCount),
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
