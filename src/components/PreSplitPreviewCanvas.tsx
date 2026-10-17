import React, { useRef, useState } from 'react';
import { LoadedImageSource } from '../utils/imageProcessor';
import {
  SliceRect,
  SplitDirection,
  GapBackgroundColor,
  GridSimulationMetrics,
  clampPieceGap,
} from '../utils/splitMath';
import {
  Eye,
  LayoutGrid,
  MoveVertical,
  MoveHorizontal,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';

interface PreSplitPreviewCanvasProps {
  source: LoadedImageSource;
  direction: SplitDirection;
  cutPositions: number[];
  plannedRects: SliceRect[];
  overlapPx: number;
  pieceGapPx: number;
  gapBgColor: GapBackgroundColor;
  gridMetrics: GridSimulationMetrics;
  isCustomMode: boolean;
  onUpdateSingleCut: (cutIndex: number, newPixelPos: number) => void;
  onChangePieceGapPx: (gapPx: number) => void;
  onResetEqualCuts: () => void;
  onReplaceImage: () => void;
  onClearImage: () => void;
}

type PreviewViewMode = 'overlay' | 'separated';

export const PreSplitPreviewCanvas: React.FC<PreSplitPreviewCanvasProps> = ({
  source,
  direction,
  cutPositions,
  plannedRects,
  overlapPx,
  pieceGapPx,
  gapBgColor,
  gridMetrics,
  isCustomMode,
  onUpdateSingleCut,
  onChangePieceGapPx,
  onResetEqualCuts,
  onReplaceImage,
  onClearImage,
}) => {
  const [viewMode, setViewMode] = useState<PreviewViewMode>('overlay');
  const [draggingCutIndex, setDraggingCutIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const totalAxisLength = direction === 'vertical-stack' ? source.height : source.width;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingCutIndex === null || !containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    if (direction === 'vertical-stack') {
      const ratio = (e.clientY - bounds.top) / bounds.height;
      const newY = Math.round(ratio * source.height);
      onUpdateSingleCut(draggingCutIndex, newY);
    } else {
      const ratio = (e.clientX - bounds.left) / bounds.width;
      const newX = Math.round(ratio * source.width);
      onUpdateSingleCut(draggingCutIndex, newX);
    }
  };

  const handlePointerUp = () => {
    if (draggingCutIndex !== null) {
      setDraggingCutIndex(null);
    }
  };

  return (
    <section
      id="preview-stage"
      aria-label="分割前イメージプレビュー"
      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4"
    >
      {/* Header & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-700" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">
              02. 分割前プレビュー（配置・カット線・グリッド間隔確認）
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            分割処理を実行する前に、カット位置やピース間隔（Gap: {pieceGapPx}px）を反映したグリッド配置を確認できます。
          </p>
        </div>

        {/* Interactive Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('overlay')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'overlay'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            カット線オーバーレイ
          </button>
          <button
            type="button"
            onClick={() => setViewMode('separated')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'separated'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            分割後イメージ（セパレート配置）
          </button>
        </div>
      </div>

      {/* Sub-toolbar: Source metadata & quick controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-800 truncate max-w-[200px]">
            {source.name}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {source.width} × {source.height} px
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {plannedRects.length}分割
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-sky-800 font-semibold">
            ピース間隔(Gap): {pieceGapPx}px
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'separated' && (
            <div className="flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
              <label htmlFor="preview-gap-inline" className="text-xs text-slate-600">
                ピース間隔(px):
              </label>
              <input
                id="preview-gap-inline"
                type="number"
                min={0}
                max={200}
                value={pieceGapPx}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onChangePieceGapPx(Number.isNaN(val) ? 0 : clampPieceGap(val));
                }}
                className="w-16 h-6 px-1.5 text-right text-xs font-mono font-semibold bg-white border border-slate-300 rounded tabular-nums"
              />
            </div>
          )}

          {isCustomMode && (
            <button
              type="button"
              onClick={onResetEqualCuts}
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>均等割りに戻す</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReplaceImage}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>別の画像</span>
          </button>

          <button
            type="button"
            onClick={onClearImage}
            className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>クリア</span>
          </button>
        </div>
      </div>

      {/* Main Preview Stage */}
      {viewMode === 'overlay' ? (
        <div
          className="bg-checkerboard border border-slate-200 rounded-lg p-4 md:p-6 flex flex-col items-center justify-center select-none overflow-auto"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div
            ref={containerRef}
            data-testid="cutline-preview-stage"
            className="relative inline-block max-w-full shadow-sm border border-slate-300 bg-white"
          >
            <img
              src={source.dataUrl}
              alt={`分割前プレビュー: ${source.name}`}
              referrerPolicy="no-referrer"
              draggable={false}
              className="block max-h-[640px] w-auto max-w-full object-contain select-none"
            />

            {/* Planned Slice Zone Overlays (#01, #02, ..., #n) */}
            {plannedRects.map((rect, idx) => {
              const startPct = (rect.cutStart / totalAxisLength) * 100;
              const sizePct = ((rect.cutEnd - rect.cutStart) / totalAxisLength) * 100;
              const style: React.CSSProperties =
                direction === 'vertical-stack'
                  ? {
                      top: `${startPct}%`,
                      left: 0,
                      right: 0,
                      height: `${sizePct}%`,
                    }
                  : {
                      left: `${startPct}%`,
                      top: 0,
                      bottom: 0,
                      width: `${sizePct}%`,
                    };

              return (
                <div
                  key={rect.index}
                  style={style}
                  className={`absolute pointer-events-none flex items-start justify-between p-2.5 transition-colors ${
                    idx % 2 === 0 ? 'bg-sky-500/5' : 'bg-slate-900/5'
                  }`}
                >
                  <div className="bg-slate-900/85 text-white px-2 py-0.5 rounded text-xs font-mono tabular-nums shadow-xs">
                    #{String(rect.index).padStart(2, '0')} · {rect.width}×{rect.height}px (
                    {sizePct.toFixed(1)}%)
                  </div>
                </div>
              );
            })}

            {/* Interactive Draggable Cut Lines */}
            {cutPositions.map((cutPx, idx) => {
              const pct = (cutPx / totalAxisLength) * 100;
              const overlapPct = (overlapPx / totalAxisLength) * 100;
              const isDragging = draggingCutIndex === idx;

              if (direction === 'vertical-stack') {
                return (
                  <div
                    key={idx}
                    style={{ top: `${pct}%` }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setDraggingCutIndex(idx);
                    }}
                    role="slider"
                    aria-label={`カット線 ${idx + 1} の位置 (px)`}
                    aria-valuemin={1}
                    aria-valuemax={totalAxisLength - 1}
                    aria-valuenow={cutPx}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        onUpdateSingleCut(idx, cutPx - 10);
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        onUpdateSingleCut(idx, cutPx + 10);
                      }
                    }}
                    className="absolute left-0 right-0 -translate-y-1/2 h-6 flex items-center cursor-ns-resize group z-10"
                  >
                    {overlapPx > 0 && (
                      <div
                        style={{ height: `${Math.max(4, overlapPct * 6)}px` }}
                        className="absolute left-0 right-0 bg-amber-400/25 border-y border-amber-400/60 pointer-events-none"
                      />
                    )}

                    <div
                      className={`w-full border-t-2 border-dashed transition-colors ${
                        isDragging
                          ? 'border-sky-400 shadow-sm'
                          : 'border-rose-500 group-hover:border-sky-400'
                      }`}
                    />

                    <div
                      className={`absolute right-2 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-white flex items-center gap-1 shadow-xs tabular-nums ${
                        isDragging
                          ? 'bg-sky-600'
                          : 'bg-rose-600 group-hover:bg-sky-600'
                      }`}
                    >
                      <MoveVertical className="w-3 h-3" aria-hidden="true" />
                      <span>
                        カット #{idx + 1}: {cutPx}px
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  style={{ left: `${pct}%` }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggingCutIndex(idx);
                  }}
                  role="slider"
                  aria-label={`カット線 ${idx + 1} の位置 (px)`}
                  aria-valuemin={1}
                  aria-valuemax={totalAxisLength - 1}
                  aria-valuenow={cutPx}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      onUpdateSingleCut(idx, cutPx - 10);
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      onUpdateSingleCut(idx, cutPx + 10);
                    }
                  }}
                  className="absolute top-0 bottom-0 -translate-x-1/2 w-6 flex justify-center cursor-ew-resize group z-10"
                >
                  <div
                    className={`h-full border-l-2 border-dashed transition-colors ${
                      isDragging
                        ? 'border-sky-400'
                        : 'border-rose-500 group-hover:border-sky-400'
                    }`}
                  />
                  <div
                    className={`absolute bottom-2 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold text-white flex items-center gap-1 shadow-xs whitespace-nowrap tabular-nums ${
                      isDragging
                        ? 'bg-sky-600'
                        : 'bg-rose-600 group-hover:bg-sky-600'
                    }`}
                  >
                    <MoveHorizontal className="w-3 h-3" aria-hidden="true" />
                    <span>{cutPx}px</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 mt-3">
            ヒント: 赤い破線（カット線）をドラッグすると分割位置を調整できます。ピース間の余白（{pieceGapPx}px）を確認するには「分割後イメージ（セパレート配置）」へ切り替えてください。
          </p>
        </div>
      ) : (
        /* Mode B: Proportional Grid Layout Simulation with Piece Gap (px) Whitespace */
        <div
          data-testid="separated-preview-stage"
          className="bg-checkerboard border border-slate-200 rounded-lg p-4 md:p-6 flex flex-col items-center justify-center overflow-auto"
        >
          {/* Proportional SVG Grid Simulation Canvas */}
          <div className="w-full max-w-xl flex flex-col items-center gap-3">
            <div className="w-full flex items-center justify-between text-xs font-mono text-slate-600 bg-white/90 px-3 py-1.5 rounded border border-slate-200 tabular-nums">
              <span>
                グリッド全体: {gridMetrics.gridWidth} × {gridMetrics.gridHeight} px
              </span>
              <span>
                ピース間隔(Gap): {gridMetrics.pieceGapPx}px × {gridMetrics.gapCount}箇所 (計{' '}
                {gridMetrics.totalGapPx}px)
              </span>
            </div>

            <div className="p-4 rounded-lg border border-slate-300 shadow-xs bg-slate-200/60 flex items-center justify-center w-full">
              <svg
                viewBox={`0 0 ${gridMetrics.gridWidth} ${gridMetrics.gridHeight}`}
                className="max-h-[640px] w-auto max-w-full block shadow-xs border border-slate-300"
                style={{
                  backgroundColor:
                    gapBgColor === 'transparent' ? 'transparent' : gapBgColor,
                }}
              >
                <defs>
                  {gridMetrics.placements.map((p) => (
                    <clipPath key={`clip-${p.index}`} id={`preview-slice-clip-${p.index}`}>
                      <rect
                        x={p.sourceRect.x}
                        y={p.sourceRect.y}
                        width={p.width}
                        height={p.height}
                      />
                    </clipPath>
                  ))}
                </defs>

                {gridMetrics.placements.map((p) => {
                  const dx = p.gridX - p.sourceRect.x;
                  const dy = p.gridY - p.sourceRect.y;
                  return (
                    <g key={p.index} transform={`translate(${dx}, ${dy})`}>
                      <image
                        href={source.dataUrl}
                        width={source.width}
                        height={source.height}
                        x={0}
                        y={0}
                        clipPath={`url(#preview-slice-clip-${p.index})`}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-3">
            各ピース間に指定したピクセル間隔（{pieceGapPx}px のホワイトスペース）を挿入した実寸比率のグリッドレイアウト・シミュレーションです。
          </p>
        </div>
      )}
    </section>
  );
};
