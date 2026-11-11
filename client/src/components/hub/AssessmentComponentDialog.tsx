import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentStructureApi } from '../../api/academicApi.js';
import type { IAssessmentComponent } from '../../types/academic.js';
import { X } from 'lucide-react';

const PRESET_NAMES = [
  'Attendance',
  'Class Test-1',
  'Class Test-2',
  'Backup CT',
  'Quiz',
  'Assignment',
  'Lab Performance',
  'Presentation',
  'Midterm',
  'Final Examination',
  'Project Submission',
  'Viva',
  'Lab Test',
  'Lab Report',
];

interface AssessmentComponentDialogProps {
  courseId: string;
  existingComponent?: IAssessmentComponent | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssessmentComponentDialog: React.FC<AssessmentComponentDialogProps> = ({
  courseId,
  existingComponent,
  onClose,
  onSuccess,
}) => {
  const qc = useQueryClient();
  const isEditing = Boolean(existingComponent?._id);

  const [name, setName] = useState(existingComponent?.name || '');
  const [allocatedMarks, setAllocatedMarks] = useState(
    existingComponent?.allocatedMarks !== undefined ? String(existingComponent.allocatedMarks) : ''
  );
  const [isOptional, setIsOptional] = useState(existingComponent?.isOptional || false);
  const [error, setError] = useState('');

  const addMutation = useMutation({
    mutationFn: (data: { name: string; allocatedMarks: number; isOptional: boolean }) =>
      assessmentStructureApi.addComponent(courseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-structure', courseId] });
      onSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; allocatedMarks?: number; isOptional?: boolean }) =>
      assessmentStructureApi.updateComponent(courseId, existingComponent!._id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-structure', courseId] });
      onSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  const isLoading = addMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Component name is required'); return; }
    const marks = parseFloat(allocatedMarks);
    if (isNaN(marks) || marks < 0) { setError('Allocated marks must be a non-negative number'); return; }

    if (isEditing) {
      updateMutation.mutate({ name: trimmedName, allocatedMarks: marks, isOptional });
    } else {
      addMutation.mutate({ name: trimmedName, allocatedMarks: marks, isOptional });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {isEditing ? 'Edit Component' : 'Add Assessment Component'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Component Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Class Test-1, Final Examination"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition"
            />
            {/* Presets */}
            <div className="flex flex-wrap gap-1 mt-2">
              {PRESET_NAMES.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Allocated Marks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Allocated Marks *</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={allocatedMarks}
              onChange={e => setAllocatedMarks(e.target.value)}
              placeholder="e.g., 20"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition"
            />
          </div>

          {/* Optional toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isOptional}
              onChange={e => setIsOptional(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">Mark as optional / bonus component</span>
          </label>

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Saving…' : isEditing ? 'Update' : 'Add Component'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

