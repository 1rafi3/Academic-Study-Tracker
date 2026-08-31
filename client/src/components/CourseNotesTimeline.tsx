import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { semesterApi, courseApi, classInstanceApi } from '../api/academicApi.js';
import type { ISemester, ICourse, IClassInstance } from '../types/academic.js';
import { ClassNotesModal } from './ClassNotesModal.js';
import {
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  CheckSquare,
  FileText,
  Edit3,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface Props {
  selectedSemesterId: string | null;
  onSelectSemester: (id: string | null) => void;
  onNavigateToSetup: () => void;
  onNavigateToGenerator: () => void;
}

export const CourseNotesTimeline: React.FC<Props> = ({
  selectedSemesterId,
  onSelectSemester,
  onNavigateToSetup,
  onNavigateToGenerator,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [expandedNotesMap, setExpandedNotesMap] = useState<Record<string, boolean>>({});
  const [editingInstance, setEditingInstance] = useState<IClassInstance | null>(null);

  // Fetch Semesters
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

  // Keep semester in sync
  React.useEffect(() => {
    if (!selectedSemesterId && activeSemester) {
      onSelectSemester(activeSemester._id);
    }
  }, [selectedSemesterId, activeSemester, onSelectSemester]);

  // Fetch Courses for active semester
  const { data: courses = [], isLoading: coursesLoading } = useQuery<ICourse[]>({
    queryKey: ['courses', activeSemester?._id],
    queryFn: () =>
      activeSemester ? courseApi.getAll(activeSemester._id) : Promise.resolve([]),
    enabled: Boolean(activeSemester?._id),
  });

  // Auto-select first course if none selected
  React.useEffect(() => {
    if (courses.length > 0) {
      if (!selectedCourseId || !courses.some((c) => c._id === selectedCourseId)) {
        setSelectedCourseId(courses[0]._id);
      }
    } else {
      setSelectedCourseId(null);
    }
  }, [courses, selectedCourseId]);

  const currentCourse = courses.find((c) => c._id === selectedCourseId) || null;

  // Fetch all class instances for the selected course (sorted chronologically by date/time ascending)
  const {
    data: classInstances = [],
    isLoading: instancesLoading,
  } = useQuery<IClassInstance[]>({
    queryKey: ['class-instances', 'timeline', selectedCourseId],
    queryFn: () =>
      selectedCourseId
        ? classInstanceApi.getAll({ courseId: selectedCourseId })
        : Promise.resolve([]),
    enabled: Boolean(selectedCourseId),
  });

  // Toggle expand / collapse for longer notes
  const toggleExpand = (id: string) => {
    setExpandedNotesMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Metrics for current course notes
  const stats = useMemo(() => {
    let total = classInstances.length;
    let notesCount = 0;
    let homeworkCount = 0;

    for (const cls of classInstances) {
      if (cls.topic || cls.notes) notesCount++;
      if (cls.hasHomework) homeworkCount++;
    }

    return { total, notesCount, homeworkCount };
  }, [classInstances]);

  // Zero State: No Semesters
  if (semesters.length === 0) {
    return (
      <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
        <BookOpen className="w-12 h-12 text-indigo-400 mx-auto" />
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-100">No Semesters Found</h2>
          <p className="text-xs text-slate-400">
            Create a semester and add courses to start recording lecture notes and study summaries.
          </p>
        </div>
        <button
          onClick={onNavigateToSetup}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Set Up Semester & Courses
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Filter Bar: Semester & Course Switcher */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Semester Selector */}
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
            <select
              value={activeSemester?._id || ''}
              onChange={(e) => {
                onSelectSemester(e.target.value || null);
                setSelectedCourseId(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
            >
              {semesters.map((sem) => (
                <option key={sem._id} value={sem._id}>
                  {sem.name} {sem.isActive ? '• Active' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Course Selector Tabs/Dropdown */}
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
            <select
              value={selectedCourseId || ''}
              onChange={(e) => setSelectedCourseId(e.target.value || null)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.courseCode} &ndash; {c.courseName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Stats Pill */}
        {currentCourse && (
          <div className="flex items-center gap-3 text-xs px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 font-medium">
              Lectures: <strong className="text-slate-200">{stats.total}</strong>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-indigo-400 font-medium">
              Notes: <strong>{stats.notesCount}</strong> / {stats.total}
            </span>
            {stats.homeworkCount > 0 && (
              <>
                <span className="text-slate-600">&bull;</span>
                <span className="text-amber-400 font-medium">
                  Homework: <strong>{stats.homeworkCount}</strong>
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {coursesLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs animate-pulse">
          Loading courses and study timeline...
        </div>
      ) : courses.length === 0 ? (
        <div className="p-10 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No Courses in {activeSemester?.name}</p>
          <p className="text-xs text-slate-500">
            Add your subjects in Academic Setup to begin recording lecture topics and exam study notes.
          </p>
          <button
            onClick={onNavigateToSetup}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
          >
            Add First Course
          </button>
        </div>
      ) : instancesLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs animate-pulse">
          Loading lecture timeline for {currentCourse?.courseCode}...
        </div>
      ) : classInstances.length === 0 ? (
        <div className="p-10 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-3">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">
            No Generated Classes for {currentCourse?.courseCode}
          </p>
          <p className="text-xs text-slate-500">
            Generate class occurrences from your weekly recurring schedule to track lectures and study notes.
          </p>
          <button
            onClick={onNavigateToGenerator}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Generate Classes
          </button>
        </div>
      ) : (
        /* Chronological Lecture Review Timeline */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: currentCourse?.color || '#6366f1' }}
                />
                <h2 className="text-base font-bold text-slate-100">
                  {currentCourse?.courseCode} &ndash; {currentCourse?.courseName}
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Chronological lecture syllabus & study notes timeline. Review before tests and exams.
              </p>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Oldest &rarr; Newest
            </span>
          </div>

          {/* Timeline List */}
          <div className="space-y-3 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-800">
            {classInstances.map((cls, index) => {
              const hasNotes = Boolean(cls.topic || cls.notes);
              const isExpanded = Boolean(expandedNotesMap[cls._id]);

              return (
                <div
                  key={cls._id}
                  className="relative pl-12 transition group"
                >
                  {/* Timeline Dot Indicator */}
                  <div
                    className={`absolute left-4.5 top-4 w-3.5 h-3.5 rounded-full border-2 transition -translate-x-1/2 ${
                      hasNotes
                        ? 'bg-indigo-600 border-slate-900 ring-2 ring-indigo-500/50'
                        : 'bg-slate-800 border-slate-950'
                    }`}
                  />

                  {/* Lecture Card */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-md hover:border-slate-700 transition space-y-3">
                    {/* Header Row: Lecture Index, Date, Time, Attendance, Edit Action */}
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/70 pb-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-950 border border-indigo-700/60 text-indigo-300 text-[11px] font-bold">
                            Lecture #{index + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-200">
                            {cls.dateString} ({cls.dayOfWeek})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {cls.startTime} &ndash; {cls.endTime}
                          </span>
                          {cls.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {cls.room}
                            </span>
                          )}
                          <span className="text-slate-500">&bull;</span>
                          <span
                            className={`font-semibold ${
                              cls.attendanceStatus === 'attended'
                                ? 'text-emerald-400'
                                : cls.attendanceStatus === 'missed'
                                ? 'text-rose-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {cls.attendanceStatus.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Edit / Add Notes Action Button */}
                      <button
                        onClick={() => setEditingInstance(cls)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          hasNotes
                            ? 'bg-slate-800 hover:bg-slate-700 text-indigo-300'
                            : 'bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-xs'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {hasNotes ? 'Edit Notes' : 'Add Notes'}
                      </button>
                    </div>

                    {/* Topic & Notes Content */}
                    {hasNotes ? (
                      <div className="space-y-2 text-xs">
                        {/* Topic Headline */}
                        {cls.topic && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                              Topic:
                            </span>
                            <span className="font-bold text-slate-100 text-sm">
                              {cls.topic}
                            </span>
                          </div>
                        )}

                        {/* Lecture Notes Content */}
                        {cls.notes && (
                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-slate-300 text-xs leading-relaxed font-sans space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold border-b border-slate-900 pb-1.5">
                              <span className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                Study Notes & Takeaways
                              </span>
                              {cls.notes.length > 200 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(cls._id)}
                                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <>
                                      Collapse <ChevronUp className="w-3 h-3" />
                                    </>
                                  ) : (
                                    <>
                                      Expand <ChevronDown className="w-3 h-3" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>

                            <p className={`whitespace-pre-wrap ${!isExpanded && cls.notes.length > 200 ? 'line-clamp-3' : ''}`}>
                              {cls.notes}
                            </p>
                          </div>
                        )}

                        {/* Homework Callout if present */}
                        {cls.hasHomework && (
                          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs space-y-1">
                            <span className="font-bold text-amber-300 flex items-center gap-1.5">
                              <CheckSquare className="w-3.5 h-3.5" />
                              Homework Assigned
                            </span>
                            {cls.homeworkDetails && (
                              <p className="text-amber-200/90 whitespace-pre-wrap pl-5 text-[11px]">
                                {cls.homeworkDetails}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Zero Notes State for this Lecture */
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-dashed border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                        <span>No lecture topic or notes recorded for this class yet.</span>
                        <button
                          onClick={() => setEditingInstance(cls)}
                          className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                        >
                          + Record what was taught
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Class Notes Modal */}
      <ClassNotesModal
        instance={editingInstance}
        isOpen={Boolean(editingInstance)}
        onClose={() => setEditingInstance(null)}
      />
    </div>
  );
};
