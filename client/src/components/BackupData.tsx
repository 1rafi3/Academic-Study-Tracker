import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { backupApi, semesterApi, authApi, type LegacyMigrationResult } from '../api/academicApi.js';
import type {
  ISemester,
  IBackupPayload,
  IBackupValidationResult,
} from '../types/academic.js';
import { ImportPreviewModal } from './ImportPreviewModal.js';
import { SemesterSummaryModal } from './SemesterSummaryModal.js';
import {
  Download,
  Upload,
  FileSpreadsheet,
  Printer,
  Layers,
  Database,
  CalendarCheck,
  Tag,
  BookOpen,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { useToast } from '../context/ToastContext.js';

interface Props {
  selectedSemesterId: string | null;
  onSelectSemester: (id: string | null) => void;
}

export const BackupData: React.FC<Props> = ({
  selectedSemesterId,
  onSelectSemester,
}) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [migrationSecret, setMigrationSecret] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<LegacyMigrationResult | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [backupPayload, setBackupPayload] = useState<IBackupPayload | null>(null);
  const [validationResult, setValidationResult] = useState<IBackupValidationResult | null>(null);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Semesters
  const { data: semesters = [] } = useQuery<ISemester[]>({
    queryKey: ['semesters'],
    queryFn: () => semesterApi.getAll(),
  });

  // Check if unassigned legacy records exist from pre-auth
  const { data: legacyStatus } = useQuery({
    queryKey: ['legacy-status'],
    queryFn: () => authApi.getLegacyStatus(),
  });

  const activeSemester = useMemo(() => {
    if (selectedSemesterId) {
      return semesters.find((s) => s._id === selectedSemesterId) || null;
    }
    return semesters.find((s) => s.isActive) || semesters[0] || null;
  }, [semesters, selectedSemesterId]);

  // Keep selected semester in sync if not set
  React.useEffect(() => {
    if (!selectedSemesterId && activeSemester) {
      onSelectSemester(activeSemester._id);
    }
  }, [selectedSemesterId, activeSemester, onSelectSemester]);

  // 1. JSON Export Handler
  const handleExportJson = async () => {
    try {
      setIsExportingJson(true);
      const data = await backupApi.exportJson();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `academic_tracker_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('JSON Backup downloaded successfully!', 'success');
    } catch (err: unknown) {
      showToast(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setIsExportingJson(false);
    }
  };

  // 2. File Upload & Validation Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    try {
      const text = await file.text();
      let parsed: IBackupPayload;
      try {
        parsed = JSON.parse(text);
      } catch (jsonErr: unknown) {
        setFileError('Invalid JSON format: The selected file is not a valid JSON document.');
        showToast('Invalid JSON format in selected file.', 'error');
        return;
      }

      const validation = await backupApi.validateBackup(parsed);
      setBackupPayload(parsed);
      setValidationResult(validation);
      setIsImportModalOpen(true);
      showToast('Backup file validated. Review items to import.', 'info');
    } catch (err: unknown) {
      const msg = `Failed to process backup file: ${err instanceof Error ? err.message : 'Server error occurred'}`;
      setFileError(msg);
      showToast(msg, 'error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // CSV Trigger Helpers (Authenticated Blob Download)
  const handleDownloadCsv = async (downloadFn: () => Promise<Blob>, filename: string) => {
    try {
      const blob = await downloadFn();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showToast(`Report downloaded: ${filename}`, 'success');
    } catch (err: unknown) {
      showToast(`CSV download failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            Data Backup, Export & Academic Reports
          </h2>
          <p className="text-xs text-slate-400">
            Export complete JSON backups, download CSV spreadsheets, and generate printable semester summaries.
          </p>
        </div>

        {/* Semester Selector */}
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
          <select
            value={activeSemester?._id || ''}
            onChange={(e) => onSelectSemester(e.target.value || null)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
          >
            {semesters.map((sem) => (
              <option key={sem._id} value={sem._id}>
                {sem.name} {sem.isActive ? '• Active' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {fileError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {fileError}
        </div>
      )}

      {/* Main Grid: 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Full JSON Backup (Export) */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/50 text-indigo-300 font-bold uppercase tracking-wider">
                Full Backup
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-100">Export Full Academic Backup</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Save a complete, versioned JSON backup of all your semesters, courses, schedules, class occurrences, attendance records, study notes, and academic events.
            </p>
          </div>

          <button
            type="button"
            disabled={isExportingJson}
            onClick={handleExportJson}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExportingJson ? 'Generating Backup...' : 'Export Full Backup (.JSON)'}
          </button>
        </div>

        {/* Card 2: Restore / Import Backup */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-700/60 text-purple-400">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-700/50 text-purple-300 font-bold uppercase tracking-wider">
                Restore Data
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-100">Import & Restore Backup</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload a previously exported JSON backup to safely restore your data with relational mapping and duplicate protection.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <Upload className="w-4 h-4 text-purple-400" />
              Select Backup JSON File
            </button>
          </div>
        </div>

        {/* Card 3: CSV Spreadsheet Exports */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/50 text-emerald-300 font-bold uppercase tracking-wider">
                Excel / Sheets
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-100">Export CSV Spreadsheets</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Download clean spreadsheet-ready CSV files compatible with Microsoft Excel, Google Sheets, and Numbers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDownloadCsv(() => backupApi.downloadAttendanceCsv(activeSemester?._id), 'attendance_export.csv')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
              Attendance CSV
            </button>

            <button
              type="button"
              onClick={() => handleDownloadCsv(() => backupApi.downloadCoursesCsv(activeSemester?._id), 'courses_export.csv')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Courses CSV
            </button>

            <button
              type="button"
              onClick={() => handleDownloadCsv(() => backupApi.downloadEventsCsv(activeSemester?._id), 'academic_events_export.csv')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              Events CSV
            </button>
          </div>
        </div>

        {/* Card 4: Printable Semester Summary & PDF */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-violet-950/80 border border-violet-700/60 text-violet-400">
                <Printer className="w-5 h-5" />
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-950 border border-violet-700/50 text-violet-300 font-bold uppercase tracking-wider">
                Print & PDF
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-100">Semester Summary & PDF Report</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate a printable academic performance report for{' '}
              <span className="text-slate-200 font-semibold">{activeSemester?.name || 'Selected Semester'}</span> with attendance rates, topics covered, and assessment schedules.
            </p>
          </div>

          <button
            type="button"
            disabled={!activeSemester}
            onClick={() => setIsSummaryModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Generate Semester Report (Print / PDF)
          </button>
        </div>

        {/* Card 5: One-Time Legacy Data Migration (Only visible if unclaimed pre-auth records exist) */}
        {legacyStatus?.hasUnclaimedData && (
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col justify-between space-y-4 md:col-span-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-700/60 text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 border border-amber-700/50 text-amber-300 font-bold uppercase tracking-wider">
                  Account Ownership
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-100">Claim Existing Academic Data</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If you used Academic Tracker before multi-user authentication was introduced, safely link your existing semesters, courses, routine instances, study notes, and events directly to your authenticated account.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <span className="text-xs text-slate-400">
                Safe &bull; Idempotent &bull; Never deletes or overwrites existing records
              </span>
              <button
                type="button"
                onClick={() => {
                  setClaimError(null);
                  setClaimResult(null);
                  setMigrationSecret('');
                  setIsClaimModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                Claim Existing Academic Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Claim Legacy Data Modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-950/80 border border-amber-700/60 text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Claim Existing Academic Data
                  </h3>
                  <p className="text-xs text-slate-400">
                    One-time safe legacy account migration
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-1.5">
              <p className="font-semibold text-slate-200">
                What does this migration do?
              </p>
              <p className="text-slate-400">
                This will link your existing Academic Tracker data to your current account. This action does not delete or modify your academic information.
              </p>
            </div>

            {/* Error banner */}
            {claimError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{claimError}</div>
              </div>
            )}

            {/* Success summary banner */}
            {claimResult && (
              <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Migration Complete</span>
                </div>
                <p className="text-slate-300">{claimResult.message}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-800/50 text-center">
                  <div className="p-2 rounded-xl bg-emerald-900/40">
                    <div className="text-base font-extrabold text-emerald-200">
                      {claimResult.migrated.semesters}
                    </div>
                    <div className="text-[10px] text-emerald-400 uppercase">Semesters</div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-900/40">
                    <div className="text-base font-extrabold text-emerald-200">
                      {claimResult.migrated.courses}
                    </div>
                    <div className="text-[10px] text-emerald-400 uppercase">Courses</div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-900/40">
                    <div className="text-base font-extrabold text-emerald-200">
                      {claimResult.migrated.classInstances}
                    </div>
                    <div className="text-[10px] text-emerald-400 uppercase">Classes</div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-900/40">
                    <div className="text-base font-extrabold text-emerald-200">
                      {claimResult.migrated.academicEvents}
                    </div>
                    <div className="text-[10px] text-emerald-400 uppercase">Events</div>
                  </div>
                </div>
                <div className="text-right text-[11px] text-emerald-400 font-semibold pt-1">
                  Total Records Secured: {claimResult.totalMigrated}
                </div>
              </div>
            )}

            {!claimResult && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setClaimError(null);
                  try {
                    setIsClaiming(true);
                    const res = await authApi.claimLegacyData(migrationSecret.trim() || undefined);
                    setClaimResult(res);
                    await queryClient.invalidateQueries();
                  } catch (err: unknown) {
                    setClaimError(
                      err instanceof Error ? err.message : 'Failed to claim legacy data.'
                    );
                  } finally {
                    setIsClaiming(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    Migration Authorization Secret
                  </label>
                  <input
                    type="password"
                    placeholder="Enter migration authorization secret"
                    value={migrationSecret}
                    disabled={isClaiming}
                    onChange={(e) => setMigrationSecret(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-medium placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={isClaiming}
                    onClick={() => setIsClaimModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isClaiming}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Securing Legacy Records...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Confirm & Claim Data</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {claimResult && (
              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      <ImportPreviewModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setBackupPayload(null);
          setValidationResult(null);
        }}
        backupPayload={backupPayload}
        validationResult={validationResult}
        semesters={semesters}
      />

      {/* Semester Summary Modal */}
      <SemesterSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        semesterId={activeSemester?._id || null}
      />
    </div>
  );
};
