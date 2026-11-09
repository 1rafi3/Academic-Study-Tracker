import React, { useState } from 'react';
import {
  Sun,
  CloudRain,
  CloudSun,
  Wheat,
  Snowflake,
  Flower2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { useSeasonal } from '../../context/SeasonalContext.js';
import { SeasonalSettingsModal } from './SeasonalSettingsModal.js';
import type { SeasonId } from '../../utils/seasonalEngine.js';

export const SeasonalControlBadge: React.FC = () => {
  const { isEnabled, activeSeason, mode, autoDetectedSeason } = useSeasonal();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getSeasonIcon = (id: SeasonId) => {
    switch (id) {
      case 'grishma':
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case 'barsha':
        return <CloudRain className="w-3.5 h-3.5 text-emerald-500" />;
      case 'sharat':
        return <CloudSun className="w-3.5 h-3.5 text-sky-400" />;
      case 'hemanta':
        return <Wheat className="w-3.5 h-3.5 text-amber-500" />;
      case 'sheet':
        return <Snowflake className="w-3.5 h-3.5 text-cyan-300 dark:text-cyan-200" />;
      case 'basanta':
        return <Flower2 className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const isManual = mode === 'manual' || activeSeason.id !== autoDetectedSeason.id;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg sm:rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800/90 dark:border-slate-800 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs group"
        title={`Bangladesh Season: ${activeSeason.nameBangla} (${activeSeason.nameEnglish}) ${
          !isEnabled ? '• Disabled' : isManual ? '• Manual' : '• Auto'
        }`}
        aria-label="Bangladesh Season Settings"
      >
        <span className={`shrink-0 group-hover:scale-110 transition-transform duration-200 ${!isEnabled ? 'opacity-40 grayscale' : ''}`}>
          {getSeasonIcon(activeSeason.id)}
        </span>
        <span className="hidden sm:inline-block font-semibold">
          {activeSeason.nameBangla}
        </span>
        <span className="hidden lg:inline-block text-[11px] text-slate-400">
          ({activeSeason.nameEnglish})
        </span>
        {isManual && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Manual preview active" />
        )}
        <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-200 transition" />
      </button>

      <SeasonalSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
