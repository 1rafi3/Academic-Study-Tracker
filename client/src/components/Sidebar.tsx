import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Award,
  FileText,
  Clock,
  Target,
  Calculator,
  CalendarCheck,
  BookOpen,
  Database,
  X,
  Compass,
  Sparkles,
  Sun,
  CloudRain,
  CloudSun,
  Wheat,
  Snowflake,
  Flower2,
} from 'lucide-react';
import type { TabType } from './Navbar.js';
import { useSeasonal } from '../context/SeasonalContext.js';
import { SeasonalSettingsModal } from './seasonal/SeasonalSettingsModal.js';
import type { SeasonId } from '../utils/seasonalEngine.js';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const TABS = [
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon, badge: 'Main' },
  { id: 'hub', label: 'Academic Hub', icon: Award, badge: 'New' },
  { id: 'notes', label: 'Study Notes', icon: FileText },
  { id: 'routine', label: 'Weekly Routine', icon: Clock },
  { id: 'analytics', label: 'Analytics', icon: Target },
  { id: 'gpa', label: 'GPA Calculator', icon: Calculator },
  { id: 'classes', label: 'Classes', icon: CalendarCheck },
  { id: 'academic', label: 'Academic Setup', icon: BookOpen },
  { id: 'backup', label: 'Backup & Data', icon: Database },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { activeSeason } = useSeasonal();
  const [isSeasonalModalOpen, setIsSeasonalModalOpen] = useState(false);

  const handleTabClick = (tabId: TabType) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
  };

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

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-4">
        {/* Sidebar Header / Section Label */}
        <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-500" />
            Navigation
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
            9 Views
          </span>
        </div>

        {/* Navigation Tab Links */}
        <nav aria-label="Sidebar Navigation" className="space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`sidebar-tab-${tab.id}-btn`}
                type="button"
                onClick={() => handleTabClick(tab.id as TabType)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-500 dark:text-slate-400 group-hover:text-indigo-400'
                    }`}
                  />
                  <span className="truncate">{tab.label}</span>
                </div>

                {'badge' in tab && tab.badge && !isActive && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Seasonal Atmosphere Info */}
      <div className="pt-3 mt-4 border-t border-slate-200/60 dark:border-slate-800/60 px-1 space-y-2">
        <button
          type="button"
          onClick={() => setIsSeasonalModalOpen(true)}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800 transition cursor-pointer text-left group"
          title="Bangladesh Season Settings (ষড়ঋতু)"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs group-hover:scale-110 transition-transform">
              {getSeasonIcon(activeSeason.id)}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                {activeSeason.nameBangla} ({activeSeason.nameEnglish})
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {activeSeason.gregorianMonths}
              </p>
            </div>
          </div>
          <Sparkles className="w-3 h-3 text-indigo-500 shrink-0 opacity-70 group-hover:opacity-100" />
        </button>

        <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Holy Grail Hub</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 font-mono">
            v2.0
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (Holy Grail Left Column) */}
      <aside className="hidden md:block w-56 lg:w-64 shrink-0 sticky top-4 print:hidden">
        <div className="glass-panel rounded-2xl p-3.5 shadow-lg border border-slate-200/80 dark:border-white/10">
          {navContent}
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200 print:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Slide-Over Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 shadow-2xl transition-transform duration-200 ease-in-out md:hidden flex flex-col justify-between print:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-slate-800">
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Menu</span>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{navContent}</div>
      </aside>

      <SeasonalSettingsModal
        isOpen={isSeasonalModalOpen}
        onClose={() => setIsSeasonalModalOpen(false)}
      />
    </>
  );
};

