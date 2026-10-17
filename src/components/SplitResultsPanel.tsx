import React, { useState } from 'react';
import {
  GeneratedSlice,
  downloadSingleSlice,
} from '../utils/imageProcessor';
import {
  SplitDirection,
  GapBackgroundColor,
  GridSimulationMetrics,
  formatBytes,
  clampPieceGap,
} from '../utils/splitMath';
import {
  Download,
  FolderArchive,
  Maximize2,
  X,
  CheckCircle2,
  RefreshCw,
  LayoutGrid,
  List,
  ImageDown,
} from 'lucide-react';

interface SplitResultsPanelProps {
  slices: GeneratedSlice[];
  direction: SplitDirection;
  pieceGapPx: number;
  gapBgColor: GapBackgroundColor;
  gridMetrics: GridSimulationMetrics;
  isProcessing: boolean;
  hasUnappliedChanges: boolean;
  onChangePieceGapPx: (gapPx: number) => void;
  onExecuteSplit: () => void;
  onDownloadZip: () => void;
  onDownloadGridComposite: () => void;
}

type ResultsViewMode = 'cards' | 'grid-simulation';

export const SplitResultsPanel: React.FC<SplitResultsPanelProps> = ({
  slices,
  direction,
  pieceGapPx,
  gapBgColor,
  gridMetrics,
  isProcessing,
  hasUnappliedChanges,
  onChangePieceGapPx,
  onExecuteSplit,
  onDownloadZip,
  onDownloadGridComposite,
}) => {
  const [viewMode, setViewMode] = useState<ResultsViewMode>('cards');
  const [zoomedSlice, setZoomedSlice] = useState<GeneratedSlice | null>(null);
  const totalBytes = slices.reduce((acc, s) => acc + s.byteSize, 0);

  // Compute CSS proportional gap for the live DOM grid simulation container
  // Assuming max display width ~520px for vertical-stack
  const displayScale =
    direction === 'vertical-stack'
      ? Math.min(1, 520 / Math.max(1, gridMetrics.gridWidth))
      : Math.min(1, 680 / Math.max(1, gridMetrics.gridWidth));
  const scaledGapPx = Math.max(0, Math.round(pieceGapPx * displayScale));

  return (
    <section
      id="results-stage"
      aria-label="分割結果一覧とダウンロード"
      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4"
    >
      {/* Header & View Mode Switcher + Batch Download CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">
              03. 分割された画像一覧・グリッドシミュレーション ({slices.length}枚)
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
            <span>形式: {slices[0]?.formatLabel ?? 'PNG'}</span>
            <span aria-hidden="true">·</span>
            <span>合計サイズ: {formatBytes(totalBytes)}</span>
            <span aria-hidden="true">·</span>
            <span>
              ピース間隔(Gap): {pieceGapPx}px (グリッド寸法 {gridMetrics.gridWidth}×
              {gridMetrics.gridHeight}px)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: Individual Cards vs Grid Layout Simulation */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
              <span>個別ピース一覧</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid-simulation')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'grid-simulation'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>グリッドシミュレーション (Gap: {pieceGapPx}px)</span>
            </button>
          </div>

          {hasUnappliedChanges && (
            <button
              type="button"
              onClick={onExecuteSplit}
              disabled={isProcessing}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>最新設定で再分割</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDownloadZip}
            disabled={slices.length === 0 || isProcessing}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FolderArchive className="w-4 h-4" aria-hidden="true" />
            <span>一括ZIPダウンロード ({slices.length}枚)</span>
          </button>
        </div>
      </div>

      {/* Notice if user tweaked preview controls and hasn't re-clicked execute */}
      {hasUnappliedChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900">
          <span>
            分割設定またはカット位置が変更されています。最新のプレビュー状態を反映するには「最新設定で再分割」を押してください。
          </span>
          <button
            type="button"
            onClick={onExecuteSplit}
            className="px-3 py-1 font-semibold bg-amber-900 text-white rounded hover:bg-amber-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            今すぐ反映
          </button>
        </div>
      )}

      {/* Main Content Area: Cards Grid OR Whitespace-Separated Grid Simulation */}
      {isProcessing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
          {Array.from({ length: Math.max(2, slices.length || 4) }).map((_, i) => (
            <div
              key={i}
              className="h-36 bg-slate-100 animate-pulse rounded-lg border border-slate-200"
            />
          ))}
        </div>
      ) : viewMode === 'cards' ? (
        <div
          data-testid="generated-slices-grid"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {slices.map((slice) => (
            <article
              key={slice.index}
              className="border border-slate-200 rounded-lg p-3 flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors bg-slate-50/50"
            >
              {/* Slice Preview Thumbnail */}
              <div className="relative bg-checkerboard border border-slate-200 rounded overflow-hidden h-36 flex items-center justify-center group">
                <img
                  src={slice.objectUrl}
                  alt={`分割画像 ${slice.index}: ${slice.filename}`}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                />
                <button
                  type="button"
                  aria-label={`${slice.filename} を拡大プレビュー`}
                  onClick={() => setZoomedSlice(slice)}
                  className="absolute top-2 right-2 p-1.5 rounded bg-slate-900/75 text-white opacity-85 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              {/* Metadata & Individual Download */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span
                    title={slice.filename}
                    className="text-xs font-mono font-semibold text-slate-900 truncate"
                  >
                    {slice.filename}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
                    <span>
                      {slice.rect.width} × {slice.rect.height} px
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatBytes(slice.byteSize)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={`${slice.filename} を保存`}
                  onClick={() => downloadSingleSlice(slice)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>保存</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Grid Layout Simulation View with Exact Piece Gap Whitespace */
        <div
          data-testid="results-grid-simulation"
          className="flex flex-col gap-4"
        >
          {/* Simulation Control Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="results-gap-slider"
                  className="text-xs font-semibold text-slate-800 whitespace-nowrap"
                >
                  ピース間隔 (Gap):
                </label>
                <input
                  id="results-gap-slider"
                  type="range"
                  min={0}
                  max={120}
                  value={Math.min(120, pieceGapPx)}
                  onChange={(e) => onChangePieceGapPx(clampPieceGap(parseInt(e.target.value, 10)))}
                  className="w-28 accent-sky-600 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                  {pieceGapPx} px
                </span>
              </div>

              <span className="text-xs text-slate-500 font-mono tabular-nums">
                余白合計: {gridMetrics.totalGapPx}px ({gridMetrics.gapCount}箇所) · 全体寸法:{' '}
                {gridMetrics.gridWidth} × {gridMetrics.gridHeight} px
              </span>
            </div>

            <button
              type="button"
              onClick={onDownloadGridComposite}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ImageDown className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
              <span>余白付きグリッド結合画像を保存 (PNG)</span>
            </button>
          </div>

          {/* Whitespace-Separated Grid Container */}
          <div className="bg-checkerboard border border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center overflow-auto">
            <div
              style={{
                backgroundColor: gapBgColor === 'transparent' ? 'transparent' : gapBgColor,
                gap: `${scaledGapPx}px`,
              }}
              className={`border border-slate-300 shadow-sm flex ${
                direction === 'vertical-stack'
                  ? 'flex-col w-full max-w-[520px]'
                  : 'flex-row items-start max-w-full overflow-x-auto'
              }`}
            >
              {slices.map((slice) => (
                <div
                  key={slice.index}
                  className="relative group overflow-hidden"
                >
                  <img
                    src={slice.objectUrl}
                    alt={`グリッドピース #${slice.index}: ${slice.filename}`}
                    referrerPolicy="no-referrer"
                    className="block w-full h-auto"
                  />
                  <div className="absolute top-2 left-2 bg-slate-900/80 text-white px-2 py-0.5 rounded text-[11px] font-mono opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                    #{String(slice.index).padStart(2, '0')} · {slice.rect.width}×
                    {slice.rect.height}px
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 mt-3 font-mono tabular-nums">
              表示中のグリッドレイアウト: 各ピース間に実寸 {pieceGapPx}px（縮小表示 {scaledGapPx}px）のホワイトスペースを挿入しています。
            </p>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Inspecting a Single Slice */}
      {zoomedSlice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${zoomedSlice.filename} の拡大表示`}
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
          onClick={() => setZoomedSlice(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2 text-sm font-mono font-semibold text-slate-900 tabular-nums">
                <span>#{String(zoomedSlice.index).padStart(2, '0')}</span>
                <span>·</span>
                <span>{zoomedSlice.filename}</span>
                <span>·</span>
                <span className="text-xs font-normal text-slate-500">
                  {zoomedSlice.rect.width} × {zoomedSlice.rect.height} px (
                  {formatBytes(zoomedSlice.byteSize)})
                </span>
              </div>
              <button
                type="button"
                aria-label="拡大表示を閉じる"
                onClick={() => setZoomedSlice(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 bg-checkerboard overflow-auto flex items-center justify-center max-h-[70vh]">
              <img
                src={zoomedSlice.objectUrl}
                alt={zoomedSlice.filename}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[62vh] object-contain border border-slate-300 bg-white"
              />
            </div>

            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setZoomedSlice(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                閉じる
              </button>
              <button
                type="button"
                onClick={() => downloadSingleSlice(zoomedSlice)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>この画像を保存</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
