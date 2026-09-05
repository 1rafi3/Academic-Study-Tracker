import React from 'react';
import { 
  GraduationCap, 
  Calendar as CalendarIcon, 
  FileText, 
  Clock, 
  Target, 
  Database, 
  CalendarCheck, 
  BookOpen, 
  Sun, 
  Moon, 
  Sparkles,
  Calculator,
} from 'lucide-react';
import { UserProfileMenu } from './auth/UserProfileMenu.js';
import { useTheme } from '../context/ThemeContext.js';

export type TabType = 'calendar' | 'notes' | 'routine' | 'analytics' | 'gpa' | 'backup' | 'classes' | 'academic';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const TABS = [
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'notes', label: 'Study Notes', icon: FileText },
  { id: 'routine', label: 'Weekly Routine', icon: Clock },
  { id: 'analytics', label: 'Analytics', icon: Target },
  { id: 'gpa', label: 'GPA Calculator', icon: Calculator },
  { id: 'classes', label: 'Classes', icon: CalendarCheck },
  { id: 'academic', label: 'Academic Setup', icon: BookOpen },
  { id: 'backup', label: 'Backup & Data', icon: Database },
] as const;

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { actualTheme, toggleTheme } = useTheme();

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
  };

  return (
    <header className="w-full glass-panel rounded-2xl sm:rounded-3xl p-3 sm:py-3.5 sm:px-6 mb-4 transition-all duration-200 relative print:hidden shadow-lg border border-slate-200/80 dark:border-white/10">
      {/* Top Right Controls */}
      <div className="flex sm:absolute sm:top-3.5 sm:right-5 justify-end items-center gap-2 mb-2 sm:mb-0 z-20">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800/90 dark:border-slate-800 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
          title={actualTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle color theme"
        >
          {actualTheme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-600" />
          )}
        </button>

        {/* User Profile Dropdown */}
        <UserProfileMenu />
      </div>

      {/* Top Middle: Compact Centered Logo, Title & Subtitle */}
      <div className="flex flex-col items-center text-center justify-center mb-2.5 cursor-pointer select-none" onClick={() => handleTabClick('calendar')}>
        <div className="flex items-center justify-center gap-2 mb-0.5">
          <div className="relative group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
              <GraduationCap className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
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

        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md">
          Organize classes, track attendance &bull; calculate GPAs &bull; study smarter
        </p>
      </div>

      {/* Nav Links: Compact and auto-adjusting in 1 or 2 rows */}
      <nav 
        aria-label="Main Navigation" 
        className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/80 max-w-3xl mx-auto shadow-inner"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}-btn`}
              onClick={() => handleTabClick(tab.id as TabType)}
              className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
