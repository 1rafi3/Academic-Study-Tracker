import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  type SeasonId,
  type SeasonMetadata,
  getCurrentBangladeshSeason,
  getSeasonById,
} from '../utils/seasonalEngine.js';

interface SeasonalPreferences {
  isEnabled: boolean;
  mode: 'auto' | 'manual';
  manualSeasonId?: SeasonId;
  isMinimalMotion: boolean;
}

const PREFERENCES_STORAGE_KEY = 'academic_tracker_seasonal_preferences_v2';

interface SeasonalContextType {
  isEnabled: boolean;
  mode: 'auto' | 'manual';
  activeSeason: SeasonMetadata;
  autoDetectedSeason: SeasonMetadata;
  isMinimalMotion: boolean;
  toggleEnabled: () => void;
  setMode: (mode: 'auto' | 'manual') => void;
  previewSeason: (seasonId: SeasonId, persistAsManual?: boolean) => void;
  resetToAuto: () => void;
  toggleMinimalMotion: () => void;
}

const SeasonalContext = createContext<SeasonalContextType | undefined>(undefined);

export const SeasonalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load preferences from localStorage safely
  const [preferences, setPreferences] = useState<SeasonalPreferences>(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          isEnabled: parsed.isEnabled !== false,
          mode: parsed.mode === 'manual' ? 'manual' : 'auto',
          manualSeasonId: parsed.manualSeasonId || undefined,
          isMinimalMotion: parsed.isMinimalMotion === true,
        };
      }
    } catch {
      // Fallback on storage read error
    }

    return {
      isEnabled: true,
      mode: 'auto',
      manualSeasonId: undefined,
      isMinimalMotion: false, // Default animations to active so users immediately enjoy them
    };
  });

  // Calculate live current season in Bangladesh (Asia/Dhaka)
  const [autoDetectedSeason, setAutoDetectedSeason] = useState<SeasonMetadata>(() =>
    getCurrentBangladeshSeason()
  );

  // Temporary preview override (session-only unless persistAsManual is true)
  const [previewSeasonId, setPreviewSeasonId] = useState<SeasonId | null>(null);

  // Periodically refresh auto-detected season and also on tab focus
  const refreshAutoSeason = useCallback(() => {
    const current = getCurrentBangladeshSeason();
    setAutoDetectedSeason(current);
  }, []);

  useEffect(() => {
    // Initial check
    refreshAutoSeason();

    // Recheck when tab gains visibility
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshAutoSeason();
      }
    };

    // Periodic check every 15 minutes (in case day/month rolls over in Dhaka)
    const intervalId = setInterval(refreshAutoSeason, 15 * 60 * 1000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshAutoSeason]);

  // Sync preferences to localStorage
  const updatePreferences = useCallback((updates: Partial<SeasonalPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Silently handle storage errors
      }
      return next;
    });
  }, []);

  // Determine active season
  const activeSeason = useMemo<SeasonMetadata>(() => {
    if (previewSeasonId) {
      return getSeasonById(previewSeasonId);
    }
    if (preferences.mode === 'manual' && preferences.manualSeasonId) {
      return getSeasonById(preferences.manualSeasonId);
    }
    return autoDetectedSeason;
  }, [previewSeasonId, preferences.mode, preferences.manualSeasonId, autoDetectedSeason]);

  const toggleEnabled = useCallback(() => {
    updatePreferences({ isEnabled: !preferences.isEnabled });
  }, [preferences.isEnabled, updatePreferences]);

  const setMode = useCallback((mode: 'auto' | 'manual') => {
    if (mode === 'auto') {
      setPreviewSeasonId(null);
      updatePreferences({ mode: 'auto', manualSeasonId: undefined });
    } else {
      updatePreferences({
        mode: 'manual',
        manualSeasonId: previewSeasonId || autoDetectedSeason.id,
      });
    }
  }, [previewSeasonId, autoDetectedSeason.id, updatePreferences]);

  const previewSeason = useCallback((seasonId: SeasonId, persistAsManual = false) => {
    setPreviewSeasonId(seasonId);
    if (persistAsManual) {
      updatePreferences({
        mode: 'manual',
        manualSeasonId: seasonId,
      });
    }
  }, [updatePreferences]);

  const resetToAuto = useCallback(() => {
    setPreviewSeasonId(null);
    updatePreferences({
      mode: 'auto',
      manualSeasonId: undefined,
    });
  }, [updatePreferences]);

  const toggleMinimalMotion = useCallback(() => {
    updatePreferences({ isMinimalMotion: !preferences.isMinimalMotion });
  }, [preferences.isMinimalMotion, updatePreferences]);

  return (
    <SeasonalContext.Provider
      value={{
        isEnabled: preferences.isEnabled,
        mode: preferences.mode,
        activeSeason,
        autoDetectedSeason,
        isMinimalMotion: preferences.isMinimalMotion,
        toggleEnabled,
        setMode,
        previewSeason,
        resetToAuto,
        toggleMinimalMotion,
      }}
    >
      {children}
    </SeasonalContext.Provider>
  );
};

export function useSeasonal(): SeasonalContextType {
  const context = useContext(SeasonalContext);
  if (!context) {
    throw new Error('useSeasonal must be used within a SeasonalProvider');
  }
  return context;
}

