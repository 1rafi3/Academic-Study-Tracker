import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classInstanceApi, semesterApi, courseApi } from '../api/academicApi.js';
import type {
  ISemester,
  ICourse,
  IClassInstance,
  AttendanceStatus,
} from '../types/academic.js';
import { ClassNotesModal } from './ClassNotesModal.js';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  User,
  Filter,
  Layers,
  Sparkles,
  CalendarCheck,
  ArrowRight,
  BookOpen,
  CheckSquare,
  Edit3,
  FileText,
} from 'lucide-react';

interface Props {
  selectedSemesterId: string | null;
  onSelectSemester: (id: string | null) => void;
  onNavigateToSetup: () => void;
  onNavigateToGenerator: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to format Date to YYYY-MM-DD safely
const toDateString = (year: number, monthIndex: number, day: number): string => {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

// Helper to get Today's Date String in local environment
const getTodayDateString = (): string => {
  const today = new Date();
  return toDateString(today.getFullYear(), today.getMonth(), today.getDate());
};

export const CalendarDashboard: React.FC<Props> = ({
  selectedSemesterId,
  onSelectSemester,
  onNavigateToSetup,
  onNavigateToGenerator,
}) => {
  const queryClient = useQueryClient();
  const todayString = useMemo(() => getTodayDateString(), []);

  // Filter & Navigation State
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  
  // Current view month/year
  const todayDate = new Date();
  const [viewYear, setViewYear] = useState<number>(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(todayDate.getMonth()); // 0-indexed

  // Selected calendar date (default to today)
  const [selectedDate, setSelectedDate] = useState<string>(todayString);

  // Notes Modal state
  const [editingNotesInstance, setEditingNotesInstance] = useState<IClassInstance | null>(null);

  // Fetch Semesters
  const { data: semesters = [], isLoading: semestersLoading } = useQuery<ISemester[]>({
    queryKey: ['semesters'],
    queryFn: () => semesterApi.getAll(),
  });

  // Active or selected semester
  const activeSemester = useMemo(() => {
    if (selectedSemesterId) {
      return semesters.find((s) => s._id === selectedSemesterId) || null;
    }
    return semesters.find((s) => s.isActive) || semesters[0] || null;
  }, [semesters, selectedSemesterId]);

  // Keep selected semester in sync if not set
  React.useEffect(() => {
    if (!selectedSemesterId && activeSemester) {
      onSelectSemester(activeSemester._id);
    }
  }, [selectedSemesterId, activeSemester, onSelectSemester]);

  // If the active semester has dates outside viewYear/Month on first load, align to semester start
  React.useEffect(() => {
    if (activeSemester?.startDate) {
      const semStart = new Date(activeSemester.startDate);
      // If current view month is way off and selected date is not in semester, optionally center on semester
      const semStartYear = semStart.getUTCFullYear();
      const semStartMonth = semStart.getUTCMonth();
      if (Math.abs(semStartYear - viewYear) > 1) {
        setViewYear(semStartYear);
        setViewMonth(semStartMonth);
        setSelectedDate(toDateString(semStartYear, semStartMonth, semStart.getUTCDate()));
      }
    }
  }, [activeSemester]);

  // Fetch Courses for filter dropdown
  const { data: courses = [] } = useQuery<ICourse[]>({
    queryKey: ['courses', activeSemester?._id],
    queryFn: () =>
      activeSemester ? courseApi.getAll(activeSemester._id) : Promise.resolve([]),
    enabled: Boolean(activeSemester?._id),
  });

  // Calculate start and end date for current view month
  const monthStartDate = useMemo(() => {
    return toDateString(viewYear, viewMonth, 1);
  }, [viewYear, viewMonth]);

  const monthEndDate = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    return toDateString(viewYear, viewMonth, daysInMonth);
  }, [viewYear, viewMonth]);

  // Fetch Class Instances for the visible month
  const {
    data: monthClasses = [],
    isLoading: classesLoading,
  } = useQuery<IClassInstance[]>({
    queryKey: [
      'class-instances',
      activeSemester?._id,
      selectedCourseId,
      monthStartDate,
      monthEndDate,
    ],
    queryFn: () => {
      if (!activeSemester?._id) return Promise.resolve([]);
      return classInstanceApi.getAll({
        semesterId: activeSemester._id,
        courseId: selectedCourseId !== 'all' ? selectedCourseId : undefined,
        startDate: monthStartDate,
        endDate: monthEndDate,
      });
    },
    enabled: Boolean(activeSemester?._id),
  });

  // Fetch upcoming 5 classes (from today onward)
  const { data: upcomingClasses = [] } = useQuery<IClassInstance[]>({
    queryKey: ['class-instances', 'upcoming', activeSemester?._id, todayString],
    queryFn: () => {
      if (!activeSemester?._id) return Promise.resolve([]);
      return classInstanceApi.getAll({
        semesterId: activeSemester._id,
        startDate: todayString,
        limit: 5,
      });
    },
    enabled: Boolean(activeSemester?._id),
  });

  // Map month classes by dateString (YYYY-MM-DD) for fast lookup
  const classesByDateMap = useMemo(() => {
    const map = new Map<string, IClassInstance[]>();
    for (const inst of monthClasses) {
      const dStr = inst.dateString;
      if (!map.has(dStr)) {
        map.set(dStr, []);
      }
      map.get(dStr)!.push(inst);
    }
    return map;
  }, [monthClasses]);

  // Attendance Mutation
  const attendanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AttendanceStatus }) =>
      classInstanceApi.updateAttendance(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
    },
    onError: (err: Error) => alert(`Error updating attendance: ${err.message}`),
  });

  // Calendar Matrix Computation
  const calendarDays = useMemo(() => {
    const days: Array<{
      year: number;
      month: number;
      day: number;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      classes: IClassInstance[];
    }> = [];

    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    // 1. Previous Month Padding Days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const pDay = daysInPrevMonth - i;
      const pMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const pYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dStr = toDateString(pYear, pMonth, pDay);
      days.push({
        year: pYear,
        month: pMonth,
        day: pDay,
        dateString: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayString,
        isSelected: dStr === selectedDate,
        classes: classesByDateMap.get(dStr) || [],
      });
    }

    // 2. Current Month Days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dStr = toDateString(viewYear, viewMonth, day);
      days.push({
        year: viewYear,
        month: viewMonth,
        day,
        dateString: dStr,
        isCurrentMonth: true,
        isToday: dStr === todayString,
        isSelected: dStr === selectedDate,
        classes: classesByDateMap.get(dStr) || [],
      });
    }

    // 3. Next Month Padding Days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dStr = toDateString(nYear, nMonth, day);
      days.push({
        year: nYear,
        month: nMonth,
        day,
        dateString: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayString,
        isSelected: dStr === selectedDate,
        classes: classesByDateMap.get(dStr) || [],
      });
    }

    return days;
  }, [viewYear, viewMonth, todayString, selectedDate, classesByDateMap]);

  // Selected Day's Classes
  const selectedDayClasses = useMemo(() => {
    return classesByDateMap.get(selectedDate) || [];
  }, [classesByDateMap, selectedDate]);

  // Month Statistics
  const monthStats = useMemo(() => {
    let total = monthClasses.length;
    let attended = 0;
    let missed = 0;
    let unmarked = 0;

    for (const c of monthClasses) {
      if (c.attendanceStatus === 'attended') attended++;
      else if (c.attendanceStatus === 'missed') missed++;
      else unmarked++;
    }

    const decided = attended + missed;
    const rate = decided === 0 ? 0 : Math.round((attended / decided) * 10000) / 100;

    return { total, attended, missed, unmarked, rate };
  }, [monthClasses]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayString);
  };

  // Formatted Selected Date Title (e.g. "Sunday, September 6, 2026")
  const selectedDateFormatted = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  const selectedDateRelativeLabel = useMemo(() => {
    if (selectedDate === todayString) return 'Today';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const [ty, tm, td] = todayString.split('-').map(Number);
    const selTime = new Date(y, m - 1, d).getTime();
    const todayTime = new Date(ty, tm - 1, td).getTime();
    const diffDays = Math.round((selTime - todayTime) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    return null;
  }, [selectedDate, todayString]);

  // If no semester is created yet
  if (!semestersLoading && semesters.length === 0) {
    return (
      <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
        <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400 w-16 h-16 mx-auto flex items-center justify-center">
          <CalendarIcon className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-100">Welcome to Academic Study Tracker</h2>
          <p className="text-xs text-slate-400">
            Create your first semester to generate class calendars and track your attendance.
          </p>
        </div>
        <button
          onClick={onNavigateToSetup}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Set Up First Semester
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Filter & Month Navigation Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        {/* Left: Semester & Course Selectors */}
        <div className="flex flex-wrap items-center gap-3">
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

          {/* Course Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">All Courses ({courses.length})</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.courseCode} &ndash; {c.courseName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Month Controls & Jump to Today */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-0.5">
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-200 min-w-[130px] text-center">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              onClick={handleNextMonth}
              title="Next Month"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleJumpToToday}
            className="px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-xs font-semibold transition cursor-pointer"
          >
            Today
          </button>
        </div>
      </div>

      {/* Main Dashboard Layout: Calendar on Left, Day Details & Widgets on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Month Calendar Grid */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg space-y-4">
            {/* Calendar Header with Quick Summary */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-indigo-400" />
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Click any calendar date to inspect class schedules and mark attendance.
                </p>
              </div>

              {/* Month Quick Metric Pill */}
              <div className="flex items-center gap-2 text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Month:</span>
                <span className="font-bold text-indigo-300">{monthStats.total} Classes</span>
                {monthStats.total > 0 && (
                  <>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-emerald-400 font-semibold">{monthStats.rate}% Attended</span>
                  </>
                )}
              </div>
            </div>

            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((wd, i) => (
                <div
                  key={wd}
                  className={`py-1.5 text-[11px] font-bold tracking-wider uppercase ${
                    i === 0 || i === 5 ? 'text-indigo-400' : 'text-slate-400'
                  }`}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((cell, idx) => {
                const hasClasses = cell.classes.length > 0;
                const isSelected = cell.dateString === selectedDate;
                const isToday = cell.isToday;

                // Status breakdown for indicator dots
                const hasAttended = cell.classes.some((c) => c.attendanceStatus === 'attended');
                const hasMissed = cell.classes.some((c) => c.attendanceStatus === 'missed');
                const hasUnmarked = cell.classes.some((c) => c.attendanceStatus === 'unmarked');

                return (
                  <button
                    key={`${cell.dateString}-${idx}`}
                    type="button"
                    onClick={() => setSelectedDate(cell.dateString)}
                    className={`min-h-[72px] sm:min-h-[82px] p-2 rounded-xl flex flex-col justify-between text-left transition relative cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-950/80 border-indigo-500 shadow-md ring-2 ring-indigo-500/40'
                        : isToday
                        ? 'bg-slate-900 border-indigo-600/70 shadow-xs'
                        : cell.isCurrentMonth
                        ? 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                        : 'bg-slate-950/30 border-slate-900/50 opacity-40 hover:opacity-75'
                    }`}
                  >
                    {/* Top Row: Day Number & Today Pill */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold ${
                          isSelected
                            ? 'text-indigo-200'
                            : isToday
                            ? 'text-indigo-400 font-extrabold'
                            : cell.isCurrentMonth
                            ? 'text-slate-200'
                            : 'text-slate-600'
                        }`}
                      >
                        {cell.day}
                      </span>

                      {isToday && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-600 text-white font-bold tracking-tight">
                          TODAY
                        </span>
                      )}
                    </div>

                    {/* Middle/Bottom: Subtle Class Indicators */}
                    {hasClasses && (
                      <div className="space-y-1 w-full pt-1">
                        {/* Course Color Pill or Tag */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {cell.classes.slice(0, 3).map((cls, cIdx) => (
                            <span
                              key={cls._id || cIdx}
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  typeof cls.courseId === 'object' && cls.courseId?.color
                                    ? cls.courseId.color
                                    : '#6366f1',
                              }}
                              title={`${typeof cls.courseId === 'object' ? cls.courseId.courseCode : 'Class'} (${cls.attendanceStatus})`}
                            />
                          ))}
                          {cell.classes.length > 3 && (
                            <span className="text-[9px] text-slate-400 font-bold">
                              +{cell.classes.length - 3}
                            </span>
                          )}
                        </div>

                        {/* Attendance State Indicator Mini Bar */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-300">
                            {cell.classes.length} {cell.classes.length === 1 ? 'class' : 'classes'}
                          </span>

                          <div className="flex items-center gap-0.5">
                            {hasAttended && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Attended" />
                            )}
                            {hasMissed && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Missed" />
                            )}
                            {hasUnmarked && (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" title="Unmarked" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Attended
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Missed
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-500" /> Unmarked
                </span>
              </div>

              {monthClasses.length === 0 && !classesLoading && (
                <button
                  onClick={onNavigateToGenerator}
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate classes for this semester &rarr;
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Daily Class View & Upcoming Classes */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Selected Date Details (Daily Class View) */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">{selectedDateFormatted}</h3>
                  {selectedDateRelativeLabel && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold uppercase tracking-wider">
                      {selectedDateRelativeLabel}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {selectedDayClasses.length === 0
                    ? 'No classes scheduled'
                    : `${selectedDayClasses.length} ${
                        selectedDayClasses.length === 1 ? 'class' : 'classes'
                      } on this day`}
                </p>
              </div>

              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono font-semibold">
                {selectedDate}
              </span>
            </div>

            {/* Zero State for Selected Day */}
            {selectedDayClasses.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center space-y-2">
                <CalendarCheck className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">No Classes on this Date</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Enjoy your free time or select another day on the calendar to mark your study attendance.
                </p>
              </div>
            ) : (
              /* Class Cards List */
              <div className="space-y-3">
                {selectedDayClasses.map((cls) => {
                  const course = typeof cls.courseId === 'object' ? cls.courseId : null;
                  const isAttended = cls.attendanceStatus === 'attended';
                  const isMissed = cls.attendanceStatus === 'missed';
                  const isUnmarked = cls.attendanceStatus === 'unmarked';

                  return (
                    <div
                      key={cls._id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 shadow-sm space-y-3 relative overflow-hidden transition"
                    >
                      {/* Course Accent Stripe */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5"
                        style={{ backgroundColor: course?.color || '#6366f1' }}
                      />

                      {/* Card Header: Code, Title, Time */}
                      <div className="pl-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-slate-100">
                                {course?.courseCode || 'CLASS'}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-medium">
                                {cls.type}
                              </span>
                            </div>
                            <h4 className="text-xs font-semibold text-slate-300">
                              {course?.courseName || 'Academic Session'}
                            </h4>
                          </div>

                          {/* Attendance Status Badge */}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                              isAttended
                                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                                : isMissed
                                ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {cls.attendanceStatus}
                          </span>
                        </div>

                        {/* Time & Room Info */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 font-semibold text-slate-200">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            {cls.startTime} &ndash; {cls.endTime}
                          </span>
                          {cls.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              {cls.room}
                            </span>
                          )}
                          {course?.instructor && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              {course.instructor}
                            </span>
                          )}
                        </div>

                        {/* Lecture Topic / Notes / Homework Preview */}
                        {(cls.topic || cls.notes || cls.hasHomework) && (
                          <div className="pt-2 border-t border-slate-900/80 space-y-1 text-xs">
                            {cls.topic && (
                              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                                <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span className="truncate">Topic: {cls.topic}</span>
                              </div>
                            )}
                            {cls.notes && !cls.topic && (
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate italic">Notes recorded</span>
                              </div>
                            )}
                            {cls.hasHomework && (
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 text-[10px] font-medium">
                                <CheckSquare className="w-3 h-3 shrink-0" />
                                Homework Assigned
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Interactive Attendance & Notes Action Buttons */}
                      <div className="pl-1 pt-2 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2">
                        {/* Notes Action Button */}
                        <button
                          type="button"
                          onClick={() => setEditingNotesInstance(cls)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            cls.topic || cls.notes
                              ? 'bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          <Edit3 className="w-3 h-3" />
                          {cls.topic || cls.notes ? 'Edit Notes' : '+ Add Notes'}
                        </button>

                        {/* Attendance Toggles */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              attendanceMutation.mutate({ id: cls._id, status: 'attended' })
                            }
                            disabled={attendanceMutation.isPending}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              isAttended
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Attended
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              attendanceMutation.mutate({ id: cls._id, status: 'missed' })
                            }
                            disabled={attendanceMutation.isPending}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              isMissed
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Missed
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              attendanceMutation.mutate({ id: cls._id, status: 'unmarked' })
                            }
                            disabled={attendanceMutation.isPending}
                            className={`px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                              isUnmarked
                                ? 'bg-slate-800 text-slate-200'
                                : 'bg-slate-900/60 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Upcoming Classes Widget (Next 5 Classes) */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Upcoming Classes
              </h3>
              <span className="text-[10px] text-slate-400">Chronological</span>
            </div>

            {upcomingClasses.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No upcoming classes found from today onward in this semester.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingClasses.map((cls) => {
                  const course = typeof cls.courseId === 'object' ? cls.courseId : null;
                  const isTarget = cls.dateString === selectedDate;

                  return (
                    <div
                      key={cls._id}
                      onClick={() => {
                        setSelectedDate(cls.dateString);
                        // Jump view month if upcoming class is in another month
                        const [y, m] = cls.dateString.split('-').map(Number);
                        setViewYear(y);
                        setViewMonth(m - 1);
                      }}
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isTarget
                          ? 'bg-indigo-950/60 border-indigo-500 text-slate-100'
                          : 'bg-slate-950 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: course?.color || '#6366f1' }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs">{course?.courseCode}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {cls.dateString}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {cls.dayOfWeek} &bull; {cls.startTime} &ndash; {cls.endTime}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            cls.attendanceStatus === 'attended'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : cls.attendanceStatus === 'missed'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {cls.attendanceStatus}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Class Notes Modal */}
      <ClassNotesModal
        instance={editingNotesInstance}
        isOpen={Boolean(editingNotesInstance)}
        onClose={() => setEditingNotesInstance(null)}
      />
    </div>
  );
};
