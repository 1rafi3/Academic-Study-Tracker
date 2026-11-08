import React, { createContext, useContext, useEffect, useState } from 'react';

export type UIThemeId = 'classic' | 'bento-glass' | 'neo-brutalist';

export interface UIThemeInfo {
  id: UIThemeId;
  name: string;
  badge: string;
  description: string;
  accentColor: string;
}

export const AVAILABLE_UI_THEMES: UIThemeInfo[] = [
  {
    id: 'classic',
    name: 'Classic Dark',
    badge: 'Original',
    description: 'Clean, dense, and familiar academic layout',
    accentColor: '#6366f1',
  },
  {
    id: 'bento-glass',
    name: 'Bento Glass',
    badge: 'Modern SaaS',
    description: 'Frosted glass, ambient glow, and Apple/Linear bento cards',
    accentColor: '#8b5cf6',
  },
  {
    id: 'neo-brutalist',
    name: 'Neo-Brutalist',
    badge: 'Playful',
    description: 'Bold high-contrast borders and pop-accent stickers',
    accentColor: '#f59e0b',
  },
];

interface UIThemeContextType {
  uiTheme: UIThemeId;
  setUITheme: (theme: UIThemeId) => void;
  availableThemes: UIThemeInfo[];
  currentThemeInfo: UIThemeInfo;
}

const UIThemeContext = createContext<UIThemeContextType | undefined>(undefined);

const UI_THEME_STORAGE_KEY = 'academic_tracker_ui_style';

export function UIThemeProvider({ children }: { children: React.ReactNode }) {
  const [uiTheme, setUIThemeState] = useState<UIThemeId>(() => {
    try {
      const saved = localStorage.getItem(UI_THEME_STORAGE_KEY);
      if (saved === 'classic' || saved === 'bento-glass' || saved === 'neo-brutalist') {
        return saved;
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    return 'classic';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-ui-theme', uiTheme);
  }, [uiTheme]);

  const setUITheme = (newTheme: UIThemeId) => {
    setUIThemeState(newTheme);
    try {
      localStorage.setItem(UI_THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore localStorage errors
    }
  };

  const currentThemeInfo =
    AVAILABLE_UI_THEMES.find((t) => t.id === uiTheme) || AVAILABLE_UI_THEMES[0];

  return (
    <UIThemeContext.Provider
      value={{
        uiTheme,
        setUITheme,
        availableThemes: AVAILABLE_UI_THEMES,
        currentThemeInfo,
      }}
    >
      {children}
    </UIThemeContext.Provider>
  );
}

export function useUITheme() {
  const context = useContext(UIThemeContext);
  if (!context) {
    throw new Error('useUITheme must be used within a UIThemeProvider');
  }
  return context;
}

