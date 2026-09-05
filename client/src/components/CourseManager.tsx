import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseApi, semesterApi } from '../api/academicApi.js';
import type { ICourse, ISemester, ISchedule, DayOfWeek } from '../types/academic.js';
import { DAYS_OF_WEEK } from '../types/academic.js';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Sparkles,
  Archive,
  RotateCcw,
  X,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { useToast } from '../context/ToastContext.js';
import { generateCourseAbbreviation, getCourseShortName } from '../utils/courseUtils.js';

interface Props {
  selectedSemesterId: string | null;
  selectedCourseId: string | null;
  onSelectCourse: (id: string | null) => void;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Purple
];

export const CourseManager: React.FC<Props> = ({
  selectedSemesterId,
  selectedCourseId,
  onSelectCourse,
}) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCourse, setEditingCourse] = useState<ICourse | null>(null);
  const [deleteConfirmCourse, setDeleteConfirmCourse] = useState<ICourse | null>(null);

  // Form State
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [credit, setCredit] = useState<number>(3.0);
  const [instructor, setInstructor] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [schedules, setSchedules] = useState<ISchedule[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Semesters
  const { data: semesters = [] } = useQuery<ISemester[]>({
    queryKey: ['semesters'],
    queryFn: () => semesterApi.getAll(),
  });

  const currentSemester = semesters.find((s) => s._id === selectedSemesterId) || null;

  // Fetch Courses for the selected semester
  const { data: courses = [], isLoading, error } = useQuery<ICourse[]>({
    queryKey: ['courses', selectedSemesterId, showArchived],
    queryFn: () =>
      selectedSemesterId
        ? courseApi.getAll(selectedSemesterId, { archived: showArchived, all: showArchived })
        : Promise.resolve([]),
    enabled: Boolean(selectedSemesterId),
  });

  // Lock background scroll when modal open
  useEffect(() => {
    if (isModalOpen || Boolean(deleteConfirmCourse)) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, deleteConfirmCourse]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<ICourse>) => courseApi.create(data),
    onSuccess: (newCourse) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setIsModalOpen(false);
      onSelectCourse(newCourse._id);
      showToast(`Course "${newCourse.courseCode}" created successfully!`, 'success');
    },
    onError: (err: Error) => {
      setFormError(err.message);
      showToast(err.message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ICourse> }) =>
      courseApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      setIsModalOpen(false);
      showToast('Course updated successfully!', 'success');
    },
    onError: (err: Error) => {
      setFormError(err.message);
      showToast(err.message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => courseApi.delete(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      setDeleteConfirmCourse(null);
      if (selectedCourseId === deleteConfirmCourse?._id) {
        onSelectCourse(null);
      }
      if (result.archived) {
        showToast('Course has historical class occurrences and was safely archived.', 'info');
      } else {
        showToast('Course deleted successfully.', 'success');
      }
    },
    onError: (err: Error) => showToast(`Error removing course: ${err.message}`, 'error'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => courseApi.update(id, { isArchived: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      showToast('Course restored successfully!', 'success');
    },
    onError: (err: Error) => showToast(`Error restoring: ${err.message}`, 'error'),
  });

  const openCreateModal = () => {
    setEditingCourse(null);
    setCourseCode('');
    setCourseName('');
    setCredit(3.0);
    setInstructor('');
    setDescription('');
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setSchedules([
      {
        dayOfWeek: 'Sunday',
        startTime: '10:00',
        endTime: '11:30',
        room: '',
        type: 'Lecture',
      },
    ]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (course: ICourse) => {
    setEditingCourse(course);
    setCourseCode(course.courseCode);
    setCourseName(course.courseName);
    setCredit(course.credit || 3.0);
    setInstructor(course.instructor || '');
    setDescription(course.description || '');
    setColor(course.color || '#6366f1');
    setSchedules(course.schedules ? JSON.parse(JSON.stringify(course.schedules)) : []);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Schedule slot management inside modal
  const handleAddScheduleSlot = () => {
    setSchedules([
      ...schedules,
      {
        dayOfWeek: 'Tuesday',
        startTime: '10:00',
        endTime: '11:30',
        room: '',
        type: 'Lecture',
      },
    ]);
  };

  const handleUpdateScheduleSlot = (index: number, field: keyof ISchedule, value: any) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  const handleRemoveScheduleSlot = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSemesterId) {
      setFormError('Please select a semester first.');
      return;
    }
    if (!courseName.trim()) {
      setFormError('Course name is required (e.g. Object Oriented Programming)');
      return;
    }

    // Auto-generate courseCode from courseName if left blank by student
    const finalCode = courseCode.trim() 
      ? courseCode.trim().toUpperCase() 
      : generateCourseAbbreviation(courseName.trim());

    const finalCredit = isNaN(Number(credit)) || Number(credit) < 0 ? 3.0 : Number(credit);

    // Validate schedules if any
    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      if (!s.startTime || !s.endTime) {
        setFormError(`Schedule slot #${i + 1} requires both start and end times.`);
        return;
      }
      if (s.startTime >= s.endTime) {
        setFormError(`Schedule slot #${i + 1}: End time (${s.endTime}) must be later than start time (${s.startTime}).`);
        return;
      }
    }

    const payload: Partial<ICourse> = {
      courseCode: finalCode,
      courseName: courseName.trim(),
      credit: finalCredit,
      instructor: instructor.trim(),
      description: description.trim(),
      color,
      semesterId: selectedSemesterId,
      schedules,
    };

    if (editingCourse) {
      updateMutation.mutate({ id: editingCourse._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!selectedSemesterId) {
    return (
      <div className="p-8 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
        <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-sm font-semibold text-slate-300">No Semester Selected</p>
        <p className="text-xs text-slate-500">
          Please select a semester above to view and add courses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">
              Courses for {currentSemester?.name || 'Selected Semester'}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Add your subjects and configure their weekly recurring class schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
              showArchived
                ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>

          <button
            id="add-course-btn"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Course
          </button>
        </div>
      </div>

      {/* Loading / Error States */}
      {isLoading && (
        <div className="p-8 text-center text-slate-500 text-xs animate-pulse">
          Loading courses...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
          Failed to load courses: {(error as Error).message}
        </div>
      )}

      {/* Course Cards Grid */}
      {!isLoading && !error && courses.length === 0 && (
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No Courses in {currentSemester?.name}</p>
          <p className="text-xs text-slate-500">
            {showArchived ? 'No archived courses.' : 'Click "Add Course" to register your first subject and weekly class times.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {courses.map((course) => {
          const isSelected = selectedCourseId === course._id;
          const scheduleCount = course.schedules?.length || 0;

          return (
            <div
              key={course._id}
              onClick={() => onSelectCourse(course._id)}
              className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 cursor-pointer ${
                course.isArchived
                  ? 'bg-slate-950/60 border-slate-800/80 opacity-70'
                  : isSelected
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: course.color || '#6366f1' }}
                    />
                    <span className="font-bold text-slate-100 text-sm">{getCourseShortName(course)}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                      {course.credit} Cr
                    </span>
                    {course.isArchived && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300">
                        Archived
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold text-slate-200 truncate">
                    {course.courseName}
                  </h3>
                  {course.instructor && (
                    <p className="text-[11px] text-slate-400 truncate">
                      Instructor: {course.instructor}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {course.isArchived ? (
                    <button
                      title="Restore Course"
                      onClick={() => restoreMutation.mutate(course._id)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-300 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <>
                      <button
                        title="Edit Course & Schedules"
                        onClick={() => openEditModal(course)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Remove / Archive Course"
                        onClick={() => setDeleteConfirmCourse(course)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Weekly Schedules Preview */}
              <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 text-[11px]">
                <div className="flex items-center justify-between text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    Weekly Schedule ({scheduleCount})
                  </span>
                  <span className="text-indigo-400 text-[10px]">
                    {isSelected ? 'Active Selection' : 'Click to inspect'}
                  </span>
                </div>

                {scheduleCount === 0 ? (
                  <p className="text-slate-500 text-[10px] italic">No weekly schedule configured yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {course.schedules.map((sch, i) => (
                      <span
                        key={sch._id || i}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300"
                      >
                        <span className="font-semibold text-slate-200">{sch.dayOfWeek.slice(0, 3)}</span>
                        <span>{sch.startTime}&ndash;{sch.endTime}</span>
                        {sch.room && <span className="text-slate-400">({sch.room})</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Course Modal (Scrollable with Unified Weekly Schedule Configuration) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  {editingCourse ? 'Edit Course & Weekly Schedule' : `Add Course to ${currentSemester?.name}`}
                </h3>
                <p className="text-xs text-slate-400">
                  Enter course details and configure its recurring weekly class schedule slots.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <form id="course-form" onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              {/* Course Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 dark:text-slate-300">Course Name *</label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Object Oriented Programming, Differentiation Equation and laplace Transform"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition"
                  required
                />
              </div>

              {/* Course Code & Credits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Course Code <span className="text-[10px] text-slate-500 font-normal">(Optional)</span></label>
                    {courseName.trim() && !courseCode.trim() && (
                      <span className="text-[10px] text-indigo-400 font-medium">
                        Auto-abbr: {generateCourseAbbreviation(courseName)}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                    placeholder={courseName.trim() ? `Auto: ${generateCourseAbbreviation(courseName)}` : 'e.g. CSE 221, OOP'}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 uppercase font-mono transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Credits <span className="text-[10px] text-slate-500 font-normal">(Default 3.0)</span></label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="30"
                    value={credit}
                    onChange={(e) => setCredit(Number(e.target.value))}
                    placeholder="3.0"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Instructor */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Instructor (Optional)</label>
                <input
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="e.g. Dr. John Doe, Prof. Smith"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition"
                />
              </div>

              {/* Color Accent Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Course Tag Color</label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition cursor-pointer ${
                        color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Weekly Recurring Schedules Section */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Weekly Recurring Schedules
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Specify the weekly recurring time blocks for this course (e.g. Sunday 10:00 &ndash; 11:30).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddScheduleSlot}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-950 hover:bg-indigo-900 border border-indigo-800/80 text-indigo-300 text-[11px] font-semibold transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Time Slot
                  </button>
                </div>

                {schedules.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                    No weekly schedule slots added. Click "+ Add Time Slot" above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {schedules.map((slot, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300">
                            Slot #{index + 1} &bull; {slot.dayOfWeek}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveScheduleSlot(index)}
                            className="text-slate-500 hover:text-rose-400 transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                          {/* Day */}
                          <div>
                            <label className="text-[10px] text-slate-400">Day</label>
                            <select
                              value={slot.dayOfWeek}
                              onChange={(e) =>
                                handleUpdateScheduleSlot(index, 'dayOfWeek', e.target.value as DayOfWeek)
                              }
                              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-hidden"
                            >
                              {DAYS_OF_WEEK.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Start Time */}
                          <div>
                            <label className="text-[10px] text-slate-400">Start Time</label>
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) =>
                                handleUpdateScheduleSlot(index, 'startTime', e.target.value)
                              }
                              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-hidden"
                              required
                            />
                          </div>

                          {/* End Time */}
                          <div>
                            <label className="text-[10px] text-slate-400">End Time</label>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) =>
                                handleUpdateScheduleSlot(index, 'endTime', e.target.value)
                              }
                              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-hidden"
                              required
                            />
                          </div>

                          {/* Room */}
                          <div>
                            <label className="text-[10px] text-slate-400">Room / Hall</label>
                            <input
                              type="text"
                              value={slot.room || ''}
                              onChange={(e) =>
                                handleUpdateScheduleSlot(index, 'room', e.target.value)
                              }
                              placeholder="e.g. Room 302"
                              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* Modal Footer (Always Accessible) */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="course-form"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingCourse
                  ? 'Save Changes'
                  : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Modal */}
      {deleteConfirmCourse && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800/80">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Remove Course</h3>
                <p className="text-xs text-slate-400">{deleteConfirmCourse.courseCode} &ndash; {deleteConfirmCourse.courseName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If this course already has historical class occurrences and attendance logs, it will be <strong>safely archived</strong> to guarantee no past academic attendance data is lost.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmCourse(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmCourse._id)}
                disabled={deleteMutation.isPending}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                {deleteMutation.isPending ? 'Processing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
