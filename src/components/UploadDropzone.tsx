import React, { useState } from 'react';
import { Upload, Image as ImageIcon, ShieldCheck, Sparkles } from 'lucide-react';

interface UploadDropzoneProps {
  onSelectFile: (file: File) => void;
  onLoadSample: () => void;
  errorMessage: string | null;
  compact?: boolean;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onSelectFile,
  onLoadSample,
  errorMessage,
  compact = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onSelectFile(file);
    }
  };

  if (compact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white border rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 transition-colors ${
          isDragging ? 'border-sky-600 bg-sky-50/40' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <ImageIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span>JPG / PNG 画像をここにドロップして切り替え</span>
              <span className="text-slate-400 font-normal text-xs hidden sm:inline">
                · クリップボード貼り付け (Ctrl+V) 対応
              </span>
            </div>
            <p className="text-xs text-slate-500">
              すべての分割処理はブラウザ内（クライアント側）で完結し、外部サーバーには一切送信されません。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="compact-file-upload"
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>ファイルを選択</span>
            <input
              id="compact-file-upload"
              type="file"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onSelectFile(f);
                e.target.value = '';
              }}
            />
          </label>

          <button
            type="button"
            onClick={onLoadSample}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            サンプル再読込
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="w-full text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
          >
            {errorMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <section
      aria-label="画像ファイルの読み込み"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-white border-2 border-dashed rounded-xl p-8 md:p-12 flex flex-col items-center justify-center text-center transition-colors ${
        isDragging ? 'border-sky-600 bg-sky-50/40' : 'border-slate-300 hover:border-slate-400'
      }`}
    >
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 mb-4">
        <Upload className="w-6 h-6" aria-hidden="true" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">
        JPG または PNG 画像をドロップして縦n分割を開始
      </h2>
      <p className="text-sm text-slate-600 max-w-xl mb-6 leading-relaxed">
        縦長のスクリーンショット、Webtoon・マンガ原稿、LPデザインカンプなどを指定した分割数（n等分・カスタム位置）で正確にスライスします。
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <label
          htmlFor="main-file-upload"
          className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          <span>画像ファイルを選択 (JPG / PNG)</span>
          <input
            id="main-file-upload"
            type="file"
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSelectFile(f);
              e.target.value = '';
            }}
          />
        </label>

        <button
          type="button"
          onClick={onLoadSample}
          className="px-5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-4 h-4 text-sky-600" aria-hidden="true" />
          <span>サンプル画像を読み込んで試す</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
        <span>サーバー送信なし（100%ブラウザ内処理）</span>
        <span aria-hidden="true">·</span>
        <span>対応形式: .jpg / .jpeg / .png</span>
        <span aria-hidden="true">·</span>
        <span>Ctrl+V でクリップボードから直接貼り付け可能</span>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 max-w-md w-full text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5"
        >
          {errorMessage}
        </div>
      )}
    </section>
  );
};
