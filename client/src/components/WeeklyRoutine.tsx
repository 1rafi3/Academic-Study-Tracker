import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseApi, semesterApi, classInstanceApi } from '../api/academicApi.js';
import type { ISemester, ICourse, DayOfWeek } from '../types/academic.js';
import {
  DAYS_OF_WEEK_ORDERED,
  extractRoutineItemsFromCourses,
  generateStandardTimeSlots,
  calculateWeeklySummary,
  calculateSlotSpan,
  getActiveRoutineDays,
  timeToMinutes,
} from '../utils/routineUtils.js';
import type { RoutineBlockItem, RoutineTimeSlotRow } from '../utils/routineUtils.js';
import {
  Calendar as CalendarIcon,
  Printer,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Flame,
  CalendarCheck,
  Palette,
  RefreshCw,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';
import { useToast } from '../context/ToastContext.js';

interface Props {
  selectedSemesterId: string | null;
  onSelectSemester: (id: string | null) => void;
  onNavigateToSetup: () => void;
}

type TimetableCell =
  | {
      type: 'class';
      items: RoutineBlockItem[];
      rowSpan: number;
    }
  | {
      type: 'empty';
    }
  | {
      type: 'skipped';
    };

export const WeeklyRoutine: React.FC<Props> = ({
  selectedSemesterId,
  onSelectSemester,
  onNavigateToSetup,
}) => {
  // Customization State
  const { actualTheme } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [is12Hour, setIs12Hour] = useState<boolean>(true);
  const [colorTheme, setColorTheme] = useState<'vibrant' | 'parchment' | 'minimal'>('vibrant');
  const [showRoom, setShowRoom] = useState<boolean>(true);
  const [showInstructor, setShowInstructor] = useState<boolean>(true);
  const [showCourseName, setShowCourseName] = useState<boolean>(false);
  const [weekendMode, setWeekendMode] = useState<'auto' | 'show' | 'hide'>('auto');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [effectiveDate, setEffectiveDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Today's weekday
  const todayDayOfWeek = useMemo<DayOfWeek>(() => {
    const dayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday, ...
    return DAYS_OF_WEEK_ORDERED[dayIndex] || 'Sunday';
  }, []);

  // 1. Fetch Semesters
  const { data: semesters = [] } = useQuery<ISemester[]>({
    queryKey: ['semesters'],
    queryFn: () => semesterApi.getAll(),
  });

  const activeSemester = useMemo(() => {
    if (selectedSemesterId) {
      return semesters.find((s) => s._id === selectedSemesterId) || null;
    }
    return semesters.find((s) => s.isActive) || semesters[0] || null;
  }, [semesters, selectedSemesterId]);

  // Sync selected semester
  React.useEffect(() => {
    if (!selectedSemesterId && activeSemester) {
      onSelectSemester(activeSemester._id);
    }
  }, [selectedSemesterId, activeSemester, onSelectSemester]);

  // 2. Fetch Courses for active semester
  const { data: courses = [], isLoading: coursesLoading } = useQuery<ICourse[]>({
    queryKey: ['courses', activeSemester?._id],
    queryFn: () =>
      activeSemester ? courseApi.getAll(activeSemester._id) : Promise.resolve([]),
    enabled: Boolean(activeSemester?._id),
  });

  const syncMutation = useMutation({
    mutationFn: () => {
      if (!activeSemester?._id) return Promise.reject(new Error('No active semester selected'));
      return classInstanceApi.syncSchedule({
        semesterId: activeSemester._id,
        effectiveDate,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-analytics'] });
      setIsSyncModalOpen(false);
      showToast(`Routine synced from ${result.effectiveDate}: ${result.createdCount} new classes scheduled, ${result.preservedCount} past classes safe.`, 'success', 4000);
    },
    onError: (err: Error) => showToast(`Sync failed: ${err.message}`, 'error'),
  });

  // Extract all routine schedule items
  const routineItems = useMemo(() => {
    return extractRoutineItemsFromCourses(courses);
  }, [courses]);

  // Summary Metrics
  const summary = useMemo(() => {
    return calculateWeeklySummary(courses);
  }, [courses]);

  // Active Timetable Days (Sunday through Thursday by default, or all 7 days if weekend enabled or scheduled)
  const activeDays = useMemo<DayOfWeek[]>(() => {
    return getActiveRoutineDays(routineItems, weekendMode);
  }, [routineItems, weekendMode]);

  const isShowingWeekend = activeDays.length === 7;

  // Uniform 90-minute time slot rows (e.g. 9:00 - 10:30, 10:30 - 12:00, etc.)
  const timeSlotRows = useMemo<RoutineTimeSlotRow[]>(() => {
    return generateStandardTimeSlots(routineItems);
  }, [routineItems]);

  // Compute 2D Table Matrix with rowSpan tracking for multi-slot classes (e.g. 3h labs)
  const tableMatrix = useMemo(() => {
    const matrix: TimetableCell[][] = [];
    const skipCount: number[] = new Array(activeDays.length).fill(0);

    for (let r = 0; r < timeSlotRows.length; r++) {
      const slot = timeSlotRows[r];
      const rowCells: TimetableCell[] = [];

      for (let d = 0; d < activeDays.length; d++) {
        const day = activeDays[d];

        // If covered by a multi-row class from an earlier slot, omit this cell
        if (skipCount[d] > 0) {
          skipCount[d]--;
          rowCells.push({ type: 'skipped' });
          continue;
        }

        // Find classes scheduled on this day starting in this time slot
        const dayItems = routineItems.filter((i) => i.dayOfWeek === day);
        const matchingClasses = dayItems.filter((item) => {
          const cStart = timeToMinutes(item.startTime);
          // Match classes that start within 20m of slot start or inside this slot window
          return (
            Math.abs(cStart - slot.startMinutes) <= 20 ||
            (cStart >= slot.startMinutes && cStart < slot.endMinutes)
          );
        });

        if (matchingClasses.length > 0) {
          // Calculate span based on the longest class (e.g. 180 min Lab = 2 slots)
          const primary = matchingClasses[0];
          const rawSpan = calculateSlotSpan(primary);
          const remainingRows = timeSlotRows.length - r;
          const actualSpan = Math.min(rawSpan, remainingRows);

          rowCells.push({
            type: 'class',
            items: matchingClasses,
            rowSpan: actualSpan,
          });

          if (actualSpan > 1) {
            skipCount[d] = actualSpan - 1;
          }
        } else {
          rowCells.push({
            type: 'empty',
          });
        }
      }

      matrix.push(rowCells);
    }

    return matrix;
  }, [activeDays, timeSlotRows, routineItems]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-0 print:m-0 print:p-0 font-sans">
      {/* Top Header Controls (Hidden on print) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-slate-100 tracking-tight">
              Weekly Class Routine &amp; Timetable
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Uniform 90-minute university timetable grid with 3-hour lab spans &amp; 1-click PDF download.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Semester Selector */}
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
            <select
              value={activeSemester?._id || ''}
              onChange={(e) => onSelectSemester(e.target.value || null)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
            >
              {semesters.map((sem) => (
                <option key={sem._id} value={sem._id}>
                  {sem.name} {sem.isActive ? '• Active' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sync Calendar Button */}
          <button
            type="button"
            disabled={routineItems.length === 0}
            onClick={() => setIsSyncModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-indigo-300 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            title="Synchronize future calendar occurrences if your weekly routine changed"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            Sync with Calendar
          </button>

          {/* Print / Download PDF Button */}
          <button
            type="button"
            disabled={routineItems.length === 0}
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Download PDF / Print
          </button>
        </div>
      </div>

      {/* Routine Summary Overview Cards (Hidden on print) */}
      {routineItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
          <div className="p-4 rounded-xl bg-slate-900 border-l-4 border-indigo-500 border-t border-r border-b border-slate-800 shadow-md space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Active Courses
            </span>
            <span className="text-2xl font-black text-slate-100 font-mono">
              {summary.totalCoursesWithSchedule}
            </span>
            <span className="text-[11px] text-slate-400 block">with weekly schedules</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border-l-4 border-indigo-400 border-t border-r border-b border-slate-800 shadow-md space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Weekly Classes
            </span>
            <span className="text-2xl font-black text-indigo-400 font-mono">
              {summary.totalWeeklyClasses}
            </span>
            <span className="text-[11px] text-slate-400 block">recurring periods</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border-l-4 border-emerald-500 border-t border-r border-b border-slate-800 shadow-md space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Total Lecture Time
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {summary.totalWeeklyHours}h
            </span>
            <span className="text-[11px] text-slate-400 block">
              {summary.totalWeeklyMinutes} minutes total
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border-l-4 border-amber-500 border-t border-r border-b border-slate-800 shadow-md space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Busiest Day
            </span>
            <span className="text-xl font-black text-amber-300 font-mono truncate block">
              {summary.busiestDay}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {Math.round((summary.busiestDayMinutes / 60) * 10) / 10}h scheduled
            </span>
          </div>
        </div>
      )}

      {/* Routine Display Customization Bar (Hidden on print) */}
      {routineItems.length > 0 && (
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden shadow-sm">
          <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            Timetable Display:
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-300">
            {/* Color Theme Selector */}
            <div className="flex items-center gap-1.5 border-r border-slate-800 pr-3">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400 font-medium">Theme:</span>
              <select
                value={colorTheme}
                onChange={(e) => setColorTheme(e.target.value as any)}
                className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                <option value="vibrant">Vibrant Colors (Standard)</option>
                <option value="parchment">Warm Parchment / Amber</option>
                <option value="minimal">Clean Minimal Blueprint</option>
              </select>
            </div>

            {/* 12h vs 24h Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={is12Hour}
                onChange={(e) => setIs12Hour(e.target.checked)}
                className="rounded-sm accent-indigo-500"
              />
              <span>12-Hour</span>
            </label>

            {/* Show Room */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showRoom}
                onChange={(e) => setShowRoom(e.target.checked)}
                className="rounded-sm accent-indigo-500"
              />
              <span>Room</span>
            </label>

            {/* Show Instructor */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInstructor}
                onChange={(e) => setShowInstructor(e.target.checked)}
                className="rounded-sm accent-indigo-500"
              />
              <span>Teacher</span>
            </label>

            {/* Show Course Name */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCourseName}
                onChange={(e) => setShowCourseName(e.target.checked)}
                className="rounded-sm accent-indigo-500"
              />
              <span>Full Name</span>
            </label>

            {/* Weekend Toggle */}
            <button
              type="button"
              onClick={() => setWeekendMode(isShowingWeekend ? 'hide' : 'show')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 transition cursor-pointer"
            >
              {isShowingWeekend ? (
                <>
                  <EyeOff className="w-3 h-3 text-slate-400" />
                  <span>5-Day View (Hide Weekend)</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3 text-indigo-400" />
                  <span>7-Day View (Show Weekend)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Timetable Card (Standard Uniform Table Grid) */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl backdrop-blur-md space-y-4 print:p-0 print:border-none print:shadow-none print:bg-white print:text-slate-900 print:space-y-2">
        {/* Timetable Header Title Bar (Matches University Timetable Reference) */}
        <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2 print:border-b-2 print:border-slate-800 print:pb-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight print:text-slate-900">
              {activeSemester?.name || 'Academic Class Routine'}
            </h1>
            <p className="text-xs font-semibold text-indigo-400 print:text-slate-600">
              Weekly Timetable &bull; {timeSlotRows.length} Periods Daily &bull; 90-Min Standard Slots
            </p>
          </div>
          <div className="text-right text-[11px] font-mono text-slate-400 print:text-slate-700 hidden sm:block">
            <span>{summary.totalWeeklyClasses} Classes</span> &bull; <span>{summary.totalWeeklyHours} Hours / Week</span>
          </div>
        </div>

        {/* Empty State: No Courses or Schedules */}
        {coursesLoading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading routine schedules...</div>
        ) : routineItems.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center space-y-3 max-w-md mx-auto">
            <CalendarCheck className="w-10 h-10 text-indigo-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-100">No Weekly Schedules Found</h3>
              <p className="text-xs text-slate-400">
                This semester does not have any weekly course schedules yet. Add schedule slots in Academic Setup to automatically generate your routine.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToSetup}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Go to Academic Setup
            </button>
          </div>
        ) : (
          /* ============================================================ */
          /* UNIFORM UNIVERSITY TIMETABLE TABLE WITH ROWSPAN              */
          /* ============================================================ */
          <div className="overflow-x-auto rounded-xl p-0.5 print:p-0">
            <div className="min-w-[880px] print:min-w-full">
              <table className="w-full border-separate border-spacing-2 print:border-spacing-1 table-fixed text-center">
                {/* Column Headers */}
                <thead>
                  <tr>
                    {/* Time Column Header */}
                    <th className="w-32 sm:w-36 print:w-28 py-3 px-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 uppercase tracking-wider font-mono text-xs font-black shadow-xs print:bg-slate-900 print:border-slate-900 print:text-white">
                      Time
                    </th>

                    {/* Day Column Headers */}
                    {activeDays.map((day) => {
                      const isToday = day === todayDayOfWeek;
                      return (
                        <th
                          key={day}
                          className={`py-3 px-2 rounded-xl uppercase tracking-wider text-xs font-black transition shadow-xs border ${
                            isToday
                              ? 'bg-indigo-950/80 border-indigo-500/80 text-indigo-200 print:bg-indigo-900 print:border-indigo-900 print:text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-200 print:bg-slate-900 print:border-slate-900 print:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{day}</span>
                            {isToday && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-600 text-white font-bold tracking-tight print:hidden">
                                TODAY
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {timeSlotRows.map((slot, rIdx) => {
                    const timeLabel = is12Hour ? slot.label12 : slot.label24;
                    const rowCells = tableMatrix[rIdx] || [];

                    return (
                      <tr key={slot.slotKey} className="align-middle">
                        {/* Time Slot Cell (Far Left) */}
                        <td className="w-32 sm:w-36 print:w-28 p-2 rounded-xl bg-slate-950 border-2 border-slate-800 text-slate-200 font-mono font-black text-xs shadow-md print:bg-slate-900 print:border-slate-900 print:text-white">
                          <div className="flex flex-col items-center justify-center space-y-0.5">
                            <span className="tracking-tight leading-tight">{timeLabel}</span>
                            <span className="text-[9px] text-slate-400 print:text-slate-300 font-sans font-semibold">
                              Period {rIdx + 1}
                            </span>
                          </div>
                        </td>

                        {/* Day Cells */}
                        {activeDays.map((day, dIdx) => {
                          const cell = rowCells[dIdx];
                          if (!cell || cell.type === 'skipped') {
                            // Covered by rowSpan of earlier slot, omit <td>
                            return null;
                          }

                          if (cell.type === 'empty') {
                            return (
                              <td
                                key={`${day}-${slot.slotKey}-empty`}
                                className="h-full p-0 align-middle"
                              >
                                <div className="h-full min-h-[76px] p-2 rounded-xl bg-slate-950/30 border-2 border-dashed border-slate-800/40 flex items-center justify-center select-none print:bg-slate-50 print:border-slate-300">
                                  <span className="text-[10px] text-slate-700/60 print:text-slate-400 font-medium">
                                    &mdash;
                                  </span>
                                </div>
                              </td>
                            );
                          }

                          // Active Class Cell
                          const items = cell.items || [];
                          const rowSpan = cell.rowSpan || 1;

                          return (
                            <td
                              key={`${day}-${slot.slotKey}-class`}
                              rowSpan={rowSpan}
                              className="h-full p-0 align-middle"
                            >
                              <div className="h-full flex flex-col gap-1.5">
                                {items.map((cls, cIdx) => {
                                  const courseColor = cls.color || '#6366f1';

                                  // Theme Color Computations
                                  const vibrantBg =
                                    actualTheme === 'light' ? `${courseColor}22` : `${courseColor}18`;
                                  const vibrantBorder = courseColor;

                                  const parchmentBg = '#f7deb4';
                                  const parchmentBorder = '#3b3225';

                                  const minimalBg =
                                    actualTheme === 'light' ? '#f1f5f9' : '#1e293b';
                                  const minimalBorder =
                                    actualTheme === 'light' ? '#cbd5e1' : '#475569';

                                  const currentBg =
                                    colorTheme === 'parchment'
                                      ? parchmentBg
                                      : colorTheme === 'minimal'
                                      ? minimalBg
                                      : vibrantBg;

                                  const currentBorder =
                                    colorTheme === 'parchment'
                                      ? parchmentBorder
                                      : colorTheme === 'minimal'
                                      ? minimalBorder
                                      : vibrantBorder;

                                  const textColor =
                                    colorTheme === 'parchment'
                                      ? '#1c1813'
                                      : colorTheme === 'minimal'
                                      ? actualTheme === 'light'
                                        ? '#0f172a'
                                        : '#f8fafc'
                                      : actualTheme === 'light'
                                      ? '#0f172a'
                                      : '#f8fafc';

                                  return (
                                    <div
                                      key={`${cls.courseId}-${cls.scheduleId}-${cIdx}`}
                                      className={`h-full min-h-[76px] p-2.5 rounded-xl border-2 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden transition-all duration-150 ${
                                        rowSpan > 1 ? 'py-4' : ''
                                      }`}
                                      style={{
                                        backgroundColor: currentBg,
                                        borderColor: currentBorder,
                                        color: textColor,
                                      }}
                                    >
                                      {/* Left Colored Accent Bar */}
                                      {colorTheme === 'vibrant' && (
                                        <div
                                          className="absolute top-0 left-0 bottom-0 w-1.5"
                                          style={{ backgroundColor: courseColor }}
                                        />
                                      )}

                                      {/* Course Code (Bold & Large) */}
                                      <div className="font-black text-sm sm:text-base uppercase tracking-wide leading-tight print:text-black">
                                        {cls.courseCode}
                                      </div>

                                      {/* Optional Full Course Name */}
                                      {showCourseName && cls.courseName && (
                                        <p className="text-[10px] font-semibold opacity-90 line-clamp-1 leading-tight mt-0.5 print:text-slate-900">
                                          {cls.courseName}
                                        </p>
                                      )}

                                      {/* Room Number */}
                                      {showRoom && cls.room && (
                                        <div className="mt-1 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight bg-slate-950/40 dark:bg-black/30 border border-black/10 dark:border-white/10 text-inherit print:bg-slate-200 print:text-black">
                                          {cls.room.toLowerCase().startsWith('room')
                                            ? cls.room
                                            : `Room ${cls.room}`}
                                        </div>
                                      )}

                                      {/* Instructor Initials / Name */}
                                      {showInstructor && cls.instructor && (
                                        <div className="text-[11px] font-bold opacity-90 mt-0.5 leading-tight print:text-slate-800">
                                          {cls.instructor}
                                        </div>
                                      )}

                                      {/* 3-Hour Lab Badge for Row-Spanned Classes */}
                                      {rowSpan > 1 && (
                                        <div className="mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 print:border-amber-800 print:text-amber-900">
                                          3 Hours &bull; Lab
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Timetable Bottom Footer Bar (Matching Photo Reference) */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 print:text-slate-600 print:border-slate-400">
          {/* Weekend Notice on Left (Matches "Friday & Saturday: No class" in photo) */}
          <div className="flex items-center gap-2">
            {!isShowingWeekend ? (
              <span className="font-semibold text-slate-400 italic">
                Friday &amp; Saturday: No classes scheduled (Weekend)
              </span>
            ) : (
              <span className="font-semibold text-slate-400">
                Displaying full 7-day academic schedule
              </span>
            )}

            <button
              type="button"
              onClick={() => setWeekendMode(isShowingWeekend ? 'hide' : 'show')}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-semibold cursor-pointer print:hidden ml-1"
            >
              {isShowingWeekend ? 'Switch to 5-Day View' : 'View Fri & Sat'}
            </button>
          </div>

          {/* Watermark Reference on Right */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono select-none">
            <span className="text-slate-500 print:text-slate-600">Created by</span>
            <span className="font-bold tracking-widest uppercase text-slate-300 print:text-slate-800">
              MD SHEIK RAFIWOL KARIM RAFI
            </span>
          </div>
        </div>
      </div>

      {/* Sync Routine with Calendar Confirmation Modal */}
      {isSyncModalOpen && activeSemester && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                Sync Routine with Calendar
              </h3>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                If your university schedule changed mid-semester, this tool aligns your upcoming calendar with your current weekly routine.
              </p>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Effective From Date:</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/70 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  <strong className="text-emerald-300 font-semibold">100% History Safe:</strong> Classes and previous attendance recorded before <span className="font-mono font-bold text-emerald-100">{effectiveDate}</span> are permanently protected and will not be touched or overwritten.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={syncMutation.isPending}
                onClick={() => syncMutation.mutate()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {syncMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing Future Classes...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Apply to Future Calendar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
