import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi, courseApi } from '../api/academicApi.js';
import type { ISchedule, DayOfWeek, ICourse } from '../types/academic.js';
import { DAYS_OF_WEEK } from '../types/academic.js';
import { Clock, Plus, Trash2, Edit2, AlertCircle, X, MapPin, Tag } from 'lucide-react';

interface Props {
  selectedCourseId: string | null;
}

export const ScheduleManager: React.FC<Props> = ({ selectedCourseId }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ISchedule | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('Sunday');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [room, setRoom] = useState('Room 302');
  const [type, setType] = useState<'Lecture' | 'Lab' | 'Tutorial' | 'Seminar' | 'Other'>('Lecture');

  const { data: course } = useQuery<ICourse>({
    queryKey: ['course', selectedCourseId],
    queryFn: () => (selectedCourseId ? courseApi.getById(selectedCourseId) : Promise.reject('No ID')),
    enabled: Boolean(selectedCourseId),
  });

  const { data: schedules = [], isLoading, error } = useQuery<ISchedule[]>({
    queryKey: ['schedules', selectedCourseId],
    queryFn: () => (selectedCourseId ? scheduleApi.getByCourse(selectedCourseId) : Promise.resolve([])),
    enabled: Boolean(selectedCourseId),
  });

  const addMutation = useMutation({
    mutationFn: (data: Partial<ISchedule>) =>
      selectedCourseId ? scheduleApi.add(selectedCourseId, data) : Promise.reject('No course selected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', selectedCourseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      closeModal();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: Partial<ISchedule> }) =>
      selectedCourseId
        ? scheduleApi.update(selectedCourseId, scheduleId, data)
        : Promise.reject('No course selected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', selectedCourseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      closeModal();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (scheduleId: string) =>
      selectedCourseId
        ? scheduleApi.delete(selectedCourseId, scheduleId)
        : Promise.reject('No course selected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', selectedCourseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (err: Error) => alert(`Error deleting schedule: ${err.message}`),
  });

  const openCreateModal = () => {
    setEditingSchedule(null);
    setDayOfWeek('Sunday');
    setStartTime('10:00');
    setEndTime('11:30');
    setRoom('Room 302');
    setType('Lecture');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sch: ISchedule) => {
    setEditingSchedule(sch);
    setDayOfWeek(sch.dayOfWeek);
    setStartTime(sch.startTime);
    setEndTime(sch.endTime);
    setRoom(sch.room || '');
    setType(sch.type || 'Lecture');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSchedule(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedCourseId) {
      setFormError('Please select a course first');
      return;
    }

    if (!startTime || !endTime) {
      setFormError('Start time and End time are required');
      return;
    }

    if (startTime >= endTime) {
      setFormError('End time must be after start time');
      return;
    }

    const payload = {
      dayOfWeek,
      startTime,
      endTime,
      room: room.trim(),
      type,
    };

    if (editingSchedule && editingSchedule._id) {
      updateMutation.mutate({ scheduleId: editingSchedule._id, data: payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  if (!selectedCourseId) {
    return (
      <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
        <Clock className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-sm font-medium text-slate-300">Select a Course</p>
        <p className="text-xs text-slate-500">Please choose a course above to configure its weekly recurring class schedule.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: course?.color || '#6366f1' }}
            />
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Weekly Class Schedule: {course?.courseCode || 'Course'}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Configure recurring days & time slots for {course?.courseName || 'this course'}.
          </p>
        </div>
        <button
          id="add-schedule-btn"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Schedule Slot
        </button>
      </div>

      {/* Schedule List */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-400 text-sm animate-pulse">Loading schedules...</div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          {(error as Error).message}
        </div>
      ) : schedules.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-300">No recurring schedule slots defined</p>
          <p className="text-xs text-slate-500">
            Define recurring weekly class times (e.g. Sunday & Tuesday 10:00 AM – 11:30 AM).
          </p>
          <button
            onClick={openCreateModal}
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add First Slot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {schedules.map((sch) => (
            <div
              key={sch._id}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-bold text-xs">
                    {sch.dayOfWeek}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <Tag className="w-3 h-3 text-slate-500" />
                    {sch.type || 'Lecture'}
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>
                    {sch.startTime} &ndash; {sch.endTime}
                  </span>
                </div>

                {sch.room && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {sch.room}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-1 border-t border-slate-800/60 pt-3 mt-3">
                <button
                  title="Edit Schedule"
                  onClick={() => openEditModal(sch)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  title="Delete Schedule"
                  onClick={() => {
                    if (sch._id && confirm(`Delete this ${sch.dayOfWeek} class schedule?`)) {
                      deleteMutation.mutate(sch._id);
                    }
                  }}
                  className="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">
                {editingSchedule ? 'Edit Schedule Slot' : 'Add Weekly Schedule Slot'}
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
                <label className="block text-slate-300 font-medium mb-1">Day of Week *</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Time (HH:mm) *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Time (HH:mm) *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Room / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 302 / Lab 4"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Session Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Lab">Lab</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
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
                  id="save-schedule-btn"
                  type="submit"
                  disabled={addMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {addMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingSchedule
                    ? 'Save Changes'
                    : 'Add Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
