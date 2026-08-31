import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalendarDashboard } from './components/CalendarDashboard.js';
import { CourseNotesTimeline } from './components/CourseNotesTimeline.js';
import { AttendanceAnalytics } from './components/AttendanceAnalytics.js';
import { WeeklyRoutine } from './components/WeeklyRoutine.js';
import { BackupData } from './components/BackupData.js';
import { SemesterManager } from './components/SemesterManager.js';
import { CourseManager } from './components/CourseManager.js';
import { ScheduleManager } from './components/ScheduleManager.js';
import { ClassInstanceManager } from './components/ClassInstanceManager.js';
import { 
  Activity, 
  Database, 
  Server, 
  Globe, 
  RefreshCw, 
  Layers, 
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Calendar as CalendarIcon,
  FileText,
  Target,
  Clock
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface HealthResponse {
  status: string;
  message: string;
  service: string;
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
  database: {
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    error: string | null;
    host: string | null;
    database: string | null;
  };
}

function MainDashboard() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'notes' | 'routine' | 'analytics' | 'backup' | 'classes' | 'academic' | 'health'>('calendar');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Health State
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    const startTime = performance.now();

    try {
      const response = await fetch('/api/health');
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));

      if (!response.ok) {
        throw new Error(`Server returned status HTTP ${response.status}: ${response.statusText}`);
      }

      const data: HealthResponse = await response.json();
      setHealthData(data);
      setLastChecked(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reach backend server';
      setHealthError(msg);
      setHealthData(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleSelectSemester = (id: string | null) => {
    setSelectedSemesterId(id);
    setSelectedCourseId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-8 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background glow accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-5xl relative z-10 space-y-6">
        {/* Top Navbar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-100">
                  Academic Study Tracker
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/50 text-indigo-300 text-[10px] font-semibold uppercase tracking-wider">
                  Phase 9
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Calendar &bull; Study Notes &bull; Weekly Routine &bull; Analytics &bull; Schedule &bull; Backup & Exports
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center p-1 rounded-xl bg-slate-900 border border-slate-800 gap-0.5">
            <button
              id="tab-calendar-btn"
              onClick={() => setActiveTab('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Calendar
            </button>
            <button
              id="tab-notes-btn"
              onClick={() => setActiveTab('notes')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Study Notes
            </button>
            <button
              id="tab-routine-btn"
              onClick={() => setActiveTab('routine')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'routine'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Weekly Routine
            </button>
            <button
              id="tab-analytics-btn"
              onClick={() => setActiveTab('analytics')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              Analytics
            </button>
            <button
              id="tab-backup-btn"
              onClick={() => setActiveTab('backup')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Backup & Data
            </button>
            <button
              id="tab-classes-btn"
              onClick={() => setActiveTab('classes')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'classes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Classes
            </button>
            <button
              id="tab-academic-btn"
              onClick={() => setActiveTab('academic')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'academic'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Academic Setup
            </button>
            <button
              id="tab-health-btn"
              onClick={() => setActiveTab('health')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Diagnostics
            </button>
          </div>
        </header>

        {/* Tab 1: Main Academic Calendar & Dashboard */}
        {activeTab === 'calendar' && (
          <main className="space-y-6">
            <CalendarDashboard
              selectedSemesterId={selectedSemesterId}
              onSelectSemester={handleSelectSemester}
              onNavigateToSetup={() => setActiveTab('academic')}
              onNavigateToGenerator={() => setActiveTab('classes')}
            />
          </main>
        )}

        {/* Tab 2: Study Notes & Chronological Lecture Timeline (Phase 5) */}
        {activeTab === 'notes' && (
          <main className="space-y-6">
            <CourseNotesTimeline
              selectedSemesterId={selectedSemesterId}
              onSelectSemester={handleSelectSemester}
              onNavigateToSetup={() => setActiveTab('academic')}
              onNavigateToGenerator={() => setActiveTab('classes')}
            />
          </main>
        )}

        {/* Tab 3: Weekly Routine Generator, Print & PDF Export (Phase 9) */}
        {activeTab === 'routine' && (
          <main className="space-y-6">
            <WeeklyRoutine
              selectedSemesterId={selectedSemesterId}
              onSelectSemester={handleSelectSemester}
              onNavigateToSetup={() => setActiveTab('academic')}
            />
          </main>
        )}

        {/* Tab 4: Attendance Analytics, Targets & Bunk/Recovery Forecast (Phase 7) */}
        {activeTab === 'analytics' && (
          <main className="space-y-6">
            <AttendanceAnalytics
              selectedSemesterId={selectedSemesterId}
              onSelectSemester={handleSelectSemester}
              onNavigateToCalendar={() => setActiveTab('calendar')}
              onNavigateToNotes={() => setActiveTab('notes')}
            />
          </main>
        )}

        {/* Tab 4: Backup, Restore, CSV Exports & Reports (Phase 8) */}
        {activeTab === 'backup' && (
          <main className="space-y-6">
            <BackupData
              selectedSemesterId={selectedSemesterId}
              onSelectSemester={handleSelectSemester}
            />
          </main>
        )}

        {/* Tab 5: Class Instances & Attendance Tracking */}
        {activeTab === 'classes' && (
          <main className="space-y-6">
            <ClassInstanceManager
              selectedSemesterId={selectedSemesterId}
              onSelectSemester={handleSelectSemester}
            />
          </main>
        )}

        {/* Tab 4: Academic Setup (Semesters, Courses, Schedules) */}
        {activeTab === 'academic' && (
          <main className="space-y-6">
            {/* Hierarchy Guide */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-300">
              <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-200">Hierarchy:</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-medium">1. Semester</span>
                <span className="text-slate-500">&rarr;</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-medium">2. Course</span>
                <span className="text-slate-500">&rarr;</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-medium">3. Weekly Schedule</span>
                <span className="text-slate-500">&rarr;</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-medium">4. Class Occurrences</span>
                <span className="text-slate-500">&rarr;</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-medium border border-emerald-800/50">5. Study Notes & Timeline (Phase 5 Active)</span>
              </div>
            </div>

            {/* Section 1: Semesters */}
            <section className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <SemesterManager
                selectedSemesterId={selectedSemesterId}
                onSelectSemester={handleSelectSemester}
              />
            </section>

            {/* Section 2: Courses */}
            <section className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <CourseManager
                selectedSemesterId={selectedSemesterId}
                selectedCourseId={selectedCourseId}
                onSelectCourse={setSelectedCourseId}
              />
            </section>

            {/* Section 3: Schedules */}
            <section className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <ScheduleManager selectedCourseId={selectedCourseId} />
            </section>
          </main>
        )}

        {/* Tab 5: System Health Diagnostics */}
        {activeTab === 'health' && (
          <main className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase">Frontend</span>
                  <Globe className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-xl font-bold text-slate-100 mt-2">Vite + React</p>
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" /> Operational
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase">Backend API</span>
                  <Server className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-xl font-bold text-slate-100 mt-2">Node / Express</p>
                {healthLoading ? (
                  <p className="text-xs text-slate-400 mt-1">Checking health...</p>
                ) : healthError ? (
                  <p className="text-xs text-rose-400 mt-1 font-medium">{healthError}</p>
                ) : (
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> {healthData?.status === 'ok' ? 'Healthy' : 'Degraded'}
                    {latency !== null && <span className="text-slate-400 font-normal">({latency}ms)</span>}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase">Database</span>
                  <Database className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xl font-bold text-slate-100 mt-2">MongoDB Atlas</p>
                {healthLoading ? (
                  <p className="text-xs text-slate-400 mt-1">Connecting...</p>
                ) : healthData?.database?.status === 'connected' ? (
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Connected
                    <span className="text-slate-400 font-normal truncate max-w-[120px]">({healthData.database.database || 'academic_tracker'})</span>
                  </p>
                ) : (
                  <p className="text-xs text-amber-400 mt-1 font-medium">
                    {healthData?.database?.status || 'Disconnected'}
                  </p>
                )}
              </div>
            </div>

            {/* Diagnostic Details */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  Live Diagnostics
                </h3>
                <button
                  onClick={fetchHealth}
                  disabled={healthLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 text-xs font-medium transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {healthData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block">Service</span>
                    <span className="text-slate-200 font-mono font-medium">{healthData.service}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block">Environment</span>
                    <span className="text-slate-200 font-mono font-medium">{healthData.environment}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block">Uptime</span>
                    <span className="text-slate-200 font-mono font-medium">{Math.floor(healthData.uptimeSeconds / 60)}m {Math.floor(healthData.uptimeSeconds % 60)}s</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block">Host Shard</span>
                    <span className="text-slate-200 font-mono font-medium truncate block">{healthData.database.host || 'Atlas'}</span>
                  </div>
                </div>
              )}

              {lastChecked && (
                <p className="text-[11px] text-slate-500 text-right">
                  Last checked: {lastChecked.toLocaleTimeString()}
                </p>
              )}
            </div>
          </main>
        )}

        {/* Footer */}
        <footer className="border-t border-slate-800/80 pt-4 text-center text-xs text-slate-500">
          <p>Academic Study Tracker &bull; Phase 5 &bull; Built with React, Vite, Node.js, Express & MongoDB Atlas</p>
        </footer>
      </div>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainDashboard />
    </QueryClientProvider>
  );
}

export default App;
