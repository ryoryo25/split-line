import React from 'react';

interface TopBarProps {
  onTriggerUpload: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onTriggerUpload }) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#workspace"
        className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
      >
        SplitLine
      </a>

      {/* Zone 2: 4 clean single-line text navigation links */}
      <nav
        aria-label="メインナビゲーション"
        className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
      >
        <a
          href="#workspace"
          className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
        >
          分割設定
        </a>
        <a
          href="#preview-stage"
          className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
        >
          分割前プレビュー
        </a>
        <a
          href="#results-stage"
          className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
        >
          分割結果・保存
        </a>
        <a
          href="#usage-guide"
          className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
        >
          使い方ガイド
        </a>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onTriggerUpload}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          画像を選択 (JPG / PNG)
        </button>
      </div>
    </header>
  );
};
