import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  classInstanceApi,
  semesterApi,
  courseApi,
  academicEventApi,
  holidayApi,
} from '../api/academicApi.js';
import type {
  ISemester,
  ICourse,
  IClassInstance,
  IAcademicEvent,
  IBangladeshHoliday,
  AttendanceStatus,
  ClassStatus,
} from '../types/academic.js';
import { ClassNotesModal } from './ClassNotesModal.js';
import { AcademicEventModal } from './AcademicEventModal.js';
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
  ArrowRight,
  BookOpen,
  CheckSquare,
  Edit3,
  Tag,
  Plus,
  Trash2,
  RotateCcw,
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

  // Modals state
  const [editingNotesInstance, setEditingNotesInstance] = useState<IClassInstance | null>(null);
  const [editingEvent, setEditingEvent] = useState<IAcademicEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Fetch Semesters
  const { data: semesters = [], isLoading: semestersLoading } = useQuery<ISemester[]>({
    queryKey: ['semesters'],
    queryFn: () => semesterApi.getAll(),
  });

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

  // Automatically jump viewYear/viewMonth to the semester date range when viewing previous or future semesters
  React.useEffect(() => {
    if (activeSemester?.startDate && activeSemester?.endDate) {
      const start = new Date(activeSemester.startDate);
      const end = new Date(activeSemester.endDate);
      const today = new Date();

      if (today >= start && today <= end) {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
        setSelectedDate(getTodayDateString());
      } else {
        setViewYear(start.getFullYear());
        setViewMonth(start.getMonth());
        setSelectedDate(activeSemester.startDate.split('T')[0]);
      }
    }
  }, [activeSemester?._id, activeSemester?.startDate, activeSemester?.endDate]);

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

  // 1. Fetch Class Instances for visible month
  const {
    data: monthClasses = [],
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

  // 2. Fetch Bangladesh Public Holidays for visible month
  const { data: monthHolidays = [] } = useQuery<IBangladeshHoliday[]>({
    queryKey: ['holidays', viewYear, viewMonth],
    queryFn: () => holidayApi.getHolidays(viewYear, viewMonth),
  });

  // 3. Fetch Academic Events for visible month
  const { data: monthEvents = [] } = useQuery<IAcademicEvent[]>({
    queryKey: ['academic-events', activeSemester?._id, monthStartDate, monthEndDate],
    queryFn: () => {
      if (!activeSemester?._id) return Promise.resolve([]);
      return academicEventApi.getAll({
        semesterId: activeSemester._id,
        startDate: monthStartDate,
        endDate: monthEndDate,
      });
    },
    enabled: Boolean(activeSemester?._id),
  });

  // Fetch upcoming 5 classes
  const { data: upcomingClasses = [] } = useQuery<IClassInstance[]>({
    queryKey: ['class-instances', 'upcoming', activeSemester?._id],
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

  // Map dates to classes for fast lookup
  const dateClassesMap = useMemo(() => {
    const map = new Map<string, IClassInstance[]>();
    for (const cls of monthClasses) {
      const existing = map.get(cls.dateString) || [];
      existing.push(cls);
      map.set(cls.dateString, existing);
    }
    return map;
  }, [monthClasses]);

  // Map dates to holidays
  const dateHolidaysMap = useMemo(() => {
    const map = new Map<string, IBangladeshHoliday>();
    for (const h of monthHolidays) {
      map.set(h.dateString, h);
    }
    return map;
  }, [monthHolidays]);

  // Map dates to academic events
  const dateEventsMap = useMemo(() => {
    const map = new Map<string, IAcademicEvent[]>();
    for (const ev of monthEvents) {
      const existing = map.get(ev.dateString) || [];
      existing.push(ev);
      map.set(ev.dateString, existing);
    }
    return map;
  }, [monthEvents]);

  // Monthly matrix builder
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const totalDaysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      classes: IClassInstance[];
      holiday?: IBangladeshHoliday;
      events: IAcademicEvent[];
    }> = [];

    // 1. Previous month trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = totalDaysInPrevMonth - i;
      const prevMonthIndex = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = toDateString(prevYear, prevMonthIndex, day);
      days.push({
        day,
        dateString: dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayString,
        classes: dateClassesMap.get(dateStr) || [],
        holiday: dateHolidaysMap.get(dateStr),
        events: dateEventsMap.get(dateStr) || [],
      });
    }

    // 2. Current month days
    for (let d = 1; d <= totalDaysInCurrentMonth; d++) {
      const dateStr = toDateString(viewYear, viewMonth, d);
      days.push({
        day: d,
        dateString: dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayString,
        classes: dateClassesMap.get(dateStr) || [],
        holiday: dateHolidaysMap.get(dateStr),
        events: dateEventsMap.get(dateStr) || [],
      });
    }

    // 3. Next month leading days (fill up to 35 or 42 grid cells)
    const remainingCells = 42 - days.length;
    if (remainingCells > 0 && remainingCells < 7) {
      for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
        const nextMonthIndex = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        const dateStr = toDateString(nextYear, nextMonthIndex, nextDay);
        days.push({
          day: nextDay,
          dateString: dateStr,
          isCurrentMonth: false,
          isToday: dateStr === todayString,
          classes: dateClassesMap.get(dateStr) || [],
          holiday: dateHolidaysMap.get(dateStr),
          events: dateEventsMap.get(dateStr) || [],
        });
      }
    }

    return days;
  }, [viewYear, viewMonth, todayString, dateClassesMap, dateHolidaysMap, dateEventsMap]);

  // Selected Day Items
  const selectedDayClasses = useMemo(() => {
    return dateClassesMap.get(selectedDate) || [];
  }, [dateClassesMap, selectedDate]);

  const selectedDayHoliday = useMemo(() => {
    return dateHolidaysMap.get(selectedDate);
  }, [dateHolidaysMap, selectedDate]);

  const selectedDayEvents = useMemo(() => {
    return dateEventsMap.get(selectedDate) || [];
  }, [dateEventsMap, selectedDate]);

  // Formatted date string for selected date
  const selectedDateFormatted = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  // Relative badge
  const selectedDateRelativeLabel = useMemo(() => {
    if (selectedDate === todayString) return 'Today';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const [ty, tm, td] = todayString.split('-').map(Number);
    const selectedTime = new Date(y, m - 1, d).getTime();
    const todayTime = new Date(ty, tm - 1, td).getTime();
    const diffDays = Math.round((selectedTime - todayTime) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    return null;
  }, [selectedDate, todayString]);

  // Month Statistics
  const monthStats = useMemo(() => {
    let total = monthClasses.length;
    let scheduledTotal = 0;
    let attended = 0;
    let missed = 0;
    let unmarked = 0;
    let cancelled = 0;
    let holiday = 0;

    for (const cls of monthClasses) {
      if (cls.status === 'cancelled') {
        cancelled++;
      } else if (cls.status === 'holiday') {
        holiday++;
      } else {
        scheduledTotal++;
        if (cls.attendanceStatus === 'attended') attended++;
        else if (cls.attendanceStatus === 'missed') missed++;
        else unmarked++;
      }
    }

    const decided = attended + missed;
    const rate = decided === 0 ? 0 : Math.round((attended / decided) * 100);

    return { total, scheduledTotal, attended, missed, unmarked, cancelled, holiday, rate };
  }, [monthClasses]);

  // Mutations
  const attendanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AttendanceStatus }) =>
      classInstanceApi.updateAttendance(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, cancellationReason }: { id: string; status: ClassStatus; cancellationReason?: string }) =>
      classInstanceApi.updateStatus(id, { status, cancellationReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => academicEventApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-events'] });
    },
  });

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayString);
  };

  // Zero State: No Semesters
  if (semesters.length === 0 && !semestersLoading) {
    return (
      <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
        <CalendarIcon className="w-12 h-12 text-indigo-400 mx-auto" />
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-100">Welcome to Academic Tracker</h2>
          <p className="text-xs text-slate-400">
            Set up your academic semester and course schedule to initialize your calendar dashboard.
          </p>
        </div>
        <button
          onClick={onNavigateToSetup}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Create First Semester & Courses
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Filter Bar: Semester Switcher, Course Filter & Month Controls */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        {/* Left: Filters */}
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
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.courseCode} &ndash; {c.courseName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Month Controls, Jump to Today, & Add Event Action */}
        <div className="flex items-center gap-2">
          {/* Add Academic Event button */}
          <button
            onClick={() => {
              setEditingEvent(null);
              setIsEventModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Event
          </button>

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
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-indigo-400" />
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Click any date to inspect classes, holidays, and academic events.
                </p>
              </div>

              {/* Month Quick Metric Pill */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Classes:</span>
                <span className="font-bold text-indigo-300">{monthStats.total}</span>
                {monthStats.total > 0 && (
                  <>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-emerald-400 font-semibold">{monthStats.rate}% Attended</span>
                  </>
                )}
                {monthStats.holiday > 0 && (
                  <>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-amber-400 font-medium">{monthStats.holiday} Holiday</span>
                  </>
                )}
                {monthStats.cancelled > 0 && (
                  <>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-rose-400 font-medium">{monthStats.cancelled} Cancelled</span>
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
                const hasHoliday = Boolean(cell.holiday);
                const hasEvents = cell.events.length > 0;
                const isSelected = cell.dateString === selectedDate;
                const isToday = cell.isToday;

                return (
                  <button
                    key={`${cell.dateString}-${idx}`}
                    type="button"
                    onClick={() => setSelectedDate(cell.dateString)}
                    className={`min-h-[76px] sm:min-h-[86px] p-2 rounded-xl flex flex-col justify-between text-left transition relative cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-950/80 border-indigo-500 shadow-md ring-2 ring-indigo-500/40'
                        : isToday
                        ? 'bg-slate-900 border-indigo-600/70 shadow-xs'
                        : hasHoliday
                        ? 'bg-amber-950/20 border-amber-900/50 hover:bg-amber-950/40'
                        : cell.isCurrentMonth
                        ? 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                        : 'bg-slate-950/30 border-slate-900/50 opacity-40 hover:opacity-75'
                    }`}
                  >
                    {/* Top Row: Day Number & Today/Holiday Tag */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold ${
                          isSelected
                            ? 'text-indigo-200'
                            : isToday
                            ? 'text-indigo-400 font-extrabold'
                            : hasHoliday
                            ? 'text-amber-300 font-bold'
                            : cell.isCurrentMonth
                            ? 'text-slate-200'
                            : 'text-slate-600'
                        }`}
                      >
                        {cell.day}
                      </span>

                      <div className="flex items-center gap-1">
                        {hasHoliday && (
                          <span className="text-[10px]" title={cell.holiday?.name}>
                            🇧🇩
                          </span>
                        )}
                        {hasEvents && (
                          <span
                            className="w-2 h-2 rounded-full bg-violet-400 ring-1 ring-violet-300"
                            title={`${cell.events.length} Event(s)`}
                          />
                        )}
                        {isToday && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-600 text-white font-bold tracking-tight">
                            TODAY
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Holiday or Event mini pill */}
                    {hasHoliday && (
                      <div className="text-[9px] text-amber-300/90 font-medium truncate leading-tight">
                        {cell.holiday?.name.split(' ')[0]}
                      </div>
                    )}

                    {/* Bottom: Class Indicator Dots */}
                    {hasClasses ? (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {cell.classes.slice(0, 3).map((cls) => {
                          const course = typeof cls.courseId === 'object' ? cls.courseId : null;
                          const isCancelled = cls.status === 'cancelled';
                          const isHolidayClass = cls.status === 'holiday';

                          return (
                            <span
                              key={cls._id}
                              className={`w-2 h-2 rounded-full transition ${
                                isCancelled
                                  ? 'bg-rose-500 opacity-40'
                                  : isHolidayClass
                                  ? 'bg-amber-400'
                                  : cls.attendanceStatus === 'attended'
                                  ? 'bg-emerald-400'
                                  : cls.attendanceStatus === 'missed'
                                  ? 'bg-rose-400'
                                  : 'bg-indigo-400'
                              }`}
                              style={
                                !isCancelled && !isHolidayClass && course?.color
                                  ? { backgroundColor: course.color }
                                  : undefined
                              }
                              title={`${course?.courseCode || 'Class'}: ${
                                isCancelled ? 'Cancelled' : isHolidayClass ? 'Holiday' : cls.attendanceStatus
                              }`}
                            />
                          );
                        })}
                        {cell.classes.length > 3 && (
                          <span className="text-[9px] text-slate-400 font-bold">
                            +{cell.classes.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-2" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Matrix Legend */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Attended
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Missed
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" /> Unmarked
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-xs">🇧🇩</span> Holiday
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-400" /> Event/Quiz
                </span>
              </div>

              {monthClasses.length === 0 && activeSemester && (
                <button
                  type="button"
                  onClick={onNavigateToGenerator}
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate classes &rarr;
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Daily Class View, Academic Events & Upcoming Classes */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Selected Date Inspector */}
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
                  {selectedDayClasses.length} {selectedDayClasses.length === 1 ? 'class' : 'classes'} &bull;{' '}
                  {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'event' : 'events'}
                </p>
              </div>

              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono font-semibold">
                {selectedDate}
              </span>
            </div>

            {/* Bangladesh Public Holiday Banner if applicable */}
            {selectedDayHoliday && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-2.5">
                <span className="text-lg shrink-0">🇧🇩</span>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-bold text-amber-300">{selectedDayHoliday.name}</h4>
                  <p className="text-[10px] text-amber-200/80">
                    Bangladesh Public Holiday &bull; Regular classes not required for attendance.
                  </p>
                </div>
              </div>
            )}

            {/* Section A: Daily Classes */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Classes</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {selectedDayClasses.length} scheduled
                </span>
              </h4>

              {selectedDayClasses.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No classes scheduled on this date.
                </div>
              ) : (
                selectedDayClasses.map((cls) => {
                  const course = typeof cls.courseId === 'object' ? cls.courseId : null;
                  const isAttended = cls.attendanceStatus === 'attended';
                  const isMissed = cls.attendanceStatus === 'missed';
                  const isUnmarked = cls.attendanceStatus === 'unmarked';
                  const isCancelled = cls.status === 'cancelled';
                  const isHoliday = cls.status === 'holiday';

                  return (
                    <div
                      key={cls._id}
                      className={`p-4 rounded-xl bg-slate-950 border shadow-sm space-y-3 relative overflow-hidden transition ${
                        isCancelled
                          ? 'border-rose-900/50 opacity-80'
                          : isHoliday
                          ? 'border-amber-900/50'
                          : 'border-slate-800/90'
                      }`}
                    >
                      {/* Accent Stripe */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5"
                        style={{
                          backgroundColor: isCancelled
                            ? '#f43f5e'
                            : isHoliday
                            ? '#f59e0b'
                            : course?.color || '#6366f1',
                        }}
                      />

                      {/* Header */}
                      <div className="pl-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono font-bold text-sm ${
                                  isCancelled ? 'line-through text-slate-400' : 'text-slate-100'
                                }`}
                              >
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

                          {/* Lifecycle / Attendance Badge */}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                              isCancelled
                                ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                                : isHoliday
                                ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                                : isAttended
                                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                                : isMissed
                                ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {isCancelled
                              ? 'Cancelled'
                              : isHoliday
                              ? 'Holiday'
                              : cls.attendanceStatus}
                          </span>
                        </div>

                        {/* Cancellation reason if present */}
                        {isCancelled && cls.cancellationReason && (
                          <p className="text-[11px] text-rose-300/90 italic pt-0.5">
                            Reason: {cls.cancellationReason}
                          </p>
                        )}

                        {/* Holiday name if present */}
                        {isHoliday && cls.holidayName && (
                          <p className="text-[11px] text-amber-300/90 font-medium pt-0.5">
                            {cls.holidayName}
                          </p>
                        )}

                        {/* Time & Room */}
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

                        {/* Topic / Notes preview */}
                        {(cls.topic || cls.notes || cls.hasHomework) && (
                          <div className="pt-2 border-t border-slate-900/80 space-y-1 text-xs">
                            {cls.topic && (
                              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                                <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span className="truncate">Topic: {cls.topic}</span>
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

                      {/* Action Footer */}
                      <div className="pl-1 pt-2 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {/* Notes Button */}
                          <button
                            type="button"
                            onClick={() => setEditingNotesInstance(cls)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            {cls.topic || cls.notes ? 'Edit Notes' : '+ Notes'}
                          </button>

                          {/* Cancel / Restore Button */}
                          {isCancelled ? (
                            <button
                              type="button"
                              onClick={() =>
                                statusMutation.mutate({ id: cls._id, status: 'scheduled' })
                              }
                              disabled={statusMutation.isPending}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 transition cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Restore Class
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                statusMutation.mutate({
                                  id: cls._id,
                                  status: 'cancelled',
                                  cancellationReason: 'Class cancelled by instructor',
                                })
                              }
                              disabled={statusMutation.isPending}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 bg-slate-900 hover:bg-rose-950/30 border border-slate-800 transition cursor-pointer"
                            >
                              <XCircle className="w-3 h-3" />
                              Cancel Class
                            </button>
                          )}
                        </div>

                        {/* Attendance Buttons (only active for scheduled classes) */}
                        {isCancelled || isHoliday ? (
                          <span className="text-[10px] text-slate-500 italic">
                            Attendance Not Required
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                attendanceMutation.mutate({ id: cls._id, status: 'attended' })
                              }
                              disabled={attendanceMutation.isPending}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                isAttended
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-300'
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
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                isMissed
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-300'
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
                              className={`px-1.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                                isUnmarked
                                  ? 'bg-slate-800 text-slate-200'
                                  : 'bg-slate-900/60 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Section B: Academic Events */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-violet-400" />
                  Academic Events
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setEditingEvent(null);
                    setIsEventModalOpen(true);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  + Add Event
                </button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No quizzes, exams, or events on this date.
                </div>
              ) : (
                selectedDayEvents.map((ev) => {
                  const evCourse = typeof ev.courseId === 'object' && ev.courseId ? ev.courseId : null;

                  return (
                    <div
                      key={ev._id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-violet-900/50 shadow-sm space-y-2 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-violet-950 border border-violet-800 text-violet-300">
                              {ev.eventType}
                            </span>
                            {evCourse ? (
                              <span className="font-mono font-bold text-xs text-slate-200">
                                {evCourse.courseCode}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">General</span>
                            )}
                          </div>
                          <h5 className="text-xs font-bold text-slate-100 pt-1">{ev.title}</h5>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEvent(ev);
                              setIsEventModalOpen(true);
                            }}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                            title="Edit Event"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEventMutation.mutate(ev._id)}
                            disabled={deleteEventMutation.isPending}
                            className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        {ev.startTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {ev.startTime} {ev.endTime ? `– ${ev.endTime}` : ''}
                          </span>
                        )}
                        {ev.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {ev.room}
                          </span>
                        )}
                      </div>

                      {ev.description && (
                        <p className="text-[11px] text-slate-300/90 whitespace-pre-wrap pt-1 border-t border-slate-900">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Upcoming Classes Widget */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Next Upcoming Classes</span>
              <span className="text-[10px] text-slate-500 font-normal">From Today Onwards</span>
            </h3>

            {upcomingClasses.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No upcoming classes scheduled.</p>
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
                            cls.status === 'cancelled'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : cls.status === 'holiday'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : cls.attendanceStatus === 'attended'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : cls.attendanceStatus === 'missed'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {cls.status === 'cancelled'
                            ? 'Cancelled'
                            : cls.status === 'holiday'
                            ? 'Holiday'
                            : cls.attendanceStatus}
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

      {/* Academic Event Modal */}
      <AcademicEventModal
        event={editingEvent}
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
        defaultDate={selectedDate}
        semesterId={activeSemester?._id || ''}
        courses={courses}
      />
    </div>
  );
};
