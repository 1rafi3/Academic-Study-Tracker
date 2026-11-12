import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  semesterApi,
  courseApi,
  academicEventApi,
  assessmentStructureApi,
  classInstanceApi,
} from '../api/academicApi.js';
import type { ICourse, ISemester } from '../types/academic.js';
import { CourseSelector } from './hub/CourseSelector.js';
import { CourseOverview } from './hub/CourseOverview.js';
import { EventsExplorer } from './hub/EventsExplorer.js';
import { AssessmentStructure } from './hub/AssessmentStructure.js';
import { AcademicEventModal } from './AcademicEventModal.js';
import {
  BookOpen,
  Calendar,
  Layers,
  Plus,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface CourseAcademicHubProps {
  selectedSemesterId: string | null;
  onSelectSemester: (semesterId: string | null) => void;
  onNavigateToSetup?: () => void;
}

type HubSubTab = 'overview' | 'events' | 'assessment';

const LAST_HUB_COURSE_KEY = 'academic_tracker_hub_selected_course_id';

export const CourseAcademicHub: React.FC<CourseAcademicHubProps> = ({
  selectedSemesterId,
  onSelectSemester,
  onNavigateToSetup,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<HubSubTab>('overview');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_HUB_COURSE_KEY);
    } catch {
      return null;
    }
  });

  // Modal for creating academic events
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);

  // Fetch Semesters
  const { data: semesters = [] } = useQuery<ISemester[]>({
    queryKey: ['semesters'],
    queryFn: () => semesterApi.getAll({ all: true }),
  });

  // Active / selected semester
  const activeSemester = useMemo(() => {
    if (selectedSemesterId) {
      return semesters.find((s) => s._id === selectedSemesterId) || null;
    }
    return semesters.find((s) => s.isActive) || semesters[0] || null;
  }, [semesters, selectedSemesterId]);

  // Sync selectedSemesterId if none selected initially
  useEffect(() => {
    if (!selectedSemesterId && activeSemester) {
      onSelectSemester(activeSemester._id);
    }
  }, [selectedSemesterId, activeSemester, onSelectSemester]);

  // Fetch Courses for the active semester
  const { data: courses = [], isLoading: isCoursesLoading } = useQuery<ICourse[]>({
    queryKey: ['courses', activeSemester?._id],
    queryFn: () => courseApi.getAll(activeSemester?._id),
    enabled: Boolean(activeSemester?._id),
  });

  // Keep selected course valid
  useEffect(() => {
    if (courses.length > 0) {
      if (!selectedCourseId || !courses.some((c) => c._id === selectedCourseId)) {
        const nextId = courses[0]._id;
        setSelectedCourseId(nextId);
        try {
          localStorage.setItem(LAST_HUB_COURSE_KEY, nextId);
        } catch {
          // Ignore storage errors
        }
      }
    } else {
      setSelectedCourseId(null);
    }
  }, [courses, selectedCourseId]);

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    try {
      localStorage.setItem(LAST_HUB_COURSE_KEY, courseId);
    } catch {
      // Ignore storage errors
    }
  };

  const selectedCourse = useMemo(() => {
    return courses.find((c) => c._id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  // Fetch all academic events for this course
  const { data: events = [], isLoading: isEventsLoading } = useQuery({
    queryKey: ['hub-events', selectedCourseId],
    queryFn: () =>
      academicEventApi.getAll({
        courseId: selectedCourseId || undefined,
        semesterId: activeSemester?._id,
      }),
    enabled: Boolean(selectedCourseId && activeSemester?._id),
  });

  // Fetch Assessment Structure for this course
  const { data: assessmentStructure } = useQuery({
    queryKey: ['assessment-structure', selectedCourseId],
    queryFn: () => assessmentStructureApi.get(selectedCourseId!),
    enabled: Boolean(selectedCourseId),
  });

  // Fetch Class Instances for Attendance preview
  const { data: classInstances = [] } = useQuery({
    queryKey: ['class-instances', activeSemester?._id, selectedCourseId],
    queryFn: () =>
      classInstanceApi.getAll({
        semesterId: activeSemester?._id,
        courseId: selectedCourseId || undefined,
      }),
    enabled: Boolean(activeSemester?._id && selectedCourseId),
  });

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header & Course Selector Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                <BookOpen className="w-4 h-4" />
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Course Academic Hub
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 text-[10px] font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Live Explorer
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Course events, test results, personal performance notes, and custom assessment structure.
            </p>
          </div>

          {/* Semester Selector Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400">Semester:</span>
            <select
              value={activeSemester?._id || ''}
              onChange={(e) => onSelectSemester(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
            >
              {semesters.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} {s.year} {s.isActive ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Course Search & Select Box */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
            Select Course to Explore
          </label>
          <CourseSelector
            courses={courses}
            semesters={semesters}
            selectedCourseId={selectedCourseId}
            onSelectCourse={handleSelectCourse}
            isLoading={isCoursesLoading}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {courses.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">
            No courses found in this semester
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Add courses and schedule routines to begin tracking assessments, CTs, and personal notes.
          </p>
          {onNavigateToSetup && (
            <button
              type="button"
              onClick={onNavigateToSetup}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Go to Academic Setup
            </button>
          )}
        </div>
      ) : selectedCourse ? (
        <div className="space-y-5">
          {/* Sub-Tab Navigation Bar */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSubTab('overview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeSubTab === 'overview'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Course Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('events')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeSubTab === 'events'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Events Explorer ({events.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('assessment')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeSubTab === 'assessment'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Assessment Structure
              </button>
            </div>

            {/* Quick Action: New Academic Event for this course */}
            <button
              type="button"
              onClick={() => setIsCreateEventModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Event
            </button>
          </div>

          {/* Sub-Tab 1: Course Overview */}
          {activeSubTab === 'overview' && (
            <CourseOverview
              course={selectedCourse}
              semester={activeSemester || undefined}
              events={events}
              assessmentStructure={assessmentStructure}
              classInstances={classInstances}
              onNavigateTab={setActiveSubTab}
              onOpenCreateModal={() => setIsCreateEventModalOpen(true)}
            />
          )}

          {/* Sub-Tab 2: Events Explorer */}
          {activeSubTab === 'events' && (
            <EventsExplorer
              course={selectedCourse}
              events={events}
              isLoading={isEventsLoading}
              onOpenCreateModal={() => setIsCreateEventModalOpen(true)}
            />
          )}

          {/* Sub-Tab 3: Assessment Structure */}
          {activeSubTab === 'assessment' && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <AssessmentStructure
                courseId={selectedCourse._id}
                courseName={selectedCourse.courseName}
              />
            </div>
          )}
        </div>
      ) : null}

      {/* Academic Event Creation Modal */}
      {isCreateEventModalOpen && activeSemester && (
        <AcademicEventModal
          event={null}
          isOpen={isCreateEventModalOpen}
          onClose={() => setIsCreateEventModalOpen(false)}
          defaultDate={todayStr}
          semesterId={activeSemester._id}
          courses={courses}
        />
      )}
    </div>
  );
};
