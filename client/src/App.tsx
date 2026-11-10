import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './context/AuthContext.js';
import { useUITheme } from './context/UIThemeContext.js';
import { AuthScreen } from './components/auth/AuthScreen.js';
import { LoadingScreen } from './components/auth/LoadingScreen.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
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
import { SeasonalBackground } from './components/seasonal/SeasonalBackground.js';
import { isEmailVerificationRequired } from './utils/authUtils.js';
import { VerifyEmailScreen } from './components/auth/VerifyEmailScreen.js';
import { useToast } from './context/ToastContext.js';

const LAST_ACTIVE_SEMESTER_KEY = 'academic_tracker_active_semester_id';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes: instant 0ms tab switching from cache!
      gcTime: 30 * 60 * 1000, // 30 minutes in-memory cache lifecycle
      refetchOnReconnect: true,
    },
  },
});

function MainDashboard() {
  const { uiTheme } = useUITheme();
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_ACTIVE_SEMESTER_KEY);
    } catch {
      return null;
    }
  });
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleSelectSemester = (id: string | null) => {
    setSelectedSemesterId(id);
    setSelectedCourseId(null);
    try {
      if (id) {
        localStorage.setItem(LAST_ACTIVE_SEMESTER_KEY, id);
      } else {
        localStorage.removeItem(LAST_ACTIVE_SEMESTER_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  };

  return (
    <div
      data-ui-theme={uiTheme}
      className="min-h-screen flex flex-col items-center p-2.5 sm:p-4 md:p-5 selection:bg-indigo-500/30 selection:text-indigo-200 print:p-0 print:m-0 print:bg-white print:min-h-0 transition-colors duration-200"
    >
      {/* Dynamic atmospheric background grid & glow accents */}
      <SeasonalBackground />
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 print:hidden">
        {/* Subtle Modern Tech Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern mask-radial-faded" />

        {/* Ambient atmospheric glow spots */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] bg-indigo-600/15 dark:bg-indigo-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-violet-600/10 dark:bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-10 w-72 h-72 bg-blue-600/10 dark:bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[1580px] relative z-10 flex flex-col space-y-4 print:max-w-full print:space-y-0 print:m-0 print:p-0">
        {/* Holy Grail Top Header (Sleek single row) */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Holy Grail Body: Left Sidebar + Center/Right Workspace */}
        <div className="flex-1 w-full flex flex-col md:flex-row gap-5 items-start">
          {/* Left Navigation Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isMobileOpen={isMobileSidebarOpen}
            setIsMobileOpen={setIsMobileSidebarOpen}
          />

          {/* Center Main Content Area */}
          <div className="flex-1 min-w-0 w-full space-y-5">
            {/* Tab 1: Main Academic Calendar & Dashboard */}
            {activeTab === 'calendar' && (
              <main className="space-y-5">
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
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200/90 dark:border-slate-800/80 pt-4 pb-2 text-center text-xs text-slate-500 dark:text-slate-400 print:hidden space-y-1">
          <p>Academic Study Tracker &bull; Your All-in-One University Companion</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Created by <span className="font-semibold text-slate-700 dark:text-slate-300">MD Sheik Rafiwol Karim Rafi</span>
          </p>
        </footer>
      </div>
    </div>
  );
}

export function App() {
  const { user, isLoading, isAuthenticated, completeEmailVerification } = useAuth();
  const { showToast } = useToast();

  // Detect and handle security URL parameters (Password Reset & Email Verification links)
  const [urlAuthAction, setUrlAuthAction] = useState<{
    mode: 'reset-password' | 'verify-email';
    userId: string;
    secret: string;
  } | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const userId = params.get('userId');
      const secret = params.get('secret');
      const mode = params.get('mode');

      if (userId && secret) {
        if (mode === 'verify-email') {
          return { mode: 'verify-email', userId, secret };
        }
        return { mode: 'reset-password', userId, secret };
      }
    } catch {
      // Ignore URL parsing errors
    }
    return null;
  });

  const clearUrlAuthParams = () => {
    setUrlAuthAction(null);
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch {
      // Ignore history manipulation errors
    }
  };

  // If email verification link is detected in URL, auto-verify!
  useEffect(() => {
    if (urlAuthAction?.mode === 'verify-email') {
      completeEmailVerification(urlAuthAction.userId, urlAuthAction.secret)
        .then(() => {
          showToast(
            'Email verified successfully! Welcome to your Academic Tracker.',
            'success',
            6000
          );
          clearUrlAuthParams();
        })
        .catch((err: unknown) => {
          const msg =
            err instanceof Error
              ? err.message
              : 'Email verification link is invalid or has expired.';
          showToast(msg, 'error', 6000);
          clearUrlAuthParams();
        });
    }
  }, [urlAuthAction, completeEmailVerification, showToast]);

  // Keep Render free-tier backend alive by pinging /api/health every 10 minutes
  useKeepAlive();

  // Security hardening: Purge all cached academic queries upon logout or session termination
  useEffect(() => {
    if (!isAuthenticated) {
      queryClient.clear();
    }
  }, [isAuthenticated]);

  // Handle incoming password reset links even before checking existing session
  if (urlAuthAction?.mode === 'reset-password') {
    return (
      <AuthScreen
        initialMode="reset-password"
        recoveryUserId={urlAuthAction.userId}
        recoverySecret={urlAuthAction.secret}
        onClearUrlParams={clearUrlAuthParams}
      />
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthScreen onClearUrlParams={clearUrlAuthParams} />;
  }

  // Mandatory Email Verification gatekeeping (rafi2nd@gmail.com is strictly exempt)
  if (isEmailVerificationRequired(user)) {
    return <VerifyEmailScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MainDashboard />
    </QueryClientProvider>
  );
}

export default App;
