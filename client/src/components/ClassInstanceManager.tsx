import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classInstanceApi, semesterApi, courseApi } from '../api/academicApi.js';
import type {
  ISemester,
  ICourse,
  IClassInstance,
  AttendanceStatus,
  OverallAttendanceStats,
  ClassGenerationResult,
} from '../types/academic.js';
import {
  CalendarDays,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Clock,
  MapPin,
  TrendingUp,
  Filter,
  Check,
} from 'lucide-react';

interface Props {
  selectedSemesterId: string | null;
  onSelectSemester: (id: string | null) => void;
}

export const ClassInstanceManager: React.FC<Props> = ({
  selectedSemesterId,
  onSelectSemester,
}) => {
  const queryClient = useQueryClient();
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [generationFeedback, setGenerationFeedback] = useState<string | null>(null);

  // Fetch Semesters for selector
  const { data: semesters = [] } = useQuery<ISemester[]>({
    queryKey: ['semesters'],
    queryFn: () => semesterApi.getAll(),
  });

  // Active or selected semester
  const activeSemester = semesters.find((s) => s._id === selectedSemesterId) || semesters[0] || null;
  const currentSemesterId = activeSemester?._id || null;

  // Fetch Courses in current semester
  const { data: courses = [] } = useQuery<ICourse[]>({
    queryKey: ['courses', currentSemesterId],
    queryFn: () => (currentSemesterId ? courseApi.getAll(currentSemesterId) : Promise.resolve([])),
    enabled: Boolean(currentSemesterId),
  });

  // Fetch Class Instances
  const { data: classInstances = [], isLoading: classesLoading } = useQuery<IClassInstance[]>({
    queryKey: ['class-instances', currentSemesterId, selectedCourseFilter, statusFilter],
    queryFn: () =>
      currentSemesterId
        ? classInstanceApi.getAll({
            semesterId: currentSemesterId,
            courseId: selectedCourseFilter !== 'ALL' ? selectedCourseFilter : undefined,
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
          })
        : Promise.resolve([]),
    enabled: Boolean(currentSemesterId),
  });

  // Fetch Attendance Statistics
  const { data: stats } = useQuery<OverallAttendanceStats>({
    queryKey: ['attendance-stats', currentSemesterId],
    queryFn: () =>
      currentSemesterId ? classInstanceApi.getStats(currentSemesterId) : Promise.reject('No semester'),
    enabled: Boolean(currentSemesterId),
  });

  // Mutation: Generate Class Instances
  const generateMutation = useMutation({
    mutationFn: (semId: string) => classInstanceApi.generate(semId),
    onSuccess: (result: ClassGenerationResult) => {
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      setGenerationFeedback(
        `Generated ${result.created} new class occurrence(s). (${result.skipped} already existed).`
      );
      setTimeout(() => setGenerationFeedback(null), 6000);
    },
    onError: (err: Error) => {
      alert(`Generation failed: ${err.message}`);
    },
  });

  // Mutation: Update Attendance Status
  const attendanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AttendanceStatus }) =>
      classInstanceApi.updateAttendance(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
    },
    onError: (err: Error) => {
      alert(`Failed to update attendance: ${err.message}`);
    },
  });

  if (semesters.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
        <CalendarDays className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-sm font-medium text-slate-300">No Semesters Available</p>
        <p className="text-xs text-slate-500">
          Please create a semester and add course schedules in the <strong>Academic Data</strong> tab first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Generation Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">
              Class Instances & Attendance Engine
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Generate calendar class instances from weekly recurring schedules and track attendance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Semester Selector */}
          <select
            id="semester-instance-select"
            value={currentSemesterId || ''}
            onChange={(e) => onSelectSemester(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
          >
            {semesters.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} {s.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>

          {/* Generate Button */}
          <button
            id="generate-classes-btn"
            onClick={() => currentSemesterId && generateMutation.mutate(currentSemesterId)}
            disabled={generateMutation.isPending || !currentSemesterId}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
            {generateMutation.isPending ? 'Generating...' : 'Generate Classes'}
          </button>
        </div>
      </div>

      {/* Generation Feedback Toast */}
      {generationFeedback && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{generationFeedback}</span>
          </div>
          <button
            onClick={() => setGenerationFeedback(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Attendance Statistics Cards */}
      {stats && (
        <section aria-label="Attendance Statistics" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Attendance Analytics & Formula
            </h3>
            <span className="text-[11px] text-slate-500">
              Formula: <code>Attended / (Attended + Missed) &times; 100</code> (Unmarked excluded)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Overall Percentage Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/50 to-slate-900 border border-indigo-900/60 flex flex-col justify-between">
              <span className="text-xs font-medium text-indigo-300">Overall Attendance</span>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {stats.percentage}%
                </span>
                <span className="text-xs text-slate-400">
                  ({stats.attended}/{stats.decided} decided)
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.percentage)}%` }}
                />
              </div>
            </div>

            {/* Attended Card */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-emerald-400">
                <span>Attended Classes</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="my-1">
                <span className="text-2xl font-bold text-slate-100">{stats.attended}</span>
                <span className="text-xs text-slate-500 ml-1.5">completed</span>
              </div>
              <span className="text-[11px] text-slate-500">Positively recorded</span>
            </div>

            {/* Missed Card */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-rose-400">
                <span>Missed Classes</span>
                <XCircle className="w-4 h-4" />
              </div>
              <div className="my-1">
                <span className="text-2xl font-bold text-slate-100">{stats.missed}</span>
                <span className="text-xs text-slate-500 ml-1.5">absences</span>
              </div>
              <span className="text-[11px] text-slate-500">Explicitly marked missed</span>
            </div>

            {/* Unmarked Card */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-amber-400">
                <span>Unmarked Classes</span>
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="my-1">
                <span className="text-2xl font-bold text-slate-100">{stats.unmarked}</span>
                <span className="text-xs text-slate-500 ml-1.5">pending / future</span>
              </div>
              <span className="text-[11px] text-slate-500">Excluded from percentage</span>
            </div>
          </div>

          {/* Per-Course Breakdown Cards */}
          {stats.courses.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {stats.courses.map((cs) => (
                <div
                  key={cs.courseId}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cs.color }}
                    />
                    <div className="truncate">
                      <span className="font-bold text-slate-200">{cs.courseCode}</span>
                      <p className="text-[11px] text-slate-400 truncate">{cs.courseName}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-100 text-sm">{cs.percentage}%</span>
                    <p className="text-[10px] text-slate-500">
                      {cs.attended} att &bull; {cs.missed} mis &bull; {cs.unmarked} un
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-800/80 py-3">
        {/* Course Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 mr-1 flex items-center gap-1 text-[11px]">
            <Filter className="w-3 h-3" /> Course:
          </span>
          <button
            onClick={() => setSelectedCourseFilter('ALL')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              selectedCourseFilter === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Courses ({courses.length})
          </button>
          {courses.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedCourseFilter(c._id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                selectedCourseFilter === c._id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: c.color || '#6366f1' }}
              />
              {c.courseCode}
            </button>
          ))}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 text-[11px]">Status:</span>
          {['ALL', 'unmarked', 'attended', 'missed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Class Instances List */}
      {classesLoading ? (
        <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
          Loading class occurrences...
        </div>
      ) : classInstances.length === 0 ? (
        <div className="p-10 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 text-center space-y-3">
          <CalendarDays className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">No Class Instances Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click <strong>Generate Classes</strong> above to automatically compute all individual calendar class dates from your courses' weekly recurring schedules.
            </p>
          </div>
          <button
            onClick={() => currentSemesterId && generateMutation.mutate(currentSemesterId)}
            disabled={generateMutation.isPending || !currentSemesterId}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Classes for {activeSemester?.name || 'Semester'}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing {classInstances.length} class occurrence(s)</span>
            <span>Sorted chronologically</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {classInstances.map((inst) => {
              const course = typeof inst.courseId === 'object' ? (inst.courseId as ICourse) : null;
              const dateObj = new Date(inst.date);
              const formattedDate = dateObj.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              });

              return (
                <div
                  key={inst._id}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                    inst.attendanceStatus === 'attended'
                      ? 'bg-emerald-950/20 border-emerald-900/60 shadow-xs'
                      : inst.attendanceStatus === 'missed'
                      ? 'bg-rose-950/20 border-rose-900/60 shadow-xs'
                      : 'bg-slate-900/80 border-slate-800/90'
                  }`}
                >
                  {/* Top Bar: Date & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-100">{formattedDate}</span>
                      <p className="text-[11px] text-slate-400">{inst.dayOfWeek}</p>
                    </div>

                    {/* Status Chip */}
                    <div>
                      {inst.attendanceStatus === 'attended' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" /> Attended
                        </span>
                      )}
                      {inst.attendanceStatus === 'missed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950 border border-rose-700/60 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                          <XCircle className="w-3 h-3" /> Missed
                        </span>
                      )}
                      {inst.attendanceStatus === 'unmarked' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-medium uppercase tracking-wider">
                          <HelpCircle className="w-3 h-3 text-amber-400" /> Unmarked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Details: Course, Time, Room */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: course?.color || '#6366f1' }}
                      />
                      <span className="text-sm font-bold text-slate-100">
                        {course?.courseCode || 'Course'}
                      </span>
                      <span className="text-xs text-slate-300 truncate">
                        &bull; {course?.courseName || ''}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        {inst.startTime} &ndash; {inst.endTime}
                      </span>
                      {inst.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {inst.room}
                        </span>
                      )}
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {inst.type || 'Lecture'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action Buttons: Fast Attendance Marking */}
                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
                    <span className="text-[11px] text-slate-500 font-medium">Quick Attendance:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        title="Mark Attended"
                        onClick={() =>
                          attendanceMutation.mutate({ id: inst._id, status: 'attended' })
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                          inst.attendanceStatus === 'attended'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-800/80 hover:bg-emerald-950/80 text-emerald-400 border border-emerald-900/50'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Attended
                      </button>

                      <button
                        title="Mark Missed"
                        onClick={() =>
                          attendanceMutation.mutate({ id: inst._id, status: 'missed' })
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                          inst.attendanceStatus === 'missed'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-800/80 hover:bg-rose-950/80 text-rose-400 border border-rose-900/50'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Missed
                      </button>

                      {inst.attendanceStatus !== 'unmarked' && (
                        <button
                          title="Reset to Unmarked"
                          onClick={() =>
                            attendanceMutation.mutate({ id: inst._id, status: 'unmarked' })
                          }
                          className="p-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
