import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { academicEventApi } from '../api/academicApi.js';
import type { IAcademicEvent, AcademicEventType, ICourse } from '../types/academic.js';
import { ACADEMIC_EVENT_TYPES } from '../types/academic.js';
import { getCourseShortName } from '../utils/courseUtils.js';
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Tag,
  BookOpen,
  X,
  Save,
} from 'lucide-react';

interface Props {
  event: IAcademicEvent | null;
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string;
  semesterId: string;
  courses: ICourse[];
}

export const AcademicEventModal: React.FC<Props> = ({
  event,
  isOpen,
  onClose,
  defaultDate,
  semesterId,
  courses,
}) => {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<AcademicEventType>('Quiz');
  const [courseId, setCourseId] = useState<string>(''); // empty string = General
  const [dateString, setDateString] = useState(defaultDate);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [endDateString, setEndDateString] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state when event changes or modal opens
  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setEventType(event.eventType || 'Quiz');
      const cId = typeof event.courseId === 'object' && event.courseId ? event.courseId._id : event.courseId || '';
      setCourseId(cId);
      setDateString(event.dateString || defaultDate);
      const hasMulti = Boolean(event.endDateString && event.endDateString > (event.dateString || defaultDate));
      setIsMultiDay(hasMulti);
      setEndDateString(event.endDateString || event.dateString || defaultDate);
      setStartTime(event.startTime || '');
      setEndTime(event.endTime || '');
      setRoom(event.room || '');
      setDescription(event.description || '');
      setFormError(null);
    } else {
      setTitle('');
      setEventType('Quiz');
      setCourseId('');
      setDateString(defaultDate);
      setIsMultiDay(false);
      setEndDateString(defaultDate);
      setStartTime('');
      setEndTime('');
      setRoom('');
      setDescription('');
      setFormError(null);
    }
  }, [event, isOpen, defaultDate]);

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

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      eventType: AcademicEventType;
      dateString: string;
      endDateString?: string | null;
      semesterId: string;
      courseId?: string | null;
      startTime?: string;
      endTime?: string;
      room?: string;
      description?: string;
    }) => academicEventApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-events'] });
      onClose();
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Failed to create event');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      title: string;
      eventType: AcademicEventType;
      dateString: string;
      endDateString?: string | null;
      courseId?: string | null;
      startTime?: string;
      endTime?: string;
      room?: string;
      description?: string;
    }) => {
      if (!event?._id) throw new Error('No event selected for update');
      return academicEventApi.update(event._id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-events'] });
      onClose();
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Failed to update event');
    },
  });

  if (!isOpen) return null;

  const isEditing = Boolean(event);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Event title is required');
      return;
    }

    if (!dateString) {
      setFormError('Event date is required');
      return;
    }

    if (isMultiDay) {
      if (!endDateString) {
        setFormError('End date is required for multi-day events');
        return;
      }
      if (endDateString < dateString) {
        setFormError('End date cannot be earlier than start date');
        return;
      }
    }

    if (startTime && endTime && startTime > endTime) {
      setFormError('Start time cannot be after end time');
      return;
    }

    const payload = {
      title: title.trim(),
      eventType,
      dateString,
      endDateString: isMultiDay && endDateString ? endDateString : null,
      courseId: courseId ? courseId : null,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      room: room.trim(),
      description: description.trim(),
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate({
        ...payload,
        semesterId,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between shrink-0 bg-slate-900">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-400" />
              {isEditing ? 'Edit Academic Event' : 'Add Academic Event'}
            </h3>
            <p className="text-xs text-slate-400">
              Schedule quizzes, assignments, exams, or department milestones.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form id="event-form" onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
              {formError}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Event Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Polymorphism Quiz 1, Midterm Exam, Project Demo"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition"
            />
          </div>

          {/* Event Type & Course Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Event Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as AcademicEventType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
              >
                {ACADEMIC_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Scope */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Course Association
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="">General (All Academic / University)</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {getCourseShortName(c)} &ndash; {c.courseName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-day Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-violet-400" />
                Multi-day Event
              </span>
              <p className="text-[11px] text-slate-400">
                Enable if event spans across two or more consecutive dates
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isMultiDay}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsMultiDay(checked);
                  if (checked && (!endDateString || endDateString < dateString)) {
                    setEndDateString(dateString);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Date & Time Slot */}
          {isMultiDay ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    Start Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dateString}
                    onChange={(e) => {
                      setDateString(e.target.value);
                      if (endDateString && endDateString < e.target.value) {
                        setEndDateString(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-violet-400" />
                    End Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={dateString}
                    value={endDateString}
                    onChange={(e) => setEndDateString(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
                  />
                </div>

                {/* End Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dateString}
                  onChange={(e) => setDateString(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
                />
              </div>

              {/* Start Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
                />
              </div>

              {/* End Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Location / Room */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Location / Room / Link (Optional)
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Room 302, Computer Lab 2, Zoom Link"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Event Description & Syllabus Scope
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Chapters 1 to 4 included, bring student ID card and scientific calculator..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition resize-y"
            />
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
            form="event-form"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isPending ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
};
