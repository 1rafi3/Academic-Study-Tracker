import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseApi } from '../api/academicApi.js';
import type { ICourse } from '../types/academic.js';
import { BookOpen, Plus, Trash2, Edit2, Clock, AlertCircle, X, User } from 'lucide-react';

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
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#f43f5e', // Rose
];

export const CourseManager: React.FC<Props> = ({
  selectedSemesterId,
  selectedCourseId,
  onSelectCourse,
}) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<ICourse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [credit, setCredit] = useState(3.0);
  const [instructor, setInstructor] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');

  const { data: courses = [], isLoading, error } = useQuery<ICourse[]>({
    queryKey: ['courses', selectedSemesterId],
    queryFn: () => (selectedSemesterId ? courseApi.getAll(selectedSemesterId) : Promise.resolve([])),
    enabled: Boolean(selectedSemesterId),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ICourse>) => courseApi.create(data),
    onSuccess: (newCourse) => {
      queryClient.invalidateQueries({ queryKey: ['courses', selectedSemesterId] });
      closeModal();
      if (!selectedCourseId) {
        onSelectCourse(newCourse._id);
      }
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ICourse> }) =>
      courseApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', selectedSemesterId] });
      closeModal();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => courseApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['courses', selectedSemesterId] });
      if (selectedCourseId === deletedId) {
        onSelectCourse(null);
      }
    },
    onError: (err: Error) => alert(`Error deleting course: ${err.message}`),
  });

  const openCreateModal = () => {
    setEditingCourse(null);
    setCourseCode('CSE 221');
    setCourseName('Object Oriented Programming');
    setCredit(3.0);
    setInstructor('Dr. Smith');
    setDescription('');
    setColor('#6366f1');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: ICourse) => {
    setEditingCourse(c);
    setCourseCode(c.courseCode);
    setCourseName(c.courseName);
    setCredit(c.credit);
    setInstructor(c.instructor || '');
    setDescription(c.description || '');
    setColor(c.color || '#6366f1');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSemesterId) {
      setFormError('Please select a semester first.');
      return;
    }
    if (!courseCode.trim()) {
      setFormError('Course code is required (e.g. CSE 221)');
      return;
    }
    if (!courseName.trim()) {
      setFormError('Course name is required');
      return;
    }

    const payload = {
      courseCode: courseCode.trim().toUpperCase(),
      courseName: courseName.trim(),
      credit: Number(credit),
      instructor: instructor.trim(),
      description: description.trim(),
      color,
      semesterId: selectedSemesterId,
    };

    if (editingCourse) {
      updateMutation.mutate({ id: editingCourse._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!selectedSemesterId) {
    return (
      <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
        <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-sm font-medium text-slate-300">Select a Semester</p>
        <p className="text-xs text-slate-500">Please choose a semester above to view and manage its courses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Courses in Selected Semester
          </h2>
          <p className="text-xs text-slate-400">
            Manage academic subjects, credit weights, and configure weekly recurring class slots.
          </p>
        </div>
        <button
          id="add-course-btn"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Course
        </button>
      </div>

      {/* Courses List */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-400 text-sm animate-pulse">Loading courses...</div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          {(error as Error).message}
        </div>
      ) : courses.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-300">No courses in this semester yet</p>
          <p className="text-xs text-slate-500">Add your first course (e.g. CSE 221 Object Oriented Programming).</p>
          <button
            onClick={openCreateModal}
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add First Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {courses.map((c) => {
            const isSelected = selectedCourseId === c._id;
            return (
              <div
                key={c._id}
                onClick={() => onSelectCourse(c._id)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between relative group ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: c.color || '#6366f1' }}
                      />
                      <h3 className="text-sm font-bold text-slate-100">{c.courseCode}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
                      {c.credit} Credits
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1">{c.courseName}</h4>
                  {c.instructor && (
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {c.instructor}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {c.schedules?.length || 0} weekly class schedule slot{c.schedules?.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 mt-3">
                  <span className={`text-[11px] font-medium ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`}>
                    {isSelected ? 'Viewing Schedule' : 'Manage Schedule'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      title="Edit Course"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(c);
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      title="Delete Course"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete course "${c.courseCode} - ${c.courseName}"?`)) {
                          deleteMutation.mutate(c._id);
                        }
                      }}
                      className="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE 221"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 uppercase focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Credits *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="30"
                    required
                    value={credit}
                    onChange={(e) => setCredit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Course Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Object Oriented Programming"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Instructor</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. John Doe"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Color Theme</label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition cursor-pointer ${
                        color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes regarding grading, prerequisites, or room location..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-course-btn"
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingCourse
                    ? 'Save Changes'
                    : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
