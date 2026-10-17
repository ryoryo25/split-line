import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampSplitCount,
  clampPieceGap,
  generateEqualCutPositions,
  generateFixedSizeCutPositions,
  normalizeCustomCutPositions,
  computeSliceRects,
  computeGridSimulationMetrics,
  resolveOutputMimeAndExt,
  formatSliceFilename,
  formatBytes,
} from './splitMath.ts';

test('clampSplitCount enforces [2, 50] bounds and handles edge inputs', () => {
  assert.equal(clampSplitCount(1), 2);
  assert.equal(clampSplitCount(0), 2);
  assert.equal(clampSplitCount(-5), 2);
  assert.equal(clampSplitCount(4), 4);
  assert.equal(clampSplitCount(100), 50);
  assert.equal(clampSplitCount(Number.NaN), 2);
});

test('clampPieceGap clamps pixel gap into [0, 200]', () => {
  assert.equal(clampPieceGap(-15), 0);
  assert.equal(clampPieceGap(0), 0);
  assert.equal(clampPieceGap(24.4), 24);
  assert.equal(clampPieceGap(350), 200);
  assert.equal(clampPieceGap(Number.NaN), 0);
});

test('generateEqualCutPositions divides height evenly into n slices', () => {
  const cuts4 = generateEqualCutPositions(1800, 4);
  assert.deepEqual(cuts4, [450, 900, 1350]);

  const cuts3 = generateEqualCutPositions(1000, 3);
  assert.deepEqual(cuts3, [333, 667]);
});

test('generateFixedSizeCutPositions slices every stepPx pixels', () => {
  const cuts = generateFixedSizeCutPositions(2000, 600);
  assert.deepEqual(cuts, [600, 1200, 1800]);
});

test('normalizeCustomCutPositions deduplicates, sorts, and clamps interior cuts', () => {
  const normalized = normalizeCustomCutPositions([900, 300, 300, -10, 1500], 1200);
  assert.deepEqual(normalized, [1, 300, 900, 1199]);
});

test('computeSliceRects computes vertical-stack slices with and without overlap', () => {
  const cuts = generateEqualCutPositions(1800, 3);
  const rects = computeSliceRects({
    width: 1200,
    height: 1800,
    direction: 'vertical-stack',
    cutPositions: cuts,
    overlapPx: 0,
  });

  assert.equal(rects.length, 3);
  assert.deepEqual(rects[0], {
    index: 1,
    x: 0,
    y: 0,
    width: 1200,
    height: 600,
    cutStart: 0,
    cutEnd: 600,
  });
  assert.deepEqual(rects[1], {
    index: 2,
    x: 0,
    y: 600,
    width: 1200,
    height: 600,
    cutStart: 600,
    cutEnd: 1200,
  });
  assert.deepEqual(rects[2], {
    index: 3,
    x: 0,
    y: 1200,
    width: 1200,
    height: 600,
    cutStart: 1200,
    cutEnd: 1800,
  });

  // With 30px overlap (のりしろ)
  const overlapped = computeSliceRects({
    width: 1200,
    height: 1800,
    direction: 'vertical-stack',
    cutPositions: cuts,
    overlapPx: 30,
  });
  assert.equal(overlapped[0].y, 0);
  assert.equal(overlapped[0].height, 600);
  assert.equal(overlapped[1].y, 570);
  assert.equal(overlapped[1].height, 630);
  assert.equal(overlapped[2].y, 1170);
  assert.equal(overlapped[2].height, 630);
});

test('computeSliceRects computes horizontal-columns slices accurately', () => {
  const cuts = generateEqualCutPositions(1200, 3);
  const rects = computeSliceRects({
    width: 1200,
    height: 1800,
    direction: 'horizontal-columns',
    cutPositions: cuts,
    overlapPx: 0,
  });

  assert.equal(rects.length, 3);
  assert.equal(rects[0].width, 400);
  assert.equal(rects[0].height, 1800);
  assert.equal(rects[1].x, 400);
  assert.equal(rects[2].x, 800);
});

test('computeGridSimulationMetrics inserts exact whitespace gap between pieces', () => {
  const cuts = generateEqualCutPositions(1800, 4);
  const rects = computeSliceRects({
    width: 1200,
    height: 1800,
    direction: 'vertical-stack',
    cutPositions: cuts,
    overlapPx: 0,
  });

  const grid = computeGridSimulationMetrics({
    rects,
    direction: 'vertical-stack',
    pieceGapPx: 24,
  });

  assert.equal(grid.pieceGapPx, 24);
  assert.equal(grid.gapCount, 3);
  assert.equal(grid.totalGapPx, 72);
  assert.equal(grid.gridWidth, 1200);
  assert.equal(grid.gridHeight, 1872);
  assert.equal(grid.placements[0].gridY, 0);
  assert.equal(grid.placements[1].gridY, 450 + 24);
  assert.equal(grid.placements[2].gridY, 900 + 48);
  assert.equal(grid.placements[3].gridY, 1350 + 72);
});

test('resolveOutputMimeAndExt and formatSliceFilename produce valid output names', () => {
  assert.deepEqual(resolveOutputMimeAndExt('image/jpeg', 'auto'), {
    mimeType: 'image/jpeg',
    extension: 'jpg',
    label: 'JPG',
  });
  assert.deepEqual(resolveOutputMimeAndExt('image/jpeg', 'png'), {
    mimeType: 'image/png',
    extension: 'png',
    label: 'PNG',
  });
  assert.equal(formatSliceFilename('webtoon_ep1.png', 1, 4, 'png'), 'webtoon_ep1_01.png');
  assert.equal(formatSliceFilename('long page', 12, 12, 'jpg'), 'long_page_12.jpg');
  assert.equal(formatBytes(51200), '50.0 KB');
});
