import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { backupApi } from '../api/academicApi.js';
import type { ISemesterSummaryReport } from '../types/academic.js';
import {
  Printer,
  X,
  GraduationCap,
  Layers,
  Tag,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  semesterId: string | null;
  targetPercentage?: number;
}

export const SemesterSummaryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  semesterId,
  targetPercentage = 75,
}) => {
  const { data: summaryData, isLoading, error } = useQuery<ISemesterSummaryReport>({
    queryKey: ['semester-summary', semesterId, targetPercentage],
    queryFn: () => {
      if (!semesterId) throw new Error('No semester selected');
      return backupApi.getSemesterSummary(semesterId, targetPercentage);
    },
    enabled: Boolean(semesterId && isOpen),
  });

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const sem = summaryData?.semester;
  const overall = summaryData?.overall;
  const courses = summaryData?.courses || [];
  const events = summaryData?.events || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-h-none print:rounded-none print:bg-white print:text-black">
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900 print:hidden">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm text-slate-100">Semester Summary Report</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Report Document Content */}
        <div className="overflow-y-auto p-6 md:p-8 space-y-6 flex-1 text-xs print:overflow-visible print:p-6 print:text-black">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Generating report...</div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300">
              Failed to load summary: {(error as Error).message}
            </div>
          ) : summaryData ? (
            <div className="space-y-6 max-w-3xl mx-auto print:space-y-4">
              {/* Report Letterhead */}
              <div className="border-b-2 border-indigo-500 pb-4 flex flex-wrap items-start justify-between gap-4 print:border-black">
                <div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-indigo-400 print:text-black" />
                    <h1 className="text-xl font-black tracking-tight text-slate-100 print:text-black">
                      Academic Study Tracker
                    </h1>
                  </div>
                  <p className="text-xs text-slate-400 print:text-gray-600 font-medium">
                    Semester Performance, Lecture Notes & Attendance Audit
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-slate-100 print:text-black font-mono block">
                    {sem?.name}
                  </span>
                  <span className="text-[11px] text-slate-400 print:text-gray-600 block">
                    {sem?.year} &bull; {sem?.term} Term
                  </span>
                  <span className="text-[10px] text-slate-500 print:text-gray-500 block">
                    Generated: {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}
                  </span>
                </div>
              </div>

              {/* Overall Performance KPIs */}
              {overall && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 print:border-gray-300 print:bg-gray-50">
                    <span className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-bold block">
                      Attendance Rate
                    </span>
                    <span className="text-2xl font-black font-mono text-slate-100 print:text-black">
                      {overall.percentage}%
                    </span>
                    <span className="text-[10px] text-slate-500 print:text-gray-600 block">
                      Target: {targetPercentage}%
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 print:border-gray-300 print:bg-gray-50">
                    <span className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-bold block">
                      Attended / Total
                    </span>
                    <span className="text-2xl font-black font-mono text-slate-100 print:text-black">
                      {overall.attended} / {overall.decided}
                    </span>
                    <span className="text-[10px] text-slate-500 print:text-gray-600 block">
                      {overall.missed} missed classes
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 print:border-gray-300 print:bg-gray-50">
                    <span className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-bold block">
                      Status & Guidance
                    </span>
                    <span className="text-sm font-bold text-slate-100 print:text-black block pt-1">
                      {overall.status}
                    </span>
                    <span className="text-[10px] text-slate-400 print:text-gray-600 block">
                      {overall.canBunk > 0 ? `Can miss ${overall.canBunk} classes` : 'No safe bunk buffer'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 print:border-gray-300 print:bg-gray-50">
                    <span className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-bold block">
                      Study Material
                    </span>
                    <span className="text-2xl font-black font-mono text-slate-100 print:text-black">
                      {overall.lecturesWithNotes}
                    </span>
                    <span className="text-[10px] text-slate-500 print:text-gray-600 block">
                      lectures with notes ({overall.homeworkCount} HW)
                    </span>
                  </div>
                </div>
              )}

              {/* Course-by-Course Audit Table */}
              <div className="space-y-2">
                <h2 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400 print:text-black" />
                  Course Breakdown & Topics Covered
                </h2>

                <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-gray-300">
                  <table className="w-full text-left border-collapse text-xs print:text-[11px]">
                    <thead>
                      <tr className="bg-slate-950/80 print:bg-gray-100 border-b border-slate-800 print:border-gray-300 text-slate-400 print:text-gray-700 font-bold">
                        <th className="py-2.5 px-3">Course</th>
                        <th className="py-2.5 px-3">Credits</th>
                        <th className="py-2.5 px-3">Attended / Decided</th>
                        <th className="py-2.5 px-3">Attendance %</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Notes / Topics</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 print:divide-gray-200">
                      {courses.map((c) => (
                        <tr key={c.courseId} className="hover:bg-slate-950/50 print:hover:bg-transparent">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-slate-100 print:text-black">{c.courseCode}</span>
                            <span className="block text-[11px] text-slate-400 print:text-gray-600 truncate max-w-[180px]">
                              {c.courseName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">{c.credit}</td>
                          <td className="py-2.5 px-3 font-mono">
                            {c.attended} / {c.decided}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            {c.percentage}%
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                c.status === 'SAFE'
                                  ? 'bg-emerald-950 text-emerald-300 print:bg-transparent print:text-green-700'
                                  : c.status === 'WARNING'
                                  ? 'bg-amber-950 text-amber-300 print:bg-transparent print:text-amber-700'
                                  : 'bg-rose-950 text-rose-300 print:bg-transparent print:text-rose-700'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="block text-[11px] text-slate-300 print:text-black font-semibold">
                              {c.lecturesWithNotes} lecture notes ({c.topicsCovered.length} topics)
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Academic Events Section */}
              {events.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-400 print:text-black" />
                    Academic Milestones & Assessments ({events.length})
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {events.map((ev) => {
                      const course = typeof ev.courseId === 'object' && ev.courseId ? ev.courseId : null;
                      return (
                        <div
                          key={ev._id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 print:border-gray-300 print:bg-transparent space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 print:bg-gray-100 text-[10px] font-bold text-indigo-300 print:text-black">
                              {ev.eventType}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 print:text-gray-600">
                              {ev.dateString}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-200 print:text-black text-xs">{ev.title}</h4>
                          <p className="text-[10px] text-slate-400 print:text-gray-600">
                            {course ? `${course.courseCode} - ${course.courseName}` : 'General University'} &bull;{' '}
                            {ev.room || 'TBA'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Printable Footer */}
              <div className="pt-4 border-t border-slate-800 print:border-gray-300 text-center text-[10px] text-slate-500 print:text-gray-500">
                Academic Study Tracker &bull; Certified Personal Academic Record &bull; Generated from local database
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
