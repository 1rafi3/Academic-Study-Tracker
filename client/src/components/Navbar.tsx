import React from 'react';
import { 
  GraduationCap, 
  Sun, 
  Moon, 
  Sparkles,
  Menu,
} from 'lucide-react';
import { UserProfileMenu } from './auth/UserProfileMenu.js';
import { useTheme } from '../context/ThemeContext.js';
import { ThemeStyleSwitcher } from './ThemeStyleSwitcher.js';

export type TabType = 'calendar' | 'notes' | 'routine' | 'analytics' | 'gpa' | 'backup' | 'classes' | 'academic';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ setActiveTab, onToggleMobileSidebar }) => {
  const { actualTheme, toggleTheme } = useTheme();

  return (
    <header className="w-full glass-panel rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-2.5 sm:py-3 mb-5 transition-all duration-200 relative z-30 print:hidden shadow-lg border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3">
      {/* Left: Mobile Menu Toggle + App Branding */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300 md:hidden transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div
          className="flex items-center gap-2.5 cursor-pointer select-none group"
          onClick={() => setActiveTab('calendar')}
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
              <GraduationCap className="w-4.5 h-4.5" />
            </div>
            <div className="absolute -inset-0.5 bg-indigo-500/30 rounded-xl blur-xs -z-10 group-hover:bg-indigo-500/50 transition duration-200" />
          </div>

          <div className="flex items-center gap-1.5">
            <h1 className="text-base sm:text-lg font-bold tracking-tight font-heading text-slate-900 dark:text-slate-100">
              Academic Tracker
            </h1>
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/25 text-indigo-600 dark:text-indigo-300">
              <Sparkles className="w-2 h-2" />
              Hub
            </span>
          </div>
        </div>
      </div>

      {/* Right: Controls & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <ThemeStyleSwitcher />

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800/90 dark:border-slate-800 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
          title={actualTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle color theme"
        >
          {actualTheme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-600" />
          )}
        </button>

        <UserProfileMenu />
      </div>
    </header>
  );
};
