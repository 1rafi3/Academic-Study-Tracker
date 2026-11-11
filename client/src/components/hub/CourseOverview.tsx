import React, { useMemo } from 'react';
import type {
  ICourse,
  ISemester,
  IAcademicEvent,
  ICourseAssessmentStructure,
  IClassInstance,
} from '../../types/academic.js';
import {
  Award,
  Calendar,
  Layers,
  Sliders,
  TrendingUp,
  User,
} from 'lucide-react';

interface CourseOverviewProps {
  course: ICourse;
  semester?: ISemester;
  events: IAcademicEvent[];
  assessmentStructure?: ICourseAssessmentStructure | null;
  classInstances?: IClassInstance[];
  onNavigateTab: (tab: 'overview' | 'events' | 'assessment') => void;
  onOpenCreateModal?: () => void;
}

export const CourseOverview: React.FC<CourseOverviewProps> = ({
  course,
  semester,
  events,
  assessmentStructure,
  classInstances = [],
  onNavigateTab,
  onOpenCreateModal,
}) => {
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const courseEvents = events.filter((ev) => {
      const cId =
        typeof ev.courseId === 'object' && ev.courseId
          ? ev.courseId._id
          : ev.courseId;
      return cId === course._id;
    });

    const totalEvents = courseEvents.length;
    let completedCount = 0;
    let upcomingCount = 0;
    let totalObtainedMarks = 0;
    let totalGradedFullMarks = 0;
    let gradedEventCount = 0;

    courseEvents.forEach((ev) => {
      const isPast = ev.isCompleted || (ev.dateString || '') < todayStr;
      if (ev.isCompleted || isPast) {
        completedCount++;
      } else {
        upcomingCount++;
      }

      if (
        ev.obtainedMarks !== undefined &&
        ev.obtainedMarks !== null &&
        ev.fullMarks !== undefined &&
        ev.fullMarks !== null &&
        ev.fullMarks > 0
      ) {
        totalObtainedMarks += ev.obtainedMarks;
        totalGradedFullMarks += ev.fullMarks;
        gradedEventCount++;
      }
    });

    const overallMarksPercentage =
      totalGradedFullMarks > 0
        ? (totalObtainedMarks / totalGradedFullMarks) * 100
        : null;

    // Attendance stats
    const courseInstances = classInstances.filter((ci) => {
      const cId =
        typeof ci.courseId === 'object' && ci.courseId
          ? ci.courseId._id
          : ci.courseId;
      return cId === course._id;
    });

    let attended = 0;
    let missed = 0;
    let decided = 0;
    courseInstances.forEach((ci) => {
      if (ci.status === 'scheduled') {
        if (ci.attendanceStatus === 'attended') {
          attended++;
          decided++;
        } else if (ci.attendanceStatus === 'missed') {
          missed++;
          decided++;
        }
      }
    });

    const attendancePercentage = decided > 0 ? (attended / decided) * 100 : null;

    // Assessment structure stats
    const components = assessmentStructure?.components || [];
    const totalAllocated = components.reduce((sum, c) => sum + (c.allocatedMarks || 0), 0);

    return {
      totalEvents,
      completedCount,
      upcomingCount,
      gradedEventCount,
      totalObtainedMarks,
      totalGradedFullMarks,
      overallMarksPercentage,
      attended,
      missed,
      decided,
      attendancePercentage,
      totalAllocated,
      componentCount: components.length,
    };
  }, [events, course._id, todayStr, classInstances, assessmentStructure]);

  return (
    <div className="space-y-5">
      {/* Course Hero Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div
          className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: course.color || '#6366f1' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {course.courseCode && (
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold text-xs tracking-wider">
                  {course.courseCode}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700 text-xs font-semibold">
                {course.credit} Credits
              </span>
              {semester && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700 text-xs">
                  {semester.name} {semester.year}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              {course.courseName}
            </h2>

            {course.instructor && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Instructor: <strong className="text-slate-300 font-medium">{course.instructor}</strong></span>
              </p>
            )}
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onOpenCreateModal && (
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                Add Event
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigateTab('assessment')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Configure Marks
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Event Counts */}
        <div
          onClick={() => onNavigateTab('events')}
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Academic Events</span>
            <Layers className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">{stats.totalEvents}</span>
            <span className="text-xs text-slate-400">total</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
            <span className="text-emerald-400">{stats.completedCount} completed</span>
            <span>•</span>
            <span className="text-blue-400">{stats.upcomingCount} upcoming</span>
          </div>
        </div>

        {/* Card 2: Cumulative Marks Performance */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Graded Performance</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              {stats.overallMarksPercentage !== null
                ? `${stats.overallMarksPercentage.toFixed(1)}%`
                : '--'}
            </span>
            {stats.gradedEventCount > 0 && (
              <span className="text-xs text-slate-400">
                ({stats.totalObtainedMarks} / {stats.totalGradedFullMarks})
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/60 truncate">
            {stats.gradedEventCount > 0
              ? `${stats.gradedEventCount} graded event${stats.gradedEventCount > 1 ? 's' : ''}`
              : 'No graded events yet'}
          </div>
        </div>

        {/* Card 3: Assessment Distribution */}
        <div
          onClick={() => onNavigateTab('assessment')}
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Assessment Allocation</span>
            <Sliders className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              {stats.totalAllocated}
              <span className="text-sm font-normal text-slate-400"> / 100</span>
            </span>
          </div>
          <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/60 truncate">
            {stats.componentCount > 0
              ? `${stats.componentCount} components configured`
              : 'Click to configure structure'}
          </div>
        </div>

        {/* Card 4: Attendance Summary */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Course Attendance</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              {stats.attendancePercentage !== null
                ? `${stats.attendancePercentage.toFixed(1)}%`
                : '--'}
            </span>
            {stats.decided > 0 && (
              <span className="text-xs text-slate-400">
                ({stats.attended}/{stats.decided})
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/60 truncate">
            {stats.decided > 0
              ? `${stats.attended} attended • ${stats.missed} missed`
              : 'No recorded attendance'}
          </div>
        </div>
      </div>

      {/* Assessment Breakdown Table Preview */}
      {assessmentStructure?.components && assessmentStructure.components.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Allocated Marks Breakdown
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('assessment')}
              className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
            >
              Manage Structure &rarr;
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {assessmentStructure.components.map((c) => (
              <div
                key={c._id || c.name}
                className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium text-slate-200 block truncate">
                    {c.name}
                  </span>
                  {c.isOptional && (
                    <span className="text-[10px] text-amber-400 block">Optional</span>
                  )}
                </div>
                <span className="text-xs font-bold text-indigo-400 shrink-0">
                  {c.allocatedMarks} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
