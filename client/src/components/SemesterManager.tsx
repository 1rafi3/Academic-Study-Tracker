import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { semesterApi } from '../api/academicApi.js';
import type { ISemester } from '../types/academic.js';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Archive,
  RotateCcw,
  Sparkles,
  CalendarRange,
  X,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  selectedSemesterId: string | null;
  onSelectSemester: (id: string | null) => void;
}

export const SemesterManager: React.FC<Props> = ({
  selectedSemesterId,
  onSelectSemester,
}) => {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<ISemester | null>(null);
  const [deleteConfirmSemester, setDeleteConfirmSemester] = useState<ISemester | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [term, setTerm] = useState<'Fall' | 'Spring' | 'Summer' | 'Winter' | 'Other'>('Fall');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Semesters
  const { data: semesters = [], isLoading, error } = useQuery<ISemester[]>({
    queryKey: ['semesters', showArchived],
    queryFn: () => semesterApi.getAll({ archived: showArchived, all: showArchived }),
  });

  // Lock background body scroll when any modal is open
  useEffect(() => {
    if (isModalOpen || Boolean(deleteConfirmSemester)) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, deleteConfirmSemester]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<ISemester>) => semesterApi.create(data),
    onSuccess: (newSem) => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      setIsModalOpen(false);
      onSelectSemester(newSem._id);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ISemester> }) =>
      semesterApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      setIsModalOpen(false);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => semesterApi.delete(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
      setDeleteConfirmSemester(null);
      if (selectedSemesterId === deleteConfirmSemester?._id) {
        onSelectSemester(null);
      }
      if (result.archived) {
        alert('Semester and its history have been safely archived.');
      }
    },
    onError: (err: Error) => alert(`Error: ${err.message}`),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => semesterApi.update(id, { isArchived: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
    },
    onError: (err: Error) => alert(`Error restoring: ${err.message}`),
  });

  const openCreateModal = () => {
    setEditingSemester(null);
    setName('');
    setYear(new Date().getFullYear());
    setTerm('Fall');
    setStartDate('');
    setEndDate('');
    setIsActive(semesters.length === 0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sem: ISemester) => {
    setEditingSemester(sem);
    setName(sem.name);
    setYear(sem.year);
    setTerm(sem.term);
    setStartDate(sem.startDate ? sem.startDate.split('T')[0] : '');
    setEndDate(sem.endDate ? sem.endDate.split('T')[0] : '');
    setIsActive(sem.isActive);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Semester name is required (e.g. 2026 Fall)');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Both start date and end date are required');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setFormError('Start date cannot be later than end date');
      return;
    }

    const payload: Partial<ISemester> = {
      name: name.trim(),
      year: Number(year),
      term,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      isActive,
    };

    if (editingSemester) {
      updateMutation.mutate({ id: editingSemester._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Semesters
          </h2>
          <p className="text-xs text-slate-400">
            Define academic terms with start and end dates. Click a semester to manage its courses.
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
            id="add-semester-btn"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Semester
          </button>
        </div>
      </div>

      {/* Loading / Error States */}
      {isLoading && (
        <div className="p-8 text-center text-slate-500 text-xs animate-pulse">
          Loading semesters...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
          Failed to load semesters: {(error as Error).message}
        </div>
      )}

      {/* Semesters Cards Grid */}
      {!isLoading && !error && semesters.length === 0 && (
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
          <CalendarRange className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No Semesters Found</p>
          <p className="text-xs text-slate-500">
            {showArchived ? 'No archived semesters.' : 'Click "Add Semester" to create your first academic term.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {semesters.map((sem) => {
          const isSelected = selectedSemesterId === sem._id;
          const sDate = sem.startDate ? new Date(sem.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
          const eDate = sem.endDate ? new Date(sem.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';

          return (
            <div
              key={sem._id}
              onClick={() => onSelectSemester(sem._id)}
              className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 cursor-pointer ${
                sem.isArchived
                  ? 'bg-slate-950/60 border-slate-800/80 opacity-70'
                  : isSelected
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-sm">{sem.name}</span>
                    {sem.isActive && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-300 text-[10px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    )}
                    {sem.isArchived && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-950 border border-amber-700/60 text-amber-300 text-[10px] font-medium">
                        <Archive className="w-3 h-3" /> Archived
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {sem.term} {sem.year}
                  </p>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {sem.isArchived ? (
                    <button
                      title="Restore Semester"
                      onClick={() => restoreMutation.mutate(sem._id)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-300 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <>
                      <button
                        title="Edit Semester"
                        onClick={() => openEditModal(sem)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Delete or Archive Semester"
                        onClick={() => setDeleteConfirmSemester(sem)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 flex items-center justify-between">
                <span>{sDate} &rarr; {eDate}</span>
                <span className="text-indigo-400 font-medium">{isSelected ? 'Selected' : 'Click to select'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Semester Modal (Fixed Scroll & Responsive) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  {editingSemester ? 'Edit Semester' : 'Add New Semester'}
                </h3>
                <p className="text-xs text-slate-400">
                  Fill in the term details and academic calendar dates.
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
            <form id="semester-form" onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Semester Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 2026 Fall, Spring 2027"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Year *</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    min={1900}
                    max={2100}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Term *</label>
                  <select
                    value={term}
                    onChange={(e) => setTerm(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition"
                  >
                    <option value="Fall">Fall</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Winter">Winter</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">End Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition"
                    required
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                  />
                  <span className="text-xs text-slate-300 font-medium">Set as Current Active Semester</span>
                </label>
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
                form="semester-form"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingSemester ? 'Save Changes' : 'Create Semester'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Dialog */}
      {deleteConfirmSemester && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800/80">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Archive or Delete Semester</h3>
                <p className="text-xs text-slate-400">{deleteConfirmSemester.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If this semester contains courses and historical attendance records, it will be <strong>safely archived</strong> to guarantee no attendance history is lost.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmSemester(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmSemester._id)}
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
