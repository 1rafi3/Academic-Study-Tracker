import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, semesterApi, courseApi } from '../api/academicApi.js';
import type {
  ISemester,
  ICourse,
  AttendanceAnalyticsResponse,
  AttendanceRiskStatus,
} from '../types/academic.js';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  Target,
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Filter,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
} from 'lucide-react';

interface Props {
  selectedSemesterId: string | null;
  onSelectSemester: (id: string | null) => void;
  onNavigateToCalendar: (dateString?: string) => void;
  onNavigateToNotes: () => void;
}

const PRESET_TARGETS = [65, 70, 75, 80, 85, 90];

export const AttendanceAnalytics: React.FC<Props> = ({
  selectedSemesterId,
  onSelectSemester,
  onNavigateToCalendar,
}) => {
  // State
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

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

  // Keep selected semester in sync if not set
  React.useEffect(() => {
    if (!selectedSemesterId && activeSemester) {
      onSelectSemester(activeSemester._id);
    }
  }, [selectedSemesterId, activeSemester, onSelectSemester]);

  // 2. Fetch Courses for filter
  const { data: courses = [] } = useQuery<ICourse[]>({
    queryKey: ['courses', activeSemester?._id],
    queryFn: () =>
      activeSemester ? courseApi.getAll(activeSemester._id) : Promise.resolve([]),
    enabled: Boolean(activeSemester?._id),
  });

  // 3. Fetch Analytics from API
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useQuery<AttendanceAnalyticsResponse>({
    queryKey: [
      'attendance-analytics',
      activeSemester?._id,
      selectedCourseId,
      targetPercentage,
    ],
    queryFn: () =>
      analyticsApi.getAttendance({
        semesterId: activeSemester?._id,
        courseId: selectedCourseId !== 'all' ? selectedCourseId : undefined,
        target: targetPercentage,
      }),
    enabled: Boolean(activeSemester?._id),
  });

  const overall = analyticsData?.overall;
  const courseAnalytics = analyticsData?.courses || [];

  // Helper for Status Badge & Color
  const getStatusBadge = (status: AttendanceRiskStatus) => {
    switch (status) {
      case 'SAFE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            SAFE
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            WARNING
          </span>
        );
      case 'DANGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-bold uppercase tracking-wider">
            <AlertOctagon className="w-3.5 h-3.5" />
            DANGER
          </span>
        );
      case 'NO_DATA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            NO DATA
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Interactive Target Selector Bar */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg backdrop-blur-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" />
              Attendance Analytics & Target Forecast
            </h2>
            <p className="text-xs text-slate-400">
              Track university exam eligibility, safe bunk allowances, and recovery class requirements.
            </p>
          </div>

          {/* Filters: Semester & Course */}
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
        </div>

        {/* Target Attendance Configurator */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Target Attendance:</span>
            <div className="flex items-center gap-1.5">
              {PRESET_TARGETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTargetPercentage(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    targetPercentage === preset
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          {/* Custom Target Input */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Custom Target:</span>
            <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 px-2.5 py-1">
              <input
                type="number"
                min={50}
                max={100}
                value={targetPercentage}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) setTargetPercentage(val);
                }}
                className="w-12 bg-transparent text-slate-200 text-xs font-bold focus:outline-hidden text-right"
              />
              <span className="text-xs text-slate-400 font-bold ml-1">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Overview Cards Grid */}
      {overall && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Overall Percentage */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Overall Attendance
              </span>
              <Percent className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-100 font-mono">
                {overall.percentage}%
              </span>
              {overall.decided > 0 && (
                <span
                  className={`text-xs font-semibold flex items-center gap-0.5 ${
                    overall.differenceFromTarget >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {overall.differenceFromTarget >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {overall.differenceFromTarget >= 0 ? '+' : ''}
                  {overall.differenceFromTarget}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {overall.attended} attended / {overall.decided} decided classes
            </p>
          </div>

          {/* Card 2: Target & Status */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Target Status
              </span>
              <Target className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="pt-0.5">{getStatusBadge(overall.status)}</div>
            <p className="text-[11px] text-slate-400">
              Required benchmark: <span className="text-slate-200 font-semibold">{targetPercentage}%</span>
            </p>
          </div>

          {/* Card 3: Safe Bunk Allowance */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Safe Bunk Allowance
              </span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                {overall.canBunk}
              </span>
              <span className="text-xs text-slate-400">classes</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {overall.canBunk > 0
                ? `You can safely miss ${overall.canBunk} classes and stay \u2265 ${targetPercentage}%.`
                : 'No bunk buffer available.'}
            </p>
          </div>

          {/* Card 4: Attendance Recovery Needed */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Recovery Requirement
              </span>
              <Clock className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-3xl font-extrabold font-mono ${
                  overall.needToAttend > 0 ? 'text-rose-400' : 'text-slate-200'
                }`}
              >
                {overall.needToAttend > 0 ? overall.needToAttend : '0'}
              </span>
              <span className="text-xs text-slate-400">classes</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {overall.needToAttend > 0
                ? `Attend the next ${overall.needToAttend} classes to reach ${targetPercentage}%.`
                : 'Already at or above target.'}
            </p>
          </div>
        </div>
      )}

      {/* Course-Wise Attendance Analytics Section */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Course Attendance Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              Detailed safety status, bunk allowances, and recovery forecasts for every course.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-semibold">
            {courseAnalytics.length} {courseAnalytics.length === 1 ? 'Course' : 'Courses'}
          </span>
        </div>

        {analyticsLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading attendance analytics...</div>
        ) : analyticsError ? (
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
            Failed to load analytics: {(analyticsError as Error).message}
          </div>
        ) : courseAnalytics.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 italic">
            No courses found for this semester.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courseAnalytics.map((course) => {
              const isSafe = course.status === 'SAFE';
              const isWarning = course.status === 'WARNING';
              const isDanger = course.status === 'DANGER';

              return (
                <div
                  key={course.courseId}
                  className={`p-5 rounded-2xl bg-slate-950 border shadow-md space-y-4 relative overflow-hidden transition ${
                    isDanger
                      ? 'border-rose-900/60 ring-1 ring-rose-900/30'
                      : isWarning
                      ? 'border-amber-900/50'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Left Color Accent */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ backgroundColor: course.color || '#6366f1' }}
                  />

                  {/* Header: Course Code, Name & Status */}
                  <div className="pl-1 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono font-bold text-sm text-slate-100">
                        {course.courseCode}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-300 line-clamp-1">
                        {course.courseName}
                      </h4>
                    </div>
                    {getStatusBadge(course.status)}
                  </div>

                  {/* Attendance Percentage & Progress Bar */}
                  <div className="pl-1 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-slate-100 font-mono">
                          {course.percentage}%
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            course.differenceFromTarget >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {course.differenceFromTarget >= 0 ? '+' : ''}
                          {course.differenceFromTarget}% vs {targetPercentage}%
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {course.attended} / {course.decided} decided
                      </span>
                    </div>

                    {/* Multi-Segment Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden flex">
                      {course.decided > 0 ? (
                        <>
                          <div
                            style={{
                              width: `${(course.attended / course.decided) * 100}%`,
                            }}
                            className="h-full bg-emerald-500 transition-all duration-300"
                            title={`Attended: ${course.attended}`}
                          />
                          <div
                            style={{
                              width: `${(course.missed / course.decided) * 100}%`,
                            }}
                            className="h-full bg-rose-500 transition-all duration-300"
                            title={`Missed: ${course.missed}`}
                          />
                        </>
                      ) : (
                        <div className="w-full h-full bg-slate-800" />
                      )}
                    </div>

                    {/* Stats details pills */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {course.attended} Attended
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-400" />
                        {course.missed} Missed
                      </span>
                      {course.cancelled > 0 && (
                        <span className="text-slate-500">
                          {course.cancelled} Cancelled
                        </span>
                      )}
                      {course.holiday > 0 && (
                        <span className="text-amber-400/80">
                          {course.holiday} Holiday
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bunk / Recovery Guidance Box */}
                  <div
                    className={`pl-1 p-3 rounded-xl border text-xs space-y-1 ${
                      isDanger
                        ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                        : isWarning
                        ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                        : isSafe
                        ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    {isDanger ? (
                      <div className="flex items-start gap-2">
                        <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-300">Attendance Below Target</p>
                          <p className="text-[11px] text-rose-200/90">
                            {course.needToAttend > 0
                              ? `You must attend the next ${course.needToAttend} consecutive classes to reach ${targetPercentage}%.`
                              : 'Focus on attending upcoming classes.'}
                          </p>
                        </div>
                      </div>
                    ) : isWarning ? (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-300">Close to Target Boundary</p>
                          <p className="text-[11px] text-amber-200/90">
                            {course.canBunk > 0
                              ? `You can safely miss ${course.canBunk} more class before falling below target.`
                              : 'Do not miss any upcoming classes to avoid dropping below target.'}
                          </p>
                        </div>
                      </div>
                    ) : isSafe ? (
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-emerald-300">Attendance is Safe</p>
                          <p className="text-[11px] text-emerald-200/90">
                            You can safely miss <span className="font-bold underline">{course.canBunk}</span> more{' '}
                            {course.canBunk === 1 ? 'class' : 'classes'} and remain above {targetPercentage}%.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <Info className="w-3.5 h-3.5" />
                        <span>No attendance recorded yet for this course.</span>
                      </div>
                    )}
                  </div>

                  {/* Footer: Future classes & Quick Calendar Jump */}
                  <div className="pl-1 pt-1 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[11px]">
                      {course.futureScheduledCount} upcoming future classes
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigateToCalendar()}
                      className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition text-xs"
                    >
                      <Calendar className="w-3 h-3" />
                      View in Calendar &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
