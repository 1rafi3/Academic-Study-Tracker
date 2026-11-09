import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sun,
  CloudRain,
  CloudSun,
  Wheat,
  Snowflake,
  Flower2,
  Sparkles,
  RotateCcw,
  Check,
  X,
  Compass,
  Eye,
} from 'lucide-react';
import { useSeasonal } from '../../context/SeasonalContext.js';
import { useToast } from '../../context/ToastContext.js';
import { ALL_SEASONS_ORDER, BANGLADESH_SEASONS, type SeasonId } from '../../utils/seasonalEngine.js';

interface SeasonalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SeasonalSettingsModal: React.FC<SeasonalSettingsModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const {
    isEnabled,
    mode,
    activeSeason,
    autoDetectedSeason,
    isMinimalMotion,
    toggleEnabled,
    previewSeason,
    resetToAuto,
    toggleMinimalMotion,
  } = useSeasonal();

  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getSeasonIcon = (id: SeasonId, className = 'w-4 h-4') => {
    switch (id) {
      case 'grishma':
        return <Sun className={`${className} text-amber-500`} />;
      case 'barsha':
        return <CloudRain className={`${className} text-emerald-500`} />;
      case 'sharat':
        return <CloudSun className={`${className} text-sky-400`} />;
      case 'hemanta':
        return <Wheat className={`${className} text-amber-600`} />;
      case 'sheet':
        return <Snowflake className={`${className} text-cyan-300 dark:text-cyan-200`} />;
      case 'basanta':
        return <Flower2 className={`${className} text-rose-500`} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  const isAutoActive = mode === 'auto' && activeSeason.id === autoDetectedSeason.id;

  const modalContent = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 overflow-y-auto overscroll-contain animate-in fade-in duration-200">
      {/* Backdrop with lighter tint so falling particles remain visible */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        className="relative w-full max-w-xl glass-modal rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-slate-100 shadow-2xl border border-white/10 my-auto z-10 space-y-6 max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seasonal-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                <Compass className="w-4 h-4" />
              </span>
              <h2 id="seasonal-modal-title" className="text-lg sm:text-xl font-bold tracking-tight font-heading">
                ষড়ঋতু &bull; Bangladesh Six Seasons
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Atmospheric ambient environment synchronized with Bangladesh astronomical seasons (Asia/Dhaka).
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700/60 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master Switches & Current Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. Master Enable / Disable */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200">Ambient Effects</span>
              <p className="text-[11px] text-slate-400">Toggle seasonal visual layers</p>
            </div>
            <button
              type="button"
              onClick={toggleEnabled}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isEnabled ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={isEnabled}
              aria-label="Toggle seasonal atmosphere"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 2. Minimal Animation Mode */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200">Minimal Motion</span>
              <p className="text-[11px] text-slate-400">Gradients only, no particles</p>
            </div>
            <button
              type="button"
              onClick={toggleMinimalMotion}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isMinimalMotion ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={isMinimalMotion}
              aria-label="Toggle minimal motion"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isMinimalMotion ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Current Status Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-500/25 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-white/10 flex items-center justify-center shrink-0">
              {getSeasonIcon(activeSeason.id, 'w-5 h-5')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100">
                  {activeSeason.nameBangla} ({activeSeason.nameEnglish})
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${activeSeason.theme.badgeBg} ${activeSeason.theme.badgeBorder} ${activeSeason.theme.badgeText}`}>
                  {isAutoActive ? 'Auto: Live in BD' : 'Manual Preview'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {activeSeason.bengaliMonthsBangla} &bull; {activeSeason.gregorianMonths}
              </p>
            </div>
          </div>

          {!isAutoActive && (
            <button
              type="button"
              onClick={() => {
                resetToAuto();
                showToast(`Restored to live Bangladesh season (${autoDetectedSeason.nameBangla})`, 'info');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Auto
            </button>
          )}
        </div>

        {/* Six Seasons Catalog / Preview Grid */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Explore All Six Seasons (ষড়ঋতু)
            </h3>
            <span className="text-[11px] text-slate-500">
              Click any season to activate visual atmosphere
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ALL_SEASONS_ORDER.map((seasonId) => {
              const season = BANGLADESH_SEASONS[seasonId];
              const isSelected = activeSeason.id === seasonId;
              const isCurrentDhakaSeason = autoDetectedSeason.id === seasonId;

              return (
                <div
                  key={seasonId}
                  onClick={() => {
                    previewSeason(seasonId, true);
                    showToast(`Season atmosphere activated: ${season.nameBangla} (${season.nameEnglish})`, 'success');
                  }}
                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-2.5 text-left group ${
                    isSelected
                      ? 'bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                      : 'bg-slate-900/60 hover:bg-slate-800/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {getSeasonIcon(seasonId, 'w-4 h-4')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-200 truncate">
                          {season.nameBangla}
                        </span>
                        <span className="text-xs text-slate-400 truncate">
                          ({season.nameEnglish})
                        </span>
                        {isCurrentDhakaSeason && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Now
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {season.gregorianMonths} &bull; {season.bengaliMonthsBangla}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center text-indigo-400">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-slate-700 group-hover:border-slate-500 flex items-center justify-center text-slate-500 group-hover:text-slate-300 transition">
                        <Eye className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
          <p className="flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Automatic mode detects Bangladesh timezone accurately worldwide.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
