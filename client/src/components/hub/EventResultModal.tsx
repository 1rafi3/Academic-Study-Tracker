import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { academicEventApi } from '../../api/academicApi.js';
import type { IAcademicEvent } from '../../types/academic.js';
import {
  Award,
  CheckCircle2,
  FileText,
  Info,
  Save,
  Trash2,
  X,
} from 'lucide-react';

interface EventResultModalProps {
  event: IAcademicEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EventResultModal: React.FC<EventResultModalProps> = ({
  event,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [obtainedMarks, setObtainedMarks] = useState<string>('');
  const [fullMarks, setFullMarks] = useState<string>('');
  const [personalNotes, setPersonalNotes] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state whenever event changes or modal opens
  useEffect(() => {
    if (event) {
      setObtainedMarks(
        event.obtainedMarks !== undefined && event.obtainedMarks !== null
          ? String(event.obtainedMarks)
          : ''
      );
      setFullMarks(
        event.fullMarks !== undefined && event.fullMarks !== null
          ? String(event.fullMarks)
          : ''
      );
      setPersonalNotes(event.personalNotes || '');
      setIsCompleted(Boolean(event.isCompleted));
      setValidationError(null);
    }
  }, [event, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: {
      obtainedMarks?: number | null;
      fullMarks?: number | null;
      personalNotes?: string;
      isCompleted?: boolean;
    }) => {
      if (!event?._id) throw new Error('No event selected');
      return academicEventApi.updateResult(event._id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-events'] });
      queryClient.invalidateQueries({ queryKey: ['hub-events'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to update result';
      setValidationError(msg);
    },
  });

  if (!isOpen || !event) return null;

  // Calculation helpers
  const numObtained = obtainedMarks.trim() !== '' ? parseFloat(obtainedMarks) : null;
  const numFull = fullMarks.trim() !== '' ? parseFloat(fullMarks) : null;

  let calculatedPercentage: number | null = null;
  if (numObtained !== null && numFull !== null && numFull > 0) {
    calculatedPercentage = (numObtained / numFull) * 100;
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate fullMarks
    let parsedFull: number | null = null;
    if (fullMarks.trim() !== '') {
      parsedFull = parseFloat(fullMarks);
      if (isNaN(parsedFull) || parsedFull < 0) {
        setValidationError('Full marks must be a non-negative number');
        return;
      }
    }

    // Validate obtainedMarks
    let parsedObtained: number | null = null;
    if (obtainedMarks.trim() !== '') {
      parsedObtained = parseFloat(obtainedMarks);
      if (isNaN(parsedObtained) || parsedObtained < 0) {
        setValidationError('Obtained marks must be a non-negative number');
        return;
      }
      if (parsedFull !== null && parsedObtained > parsedFull) {
        setValidationError(
          `Obtained marks (${parsedObtained}) cannot exceed full marks (${parsedFull})`
        );
        return;
      }
    }

    // Auto mark completed if marks are entered
    const shouldBeCompleted =
      isCompleted || (parsedObtained !== null && parsedObtained >= 0);

    mutation.mutate({
      obtainedMarks: parsedObtained,
      fullMarks: parsedFull,
      personalNotes: personalNotes.trim(),
      isCompleted: shouldBeCompleted,
    });
  };

  const handleClearMarks = () => {
    setObtainedMarks('');
    setFullMarks('');
    setValidationError(null);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-slate-100 truncate">
                {event.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold">
                  {event.eventType}
                </span>
                <span>•</span>
                <span>{event.dateString}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Event Description (Read-Only Context) */}
        {event.description && (
          <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex items-start gap-2.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-slate-400 text-[11px] block uppercase tracking-wider">
                Event Description / Syllabus
              </span>
              <p className="mt-0.5 line-clamp-2 text-slate-300">{event.description}</p>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Validation Error Alert */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Marks Input Grid */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-400" />
                Assessment Performance
              </label>
              {(numObtained !== null || numFull !== null) && (
                <button
                  type="button"
                  onClick={handleClearMarks}
                  className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Marks
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Obtained Marks */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Obtained Marks</span>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max={numFull !== null ? numFull : undefined}
                  value={obtainedMarks}
                  onChange={(e) => setObtainedMarks(e.target.value)}
                  placeholder="e.g. 18"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-hidden focus:border-indigo-500 transition"
                />
              </div>

              {/* Full Marks */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Total / Full Marks</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={fullMarks}
                  onChange={(e) => setFullMarks(e.target.value)}
                  placeholder="e.g. 20"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-hidden focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Performance Badge / Status Preview */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs">
              <span className="text-slate-400">Grading Status:</span>
              {numObtained !== null && numFull !== null ? (
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-[11px] border ${
                      calculatedPercentage! >= 80
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : calculatedPercentage! >= 60
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                        : calculatedPercentage! >= 40
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {numObtained} / {numFull} ({calculatedPercentage!.toFixed(1)}%)
                  </span>
                </div>
              ) : numObtained !== null ? (
                <span className="text-indigo-400 font-semibold">{numObtained} marks</span>
              ) : (
                <span className="text-slate-500 italic">Not Graded Yet</span>
              )}
            </div>
          </div>

          {/* Personal Notes (Distinct from Event Description) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Personal Performance Notes & Observations
              </span>
              <span className="text-[10px] text-slate-500">Private to you</span>
            </label>
            <textarea
              rows={3}
              value={personalNotes}
              onChange={(e) => setPersonalNotes(e.target.value)}
              placeholder="e.g. Made mistakes in Q2 array pointers. Need to revise chapters 3 and 4 before finals."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition resize-none placeholder:text-slate-600"
            />
            <p className="text-[11px] text-slate-500">
              Note: This is your personal reflection. The event syllabus/description is preserved separately.
            </p>
          </div>

          {/* Completion Status Toggle */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`w-4 h-4 ${
                  isCompleted ? 'text-emerald-400' : 'text-slate-500'
                }`}
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Event Status
                </span>
                <span className="text-[11px] text-slate-400">
                  {isCompleted
                    ? 'Marked as completed / attended'
                    : 'Upcoming / Pending'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCompleted(!isCompleted)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                isCompleted
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isCompleted ? 'Completed' : 'Mark Complete'}
            </button>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {mutation.isPending ? 'Saving...' : 'Save Result & Notes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
