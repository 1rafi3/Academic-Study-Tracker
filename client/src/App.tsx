import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './context/AuthContext.js';
import { AuthScreen } from './components/auth/AuthScreen.js';
import { LoadingScreen } from './components/auth/LoadingScreen.js';
import { Navbar } from './components/Navbar.js';
import type { TabType } from './components/Navbar.js';
import { useKeepAlive } from './hooks/useKeepAlive.js';
import { CalendarDashboard } from './components/CalendarDashboard.js';
import { CourseNotesTimeline } from './components/CourseNotesTimeline.js';
import { AttendanceAnalytics } from './components/AttendanceAnalytics.js';
import { WeeklyRoutine } from './components/WeeklyRoutine.js';
import { BackupData } from './components/BackupData.js';
import { SemesterManager } from './components/SemesterManager.js';
import { CourseManager } from './components/CourseManager.js';
import { ScheduleManager } from './components/ScheduleManager.js';
import { ClassInstanceManager } from './components/ClassInstanceManager.js';
import { GpaCalculator } from './components/GpaCalculator.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function MainDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const handleSelectSemester = (id: string | null) => {
    setSelectedSemesterId(id);
    setSelectedCourseId(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-3 sm:p-6 md:p-8 selection:bg-indigo-500/30 selection:text-indigo-200 print:p-0 print:m-0 print:bg-white print:min-h-0 transition-colors duration-200">
      {/* Dynamic atmospheric background glow accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 print:hidden opacity-75">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-indigo-600/15 dark:bg-indigo-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-violet-600/10 dark:bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-10 w-72 h-72 bg-blue-600/10 dark:bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-5xl relative z-10 space-y-6 print:max-w-full print:space-y-0 print:m-0 print:p-0">
        {/* Top Navbar with tabs & theme toggle */}
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

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
              onNavigateToGpa={() => setActiveTab('gpa')}
            />
          </main>
        )}

        {/* Tab: GPA & CGPA Calculator */}
        {activeTab === 'gpa' && (
          <main className="space-y-6">
            <GpaCalculator
              selectedSemesterId={selectedSemesterId}
              onSelectSemester={handleSelectSemester}
              onNavigateToSetup={() => setActiveTab('academic')}
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
            {/* Section 1: Semesters */}
            <section className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <SemesterManager
                selectedSemesterId={selectedSemesterId}
                onSelectSemester={handleSelectSemester}
              />
            </section>

            {/* Section 2: Courses */}
            <section className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <CourseManager
                selectedSemesterId={selectedSemesterId}
                selectedCourseId={selectedCourseId}
                onSelectCourse={setSelectedCourseId}
              />
            </section>

            {/* Section 3: Schedules */}
            <section className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <ScheduleManager selectedCourseId={selectedCourseId} />
            </section>
          </main>
        )}

        {/* Footer */}
        <footer className="border-t border-slate-800/80 pt-4 text-center text-xs text-slate-500 print:hidden">
          <p>Academic Study Tracker &bull; Your All-in-One University Companion</p>
        </footer>
      </div>
    </div>
  );
}

export function App() {
  const { isLoading, isAuthenticated } = useAuth();

  // Keep Render free-tier backend alive by pinging /api/health every 10 minutes
  useKeepAlive();

  // Security hardening: Purge all cached academic queries upon logout or session termination
  useEffect(() => {
    if (!isAuthenticated) {
      queryClient.clear();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MainDashboard />
    </QueryClientProvider>
  );
}

export default App;
