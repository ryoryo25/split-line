import JSZip from 'jszip';
import {
  SliceRect,
  SplitDirection,
  OutputFormat,
  GapBackgroundColor,
  resolveOutputMimeAndExt,
  formatSliceFilename,
  computeGridSimulationMetrics,
} from './splitMath';

export interface LoadedImageSource {
  id: string;
  name: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  dataUrl: string;
  element: HTMLImageElement;
}

export interface GeneratedSlice {
  index: number;
  filename: string;
  mimeType: 'image/png' | 'image/jpeg';
  formatLabel: 'PNG' | 'JPG';
  rect: SliceRect;
  blob: Blob;
  objectUrl: string;
  byteSize: number;
}

/**
 * Validates that a file is a supported JPG or PNG image.
 */
export function validateImageFile(file: File): string | null {
  const validMime = /^image\/(jpe?g|png)$/i.test(file.type);
  const validExt = /\.(jpe?g|png)$/i.test(file.name);
  if (!validMime && !validExt) {
    return '対応フォーマットは JPG (.jpg / .jpeg) または PNG (.png) のみです。';
  }
  if (file.size > 80 * 1024 * 1024) {
    return 'ファイルサイズが大きすぎます（上限 80MB）。';
  }
  return null;
}

/**
 * Loads a File into an HTMLImageElement and returns full metadata.
 */
export async function loadImageFromFile(file: File): Promise<LoadedImageSource> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('画像ファイルの読み込みに失敗しました。'));
    reader.readAsDataURL(file);
  });

  const element = await loadHtmlImage(dataUrl);
  const inferredMime =
    file.type && /^image\/(jpe?g|png)$/i.test(file.type)
      ? file.type
      : /\.jpe?g$/i.test(file.name)
        ? 'image/jpeg'
        : 'image/png';

  return {
    id: `${file.name}-${file.size}-${Date.now()}`,
    name: file.name,
    mimeType: inferredMime,
    byteSize: file.size,
    width: element.naturalWidth || element.width,
    height: element.naturalHeight || element.height,
    dataUrl,
    element,
  };
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像データのデコードに失敗しました。'));
    img.src = src;
  });
}

/**
 * Renders each SliceRect onto an offscreen canvas and exports PNG/JPG Blobs.
 */
export async function renderImageSlices(params: {
  source: LoadedImageSource;
  rects: SliceRect[];
  outputFormat: OutputFormat;
  jpegQuality: number;
  filenamePrefix: string;
}): Promise<GeneratedSlice[]> {
  const { source, rects, outputFormat, jpegQuality, filenamePrefix } = params;
  const { mimeType, extension, label } = resolveOutputMimeAndExt(source.mimeType, outputFormat);
  const quality = Math.max(0.1, Math.min(1, jpegQuality / 100));

  const slices: GeneratedSlice[] = [];

  for (const rect of rects) {
    const canvas = document.createElement('canvas');
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D コンテキストの初期化に失敗しました。');
    }

    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    ctx.drawImage(
      source.element,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      rect.width,
      rect.height
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('分割画像の書き出しに失敗しました。'));
        },
        mimeType,
        mimeType === 'image/jpeg' ? quality : undefined
      );
    });

    const objectUrl = URL.createObjectURL(blob);
    const filename = formatSliceFilename(filenamePrefix, rect.index, rects.length, extension);

    slices.push({
      index: rect.index,
      filename,
      mimeType,
      formatLabel: label,
      rect,
      blob,
      objectUrl,
      byteSize: blob.size,
    });
  }

  return slices;
}

/**
 * Renders and downloads a composite Grid Simulation image with `pieceGapPx` pixels of whitespace
 * inserted between each split piece.
 */
export async function downloadGridSimulationImage(params: {
  source: LoadedImageSource;
  rects: SliceRect[];
  direction: SplitDirection;
  pieceGapPx: number;
  gapBgColor: GapBackgroundColor;
  filenamePrefix: string;
}): Promise<void> {
  const { source, rects, direction, pieceGapPx, gapBgColor, filenamePrefix } = params;
  const metrics = computeGridSimulationMetrics({ rects, direction, pieceGapPx });
  if (metrics.gridWidth <= 0 || metrics.gridHeight <= 0) return;

  const canvas = document.createElement('canvas');
  canvas.width = metrics.gridWidth;
  canvas.height = metrics.gridHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (gapBgColor !== 'transparent') {
    ctx.fillStyle = gapBgColor;
    ctx.fillRect(0, 0, metrics.gridWidth, metrics.gridHeight);
  }

  for (const p of metrics.placements) {
    ctx.drawImage(
      source.element,
      p.sourceRect.x,
      p.sourceRect.y,
      p.sourceRect.width,
      p.sourceRect.height,
      p.gridX,
      p.gridY,
      p.width,
      p.height
    );
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const cleanName =
    (filenamePrefix || 'split_image')
      .trim()
      .replace(/\.(png|jpe?g)$/i, '')
      .replace(/[\\/:*?"<>|]+/g, '_') || 'split_image';

  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanName}_grid_gap${metrics.pieceGapPx}px.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Triggers a browser download for a single generated slice.
 */
export function downloadSingleSlice(slice: GeneratedSlice): void {
  const a = document.createElement('a');
  a.href = slice.objectUrl;
  a.download = slice.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Bundles all generated slices into a single ZIP file and triggers browser download.
 */
export async function downloadAllSlicesAsZip(
  slices: GeneratedSlice[],
  zipBaseName: string
): Promise<void> {
  const zip = new JSZip();
  for (const slice of slices) {
    zip.file(slice.filename, slice.blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const cleanName =
    (zipBaseName || 'split_images')
      .trim()
      .replace(/\.(png|jpe?g)$/i, '')
      .replace(/[\\/:*?"<>|]+/g, '_') || 'split_images';

  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanName}_${slices.length}split.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Generates a crisp 1200x1800px architectural/editorial vertical sample image
 * with 4 distinct visual bands and a pixel ruler so users can immediately test n-split.
 */
export async function createSampleVerticalImage(): Promise<LoadedImageSource> {
  const width = 1200;
  const height = 1800;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const bands = [
    {
      y: 0,
      h: 450,
      bg: '#0F172A',
      accent: '#38BDF8',
      title: 'SECTION 01 — ARCHITECTURAL OVERVIEW',
      sub: '0px – 450px  |  Top Vertical Frame',
    },
    {
      y: 450,
      h: 450,
      bg: '#1E293B',
      accent: '#F59E0B',
      title: 'SECTION 02 — STRUCTURAL ELEVATION',
      sub: '450px – 900px  |  Upper-Middle Frame',
    },
    {
      y: 900,
      h: 450,
      bg: '#0F172A',
      accent: '#10B981',
      title: 'SECTION 03 — MATERIAL SPECIFICATION',
      sub: '900px – 1350px  |  Lower-Middle Frame',
    },
    {
      y: 1350,
      h: 450,
      bg: '#1E293B',
      accent: '#F43F5E',
      title: 'SECTION 04 — FOUNDATION & BASELINE',
      sub: '1350px – 1800px  |  Bottom Vertical Frame',
    },
  ];

  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    ctx.fillStyle = b.bg;
    ctx.fillRect(0, b.y, width, b.h);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let gx = 60; gx < width; gx += 60) {
      ctx.beginPath();
      ctx.moveTo(gx, b.y);
      ctx.lineTo(gx, b.y + b.h);
      ctx.stroke();
    }
    for (let gy = b.y + 50; gy < b.y + b.h; gy += 50) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }

    ctx.save();
    ctx.strokeStyle = b.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(760, b.y + 85, 340, 280);
    ctx.fillStyle = `${b.accent}22`;
    ctx.fillRect(790, b.y + 115, 280, 220);

    ctx.beginPath();
    ctx.moveTo(760, b.y + 85);
    ctx.lineTo(1100, b.y + 365);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(930, b.y + 225, 68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = b.accent;
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText(`0${i + 1} / VERTICAL SEGMENT`, 88, b.y + 145);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 40px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(b.title, 88, b.y + 215);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '400 24px "JetBrains Mono", monospace';
    ctx.fillText(b.sub, 88, b.y + 275);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '400 14px "JetBrains Mono", monospace';
    for (let tick = b.y; tick < b.y + b.h; tick += 90) {
      ctx.fillRect(0, tick, 24, 2);
      ctx.fillText(`${tick}px`, 32, tick + 16);
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Sample error'))), 'image/png');
  });

  const dataUrl = canvas.toDataURL('image/png');
  const element = await loadHtmlImage(dataUrl);

  return {
    id: `sample-vertical-${Date.now()}`,
    name: 'sample_vertical_poster_1200x1800.png',
    mimeType: 'image/png',
    byteSize: blob.size,
    width,
    height,
    dataUrl,
    element,
  };
}
