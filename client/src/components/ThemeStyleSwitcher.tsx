import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles, Layers, ChevronDown } from 'lucide-react';
import { useUITheme, type UIThemeId } from '../context/UIThemeContext.js';

export const ThemeStyleSwitcher: React.FC = () => {
  const { uiTheme, setUITheme, availableThemes, currentThemeInfo } = useUITheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getThemeIcon = (id: UIThemeId) => {
    switch (id) {
      case 'bento-glass':
        return <Sparkles className="w-3.5 h-3.5 text-violet-400" />;
      case 'neo-brutalist':
        return <Palette className="w-3.5 h-3.5 text-amber-400" />;
      case 'classic':
      default:
        return <Layers className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg sm:rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800/90 dark:border-slate-800 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs"
        title="Switch UI/UX Design System"
        aria-label="UI/UX Theme Switcher"
        aria-expanded={isOpen}
      >
        {getThemeIcon(uiTheme)}
        <span className="hidden sm:inline-block font-semibold">
          {currentThemeInfo.name}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-500" />
                UI Design System
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800/60">
                Multi-Theme
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Choose your preferred visual layout and aesthetic
            </p>
          </div>

          <div className="space-y-1">
            {availableThemes.map((theme) => {
              const isSelected = uiTheme === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setUITheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition flex items-start gap-2.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700/80 shadow-2xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border-transparent text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                    {getThemeIcon(theme.id)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-bold ${
                          isSelected
                            ? 'text-indigo-600 dark:text-indigo-300'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {theme.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {theme.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {theme.description}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="self-center shrink-0">
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
