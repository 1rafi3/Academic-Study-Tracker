import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { semesterApi, courseApi } from '../api/academicApi.js';
import type { ISemester, ICourse } from '../types/academic.js';
import { getCourseShortName } from '../utils/courseUtils.js';
import {
  Calculator,
  Layers,
  AlertTriangle,
  Plus,
  Trash2,
  TrendingUp,
  Award,
  Target,
  RefreshCw,
  BookOpen,
  Info,
} from 'lucide-react';
import { useToast } from '../context/ToastContext.js';

interface Props {
  selectedSemesterId: string | null;
  onSelectSemester: (id: string | null) => void;
  onNavigateToSetup: () => void;
}

export interface GradeDefinition {
  letter: string;
  points: number;
  percentage?: string;
  description?: string;
}

// Bangladesh UGC Standard 4.0 Scale (Most common across BD Universities)
export const UGC_BANGLADESH_SCALE: GradeDefinition[] = [
  { letter: 'A+', points: 4.0, percentage: '80% and above', description: 'Outstanding' },
  { letter: 'A', points: 3.75, percentage: '75% to <80%', description: 'Excellent' },
  { letter: 'A-', points: 3.5, percentage: '70% to <75%', description: 'Very Good' },
  { letter: 'B+', points: 3.25, percentage: '65% to <70%', description: 'Good' },
  { letter: 'B', points: 3.0, percentage: '60% to <65%', description: 'Satisfactory' },
  { letter: 'B-', points: 2.75, percentage: '55% to <60%', description: 'Above Average' },
  { letter: 'C+', points: 2.5, percentage: '50% to <55%', description: 'Average' },
  { letter: 'C', points: 2.25, percentage: '45% to <50%', description: 'Below Average' },
  { letter: 'D', points: 2.0, percentage: '40% to <45%', description: 'Pass' },
  { letter: 'F', points: 0.0, percentage: 'Less than 40%', description: 'Fail' },
];

// International Standard 4.0 Scale
export const STANDARD_US_SCALE: GradeDefinition[] = [
  { letter: 'A', points: 4.0, percentage: '93% - 100%' },
  { letter: 'A-', points: 3.7, percentage: '90% - 92%' },
  { letter: 'B+', points: 3.3, percentage: '87% - 89%' },
  { letter: 'B', points: 3.0, percentage: '83% - 86%' },
  { letter: 'B-', points: 2.7, percentage: '80% - 82%' },
  { letter: 'C+', points: 2.3, percentage: '77% - 79%' },
  { letter: 'C', points: 2.0, percentage: '73% - 76%' },
  { letter: 'C-', points: 1.7, percentage: '70% - 72%' },
  { letter: 'D+', points: 1.3, percentage: '67% - 69%' },
  { letter: 'D', points: 1.0, percentage: '60% - 66%' },
  { letter: 'F', points: 0.0, percentage: '< 60%' },
];

export interface GpaCourseRow {
  id: string;
  name: string;
  code: string;
  color?: string;
  credit: number | '';
  isCreditUnset: boolean;
  grade: string; // letter or 'custom'
  customPoints?: number;
  isIncluded: boolean;
  isCustom: boolean;
}

export const GpaCalculator: React.FC<Props> = ({
  selectedSemesterId,
  onSelectSemester,
  onNavigateToSetup,
}) => {
  const { showToast } = useToast();

  // 1. Fetch Semesters
  const { data: semesters = [] } = useQuery<ISemester[]>({
    queryKey: ['semesters'],
    queryFn: () => semesterApi.getAll(),
  });

  const activeSemester = useMemo(() => {
    if (selectedSemesterId) {
      return semesters.find((s) => s._id === selectedSemesterId) || null;
    }
    return semesters.find((s) => s.isActive) || semesters[0] || null;
  }, [semesters, selectedSemesterId]);

  // Keep selected semester in sync if not set
  useEffect(() => {
    if (!selectedSemesterId && activeSemester) {
      onSelectSemester(activeSemester._id);
    }
  }, [selectedSemesterId, activeSemester, onSelectSemester]);

  // 2. Fetch Courses for active semester
  const { data: courses = [], isLoading: coursesLoading } = useQuery<ICourse[]>({
    queryKey: ['courses', activeSemester?._id],
    queryFn: () =>
      activeSemester ? courseApi.getAll(activeSemester._id) : Promise.resolve([]),
    enabled: Boolean(activeSemester?._id),
  });

  // Scale Selection
  const [scaleType, setScaleType] = useState<'ugc' | 'standard'>('ugc');
  const activeScale = scaleType === 'ugc' ? UGC_BANGLADESH_SCALE : STANDARD_US_SCALE;

  // Local courses row state for calculations
  const [courseRows, setCourseRows] = useState<GpaCourseRow[]>([]);

  // Previous CGPA & Credits for Cumulative Calculation
  const [prevCgpa, setPrevCgpa] = useState<number | ''>('');
  const [prevCredits, setPrevCredits] = useState<number | ''>('');

  // Target Goal Forecaster
  const [targetCgpa, setTargetCgpa] = useState<number | ''>('');
  const [remainingCredits, setRemainingCredits] = useState<number | ''>('');

  // Storage key for caching grades
  const storageKey = useMemo(() => {
    return `academic_tracker_gpa_${activeSemester?._id || 'manual'}`;
  }, [activeSemester?._id]);

  // Sync courses with courseRows
  useEffect(() => {
    // Attempt to retrieve saved cache from localStorage
    let cachedRows: GpaCourseRow[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        cachedRows = JSON.parse(saved);
      }
    } catch {
      cachedRows = [];
    }

    const cachedMap = new Map<string, GpaCourseRow>(
      cachedRows.map((r) => [r.id, r])
    );

    // Build course rows for current semester's courses
    const syncedRows: GpaCourseRow[] = courses.map((c) => {
      const existing = cachedMap.get(c._id);
      const isCreditZeroOrMissing = !c.credit || c.credit <= 0;

      return {
        id: c._id,
        name: c.courseName,
        code: getCourseShortName(c),
        color: c.color || '#6366f1',
        credit: existing?.credit !== undefined && existing.credit !== ''
          ? existing.credit
          : isCreditZeroOrMissing
          ? ''
          : c.credit,
        isCreditUnset: isCreditZeroOrMissing && (existing?.credit === undefined || existing.credit === ''),
        grade: existing?.grade || 'A+',
        customPoints: existing?.customPoints,
        isIncluded: existing ? existing.isIncluded : true,
        isCustom: false,
      };
    });

    // Retain any manual custom rows that were saved in cachedRows
    const manualRows = cachedRows.filter((r) => r.isCustom);

    setCourseRows([...syncedRows, ...manualRows]);
  }, [courses, storageKey]);

  // Persist courseRows to localStorage
  useEffect(() => {
    if (courseRows.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(courseRows));
      } catch {
        // ignore localStorage quota errors
      }
    }
  }, [courseRows, storageKey]);

  // Handlers for course row modifications
  const handleGradeChange = (id: string, grade: string) => {
    setCourseRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, grade } : row))
    );
  };

  const handleCreditChange = (id: string, value: string) => {
    const num = parseFloat(value);
    setCourseRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const isInvalid = isNaN(num) || num <= 0;
          return {
            ...row,
            credit: isInvalid ? '' : num,
            isCreditUnset: isInvalid,
          };
        }
        return row;
      })
    );
  };

  const handleToggleInclude = (id: string) => {
    setCourseRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, isIncluded: !row.isIncluded } : row
      )
    );
  };

  const handleAddManualCourse = () => {
    const newId = `custom-${Date.now()}`;
    const newRow: GpaCourseRow = {
      id: newId,
      name: `Course ${courseRows.length + 1}`,
      code: `C${courseRows.length + 1}`,
      credit: 3.0,
      isCreditUnset: false,
      grade: 'A+',
      isIncluded: true,
      isCustom: true,
    };
    setCourseRows((prev) => [...prev, newRow]);
    showToast('Custom course added', 'info', 1500);
  };

  const handleRemoveRow = (id: string) => {
    setCourseRows((prev) => prev.filter((r) => r.id !== id));
    showToast('Course removed from calculator', 'info', 1500);
  };

  const handleReset = () => {
    localStorage.removeItem(storageKey);
    setCourseRows((prev) =>
      prev
        .filter((r) => !r.isCustom)
        .map((r) => ({
          ...r,
          grade: 'A+',
          isIncluded: true,
        }))
    );
    showToast('Calculator reset to default', 'info', 1500);
  };

  // Grade point resolution helper
  const getGradePoint = (row: GpaCourseRow): number => {
    if (row.grade === 'custom') {
      return row.customPoints || 0;
    }
    const def = activeScale.find((g) => g.letter === row.grade);
    return def ? def.points : 0;
  };

  // Calculations
  const metrics = useMemo(() => {
    let totalEnrolledCredits = 0;
    let totalGradedCredits = 0;
    let totalGradePoints = 0;
    let missingCreditCount = 0;

    for (const row of courseRows) {
      if (!row.isIncluded) continue;

      const cred = typeof row.credit === 'number' ? row.credit : 0;
      if (cred <= 0) {
        missingCreditCount++;
      } else {
        totalEnrolledCredits += cred;
        const pts = getGradePoint(row);
        totalGradedCredits += cred;
        totalGradePoints += cred * pts;
      }
    }

    const semesterGpa =
      totalGradedCredits > 0 ? totalGradePoints / totalGradedCredits : 0;

    return {
      totalEnrolledCredits,
      totalGradedCredits,
      totalGradePoints,
      missingCreditCount,
      semesterGpa,
    };
  }, [courseRows, activeScale]);

  // Cumulative CGPA calculation
  const cumulativeMetrics = useMemo(() => {
    const prevC = typeof prevCredits === 'number' && prevCredits > 0 ? prevCredits : 0;
    const prevG = typeof prevCgpa === 'number' && prevCgpa >= 0 ? prevCgpa : 0;

    if (prevC === 0 || prevG === 0) {
      return null;
    }

    const prevPoints = prevC * prevG;
    const combinedCredits = prevC + metrics.totalGradedCredits;
    const combinedPoints = prevPoints + metrics.totalGradePoints;
    const newCgpa = combinedCredits > 0 ? combinedPoints / combinedCredits : 0;

    return {
      combinedCredits,
      combinedPoints,
      newCgpa,
    };
  }, [prevCredits, prevCgpa, metrics]);

  // Target GPA Planner calculation
  const targetPlannerResult = useMemo(() => {
    const target = typeof targetCgpa === 'number' && targetCgpa > 0 ? targetCgpa : 0;
    const rem = typeof remainingCredits === 'number' && remainingCredits > 0 ? remainingCredits : 0;

    if (target === 0 || rem === 0) return null;

    // Current total earned points and credits
    const currCredits = cumulativeMetrics
      ? cumulativeMetrics.combinedCredits
      : metrics.totalGradedCredits;
    const currPoints = cumulativeMetrics
      ? cumulativeMetrics.combinedPoints
      : metrics.totalGradePoints;

    const totalTargetCredits = currCredits + rem;
    const totalTargetPointsNeeded = target * totalTargetCredits;
    const remainingPointsNeeded = totalTargetPointsNeeded - currPoints;
    const requiredGpa = remainingPointsNeeded / rem;

    return {
      requiredGpa,
      isAchievable: requiredGpa <= 4.0,
      isAlreadyMet: requiredGpa <= 0,
    };
  }, [targetCgpa, remainingCredits, cumulativeMetrics, metrics]);

  // Academic standing / remarks badge
  const getAcademicStanding = (gpa: number) => {
    if (gpa >= 3.8) {
      return {
        label: "Dean's List / High Honors 🏆",
        color: 'bg-emerald-950/80 border-emerald-700 text-emerald-300',
      };
    }
    if (gpa >= 3.5) {
      return {
        label: 'First Class / Honors 🌟',
        color: 'bg-indigo-950/80 border-indigo-700 text-indigo-300',
      };
    }
    if (gpa >= 3.0) {
      return {
        label: 'Good Standing 👍',
        color: 'bg-cyan-950/80 border-cyan-700 text-cyan-300',
      };
    }
    if (gpa >= 2.5) {
      return {
        label: 'Satisfactory ℹ️',
        color: 'bg-amber-950/80 border-amber-700 text-amber-300',
      };
    }
    if (gpa > 0) {
      return {
        label: 'Academic Warning ⚠️',
        color: 'bg-rose-950/80 border-rose-700 text-rose-300',
      };
    }
    return {
      label: 'Not Calculated',
      color: 'bg-slate-900 border-slate-800 text-slate-400',
    };
  };

  const standing = getAcademicStanding(metrics.semesterGpa);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                GPA & CGPA Calculator
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono">
                  4.00 Max
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Calculate semester GPA from current courses, estimate grades, and plan cumulative CGPA goals.
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Semester Switcher */}
          {semesters.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
              <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={activeSemester?._id || ''}
                onChange={(e) => onSelectSemester(e.target.value || null)}
                className="bg-transparent text-slate-200 font-medium focus:outline-hidden cursor-pointer"
              >
                {semesters.map((s) => (
                  <option key={s._id} value={s._id} className="bg-slate-900 text-slate-200">
                    {s.name} {s.isActive ? '• Active' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Scale Switcher Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setScaleType('ugc')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                scaleType === 'ugc'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Bangladesh UGC Standard 4.0 Scale (A+=4.0, A=3.75, A-=3.5, B+=3.25...)"
            >
              🇧🇩 BD UGC 4.0
            </button>
            <button
              type="button"
              onClick={() => setScaleType('standard')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                scaleType === 'standard'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="US / International Standard Scale (A=4.0, A-=3.7, B+=3.3...)"
            >
              Standard 4.0
            </button>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100 text-xs font-semibold transition cursor-pointer"
            title="Reset Grades"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Reset
          </button>
        </div>
      </div>

      {/* Main Scoreboard: 3 Key Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Semester GPA */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 shadow-lg space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              Semester GPA
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${standing.color}`}>
              {standing.label}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100">
              {metrics.semesterGpa.toFixed(2)}
            </span>
            <span className="text-sm font-bold text-slate-400 dark:text-slate-500 font-mono">/ 4.00</span>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Graded Credits: <strong className="text-slate-800 dark:text-slate-200 font-mono">{metrics.totalGradedCredits.toFixed(1)}</strong>
            </span>
            <span>
              Grade Points: <strong className="text-slate-800 dark:text-slate-200 font-mono">{metrics.totalGradePoints.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Card 2: Cumulative CGPA Quick Calc */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Cumulative CGPA
            </span>
            {cumulativeMetrics && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold uppercase">
                Updated
              </span>
            )}
          </div>

          {cumulativeMetrics ? (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-300">
                {cumulativeMetrics.newCgpa.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-slate-500 font-mono">/ 4.00</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-1">
              Enter previous CGPA and completed credits below to view cumulative result.
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block pb-0.5">Prev CGPA</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4.0"
                placeholder="e.g. 3.65"
                value={prevCgpa}
                onChange={(e) => setPrevCgpa(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block pb-0.5">Prev Credits</label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 45"
                value={prevCredits}
                onChange={(e) => setPrevCredits(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Target Goal Forecaster */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-violet-400" />
              Target Goal Forecaster
            </span>
          </div>

          {targetPlannerResult ? (
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                    targetPlannerResult.isAlreadyMet
                      ? 'text-emerald-400'
                      : targetPlannerResult.isAchievable
                      ? 'text-violet-300'
                      : 'text-rose-400'
                  }`}
                >
                  {targetPlannerResult.isAlreadyMet
                    ? 'Met!'
                    : targetPlannerResult.requiredGpa.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400">Required GPA</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                {targetPlannerResult.isAlreadyMet
                  ? 'Target already achieved!'
                  : targetPlannerResult.isAchievable
                  ? `Average GPA needed in the remaining ${remainingCredits} credits to graduate with ${targetCgpa} CGPA.`
                  : 'Goal is mathematically unattainable with current credit distribution (>4.00 required).'}
              </p>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-1">
              Test what GPA you need in remaining credits to achieve a dream graduating CGPA.
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block pb-0.5">Target CGPA</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4.0"
                placeholder="e.g. 3.75"
                value={targetCgpa}
                onChange={(e) => setTargetCgpa(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block pb-0.5">Remaining Cr</label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 30"
                value={remainingCredits}
                onChange={(e) => setRemainingCredits(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Warning Notice: If any course has missing credit */}
      {metrics.missingCreditCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-3 shadow-md">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <h4 className="text-xs font-bold text-amber-300">
              {metrics.missingCreditCount} {metrics.missingCreditCount === 1 ? 'Course Has' : 'Courses Have'} No Credit Set
            </h4>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Courses without a credit hour cannot be calculated into your GPA. Please set the credit hours directly in the table below (default is typically <strong className="text-amber-100 font-mono">3.0</strong> credits).
            </p>
          </div>
        </div>
      )}

      {/* Main Course Table / Calculation Cards */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Course Grades & Credit Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              Select expected or received letter grades to view your instant projected GPA.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddManualCourse}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Manual Course
            </button>
          </div>
        </div>

        {/* Empty State */}
        {coursesLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading semester courses...
          </div>
        ) : courseRows.length === 0 ? (
          <div className="p-12 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-3 max-w-md mx-auto">
            <Calculator className="w-10 h-10 text-indigo-400 mx-auto opacity-60" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-200">No Courses Found for this Semester</h4>
              <p className="text-xs text-slate-400">
                You can add courses in Academic Setup or use the manual "+ Add Manual Course" button above to calculate custom GPAs right now.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToSetup}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Go to Academic Setup
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {courseRows.map((row) => {
              const hasMissingCredit = !row.credit || row.credit <= 0;
              const currentGradePoint = getGradePoint(row);

              return (
                <div
                  key={row.id}
                  className={`p-3.5 sm:p-4 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    !row.isIncluded
                      ? 'bg-slate-950/40 border-slate-900 opacity-50'
                      : hasMissingCredit
                      ? 'bg-amber-950/15 border-amber-900/60'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Checkbox + Course Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={row.isIncluded}
                      onChange={() => handleToggleInclude(row.id)}
                      className="w-4 h-4 rounded-md border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 cursor-pointer"
                      title={row.isIncluded ? 'Included in GPA' : 'Excluded from GPA'}
                    />

                    {row.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                    )}

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {row.isCustom ? (
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCourseRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, name: val, code: val.slice(0, 6).toUpperCase() } : r
                                )
                              );
                            }}
                            placeholder="Custom Course Name"
                            className="text-xs font-bold text-slate-100 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 focus:outline-hidden focus:border-indigo-500"
                          />
                        ) : (
                          <>
                            <span className="font-mono font-bold text-xs text-indigo-300">
                              {row.code}
                            </span>
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {row.name}
                            </span>
                          </>
                        )}

                        {row.isCustom && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-semibold">
                            Manual
                          </span>
                        )}
                      </div>

                      {/* Missing credit warning badge if applicable */}
                      {hasMissingCredit && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-amber-950/80 border border-amber-800 text-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            Credit Not Set
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCreditChange(row.id, '3.0')}
                            className="text-[10px] font-semibold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                          >
                            Set to 3.0 Cr
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Credit input, Grade selector & Point indicator */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                    {/* Credit Input */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-slate-400 font-medium">Credits:</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="12.0"
                        placeholder="3.0"
                        value={row.credit}
                        onChange={(e) => handleCreditChange(row.id, e.target.value)}
                        className={`w-16 px-2 py-1 rounded-lg text-xs font-mono text-center font-bold focus:outline-hidden transition ${
                          hasMissingCredit
                            ? 'bg-amber-950/60 border border-amber-500 text-amber-200 focus:border-amber-400'
                            : 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-indigo-500'
                        }`}
                        title="Course Credit Hours"
                      />
                    </div>

                    {/* Grade Selector */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-slate-400 font-medium">Grade:</label>
                      <select
                        value={row.grade}
                        onChange={(e) => handleGradeChange(row.id, e.target.value)}
                        disabled={!row.isIncluded}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold font-mono focus:outline-hidden focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                      >
                        {activeScale.map((g) => (
                          <option key={g.letter} value={g.letter} className="bg-slate-900 text-slate-200 font-mono">
                            {g.letter} ({g.points.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Points Total */}
                    <div className="min-w-[64px] text-right">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {(
                          (typeof row.credit === 'number' ? row.credit : 0) * currentGradePoint
                        ).toFixed(2)}{' '}
                        <span className="text-[10px] text-slate-500 font-normal">pts</span>
                      </span>
                    </div>

                    {/* Delete button (for custom rows) */}
                    {row.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-300 transition cursor-pointer"
                        title="Remove Course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grading Scale Reference Reference Table (Collapsible / Informative) */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            Grading Scale Reference ({scaleType === 'ugc' ? 'Bangladesh UGC Standard' : 'International Standard'})
          </h4>
          <span className="text-[10px] text-slate-500">
            {scaleType === 'ugc' ? 'Approved by University Grants Commission' : 'Standard 4.0 GPA Scale'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {activeScale.map((grade) => (
            <div
              key={grade.letter}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-slate-100 font-mono">{grade.letter}</span>
                {grade.percentage && (
                  <p className="text-[9px] text-slate-500">{grade.percentage}</p>
                )}
              </div>
              <span className="text-xs font-mono font-black text-indigo-400">
                {grade.points.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
