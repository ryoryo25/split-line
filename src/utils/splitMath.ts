export type SplitDirection = 'vertical-stack' | 'horizontal-columns';
export type SplitMode = 'equal' | 'fixed-size' | 'custom';
export type OutputFormat = 'auto' | 'png' | 'jpeg';
export type GapBackgroundColor = '#FFFFFF' | '#F1F5F9' | '#0F172A' | 'transparent';

export interface SliceRect {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  cutStart: number;
  cutEnd: number;
}

export interface ComputeSlicesParams {
  width: number;
  height: number;
  direction: SplitDirection;
  cutPositions: number[];
  overlapPx?: number;
}

export interface GridPiecePlacement {
  index: number;
  gridX: number;
  gridY: number;
  width: number;
  height: number;
  sourceRect: SliceRect;
}

export interface GridSimulationMetrics {
  pieceGapPx: number;
  gapCount: number;
  totalGapPx: number;
  gridWidth: number;
  gridHeight: number;
  placements: GridPiecePlacement[];
}

export const MIN_SPLIT_COUNT = 2;
export const MAX_SPLIT_COUNT = 50;
export const MIN_PIECE_GAP_PX = 0;
export const MAX_PIECE_GAP_PX = 200;

/**
 * Clamps split count n into a safe integer range [2, 50] and <= maxDimension.
 */
export function clampSplitCount(n: number, maxDimension = 10000): number {
  if (!Number.isFinite(n)) return MIN_SPLIT_COUNT;
  const rounded = Math.round(n);
  const upper = Math.max(MIN_SPLIT_COUNT, Math.min(MAX_SPLIT_COUNT, Math.floor(maxDimension)));
  return Math.max(MIN_SPLIT_COUNT, Math.min(upper, rounded));
}

/**
 * Clamps piece gap (whitespace interval in px) into [0, 200].
 */
export function clampPieceGap(gapPx: number): number {
  if (!Number.isFinite(gapPx)) return 0;
  return Math.max(MIN_PIECE_GAP_PX, Math.min(MAX_PIECE_GAP_PX, Math.round(gapPx)));
}

/**
 * Generates (count - 1) internal cut coordinates along [0, totalLength]
 * using exact integer arithmetic so all slices sum to totalLength.
 */
export function generateEqualCutPositions(totalLength: number, count: number): number[] {
  const safeLength = Math.max(2, Math.floor(totalLength));
  const safeCount = clampSplitCount(count, safeLength);
  const cuts: number[] = [];
  for (let i = 1; i < safeCount; i++) {
    cuts.push(Math.round((safeLength * i) / safeCount));
  }
  return normalizeCustomCutPositions(cuts, safeLength);
}

/**
 * Generates cut coordinates every `stepPx` pixels along [0, totalLength],
 * capped at MAX_SPLIT_COUNT slices.
 */
export function generateFixedSizeCutPositions(totalLength: number, stepPx: number): number[] {
  const safeLength = Math.max(2, Math.floor(totalLength));
  const minStep = Math.ceil(safeLength / MAX_SPLIT_COUNT);
  const safeStep = Math.max(minStep, Math.max(10, Math.round(stepPx || 500)));

  if (safeStep >= safeLength) {
    return [Math.round(safeLength / 2)];
  }

  const cuts: number[] = [];
  for (let pos = safeStep; pos < safeLength; pos += safeStep) {
    cuts.push(pos);
    if (cuts.length >= MAX_SPLIT_COUNT - 1) break;
  }
  return normalizeCustomCutPositions(cuts, safeLength);
}

/**
 * Ensures internal cut coordinates are sorted, unique integers strictly inside (0, totalLength).
 */
export function normalizeCustomCutPositions(cuts: number[], totalLength: number): number[] {
  const safeLength = Math.max(2, Math.floor(totalLength));
  const clamped = cuts
    .filter((c) => Number.isFinite(c))
    .map((c) => Math.max(1, Math.min(safeLength - 1, Math.round(c))))
    .sort((a, b) => a - b);

  const unique: number[] = [];
  for (const c of clamped) {
    if (unique.length === 0 || c > unique[unique.length - 1]) {
      unique.push(c);
    }
  }

  if (unique.length === 0) {
    return [Math.max(1, Math.floor(safeLength / 2))];
  }
  return unique.slice(0, MAX_SPLIT_COUNT - 1);
}

/**
 * Computes exact bounding rectangles for each slice given cut positions and optional overlap.
 * `overlapPx` adds extra context pixels on cut boundaries (clamped to image bounds).
 */
export function computeSliceRects(params: ComputeSlicesParams): SliceRect[] {
  const width = Math.max(2, Math.floor(params.width));
  const height = Math.max(2, Math.floor(params.height));
  const totalLength = params.direction === 'vertical-stack' ? height : width;
  const cuts = normalizeCustomCutPositions(params.cutPositions, totalLength);
  const overlap = Math.max(0, Math.min(Math.floor(totalLength / 4), Math.round(params.overlapPx ?? 0)));

  const boundaries = [0, ...cuts, totalLength];
  const rects: SliceRect[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const rawStart = boundaries[i];
    const rawEnd = boundaries[i + 1];

    const startWithOverlap = i === 0 ? 0 : Math.max(0, rawStart - overlap);
    const endWithOverlap = i === boundaries.length - 2 ? totalLength : Math.min(totalLength, rawEnd);
    const sliceLength = Math.max(1, endWithOverlap - startWithOverlap);

    if (params.direction === 'vertical-stack') {
      rects.push({
        index: i + 1,
        x: 0,
        y: startWithOverlap,
        width,
        height: sliceLength,
        cutStart: rawStart,
        cutEnd: rawEnd,
      });
    } else {
      rects.push({
        index: i + 1,
        x: startWithOverlap,
        y: 0,
        width: sliceLength,
        height,
        cutStart: rawStart,
        cutEnd: rawEnd,
      });
    }
  }

  return rects;
}

/**
 * Computes grid layout simulation metrics when inserting `pieceGapPx` pixels of whitespace
 * between adjacent split pieces.
 */
export function computeGridSimulationMetrics(params: {
  rects: SliceRect[];
  direction: SplitDirection;
  pieceGapPx: number;
}): GridSimulationMetrics {
  const { rects, direction } = params;
  const pieceGapPx = clampPieceGap(params.pieceGapPx);
  const gapCount = Math.max(0, rects.length - 1);
  const totalGapPx = gapCount * pieceGapPx;

  if (rects.length === 0) {
    return {
      pieceGapPx,
      gapCount: 0,
      totalGapPx: 0,
      gridWidth: 0,
      gridHeight: 0,
      placements: [],
    };
  }

  const placements: GridPiecePlacement[] = [];
  let cursor = 0;
  let maxCrossAxis = 0;

  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (direction === 'vertical-stack') {
      placements.push({
        index: r.index,
        gridX: 0,
        gridY: cursor,
        width: r.width,
        height: r.height,
        sourceRect: r,
      });
      cursor += r.height + (i < rects.length - 1 ? pieceGapPx : 0);
      if (r.width > maxCrossAxis) maxCrossAxis = r.width;
    } else {
      placements.push({
        index: r.index,
        gridX: cursor,
        gridY: 0,
        width: r.width,
        height: r.height,
        sourceRect: r,
      });
      cursor += r.width + (i < rects.length - 1 ? pieceGapPx : 0);
      if (r.height > maxCrossAxis) maxCrossAxis = r.height;
    }
  }

  return {
    pieceGapPx,
    gapCount,
    totalGapPx,
    gridWidth: direction === 'vertical-stack' ? maxCrossAxis : cursor,
    gridHeight: direction === 'vertical-stack' ? cursor : maxCrossAxis,
    placements,
  };
}

/**
 * Resolves the target MIME type and file extension from source MIME and user preference.
 */
export function resolveOutputMimeAndExt(
  sourceMime: string,
  outputFormat: OutputFormat
): { mimeType: 'image/png' | 'image/jpeg'; extension: 'png' | 'jpg'; label: 'PNG' | 'JPG' } {
  if (outputFormat === 'png') {
    return { mimeType: 'image/png', extension: 'png', label: 'PNG' };
  }
  if (outputFormat === 'jpeg') {
    return { mimeType: 'image/jpeg', extension: 'jpg', label: 'JPG' };
  }
  const isJpeg = /jpe?g/i.test(sourceMime);
  if (isJpeg) {
    return { mimeType: 'image/jpeg', extension: 'jpg', label: 'JPG' };
  }
  return { mimeType: 'image/png', extension: 'png', label: 'PNG' };
}

/**
 * Formats an individual slice filename with clean zero-padded index.
 */
export function formatSliceFilename(
  basePrefix: string,
  index: number,
  total: number,
  extension: string
): string {
  const sanitized = (basePrefix || 'split_image')
    .trim()
    .replace(/\.(png|jpe?g|webp)$/i, '')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_');
  const cleanPrefix = sanitized.length > 0 ? sanitized : 'split_image';
  const padWidth = Math.max(2, String(total).length);
  const paddedIndex = String(index).padStart(padWidth, '0');
  const cleanExt = extension.replace(/^\./, '').toLowerCase();
  return `${cleanPrefix}_${paddedIndex}.${cleanExt}`;
}

/**
 * Formats byte count into human-readable KB / MB string.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
