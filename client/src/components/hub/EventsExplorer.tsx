import React, { useState, useMemo } from 'react';
import type { IAcademicEvent, ICourse } from '../../types/academic.js';
import { ACADEMIC_EVENT_TYPES } from '../../types/academic.js';
import { EventResultModal } from './EventResultModal.js';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Search,
} from 'lucide-react';

interface EventsExplorerProps {
  course: ICourse;
  events: IAcademicEvent[];
  isLoading?: boolean;
  onOpenCreateModal?: () => void;
}

type FilterView = 'all' | 'previous' | 'upcoming';
type StatusFilter = 'all' | 'completed' | 'pending' | 'graded';

export const EventsExplorer: React.FC<EventsExplorerProps> = ({
  course,
  events,
  isLoading = false,
  onOpenCreateModal,
}) => {
  const [selectedEventForModal, setSelectedEventForModal] = useState<IAcademicEvent | null>(null);
  const [activeView, setActiveView] = useState<FilterView>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Today in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Filter events strictly for this course
  const courseEvents = useMemo(() => {
    return events.filter((ev) => {
      const cId =
        typeof ev.courseId === 'object' && ev.courseId
          ? ev.courseId._id
          : ev.courseId;
      return cId === course._id;
    });
  }, [events, course._id]);

  // Split into Previous and Upcoming
  const { previousEvents, upcomingEvents } = useMemo(() => {
    const prev: IAcademicEvent[] = [];
    const up: IAcademicEvent[] = [];

    courseEvents.forEach((ev) => {
      // If marked completed or date is strictly in the past, consider it previous
      const isPastDate = (ev.dateString || '') < todayStr;
      if (ev.isCompleted || isPastDate) {
        prev.push(ev);
      } else {
        up.push(ev);
      }
    });

    // Previous: newest date first
    prev.sort((a, b) => (b.dateString || '').localeCompare(a.dateString || ''));

    // Upcoming: nearest date first
    up.sort((a, b) => (a.dateString || '').localeCompare(b.dateString || ''));

    return { previousEvents: prev, upcomingEvents: up };
  }, [courseEvents, todayStr]);

  // Apply search and dropdown filters
  const applyFilters = (list: IAcademicEvent[]) => {
    return list.filter((ev) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesDesc = (ev.description || '').toLowerCase().includes(q);
        const matchesNotes = (ev.personalNotes || '').toLowerCase().includes(q);
        const matchesType = ev.eventType.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesNotes && !matchesType) {
          return false;
        }
      }

      // Event Type
      if (selectedType !== 'all' && ev.eventType !== selectedType) {
        return false;
      }

      // Status Filter
      if (statusFilter === 'completed' && !ev.isCompleted) return false;
      if (statusFilter === 'pending' && ev.isCompleted) return false;
      if (statusFilter === 'graded' && (ev.obtainedMarks === undefined || ev.obtainedMarks === null)) {
        return false;
      }

      return true;
    });
  };

  const filteredPrevious = useMemo(() => applyFilters(previousEvents), [previousEvents, searchQuery, selectedType, statusFilter]);
  const filteredUpcoming = useMemo(() => applyFilters(upcomingEvents), [upcomingEvents, searchQuery, selectedType, statusFilter]);

  // Helper for remaining days calculation
  const getDaysDiffLabel = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr === todayStr) return 'Today';

    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const [eY, eM, eD] = dateStr.split('-').map(Number);
    const todayUtc = Date.UTC(tY, tM - 1, tD);
    const eventUtc = Date.UTC(eY, eM - 1, eD);

    const diffDays = Math.round((eventUtc - todayUtc) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays === -1) return 'Yesterday';
    return `${Math.abs(diffDays)} days ago`;
  };

  const renderEventCard = (ev: IAcademicEvent, isPast: boolean) => {
    const isGraded = ev.obtainedMarks !== undefined && ev.obtainedMarks !== null;
    const hasFull = ev.fullMarks !== undefined && ev.fullMarks !== null && ev.fullMarks > 0;
    const percentage = isGraded && hasFull ? ((ev.obtainedMarks! / ev.fullMarks!) * 100).toFixed(1) : null;
    const daysLabel = getDaysDiffLabel(ev.dateString);

    return (
      <div
        key={ev._id}
        className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 hover:shadow-lg transition-all duration-200 space-y-3 group"
      >
        {/* Top Row: Type Badge, Title, Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider">
                {ev.eventType}
              </span>

              {ev.isCompleted && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Completed
                </span>
              )}

              {!isPast && daysLabel && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                  daysLabel === 'Today'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : daysLabel === 'Tomorrow'
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  <Clock className="w-2.5 h-2.5 inline mr-1" />
                  {daysLabel}
                </span>
              )}
            </div>

            <h4 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
              {ev.title}
            </h4>
          </div>

          {/* Quick Edit Result Button */}
          <button
            type="button"
            onClick={() => setSelectedEventForModal(ev)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-indigo-600 hover:text-white border border-slate-700/80 text-slate-300 text-xs font-medium transition cursor-pointer shrink-0"
            title="Edit marks, results & personal notes"
          >
            <Pencil className="w-3 h-3" />
            <span className="hidden sm:inline">Result & Notes</span>
          </button>
        </div>

        {/* Date, Time & Room */}
        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{ev.dateString}</span>
          </div>
          {(ev.startTime || ev.endTime) && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {ev.startTime || '--:--'} - {ev.endTime || '--:--'}
              </span>
            </div>
          )}
          {ev.room && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{ev.room}</span>
            </div>
          )}
        </div>

        {/* Description / Syllabus (Preserved) */}
        {ev.description && (
          <p className="text-xs text-slate-300/90 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
            {ev.description}
          </p>
        )}

        {/* Bottom Stats: Marks & Personal Notes Section */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          {/* Marks badge */}
          <div className="flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            {isGraded ? (
              <span className="font-semibold text-slate-200">
                Score:{' '}
                <span className="text-indigo-400 font-bold">
                  {ev.obtainedMarks}
                </span>
                {ev.fullMarks !== undefined && ev.fullMarks !== null && (
                  <span className="text-slate-400"> / {ev.fullMarks}</span>
                )}
                {percentage && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px]">
                    {percentage}%
                  </span>
                )}
              </span>
            ) : ev.fullMarks !== undefined && ev.fullMarks !== null ? (
              <span className="text-slate-400">
                Full Marks: <strong className="text-slate-200">{ev.fullMarks}</strong> (Not Graded)
              </span>
            ) : (
              <span className="text-slate-500 italic">Not Graded</span>
            )}
          </div>

          {/* Personal Notes preview */}
          {ev.personalNotes && (
            <div className="text-[11px] text-amber-300/80 bg-amber-500/5 px-2 py-1 rounded border border-amber-500/20 truncate max-w-xs" title={ev.personalNotes}>
              <span className="font-semibold text-amber-400 mr-1">Note:</span>
              {ev.personalNotes}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events by title, description, notes..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 transition placeholder:text-slate-500"
            />
          </div>

          {/* Right Action: Create Event */}
          {onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          )}
        </div>

        {/* View Switcher & Granular Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          {/* Main Segmented View Toggle: All / Previous / Upcoming */}
          <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveView('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeView === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Events ({courseEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveView('upcoming')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeView === 'upcoming'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Upcoming ({upcomingEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveView('previous')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeView === 'previous'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Previous ({previousEvents.length})
            </button>
          </div>

          {/* Type & Status Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Event Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">All Types</option>
              {ACADEMIC_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="graded">Graded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Sections */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-slate-900/60 border border-slate-800" />
          ))}
        </div>
      ) : courseEvents.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">
            No Academic Events Recorded for {course.courseName}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Record Class Tests (CTs), Quizzes, Midterms, Assignments, Presentations, and Finals to track marks and notes.
          </p>
          {onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule First Event</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section B: Upcoming Events */}
          {(activeView === 'all' || activeView === 'upcoming') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Upcoming Events
                  <span className="text-xs font-normal text-slate-400">
                    ({filteredUpcoming.length})
                  </span>
                </h3>
                <span className="text-[11px] text-slate-500">Sorted nearest date first</span>
              </div>

              {filteredUpcoming.length === 0 ? (
                <div className="p-5 text-center rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400">
                  {activeView === 'upcoming'
                    ? 'No upcoming events match the active filters.'
                    : 'No upcoming events scheduled.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredUpcoming.map((ev) => renderEventCard(ev, false))}
                </div>
              )}
            </div>
          )}

          {/* Section A: Previous Events */}
          {(activeView === 'all' || activeView === 'previous') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Previous Events & Results
                  <span className="text-xs font-normal text-slate-400">
                    ({filteredPrevious.length})
                  </span>
                </h3>
                <span className="text-[11px] text-slate-500">Sorted newest date first</span>
              </div>

              {filteredPrevious.length === 0 ? (
                <div className="p-5 text-center rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400">
                  {activeView === 'previous'
                    ? 'No previous events match the active filters.'
                    : 'No past events recorded yet.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredPrevious.map((ev) => renderEventCard(ev, true))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Result & Notes Modal */}
      <EventResultModal
        event={selectedEventForModal}
        isOpen={Boolean(selectedEventForModal)}
        onClose={() => setSelectedEventForModal(null)}
      />
    </div>
  );
};
