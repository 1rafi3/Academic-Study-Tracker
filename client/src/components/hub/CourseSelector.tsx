import React, { useMemo } from 'react';
import type { ICourse, ISemester } from '../../types/academic.js';
import { BookOpen, ChevronDown, Search } from 'lucide-react';

interface CourseSelectorProps {
  courses: ICourse[];
  semesters: ISemester[];
  selectedCourseId: string | null;
  onSelectCourse: (courseId: string) => void;
  isLoading?: boolean;
}

export const CourseSelector: React.FC<CourseSelectorProps> = ({
  courses,
  semesters,
  selectedCourseId,
  onSelectCourse,
  isLoading,
}) => {
  const [search, setSearch] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const semesterMap = useMemo(() => {
    const map: Record<string, ISemester> = {};
    semesters.forEach(s => { map[s._id] = s; });
    return map;
  }, [semesters]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return courses.filter(c =>
      !q ||
      c.courseName.toLowerCase().includes(q) ||
      c.courseCode.toLowerCase().includes(q)
    );
  }, [courses, search]);

  // Group by semester
  const grouped = useMemo(() => {
    const groups: Record<string, ICourse[]> = {};
    filtered.forEach(course => {
      const semId = typeof course.semesterId === 'string' ? course.semesterId : (course.semesterId as ISemester)._id;
      if (!groups[semId]) groups[semId] = [];
      groups[semId].push(course);
    });
    return groups;
  }, [filtered]);

  const selectedCourse = courses.find(c => c._id === selectedCourseId);

  const handleSelect = (id: string) => {
    onSelectCourse(id);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors shadow-sm text-left cursor-pointer"
        disabled={isLoading}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedCourse ? (
            <>
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: selectedCourse.color || '#6366f1' }}
              />
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                {selectedCourse.courseCode && <span className="text-indigo-600 dark:text-indigo-400 mr-1.5">{selectedCourse.courseCode}</span>}
                {selectedCourse.courseName}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                {selectedCourse.credit} cr
              </span>
            </>
          ) : (
            <>
              <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {isLoading ? 'Loading courses…' : 'Select a course to explore'}
              </span>
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search by name or code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
              />
            </div>
          </div>

          {/* Course List */}
          <div className="max-h-72 overflow-y-auto">
            {Object.keys(grouped).length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">No courses found</p>
            ) : (
              Object.entries(grouped).map(([semId, semCourses]) => {
                const sem = semesterMap[semId];
                return (
                  <div key={semId}>
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/80 dark:bg-slate-800/60">
                      {sem ? `${sem.name} ${sem.year}` : 'Unknown Semester'}
                      {sem?.isActive && (
                        <span className="ml-1.5 px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-semibold">Active</span>
                      )}
                    </div>
                    {semCourses.map(course => (
                      <button
                        key={course._id}
                        type="button"
                        onClick={() => handleSelect(course._id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer ${
                          selectedCourseId === course._id ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: course.color || '#6366f1' }}
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {course.courseCode && <span className="text-indigo-600 dark:text-indigo-400 mr-1">{course.courseCode}</span>}
                            {course.courseName}
                          </span>
                          {course.instructor && (
                            <span className="block text-[10px] text-slate-400 truncate">{course.instructor}</span>
                          )}
                        </div>
                        <span className="ml-auto text-[10px] text-slate-400 shrink-0">{course.credit} cr</span>
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

