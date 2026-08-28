import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  CalendarCheck
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
  const [activeTab, setActiveTab] = useState<'classes' | 'academic' | 'health'>('classes');
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
                  Phase 3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Class Instances &bull; Attendance Tracking &bull; Academic Schedule Engine
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              id="tab-classes-btn"
              onClick={() => setActiveTab('classes')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'classes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Classes & Attendance
            </button>
            <button
              id="tab-academic-btn"
              onClick={() => setActiveTab('academic')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
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
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              System Diagnostics
            </button>
          </div>
        </header>

        {/* Tab 1: Class Instances & Attendance Tracking */}
        {activeTab === 'classes' && (
          <main className="space-y-6">
            <ClassInstanceManager
              selectedSemesterId={selectedSemesterId}
              onSelectSemester={handleSelectSemester}
            />
          </main>
        )}

        {/* Tab 2: Academic Setup (Semesters, Courses, Schedules) */}
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
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-medium border border-emerald-800/50">4. Class Instances (Phase 3 Active)</span>
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

        {/* Tab 3: System Health Diagnostics */}
        {activeTab === 'health' && (
          <main className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase">Frontend</span>
                  <Globe className="w-4 h-4 text-blue-400" />
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-200 text-sm">React 19 + Vite</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">TanStack Query &bull; Tailwind CSS</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase">Backend API</span>
                  <Server className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    {healthData ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-slate-200 text-sm">Express Running</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span className="font-semibold text-rose-400 text-sm">Disconnected</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Node.js &bull; Port 5000</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase">Database</span>
                  <Database className="w-4 h-4 text-teal-400" />
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    {healthData?.database.status === 'connected' ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-slate-200 text-sm">Connected</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="font-semibold text-amber-300 text-sm">Standby / Unconnected</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {healthData?.database.status === 'connected'
                      ? `Host: ${healthData.database.host || 'MongoDB Atlas'}`
                      : 'Requires MONGODB_URI'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Live Health Check Payload</h3>
                  <p className="text-xs text-slate-500">Endpoint: <code className="text-indigo-300">GET /api/health</code></p>
                </div>
                <div className="flex items-center gap-2">
                  {lastChecked && (
                    <span className="text-xs text-slate-500">
                      Checked {lastChecked.toLocaleTimeString()}
                    </span>
                  )}
                  {latency !== null && (
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                      {latency}ms
                    </span>
                  )}
                  <button
                    onClick={fetchHealth}
                    disabled={healthLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {healthError ? (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                  {healthError}
                </div>
              ) : healthData ? (
                <pre className="bg-slate-950 p-4 rounded-xl font-mono text-xs overflow-x-auto text-slate-300">
                  {JSON.stringify(healthData, null, 2)}
                </pre>
              ) : null}
            </div>
          </main>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-slate-600 pt-4 border-t border-slate-800/40">
          Academic Study Tracker &bull; Phase 3: Class Instance Generation & Attendance Foundation
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
