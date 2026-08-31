import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { courseApi, semesterApi } from '../api/academicApi.js';
import type { ISemester, ICourse, DayOfWeek } from '../types/academic.js';
import {
  DAYS_OF_WEEK_ORDERED,
  extractRoutineItemsFromCourses,
  extractUniqueTimeSlots,
  calculateWeeklySummary,
} from '../utils/routineUtils.js';
import {
  Calendar as CalendarIcon,
  Printer,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Flame,
  CalendarCheck,
  Palette,
} from 'lucide-react';

interface Props {
  selectedSemesterId: string | null;
  onSelectSemester: (id: string | null) => void;
  onNavigateToSetup: () => void;
}

export const WeeklyRoutine: React.FC<Props> = ({
  selectedSemesterId,
  onSelectSemester,
  onNavigateToSetup,
}) => {
  // Customization State
  const [is12Hour, setIs12Hour] = useState<boolean>(true); // default to 12h like "9 AM - 10:30 AM"
  const [colorTheme, setColorTheme] = useState<'parchment' | 'courseColor'>('parchment'); // 'parchment' matches user image
  const [showRoom, setShowRoom] = useState<boolean>(true);
  const [showInstructor, setShowInstructor] = useState<boolean>(true);
  const [showCourseName, setShowCourseName] = useState<boolean>(true);

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

  // Extract all routine schedule items
  const routineItems = useMemo(() => {
    return extractRoutineItemsFromCourses(courses);
  }, [courses]);

  // Summary Metrics
  const summary = useMemo(() => {
    return calculateWeeklySummary(courses);
  }, [courses]);

  // Extract distinct schedule time slot rows (e.g. "9 AM - 10:30 AM", "1:30 PM - 3 PM", etc.)
  const timeSlotRows = useMemo(() => {
    return extractUniqueTimeSlots(routineItems);
  }, [routineItems]);

  // Map of (DayOfWeek, SlotKey) -> RoutineBlockItem[]
  const slotGridMap = useMemo(() => {
    const map = new Map<string, typeof routineItems>();

    for (const item of routineItems) {
      const key = `${item.dayOfWeek}-${item.startTime}-${item.endTime}`;
      const existing = map.get(key) || [];
      existing.push(item);
      map.set(key, existing);
    }

    return map;
  }, [routineItems]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls (Hidden on print) */}
      <div className="p-5 rounded-none bg-slate-900 border border-slate-800 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="space-y-0.5">
          <h2 className="text-lg font-black text-slate-100 flex items-center gap-2 tracking-tight">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            Weekly Class Routine & Timetable
          </h2>
          <p className="text-xs text-slate-400">
            Clean university timetable format with discrete class time slots &amp; sharp pointer corners.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Semester Selector */}
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
            <select
              value={activeSemester?._id || ''}
              onChange={(e) => onSelectSemester(e.target.value || null)}
              className="px-3 py-1.5 rounded-none bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
            >
              {semesters.map((sem) => (
                <option key={sem._id} value={sem._id}>
                  {sem.name} {sem.isActive ? '• Active' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Print Button */}
          <button
            type="button"
            disabled={routineItems.length === 0}
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-none bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print Routine
          </button>
        </div>
      </div>

      {/* Routine Summary Overview Cards (Hidden on print) */}
      {routineItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
          <div className="p-4 rounded-none bg-slate-900 border-l-4 border-indigo-500 border-t border-r border-b border-slate-800 shadow-md space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Active Courses
            </span>
            <span className="text-2xl font-black text-slate-100 font-mono">
              {summary.totalCoursesWithSchedule}
            </span>
            <span className="text-[11px] text-slate-400 block">with weekly schedules</span>
          </div>

          <div className="p-4 rounded-none bg-slate-900 border-l-4 border-indigo-400 border-t border-r border-b border-slate-800 shadow-md space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Weekly Classes
            </span>
            <span className="text-2xl font-black text-indigo-400 font-mono">
              {summary.totalWeeklyClasses}
            </span>
            <span className="text-[11px] text-slate-400 block">recurring lecture slots</span>
          </div>

          <div className="p-4 rounded-none bg-slate-900 border-l-4 border-emerald-500 border-t border-r border-b border-slate-800 shadow-md space-y-1">
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

          <div className="p-4 rounded-none bg-slate-900 border-l-4 border-amber-500 border-t border-r border-b border-slate-800 shadow-md space-y-1">
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
        <div className="p-3.5 rounded-none bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden shadow-sm">
          <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            Display Options:
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            {/* Color Theme Selector */}
            <div className="flex items-center gap-1.5 border-r border-slate-800 pr-3">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 font-medium">Style:</span>
              <select
                value={colorTheme}
                onChange={(e) => setColorTheme(e.target.value as any)}
                className="px-2 py-0.5 rounded-none bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                <option value="parchment">Classic Timetable (Image Style)</option>
                <option value="courseColor">Course Accent Colors</option>
              </select>
            </div>

            {/* 12h vs 24h Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={is12Hour}
                onChange={(e) => setIs12Hour(e.target.checked)}
                className="rounded-none accent-indigo-500"
              />
              <span>12-Hour (e.g. 9 AM - 10:30 AM)</span>
            </label>

            {/* Show Course Name */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCourseName}
                onChange={(e) => setShowCourseName(e.target.checked)}
                className="rounded-none accent-indigo-500"
              />
              <span>Course Name</span>
            </label>

            {/* Show Room */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showRoom}
                onChange={(e) => setShowRoom(e.target.checked)}
                className="rounded-none accent-indigo-500"
              />
              <span>Room</span>
            </label>

            {/* Show Instructor */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInstructor}
                onChange={(e) => setShowInstructor(e.target.checked)}
                className="rounded-none accent-indigo-500"
              />
              <span>Instructor</span>
            </label>
          </div>
        </div>
      )}

      {/* Main Timetable Card Matching the Reference Image */}
      <div className="p-4 sm:p-6 rounded-none bg-slate-900 border border-slate-800 shadow-2xl backdrop-blur-md space-y-4 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Printable Header (Visible ONLY during print) */}
        <div className="hidden print:block border-b-2 border-black pb-3 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-black">
                Academic Weekly Class Routine
              </h1>
              <p className="text-xs text-gray-700 font-medium">
                Semester: <span className="font-bold text-black">{activeSemester?.name}</span> ({activeSemester?.year} {activeSemester?.term}) &bull; Generated from Academic Tracker
              </p>
            </div>
            <div className="text-right text-[10px] text-gray-600">
              <p>Weekly Hours: {summary.totalWeeklyHours}h &bull; Total Classes: {summary.totalWeeklyClasses}</p>
              <p>Printed: {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
            </div>
          </div>
        </div>

        {/* Empty State: No Courses or Schedules */}
        {coursesLoading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading routine schedules...</div>
        ) : routineItems.length === 0 ? (
          <div className="p-12 rounded-none bg-slate-950 border border-dashed border-slate-800 text-center space-y-3 max-w-md mx-auto">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-none bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Go to Academic Setup
            </button>
          </div>
        ) : (
          /* ============================================================ */
          /* TIMETABLE GRID MATCHING THE USER REFERENCE IMAGE             */
          /* ============================================================ */
          <div className="overflow-x-auto rounded-none p-1 print:p-0">
            <div className="min-w-[960px] print:min-w-full space-y-3">
              {/* Table Headers: Weekdays */}
              <div className="grid grid-cols-8 gap-3 text-center text-xs font-black">
                {/* Time Axis Title */}
                <div className="py-2.5 px-2 bg-slate-950/80 border border-slate-800 print:border-black text-slate-400 print:text-black uppercase tracking-wider font-mono">
                  Time
                </div>

                {/* 7 Days of the Week */}
                {DAYS_OF_WEEK_ORDERED.map((day) => {
                  const isToday = day === todayDayOfWeek;
                  return (
                    <div
                      key={day}
                      className={`py-2.5 px-2 uppercase tracking-wider border print:border-black font-black transition ${
                        isToday
                          ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 print:bg-transparent print:text-black'
                          : 'bg-slate-950/80 border-slate-800 text-slate-200 print:bg-transparent print:text-black'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{day}</span>
                        {isToday && (
                          <span className="text-[9px] px-1 py-0.2 rounded-none bg-indigo-600 text-white font-bold tracking-tight print:hidden">
                            TODAY
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rows: Each distinct schedule time slot (e.g. 9 AM - 10:30 AM, 10:30 AM - 12 PM, etc.) */}
              {timeSlotRows.map((slot) => {
                const timeLabel = is12Hour ? slot.label12 : slot.label24;

                return (
                  <div key={slot.slotKey} className="grid grid-cols-8 gap-3 items-stretch">
                    {/* Far Left Time Box (Dark rectangle matching user image) */}
                    <div className="p-3 bg-[#1e232a] dark:bg-[#111317] border-2 border-slate-700/80 print:border-black text-slate-100 print:text-black flex items-center justify-center text-center font-black text-xs tracking-tight rounded-none shadow-md">
                      <span>{timeLabel}</span>
                    </div>

                    {/* 7 Day Columns */}
                    {DAYS_OF_WEEK_ORDERED.map((day) => {
                      const key = `${day}-${slot.startTime}-${slot.endTime}`;
                      const classesInSlot = slotGridMap.get(key) || [];

                      return (
                        <div key={day} className="flex flex-col">
                          {classesInSlot.length === 0 ? (
                            /* Empty Cell Placeholder matching user image */
                            <div className="p-3 flex-1 min-h-[76px] bg-[#f9e9cf]/50 dark:bg-[#201c15] border-2 border-slate-800/30 dark:border-[#382f23] rounded-none print:border-gray-300 print:bg-white flex items-center justify-center">
                              {/* Blank box */}
                            </div>
                          ) : (
                            /* Active Class Card(s) matching user image */
                            <div className="space-y-2 flex-1 flex flex-col">
                              {classesInSlot.map((cls, cIdx) => {
                                const isParchment = colorTheme === 'parchment';

                                return (
                                  <div
                                    key={`${cls.courseId}-${cls.scheduleId}-${cIdx}`}
                                    className={`p-2.5 flex-1 min-h-[76px] flex flex-col justify-center items-center text-center rounded-none border-2 shadow-sm transition-all duration-150 ${
                                      isParchment
                                        ? 'bg-[#f7deb4] dark:bg-[#342918] border-[#3b3225] dark:border-[#5c4a30] text-[#1c1813] dark:text-[#f8e5b9] print:bg-[#f7deb4] print:text-black print:border-black'
                                        : 'border-slate-800 text-slate-100'
                                    }`}
                                    style={
                                      !isParchment
                                        ? {
                                            backgroundColor: `${cls.color}25`,
                                            borderColor: cls.color || '#6366f1',
                                          }
                                        : undefined
                                    }
                                  >
                                    {/* Primary Line: Course Code / Short Name (e.g. OOP, EE&CL, BS&P) */}
                                    <div className="font-black text-xs uppercase tracking-wide leading-tight">
                                      {cls.courseCode}
                                    </div>

                                    {/* Optional Course Full Name */}
                                    {showCourseName && cls.courseName && (
                                      <p className="text-[10px] font-semibold opacity-90 line-clamp-1 leading-tight mt-0.5">
                                        {cls.courseName}
                                      </p>
                                    )}

                                    {/* Secondary Line: Room (Instructor) (e.g. 506 (GMN), 508 (RAR)) */}
                                    {(showRoom || showInstructor) && (cls.room || cls.instructor) && (
                                      <div className="text-[11px] font-bold opacity-85 mt-1 leading-tight">
                                        {showRoom && cls.room ? cls.room : ''}
                                        {showInstructor && cls.instructor
                                          ? ` (${cls.instructor})`
                                          : ''}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Printable Footer (Visible ONLY during print) */}
        <div className="hidden print:block pt-3 border-t border-gray-300 text-center text-[9px] text-gray-500">
          Academic Study Tracker &bull; Student Weekly Routine &bull; Generated from Course Schedules
        </div>
      </div>
    </div>
  );
};
