import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentStructureApi } from '../../api/academicApi.js';
import type { IAssessmentComponent } from '../../types/academic.js';
import { AssessmentComponentDialog } from './AssessmentComponentDialog.js';
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  GripVertical,
} from 'lucide-react';

interface AssessmentStructureProps {
  courseId: string;
  courseName: string;
}

export const AssessmentStructure: React.FC<AssessmentStructureProps> = ({ courseId, courseName }) => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<IAssessmentComponent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: structure, isLoading } = useQuery({
    queryKey: ['assessment-structure', courseId],
    queryFn: () => assessmentStructureApi.get(courseId),
    enabled: Boolean(courseId),
  });

  const deleteMutation = useMutation({
    mutationFn: (componentId: string) => assessmentStructureApi.deleteComponent(courseId, componentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-structure', courseId] });
      setDeletingId(null);
    },
  });

  const components = structure?.components || [];
  const totalAllocated = components.reduce((sum, c) => sum + c.allocatedMarks, 0);
  const isOver100 = totalAllocated > 100;
  const isExactly100 = Math.abs(totalAllocated - 100) < 0.01;

  const handleAdd = () => {
    setEditingComponent(null);
    setDialogOpen(true);
  };

  const handleEdit = (comp: IAssessmentComponent) => {
    setEditingComponent(comp);
    setDialogOpen(true);
  };

  const handleDelete = (compId: string) => {
    if (deletingId === compId) {
      deleteMutation.mutate(compId);
    } else {
      setDeletingId(compId);
      // Auto-cancel confirmation after 3s
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assessment Structure</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure marks distribution for <span className="font-medium text-slate-700 dark:text-slate-300">{courseName}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Component
        </button>
      </div>

      {/* Total marks indicator */}
      {components.length > 0 && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${
          isOver100
            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
            : isExactly100
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
        }`}>
          {isOver100 ? (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          ) : isExactly100 ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>
            Total allocated: <strong>{totalAllocated}</strong> marks
            {isOver100 && ' — exceeds 100!'}
            {isExactly100 && ' — perfect distribution'}
            {!isOver100 && !isExactly100 && ` — ${(100 - totalAllocated).toFixed(1)} remaining to 100`}
          </span>
        </div>
      )}

      {/* Components list */}
      {components.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Plus className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">No assessment components yet.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add components like CT-1, Midterm, Final Exam…</p>
          <button
            type="button"
            onClick={handleAdd}
            className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            + Add your first component
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Component</span>
            <span className="text-right">Marks</span>
            <span className="text-right w-14">Actions</span>
          </div>

          {components.map((comp) => (
            <div
              key={comp._id}
              className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-slate-400" />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate block">{comp.name}</span>
                  {comp.isOptional && (
                    <span className="text-[10px] text-amber-500 dark:text-amber-400">Optional / Bonus</span>
                  )}
                </div>
              </div>

              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums text-right">
                {comp.allocatedMarks}
              </span>

              <div className="flex items-center gap-1 justify-end">
                <button
                  type="button"
                  onClick={() => handleEdit(comp)}
                  className="p-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                  title="Edit component"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => comp._id && handleDelete(comp._id)}
                  disabled={deleteMutation.isPending && deletingId === comp._id}
                  className={`p-1 rounded-lg transition cursor-pointer ${
                    deletingId === comp._id
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400'
                  }`}
                  title={deletingId === comp._id ? 'Click again to confirm delete' : 'Delete component'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Total row */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total</span>
            <span className={`text-sm font-bold tabular-nums text-right ${isOver100 ? 'text-red-600 dark:text-red-400' : isExactly100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
              {totalAllocated}
            </span>
            <span className="w-14" />
          </div>
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <AssessmentComponentDialog
          courseId={courseId}
          existingComponent={editingComponent}
          onClose={() => { setDialogOpen(false); setEditingComponent(null); }}
          onSuccess={() => { setDialogOpen(false); setEditingComponent(null); }}
        />
      )}
    </div>
  );
};

