import React from 'react';
import type {
  ISemester,
  ICourse,
  OverallAnalyticsSummary,
  CourseAnalyticsData,
  AttendanceRiskStatus,
} from '../../types/academic.js';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
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
  Calendar,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import { getCourseShortName } from '../../utils/courseUtils.js';

interface BentoAnalyticsProps {
  semesters: ISemester[];
  activeSemester: ISemester | null;
  courses: ICourse[];
  selectedSemesterId: string | null;
  selectedCourseId: string;
  targetPercentage: number;
  overall: OverallAnalyticsSummary | undefined;
  courseAnalytics: CourseAnalyticsData[];
  analyticsLoading: boolean;
  analyticsError: unknown;
  onSelectSemester: (id: string | null) => void;
  setSelectedCourseId: (id: string) => void;
  setTargetPercentage: (target: number) => void;
  onNavigateToCalendar: (dateString?: string) => void;
  onNavigateToGpa?: () => void;
  getStatusBadge: (status: AttendanceRiskStatus) => React.ReactNode;
}

const PRESET_TARGETS = [65, 70, 75, 80, 85, 90];

export const BentoAttendanceAnalyticsView: React.FC<BentoAnalyticsProps> = ({
  semesters,
  activeSemester,
  courses,
  selectedCourseId,
  targetPercentage,
  overall,
  courseAnalytics,
  analyticsLoading,
  analyticsError,
  onSelectSemester,
  setSelectedCourseId,
  setTargetPercentage,
  onNavigateToCalendar,
  onNavigateToGpa,
  getStatusBadge,
}) => {
  // SVG Circular Gauge calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const currentPercentage = overall?.percentage || 0;
  const strokeDashoffset = circumference - (Math.min(currentPercentage, 100) / 100) * circumference;

  const getGaugeStrokeColor = (status?: AttendanceRiskStatus) => {
    switch (status) {
      case 'SAFE':
        return '#10b981'; // emerald-500
      case 'WARNING':
        return '#f59e0b'; // amber-500
      case 'DANGER':
        return '#f43f5e'; // rose-500
      default:
        return '#6366f1'; // indigo-500
    }
  };

  const getStatusGlowClass = (status?: AttendanceRiskStatus) => {
    switch (status) {
      case 'SAFE':
        return 'bento-glow-safe border-emerald-500/30';
      case 'WARNING':
        return 'bento-glow-warning border-amber-500/30';
      case 'DANGER':
        return 'bento-glow-danger border-rose-500/40 ring-1 ring-rose-500/30';
      default:
        return 'border-slate-800';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Filters Bento Box */}
      <div className="bento-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-xs">
                <Target className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                Attendance Health & Bunk Intelligence
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Real-time exam eligibility, safe skip allowances, and target forecast.
            </p>
          </div>

          {/* Filters: Semester & Course & GPA Link */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Semester Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
              <Layers className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <select
                value={activeSemester?._id || ''}
                onChange={(e) => onSelectSemester(e.target.value || null)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-hidden cursor-pointer"
              >
                {semesters.map((sem) => (
                  <option key={sem._id} value={sem._id} className="bg-slate-900 text-slate-100">
                    {sem.name} {sem.isActive ? '• Active' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-slate-100">All Courses</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id} className="bg-slate-900 text-slate-100">
                    {getCourseShortName(c)} &ndash; {c.courseName}
                  </option>
                ))}
              </select>
            </div>

            {/* GPA Link */}
            {onNavigateToGpa && (
              <button
                type="button"
                onClick={onNavigateToGpa}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 text-xs font-semibold transition cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                GPA Calculator &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Target Selector Bar */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Target Threshold:</span>
            <div className="flex items-center gap-1.5">
              {PRESET_TARGETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTargetPercentage(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    targetPercentage === preset
                      ? 'bg-violet-600 text-white shadow-xs scale-105'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Custom Target:</span>
            <div className="flex items-center bg-slate-950/60 rounded-xl border border-slate-800 px-2.5 py-1">
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

      {/* 2. Top Bento Grid: Overall Health, Bunk Allowance & Recovery */}
      {overall && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Bento Cell 1: Overall Percentage (2 Columns) */}
          <div
            className={`md:col-span-2 bento-card p-5 flex flex-col justify-between relative overflow-hidden ${getStatusGlowClass(
              overall.status
            )}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Overall Semester Health
                </span>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-4xl font-extrabold text-slate-100 font-mono tracking-tight">
                    {overall.percentage}%
                  </span>
                  {overall.decided > 0 && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 border ${
                        overall.differenceFromTarget >= 0
                          ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-300'
                          : 'bg-rose-950/80 border-rose-800/80 text-rose-300'
                      }`}
                    >
                      {overall.differenceFromTarget >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {overall.differenceFromTarget >= 0 ? '+' : ''}
                      {overall.differenceFromTarget}% vs {targetPercentage}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 pt-0.5">
                  <strong className="text-slate-200">{overall.attended}</strong> attended of{' '}
                  <strong className="text-slate-200">{overall.decided}</strong> decided classes
                </p>
              </div>

              {/* Apple-style SVG Radial Gauge */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="8"
                  />
                  {/* Dynamic Progress Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={getGaugeStrokeColor(overall.status)}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <Percent className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Bottom Status Banner */}
            <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusBadge(overall.status)}
                <span className="text-xs text-slate-400">
                  {overall.status === 'SAFE' && 'Attendance is safely above your target.'}
                  {overall.status === 'WARNING' && 'Close to boundary limit. Exercise caution.'}
                  {overall.status === 'DANGER' && 'Below target! Immediate recovery required.'}
                  {overall.status === 'NO_DATA' && 'No attendance records yet.'}
                </span>
              </div>
            </div>
          </div>

          {/* Bento Cell 2: Safe Bunk Allowance (1 Column) */}
          <div className="bento-card p-5 flex flex-col justify-between border-emerald-500/20 hover:border-emerald-500/50 bento-glow-safe">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Safe Bunk Capacity
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-300">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>

            <div className="my-auto py-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-emerald-400 font-mono tracking-tight">
                  {overall.canBunk}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  {overall.canBunk === 1 ? 'class' : 'classes'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {overall.canBunk > 0
                  ? `You can safely miss ${overall.canBunk} classes without falling below ${targetPercentage}%.`
                  : 'Zero skip buffer. Missing any class drops your grade below target.'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-emerald-300/80 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Guaranteed Safe Zone
            </div>
          </div>

          {/* Bento Cell 3: Recovery Requirement (1 Column) */}
          <div className="bento-card p-5 flex flex-col justify-between border-rose-500/20 hover:border-rose-500/50 bento-glow-danger">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Recovery Needed
              </span>
              <div className="p-1.5 rounded-lg bg-rose-950/80 border border-rose-800/60 text-rose-300">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="my-auto py-2">
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-4xl font-extrabold font-mono tracking-tight ${
                    overall.needToAttend > 0 ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  {overall.needToAttend > 0 ? overall.needToAttend : '0'}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  {overall.needToAttend === 1 ? 'class' : 'classes'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {overall.needToAttend > 0
                  ? `Must attend the next ${overall.needToAttend} consecutive classes to hit ${targetPercentage}%.`
                  : 'Target achieved. No recovery streak needed at this moment.'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-rose-300/80 font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {overall.needToAttend > 0 ? 'Recovery in progress' : 'Optimal Standing'}
            </div>
          </div>
        </div>
      )}

      {/* 3. Stat Badges Row */}
      {overall && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bento-card p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-100 font-mono">
                {overall.attended}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Attended Classes</div>
            </div>
          </div>

          <div className="bento-card p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-100 font-mono">
                {overall.missed}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Missed Classes</div>
            </div>
          </div>

          <div className="bento-card p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <AlertOctagon className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-100 font-mono">
                {overall.cancelled}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Cancelled Classes</div>
            </div>
          </div>

          <div className="bento-card p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800/50 flex items-center justify-center text-amber-300">
              <span className="text-xs">🇧🇩</span>
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-100 font-mono">
                {overall.holiday}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Public Holidays</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Course-Wise Bento Grid Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Course Health Cards
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-semibold">
            {courseAnalytics.length} Courses
          </span>
        </div>

        {analyticsLoading ? (
          <div className="bento-card p-8 text-center text-xs text-slate-400">
            Loading course health breakdown...
          </div>
        ) : analyticsError ? (
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
            Failed to load analytics: {(analyticsError as Error).message}
          </div>
        ) : courseAnalytics.length === 0 ? (
          <div className="bento-card p-8 text-center text-xs text-slate-500 italic">
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
                  className={`bento-card p-5 space-y-4 relative overflow-hidden group ${
                    isDanger
                      ? 'border-rose-900/60 ring-1 ring-rose-900/30 bento-glow-danger'
                      : isWarning
                      ? 'border-amber-900/50 bento-glow-warning'
                      : 'hover:border-slate-700'
                  }`}
                >
                  {/* Top Ambient Accent Bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: course.color || '#8b5cf6' }}
                  />

                  {/* Header: Course Code & Name & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-100">
                          {course.courseCode}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: course.color || '#8b5cf6' }}
                        />
                      </div>
                      <h4 className="text-xs font-semibold text-slate-300 truncate">
                        {course.courseName}
                      </h4>
                    </div>
                    {getStatusBadge(course.status)}
                  </div>

                  {/* Attendance Stats & Dual-Bar Meter */}
                  <div className="space-y-2">
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

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800/80">
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

                    {/* Class Count Chips */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {course.attended} Attended
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        {course.missed} Missed
                      </span>
                      {course.cancelled > 0 && (
                        <span className="text-orange-400">
                          {course.cancelled} Cancelled
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bunk / Recovery Guidance Pill */}
                  <div
                    className={`p-3 rounded-xl border text-xs ${
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
                          <p className="font-bold text-rose-300">Target Deficit</p>
                          <p className="text-[11px] text-rose-200/90">
                            {course.needToAttend > 0
                              ? `Must attend the next ${course.needToAttend} consecutive classes to reach ${targetPercentage}%.`
                              : 'Attend all upcoming classes to avoid failing criteria.'}
                          </p>
                        </div>
                      </div>
                    ) : isWarning ? (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-300">Borderline Standing</p>
                          <p className="text-[11px] text-amber-200/90">
                            {course.canBunk > 0
                              ? `You have a buffer of only ${course.canBunk} class before falling below target.`
                              : 'Zero margin! Any missed class will immediately breach target.'}
                          </p>
                        </div>
                      </div>
                    ) : isSafe ? (
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-emerald-300">Optimal Attendance</p>
                          <p className="text-[11px] text-emerald-200/90">
                            Safe skip buffer:{' '}
                            <span className="font-extrabold text-emerald-300 font-mono">
                              {course.canBunk} {course.canBunk === 1 ? 'class' : 'classes'}
                            </span>{' '}
                            without dropping below {targetPercentage}%.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-xs">
                        No decided attendance data recorded yet.
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Quick Navigation */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[11px]">
                      {course.futureScheduledCount} upcoming scheduled
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigateToCalendar()}
                      className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 font-semibold cursor-pointer transition group-hover:translate-x-0.5"
                    >
                      <Calendar className="w-3 h-3" />
                      Calendar
                      <ArrowRight className="w-3 h-3" />
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
