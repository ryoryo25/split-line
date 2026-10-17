import React from 'react';
import {
  SplitDirection,
  SplitMode,
  OutputFormat,
  GapBackgroundColor,
  GridSimulationMetrics,
  MIN_SPLIT_COUNT,
  MAX_SPLIT_COUNT,
  MIN_PIECE_GAP_PX,
  MAX_PIECE_GAP_PX,
  clampSplitCount,
  clampPieceGap,
} from '../utils/splitMath';
import {
  Sliders,
  Rows3,
  Columns3,
  RotateCcw,
  Scissors,
  Download,
  ShieldCheck,
  LayoutGrid,
} from 'lucide-react';

interface SplitSettingsPanelProps {
  imageWidth: number;
  imageHeight: number;
  splitCount: number;
  direction: SplitDirection;
  splitMode: SplitMode;
  fixedStepPx: number;
  cutPositions: number[];
  overlapPx: number;
  pieceGapPx: number;
  gapBgColor: GapBackgroundColor;
  gridMetrics: GridSimulationMetrics;
  outputFormat: OutputFormat;
  jpegQuality: number;
  filenamePrefix: string;
  isProcessing: boolean;
  hasUnappliedChanges: boolean;
  onChangeSplitCount: (n: number) => void;
  onChangeDirection: (dir: SplitDirection) => void;
  onChangeSplitMode: (mode: SplitMode) => void;
  onChangeFixedStepPx: (step: number) => void;
  onUpdateSingleCut: (cutIndex: number, newPixelPos: number) => void;
  onResetEqualCuts: () => void;
  onChangeOverlapPx: (px: number) => void;
  onChangePieceGapPx: (gapPx: number) => void;
  onChangeGapBgColor: (color: GapBackgroundColor) => void;
  onChangeOutputFormat: (fmt: OutputFormat) => void;
  onChangeJpegQuality: (q: number) => void;
  onChangeFilenamePrefix: (prefix: string) => void;
  onExecuteSplit: () => void;
  onDownloadZip: () => void;
  canDownloadZip: boolean;
}

const PRESET_COUNTS = [2, 3, 4, 5, 6, 8, 10, 12];
const PRESET_GAPS = [0, 8, 16, 24, 40, 64];

const GAP_BG_OPTIONS: { value: GapBackgroundColor; label: string }[] = [
  { value: '#FFFFFF', label: 'ホワイト (#FFF)' },
  { value: '#F1F5F9', label: 'ライトグレー' },
  { value: '#0F172A', label: 'ダーク' },
  { value: 'transparent', label: '透過 (PNG)' },
];

export const SplitSettingsPanel: React.FC<SplitSettingsPanelProps> = ({
  imageWidth,
  imageHeight,
  splitCount,
  direction,
  splitMode,
  fixedStepPx,
  cutPositions,
  overlapPx,
  pieceGapPx,
  gapBgColor,
  gridMetrics,
  outputFormat,
  jpegQuality,
  filenamePrefix,
  isProcessing,
  hasUnappliedChanges,
  onChangeSplitCount,
  onChangeDirection,
  onChangeSplitMode,
  onChangeFixedStepPx,
  onUpdateSingleCut,
  onResetEqualCuts,
  onChangeOverlapPx,
  onChangePieceGapPx,
  onChangeGapBgColor,
  onChangeOutputFormat,
  onChangeJpegQuality,
  onChangeFilenamePrefix,
  onExecuteSplit,
  onDownloadZip,
  canDownloadZip,
}) => {
  const activeAxisLength = direction === 'vertical-stack' ? imageHeight : imageWidth;
  const approxEqualSize = Math.round(activeAxisLength / Math.max(2, splitCount));

  return (
    <aside
      aria-label="分割パラメータ設定パネル"
      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3.5">
        <div className="flex items-center gap-2 shrink-0">
          <Sliders className="w-4 h-4 text-slate-700" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-900 whitespace-nowrap">
            01. 分割数・配置の設定
          </h2>
        </div>
        <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
          元サイズ: {imageWidth} × {imageHeight} px
        </span>
      </div>

      {/* 1. Split Count (n) — Number Input + Slider + Presets */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor="split-count-number"
            className="text-sm font-semibold text-slate-900"
          >
            分割数 (n) を指定
          </label>
          <span className="text-xs text-slate-500 tabular-nums">
            1枚あたり約 {approxEqualSize} px
          </span>
        </div>

        {/* Numeric input + Stepper */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="分割数を1減らす"
            disabled={splitCount <= MIN_SPLIT_COUNT}
            onClick={() => onChangeSplitCount(clampSplitCount(splitCount - 1, activeAxisLength))}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
          >
            −
          </button>

          <div className="relative flex-1">
            <input
              id="split-count-number"
              type="number"
              min={MIN_SPLIT_COUNT}
              max={MAX_SPLIT_COUNT}
              value={splitCount}
              onChange={(e) => {
                const raw = parseInt(e.target.value, 10);
                if (!Number.isNaN(raw)) {
                  onChangeSplitCount(clampSplitCount(raw, activeAxisLength));
                }
              }}
              className="w-full h-10 px-3 pr-12 text-center text-base font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 tabular-nums"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 pointer-events-none">
              分割
            </span>
          </div>

          <button
            type="button"
            aria-label="分割数を1増やす"
            disabled={splitCount >= MAX_SPLIT_COUNT}
            onClick={() => onChangeSplitCount(clampSplitCount(splitCount + 1, activeAxisLength))}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
          >
            ＋
          </button>
        </div>

        {/* Range Slider */}
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <label htmlFor="split-count-slider">スライダーで分割数を調整</label>
            <span className="font-mono tabular-nums">
              {MIN_SPLIT_COUNT} 〜 {MAX_SPLIT_COUNT} 分割
            </span>
          </div>
          <input
            id="split-count-slider"
            type="range"
            min={MIN_SPLIT_COUNT}
            max={MAX_SPLIT_COUNT}
            value={splitCount}
            onChange={(e) =>
              onChangeSplitCount(clampSplitCount(parseInt(e.target.value, 10), activeAxisLength))
            }
            className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />
        </div>

        {/* Quick Preset Buttons */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-500">よく使う分割数プリセット</span>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_COUNTS.map((preset) => {
              const isActive = splitCount === preset && splitMode === 'equal';
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChangeSplitCount(preset)}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {preset}分割
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* 2. Piece Gap (ピース間隔 / ホワイトスペース) Setting for Grid Layout Simulation */}
      <div className="flex flex-col gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <LayoutGrid className="w-4 h-4 text-sky-700" aria-hidden="true" />
            <label
              htmlFor="piece-gap-number"
              className="text-xs font-bold text-slate-900"
            >
              ピース間隔（Gap）設定
            </label>
          </div>
          <div className="flex items-center gap-1">
            <input
              id="piece-gap-number"
              aria-label="ピース間隔 (px)"
              type="number"
              min={MIN_PIECE_GAP_PX}
              max={MAX_PIECE_GAP_PX}
              value={pieceGapPx}
              onChange={(e) => {
                const raw = parseInt(e.target.value, 10);
                onChangePieceGapPx(Number.isNaN(raw) ? 0 : clampPieceGap(raw));
              }}
              className="w-18 h-7 px-2 text-right font-mono text-xs font-bold bg-white border border-slate-300 rounded tabular-nums"
            />
            <span className="text-xs font-mono text-slate-600">px</span>
          </div>
        </div>

        {/* Piece Gap Slider */}
        <div className="flex flex-col gap-1">
          <input
            id="piece-gap-slider"
            aria-label="ピース間隔スライダー"
            type="range"
            min={MIN_PIECE_GAP_PX}
            max={120}
            step={1}
            value={Math.min(120, pieceGapPx)}
            onChange={(e) => onChangePieceGapPx(clampPieceGap(parseInt(e.target.value, 10)))}
            className="w-full accent-sky-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
            <span>0px (密着)</span>
            <span>合計余白: {gridMetrics.totalGapPx}px ({gridMetrics.gapCount}箇所)</span>
          </div>
        </div>

        {/* Quick Gap Presets */}
        <div className="grid grid-cols-6 gap-1">
          {PRESET_GAPS.map((gap) => (
            <button
              key={gap}
              type="button"
              onClick={() => onChangePieceGapPx(gap)}
              className={`py-1 px-1.5 text-[11px] font-mono font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                pieceGapPx === gap
                  ? 'bg-sky-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {gap}px
            </button>
          ))}
        </div>

        {/* Whitespace Color Selector */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
          <label htmlFor="gap-bg-select" className="text-[11px] font-medium text-slate-600">
            余白（ホワイトスペース）色:
          </label>
          <select
            id="gap-bg-select"
            value={gapBgColor}
            onChange={(e) => onChangeGapBgColor(e.target.value as GapBackgroundColor)}
            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium text-slate-800 cursor-pointer"
          >
            {GAP_BG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Simulated Grid Dimension Readout */}
        <div className="text-[11px] text-slate-600 font-mono tabular-nums flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200">
          <span>グリッド全体寸法:</span>
          <span className="font-semibold text-slate-900">
            {gridMetrics.gridWidth} × {gridMetrics.gridHeight} px
          </span>
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* 3. Split Direction (上下に縦分割 vs 左右にカラム分割) */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-700">分割の方向（カット線の向き）</span>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => onChangeDirection('vertical-stack')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              direction === 'vertical-stack'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Rows3 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>上下にn分割 (縦並び)</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeDirection('horizontal-columns')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              direction === 'horizontal-columns'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>左右にn分割 (短冊)</span>
          </button>
        </div>
      </div>

      {/* 4. Split Mode & Cut Position Adjustment */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">カット位置の配置方式</span>
          {splitMode === 'custom' && (
            <button
              type="button"
              onClick={onResetEqualCuts}
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>均等に戻す</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => onChangeSplitMode('equal')}
            className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              splitMode === 'equal'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            均等n分割
          </button>
          <button
            type="button"
            onClick={() => onChangeSplitMode('custom')}
            className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              splitMode === 'custom'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            個別位置調整
          </button>
          <button
            type="button"
            onClick={() => onChangeSplitMode('fixed-size')}
            className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              splitMode === 'fixed-size'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            px間隔指定
          </button>
        </div>

        {splitMode === 'fixed-size' && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <label htmlFor="fixed-step-input" className="text-xs text-slate-600">
              分割間隔 (px):
            </label>
            <input
              id="fixed-step-input"
              type="number"
              min={20}
              max={activeAxisLength}
              step={10}
              value={fixedStepPx}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val)) onChangeFixedStepPx(val);
              }}
              className="w-28 h-8 px-2.5 text-right text-xs font-mono font-semibold border border-slate-300 rounded-md tabular-nums"
            />
          </div>
        )}

        {/* Cut Line Coordinates List */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>カット線の座標 ({cutPositions.length}本)</span>
            <span className="text-slate-400">プレビュー上でもドラッグ可能</span>
          </div>
          <div className="max-h-32 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {cutPositions.map((pos, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                <label
                  htmlFor={`cut-line-input-${idx}`}
                  className="font-mono text-slate-600 tabular-nums"
                >
                  カット線 #{idx + 1}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id={`cut-line-input-${idx}`}
                    type="number"
                    min={1}
                    max={activeAxisLength - 1}
                    value={pos}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val)) {
                        onUpdateSingleCut(idx, val);
                      }
                    }}
                    className="w-24 h-7 px-2 text-right font-mono text-xs bg-white border border-slate-300 rounded tabular-nums"
                  />
                  <span className="text-slate-500 font-mono">px</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Overlap (のりしろ px) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="overlap-slider" className="text-xs font-semibold text-slate-700">
            のりしろ・重複余白 (Overlap)
          </label>
          <span className="text-xs font-mono text-slate-600 tabular-nums">{overlapPx} px</span>
        </div>
        <input
          id="overlap-slider"
          type="range"
          min={0}
          max={Math.min(200, Math.floor(activeAxisLength / 6))}
          step={5}
          value={overlapPx}
          onChange={(e) => onChangeOverlapPx(parseInt(e.target.value, 10) || 0)}
          className="w-full accent-sky-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
        />
      </div>

      <hr className="border-slate-200" />

      {/* 6. Output Format & Filename Prefix */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-slate-700">保存形式・ファイル名</span>
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
          {(
            [
              { id: 'auto', label: '元形式を維持' },
              { id: 'png', label: 'PNG (高画質)' },
              { id: 'jpeg', label: 'JPG (軽量)' },
            ] as const
          ).map((fmt) => (
            <button
              key={fmt.id}
              type="button"
              onClick={() => onChangeOutputFormat(fmt.id)}
              className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                outputFormat === fmt.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>

        {outputFormat === 'jpeg' && (
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="jpeg-quality-slider" className="text-xs text-slate-600">
              JPG画質 ({jpegQuality}%)
            </label>
            <input
              id="jpeg-quality-slider"
              type="range"
              min={50}
              max={100}
              value={jpegQuality}
              onChange={(e) => onChangeJpegQuality(parseInt(e.target.value, 10))}
              className="w-32 accent-sky-600 cursor-pointer"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="filename-prefix-input" className="text-xs text-slate-600">
            出力ファイル名プレフィックス
          </label>
          <input
            id="filename-prefix-input"
            type="text"
            value={filenamePrefix}
            onChange={(e) => onChangeFilenamePrefix(e.target.value)}
            placeholder="split_image"
            className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={onExecuteSplit}
          disabled={isProcessing}
          className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            hasUnappliedChanges
              ? 'bg-sky-600 hover:bg-sky-700'
              : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          <Scissors className="w-4 h-4" aria-hidden="true" />
          <span>
            {isProcessing
              ? '分割画像を生成中...'
              : hasUnappliedChanges
                ? `プレビュー内容で ${splitCount}分割 を再生成`
                : `この設定で ${splitCount}分割 を実行`}
          </span>
        </button>

        <button
          type="button"
          onClick={onDownloadZip}
          disabled={!canDownloadZip || isProcessing}
          className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>全 {splitCount} 枚を一括ZIPダウンロード</span>
        </button>
      </div>

      {/* Client-side privacy guarantee */}
      <div className="pt-2 border-t border-slate-200 flex items-start gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed">
          完全ローカル処理: 画像はサーバーへ一切送信されず、お使いのブラウザ内の Canvas 上でのみ安全に分割されます。
        </p>
      </div>
    </aside>
  );
};
