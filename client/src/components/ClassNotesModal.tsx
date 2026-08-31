import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classInstanceApi } from '../api/academicApi.js';
import type { IClassInstance } from '../types/academic.js';
import {
  BookOpen,
  X,
  CheckSquare,
  FileText,
  Calendar,
  Clock,
  MapPin,
  Save,
} from 'lucide-react';

interface Props {
  instance: IClassInstance | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ClassNotesModal: React.FC<Props> = ({ instance, isOpen, onClose }) => {
  const queryClient = useQueryClient();

  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [hasHomework, setHasHomework] = useState(false);
  const [homeworkDetails, setHomeworkDetails] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state when instance changes or modal opens
  useEffect(() => {
    if (instance) {
      setTopic(instance.topic || '');
      setNotes(instance.notes || '');
      setHasHomework(Boolean(instance.hasHomework));
      setHomeworkDetails(instance.homeworkDetails || '');
      setFormError(null);
    }
  }, [instance, isOpen]);

  // Lock background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: (data: {
      topic: string;
      notes: string;
      hasHomework: boolean;
      homeworkDetails: string;
    }) => {
      if (!instance?._id) throw new Error('No class instance selected');
      return classInstanceApi.updateNotes(instance._id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
      onClose();
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Failed to save notes');
    },
  });

  if (!isOpen || !instance) return null;

  const course = typeof instance.courseId === 'object' ? instance.courseId : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    mutation.mutate({
      topic: topic.trim(),
      notes: notes.trim(),
      hasHomework,
      homeworkDetails: hasHomework ? homeworkDetails.trim() : '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between shrink-0 bg-slate-900">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: course?.color || '#6366f1' }}
              />
              <h3 className="text-base font-bold text-slate-100">
                {course?.courseCode || 'Class'} &ndash; Lecture Notes
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {course?.courseName || 'Academic Session'}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-400" />
                {instance.dateString} ({instance.dayOfWeek})
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                {instance.startTime} &ndash; {instance.endTime}
              </span>
              {instance.room && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  {instance.room}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form id="notes-form" onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
              {formError}
            </div>
          )}

          {/* Topic Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Lesson Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Binary Search Trees, Method Overriding, Normalization"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition"
            />
            <p className="text-[10px] text-slate-500">
              Brief summary of the primary concept taught in this lecture.
            </p>
          </div>

          {/* Lecture Notes Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Lecture Notes & Key Takeaways
            </label>
            <textarea
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was taught today? Write down key formulas, concepts, discussion points, or exam hints..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition resize-y leading-relaxed font-sans"
            />
          </div>

          {/* Homework Checklist & Details */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer selection:bg-transparent">
              <input
                type="checkbox"
                checked={hasHomework}
                onChange={(e) => setHasHomework(e.target.checked)}
                className="w-4 h-4 rounded-sm border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                Homework or Assignment Assigned?
              </span>
            </label>

            {hasHomework && (
              <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                <label className="text-[11px] font-medium text-slate-400">
                  Homework Details / Tasks:
                </label>
                <textarea
                  rows={2}
                  value={homeworkDetails}
                  onChange={(e) => setHomeworkDetails(e.target.value)}
                  placeholder="e.g. Solve exercise problems 1 to 5 from chapter 3, prepare presentation slides..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition resize-y"
                />
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="notes-form"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {mutation.isPending ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
};
