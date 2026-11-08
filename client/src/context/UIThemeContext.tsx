import React, { createContext, useContext, useEffect, useState } from 'react';

export type UIThemeId = 'bento-glass' | 'classic' | 'minimalist';

export interface UIThemeInfo {
  id: UIThemeId;
  name: string;
  badge: string;
  description: string;
  accentColor: string;
}

export const AVAILABLE_UI_THEMES: UIThemeInfo[] = [
  {
    id: 'bento-glass',
    name: 'Bento Glass',
    badge: 'Modern SaaS',
    description: 'Frosted glass, ambient glow, and Apple/Linear bento cards',
    accentColor: '#8b5cf6',
  },
  {
    id: 'classic',
    name: 'Classic Dark',
    badge: 'Original',
    description: 'Clean, dense, and familiar academic layout',
    accentColor: '#6366f1',
  },
  {
    id: 'minimalist',
    name: 'Minimalist Slate',
    badge: 'Focus',
    description: 'Clean OLED dark, crisp hairline borders, and pure readability',
    accentColor: '#10b981',
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
      if (saved === 'neo-brutalist') {
        return 'bento-glass'; // Automatically migrate away from legacy brutalist
      }
      if (saved === 'classic' || saved === 'bento-glass' || saved === 'minimalist') {
        return saved;
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    return 'bento-glass';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-ui-theme', uiTheme);
    document.body.setAttribute('data-ui-theme', uiTheme);
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

