import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { semesterApi } from '../api/academicApi.js';
import type { ISemester } from '../types/academic.js';
import { Plus, Calendar, CheckCircle, Trash2, Edit2, AlertCircle, X } from 'lucide-react';

interface Props {
  selectedSemesterId: string | null;
  onSelectSemester: (id: string | null) => void;
}

export const SemesterManager: React.FC<Props> = ({ selectedSemesterId, onSelectSemester }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<ISemester | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState<'Fall' | 'Spring' | 'Summer' | 'Winter' | 'Other'>('Fall');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(false);

  const { data: semesters = [], isLoading, error } = useQuery<ISemester[]>({
    queryKey: ['semesters'],
    queryFn: () => semesterApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ISemester>) => semesterApi.create(data),
    onSuccess: (newSemester) => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      closeModal();
      if (!selectedSemesterId) {
        onSelectSemester(newSemester._id);
      }
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ISemester> }) =>
      semesterApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      closeModal();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => semesterApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      if (selectedSemesterId === deletedId) {
        onSelectSemester(null);
      }
    },
    onError: (err: Error) => alert(`Error deleting semester: ${err.message}`),
  });

  const openCreateModal = () => {
    setEditingSemester(null);
    setName('2026 Fall');
    setYear(2026);
    setTerm('Fall');
    setStartDate('2026-09-01');
    setEndDate('2026-12-20');
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sem: ISemester) => {
    setEditingSemester(sem);
    setName(sem.name);
    setYear(sem.year);
    setTerm(sem.term);
    setStartDate(sem.startDate ? sem.startDate.substring(0, 10) : '');
    setEndDate(sem.endDate ? sem.endDate.substring(0, 10) : '');
    setIsActive(sem.isActive);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSemester(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Semester name is required');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Both start and end dates are required');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setFormError('Start date cannot be after end date');
      return;
    }

    const payload = {
      name: name.trim(),
      year: Number(year),
      term,
      startDate,
      endDate,
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Academic Semesters
          </h2>
          <p className="text-xs text-slate-400">
            Define terms, date ranges, and select your active academic period.
          </p>
        </div>
        <button
          id="add-semester-btn"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Semester
        </button>
      </div>

      {/* Semester List */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-400 text-sm animate-pulse">Loading semesters...</div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          {(error as Error).message}
        </div>
      ) : semesters.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-2">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-300">No semesters found</p>
          <p className="text-xs text-slate-500">Create your first semester to begin managing courses and schedules.</p>
          <button
            onClick={openCreateModal}
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Create Initial Semester
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {semesters.map((sem) => {
            const isSelected = selectedSemesterId === sem._id;
            return (
              <div
                key={sem._id}
                onClick={() => onSelectSemester(sem._id)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between relative group ${
                  isSelected
                    ? 'bg-indigo-950/30 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-100 tracking-tight">{sem.name}</h3>
                    {sem.isActive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-[10px] font-semibold uppercase tracking-wider">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {sem.term} &bull; {sem.year}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2">
                    {new Date(sem.startDate).toLocaleDateString()} &rarr;{' '}
                    {new Date(sem.endDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 mt-3">
                  <span className={`text-[11px] font-medium ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`}>
                    {isSelected ? 'Selected' : 'Click to select'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      title="Edit Semester"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(sem);
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      title="Delete Semester"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete semester "${sem.name}"?`)) {
                          deleteMutation.mutate(sem._id);
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
                {editingSemester ? 'Edit Semester' : 'Add New Semester'}
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
              <div>
                <label className="block text-slate-300 font-medium mb-1">Semester Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Fall"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Year *</label>
                  <input
                    type="number"
                    required
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Term *</label>
                  <select
                    value={term}
                    onChange={(e) => setTerm(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="Fall">Fall</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Winter">Winter</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="isActiveCheck" className="text-slate-300 cursor-pointer">
                  Set as Active Semester
                </label>
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
                  id="save-semester-btn"
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingSemester
                    ? 'Save Changes'
                    : 'Create Semester'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
