import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { UploadDropzone } from './components/UploadDropzone';
import { SplitSettingsPanel } from './components/SplitSettingsPanel';
import { PreSplitPreviewCanvas } from './components/PreSplitPreviewCanvas';
import { SplitResultsPanel } from './components/SplitResultsPanel';
import {
  SplitDirection,
  SplitMode,
  OutputFormat,
  GapBackgroundColor,
  clampSplitCount,
  clampPieceGap,
  generateEqualCutPositions,
  generateFixedSizeCutPositions,
  normalizeCustomCutPositions,
  computeSliceRects,
  computeGridSimulationMetrics,
} from './utils/splitMath';
import {
  LoadedImageSource,
  GeneratedSlice,
  loadImageFromFile,
  renderImageSlices,
  downloadAllSlicesAsZip,
  downloadGridSimulationImage,
  createSampleVerticalImage,
} from './utils/imageProcessor';

export default function App() {
  const [sourceImage, setSourceImage] = useState<LoadedImageSource | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Split configuration state
  const [splitCount, setSplitCount] = useState<number>(4);
  const [direction, setDirection] = useState<SplitDirection>('vertical-stack');
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [fixedStepPx, setFixedStepPx] = useState<number>(450);
  const [customCuts, setCustomCuts] = useState<number[]>([450, 900, 1350]);
  const [overlapPx, setOverlapPx] = useState<number>(0);

  // Piece Gap (whitespace interval between pieces for grid layout simulation)
  const [pieceGapPx, setPieceGapPx] = useState<number>(16);
  const [gapBgColor, setGapBgColor] = useState<GapBackgroundColor>('#FFFFFF');

  const [outputFormat, setOutputFormat] = useState<OutputFormat>('auto');
  const [jpegQuality, setJpegQuality] = useState<number>(92);
  const [filenamePrefix, setFilenamePrefix] = useState<string>('vertical_split');

  // Generated output slices state
  const [generatedSlices, setGeneratedSlices] = useState<GeneratedSlice[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastAppliedSignature, setLastAppliedSignature] = useState<string>('');

  const hiddenFileInputRef = useRef<HTMLInputElement | null>(null);

  const activeAxisLength = useMemo(() => {
    if (!sourceImage) return 1800;
    return direction === 'vertical-stack' ? sourceImage.height : sourceImage.width;
  }, [sourceImage, direction]);

  // Active cut positions along the selected axis
  const activeCutPositions = useMemo(() => {
    if (splitMode === 'equal') {
      return generateEqualCutPositions(activeAxisLength, splitCount);
    }
    if (splitMode === 'fixed-size') {
      return generateFixedSizeCutPositions(activeAxisLength, fixedStepPx);
    }
    return normalizeCustomCutPositions(customCuts, activeAxisLength);
  }, [splitMode, activeAxisLength, splitCount, fixedStepPx, customCuts]);

  // Planned slice rectangles for the Pre-Split Preview
  const plannedRects = useMemo(() => {
    const w = sourceImage?.width ?? 1200;
    const h = sourceImage?.height ?? 1800;
    return computeSliceRects({
      width: w,
      height: h,
      direction,
      cutPositions: activeCutPositions,
      overlapPx,
    });
  }, [sourceImage, direction, activeCutPositions, overlapPx]);

  // Grid layout simulation metrics (with pieceGapPx whitespace inserted between pieces)
  const gridMetrics = useMemo(() => {
    return computeGridSimulationMetrics({
      rects: plannedRects,
      direction,
      pieceGapPx,
    });
  }, [plannedRects, direction, pieceGapPx]);

  // Signature representing current settings to detect unapplied preview adjustments
  const currentConfigSignature = useMemo(() => {
    if (!sourceImage) return '';
    return JSON.stringify({
      id: sourceImage.id,
      direction,
      cuts: activeCutPositions,
      overlapPx,
      outputFormat,
      jpegQuality,
      filenamePrefix,
    });
  }, [
    sourceImage,
    direction,
    activeCutPositions,
    overlapPx,
    outputFormat,
    jpegQuality,
    filenamePrefix,
  ]);

  const hasUnappliedChanges =
    Boolean(sourceImage) &&
    lastAppliedSignature !== '' &&
    lastAppliedSignature !== currentConfigSignature;

  // Cleanup old Object URLs when slices change or unmount
  const revokeSlices = useCallback((slices: GeneratedSlice[]) => {
    for (const s of slices) {
      URL.revokeObjectURL(s.objectUrl);
    }
  }, []);

  // Execute client-side canvas splitting
  const executeSplitGeneration = useCallback(
    async (
      targetSource: LoadedImageSource,
      targetRects = plannedRects,
      targetFormat = outputFormat,
      targetQuality = jpegQuality,
      targetPrefix = filenamePrefix,
      signatureToSave = currentConfigSignature
    ) => {
      setIsProcessing(true);
      try {
        const slices = await renderImageSlices({
          source: targetSource,
          rects: targetRects,
          outputFormat: targetFormat,
          jpegQuality: targetQuality,
          filenamePrefix: targetPrefix,
        });
        setGeneratedSlices((prev) => {
          revokeSlices(prev);
          return slices;
        });
        setLastAppliedSignature(signatureToSave);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : '画像の分割処理中にエラーが発生しました。'
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [
      plannedRects,
      outputFormat,
      jpegQuality,
      filenamePrefix,
      currentConfigSignature,
      revokeSlices,
    ]
  );

  // Auto-keep slices synchronized when user adjusts split count or settings
  useEffect(() => {
    if (!sourceImage) return;
    const timer = window.setTimeout(() => {
      executeSplitGeneration(
        sourceImage,
        plannedRects,
        outputFormat,
        jpegQuality,
        filenamePrefix,
        currentConfigSignature
      );
    }, 80);
    return () => window.clearTimeout(timer);
  }, [
    sourceImage,
    plannedRects,
    outputFormat,
    jpegQuality,
    filenamePrefix,
    currentConfigSignature,
    executeSplitGeneration,
  ]);

  // Load initial sample image on startup (unless ?empty=1 is specified)
  const handleLoadSample = useCallback(async () => {
    setErrorMessage(null);
    try {
      const sample = await createSampleVerticalImage();
      setSourceImage(sample);
      setSplitCount(4);
      setDirection('vertical-stack');
      setSplitMode('equal');
      setOverlapPx(0);
      setPieceGapPx(16);
      setFilenamePrefix('sample_vertical_poster');
      const initialCuts = generateEqualCutPositions(sample.height, 4);
      setCustomCuts(initialCuts);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'サンプル画像の生成に失敗しました。'
      );
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('empty') !== '1') {
      handleLoadSample();
    }
  }, [handleLoadSample]);

  // Handle loading a user-selected JPG/PNG file
  const handleSelectFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);
      try {
        const loaded = await loadImageFromFile(file);
        setSourceImage(loaded);
        const baseName = file.name.replace(/\.(png|jpe?g)$/i, '') || 'split_image';
        setFilenamePrefix(baseName);
        const axisLen = direction === 'vertical-stack' ? loaded.height : loaded.width;
        const safeN = clampSplitCount(splitCount, axisLen);
        setSplitCount(safeN);
        const eqCuts = generateEqualCutPositions(axisLen, safeN);
        setCustomCuts(eqCuts);
        if (splitMode === 'custom') {
          setSplitMode('equal');
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'ファイルの読み込みに失敗しました。'
        );
      }
    },
    [direction, splitCount, splitMode]
  );

  // Clipboard paste support (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            handleSelectFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleSelectFile]);

  // Handlers for changing split count, mode, and individual cut positions
  const handleChangeSplitCount = (newCount: number) => {
    const clamped = clampSplitCount(newCount, activeAxisLength);
    setSplitCount(clamped);
    const eqCuts = generateEqualCutPositions(activeAxisLength, clamped);
    setCustomCuts(eqCuts);
    if (splitMode === 'fixed-size') {
      setSplitMode('equal');
    }
  };

  const handleChangeDirection = (newDir: SplitDirection) => {
    setDirection(newDir);
    if (sourceImage) {
      const newAxisLen = newDir === 'vertical-stack' ? sourceImage.height : sourceImage.width;
      const eqCuts = generateEqualCutPositions(newAxisLen, splitCount);
      setCustomCuts(eqCuts);
    }
  };

  const handleChangeSplitMode = (newMode: SplitMode) => {
    if (newMode === 'custom') {
      setCustomCuts(activeCutPositions);
    } else if (newMode === 'fixed-size') {
      const step = Math.max(50, Math.round(activeAxisLength / Math.max(2, splitCount)));
      setFixedStepPx(step);
      const cuts = generateFixedSizeCutPositions(activeAxisLength, step);
      setSplitCount(cuts.length + 1);
    } else if (newMode === 'equal') {
      const eqCuts = generateEqualCutPositions(activeAxisLength, splitCount);
      setCustomCuts(eqCuts);
    }
    setSplitMode(newMode);
  };

  const handleChangeFixedStepPx = (step: number) => {
    setFixedStepPx(step);
    const cuts = generateFixedSizeCutPositions(activeAxisLength, step);
    setSplitCount(cuts.length + 1);
  };

  const handleUpdateSingleCut = (cutIndex: number, newPixelPos: number) => {
    const base = [...activeCutPositions];
    const minBound = cutIndex === 0 ? 1 : base[cutIndex - 1] + 1;
    const maxBound =
      cutIndex === base.length - 1 ? activeAxisLength - 1 : base[cutIndex + 1] - 1;
    base[cutIndex] = Math.max(minBound, Math.min(maxBound, Math.round(newPixelPos)));
    setCustomCuts(base);
    setSplitMode('custom');
  };

  const handleResetEqualCuts = () => {
    const eqCuts = generateEqualCutPositions(activeAxisLength, splitCount);
    setCustomCuts(eqCuts);
    setSplitMode('equal');
  };

  const handleClearImage = () => {
    setGeneratedSlices((prev) => {
      revokeSlices(prev);
      return [];
    });
    setSourceImage(null);
    setErrorMessage(null);
  };

  const handleDownloadZip = async () => {
    if (generatedSlices.length === 0) return;
    await downloadAllSlicesAsZip(generatedSlices, filenamePrefix);
  };

  const handleDownloadGridComposite = async () => {
    if (!sourceImage) return;
    await downloadGridSimulationImage({
      source: sourceImage,
      rects: plannedRects,
      direction,
      pieceGapPx,
      gapBgColor,
      filenamePrefix,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Hidden global file input triggered by TopBar CTA */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        className="sr-only"
        aria-label="画像をファイルから選択"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleSelectFile(f);
          e.target.value = '';
        }}
      />

      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <TopBar onTriggerUpload={() => hiddenFileInputRef.current?.click()} />

      {/* Main Content Container */}
      <main id="workspace" className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Page Header & Value Proposition */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex flex-col gap-1.5">
            <h1
              style={{ textWrap: 'balance' }}
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
            >
              JPG / PNG 画像 縦n分割スタジオ
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              スライダーや数値入力で分割数（2〜50分割）やピース間隔（Gap / ホワイトスペース）を自由に設定し、グリッドレイアウトの事前シミュレーションと分割書き出しをブラウザ内で完結できます。
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0 tabular-nums">
            <span>処理方式: クライアント内 Canvas API</span>
            <span aria-hidden="true">·</span>
            <span>対応形式: JPG / PNG</span>
            <span aria-hidden="true">·</span>
            <span>サーバー送信: なし</span>
          </div>
        </div>

        {/* Workspace State: Empty Dropzone OR Full 2-Column Split Studio */}
        {!sourceImage ? (
          <UploadDropzone
            onSelectFile={handleSelectFile}
            onLoadSample={handleLoadSample}
            errorMessage={errorMessage}
          />
        ) : (
          <>
            {/* Compact Top Upload Bar */}
            <UploadDropzone
              compact
              onSelectFile={handleSelectFile}
              onLoadSample={handleLoadSample}
              errorMessage={errorMessage}
            />

            {/* Main 12-Column Studio Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (4 cols on desktop): Split Settings & Parameter Controls */}
              <div className="lg:col-span-4">
                <SplitSettingsPanel
                  imageWidth={sourceImage.width}
                  imageHeight={sourceImage.height}
                  splitCount={plannedRects.length}
                  direction={direction}
                  splitMode={splitMode}
                  fixedStepPx={fixedStepPx}
                  cutPositions={activeCutPositions}
                  overlapPx={overlapPx}
                  pieceGapPx={pieceGapPx}
                  gapBgColor={gapBgColor}
                  gridMetrics={gridMetrics}
                  outputFormat={outputFormat}
                  jpegQuality={jpegQuality}
                  filenamePrefix={filenamePrefix}
                  isProcessing={isProcessing}
                  hasUnappliedChanges={hasUnappliedChanges}
                  onChangeSplitCount={handleChangeSplitCount}
                  onChangeDirection={handleChangeDirection}
                  onChangeSplitMode={handleChangeSplitMode}
                  onChangeFixedStepPx={handleChangeFixedStepPx}
                  onUpdateSingleCut={handleUpdateSingleCut}
                  onResetEqualCuts={handleResetEqualCuts}
                  onChangeOverlapPx={setOverlapPx}
                  onChangePieceGapPx={(gap) => setPieceGapPx(clampPieceGap(gap))}
                  onChangeGapBgColor={setGapBgColor}
                  onChangeOutputFormat={setOutputFormat}
                  onChangeJpegQuality={setJpegQuality}
                  onChangeFilenamePrefix={setFilenamePrefix}
                  onExecuteSplit={() =>
                    executeSplitGeneration(
                      sourceImage,
                      plannedRects,
                      outputFormat,
                      jpegQuality,
                      filenamePrefix,
                      currentConfigSignature
                    )
                  }
                  onDownloadZip={handleDownloadZip}
                  canDownloadZip={generatedSlices.length > 0}
                />
              </div>

              {/* Right Column (8 cols on desktop): Pre-Split Preview + Generated Slices */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <PreSplitPreviewCanvas
                  source={sourceImage}
                  direction={direction}
                  cutPositions={activeCutPositions}
                  plannedRects={plannedRects}
                  overlapPx={overlapPx}
                  pieceGapPx={pieceGapPx}
                  gapBgColor={gapBgColor}
                  gridMetrics={gridMetrics}
                  isCustomMode={splitMode === 'custom'}
                  onUpdateSingleCut={handleUpdateSingleCut}
                  onChangePieceGapPx={(gap) => setPieceGapPx(clampPieceGap(gap))}
                  onResetEqualCuts={handleResetEqualCuts}
                  onReplaceImage={() => hiddenFileInputRef.current?.click()}
                  onClearImage={handleClearImage}
                />

                <SplitResultsPanel
                  slices={generatedSlices}
                  direction={direction}
                  pieceGapPx={pieceGapPx}
                  gapBgColor={gapBgColor}
                  gridMetrics={gridMetrics}
                  isProcessing={isProcessing}
                  hasUnappliedChanges={hasUnappliedChanges}
                  onChangePieceGapPx={(gap) => setPieceGapPx(clampPieceGap(gap))}
                  onExecuteSplit={() =>
                    executeSplitGeneration(
                      sourceImage,
                      plannedRects,
                      outputFormat,
                      jpegQuality,
                      filenamePrefix,
                      currentConfigSignature
                    )
                  }
                  onDownloadZip={handleDownloadZip}
                  onDownloadGridComposite={handleDownloadGridComposite}
                />
              </div>
            </div>
          </>
        )}

        {/* Usage Guide & Specification Section */}
        <section
          id="usage-guide"
          aria-label="使い方ガイドと機能仕様"
          className="bg-white border border-slate-200 rounded-xl p-6 mt-2"
        >
          <h2 className="text-base font-bold text-slate-900 mb-4">
            使い方と主な機能
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="flex flex-col gap-1.5">
              <h3 className="font-semibold text-slate-900">
                01. スライダー・数値入力で自由なn分割
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                2分割から最大50分割まで、数値入力フィールドやスライダー、またはプリセットボタンで希望の分割数を直感的に指定できます。均等分割だけでなくピクセル間隔指定にも対応しています。
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-semibold text-slate-900">
                02. ピース間隔（Gap）とグリッドシミュレーション
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                各ピース間に一定のピクセル間隔（0〜200px のホワイトスペース）を挿入し、SNS投稿やWebレイアウトに配置した際のグリッド表示を実寸比率でシミュレーション・結合画像保存できます。
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-semibold text-slate-900">
                03. 100%クライアント処理で安全・高速保存
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                読み込んだ画像は外部サーバーへ一切アップロードされず、お使いのブラウザ内の HTML5 Canvas 上で直接処理されます。機密資料や未公開原稿も安心して個別保存・ZIP一括保存できます。
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-8">
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>SplitLine — クライアントサイド JPG / PNG 画像縦n分割ツール</span>
          <span>ブラウザ内完結処理 · 外部通信なし</span>
        </div>
      </footer>
    </div>
  );
}
