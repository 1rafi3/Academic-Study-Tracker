import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { backupApi } from '../api/academicApi.js';
import type { IBackupPayload, IBackupValidationResult, ISemester } from '../types/academic.js';
import {
  UploadCloud,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Layers,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  backupPayload: IBackupPayload | null;
  validationResult: IBackupValidationResult | null;
  semesters: ISemester[];
}

export const ImportPreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  backupPayload,
  validationResult,
  semesters,
}) => {
  const queryClient = useQueryClient();
  const [importMode, setImportMode] = useState<'add_missing' | 'replace_semester'>('add_missing');
  const [targetSemesterId, setTargetSemesterId] = useState<string>(semesters[0]?._id || '');
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (data: {
      backup: IBackupPayload;
      mode: 'add_missing' | 'replace_semester';
      targetSemesterId?: string;
    }) => backupApi.importBackup(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
      queryClient.invalidateQueries({ queryKey: ['academic-events'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-analytics'] });

      const msg = `Successfully imported: ${res.semesters.inserted} semesters, ${res.courses.inserted} courses, ${res.classInstances.inserted} classes, ${res.academicEvents.inserted} events (${res.semesters.skipped + res.courses.skipped + res.classInstances.skipped + res.academicEvents.skipped} matching records skipped).`;
      setImportSuccessMessage(msg);
      setImportError(null);
    },
    onError: (err: Error) => {
      setImportError(err.message || 'Failed to import backup');
      setImportSuccessMessage(null);
    },
  });

  if (!isOpen || !backupPayload || !validationResult) return null;

  const isValid = validationResult.isValid;
  const counts = validationResult.preview?.counts;

  const handleExecuteImport = () => {
    setImportError(null);
    setImportSuccessMessage(null);
    importMutation.mutate({
      backup: backupPayload,
      mode: importMode,
      targetSemesterId: importMode === 'replace_semester' ? targetSemesterId : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between shrink-0 bg-slate-900">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-400" />
              Backup Import Preview & Validation
            </h3>
            <p className="text-xs text-slate-400">
              Review records before safely applying changes to your academic database.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1 text-xs">
          {importSuccessMessage ? (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Import Complete!
              </div>
              <p className="text-xs leading-relaxed">{importSuccessMessage}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer"
              >
                Close & Return
              </button>
            </div>
          ) : (
            <>
              {/* Validation Status Banner */}
              {isValid ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-2.5 text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold">Backup Verified Successfully</p>
                    <p className="text-[11px] text-emerald-300/80">
                      Created on: {new Date(backupPayload.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 space-y-2 text-rose-300">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                    Backup Validation Failed
                  </div>
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Records Found Grid */}
              {counts && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Semesters</span>
                    <span className="text-lg font-bold font-mono text-slate-100">{counts.semesters.total}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Courses</span>
                    <span className="text-lg font-bold font-mono text-slate-100">{counts.courses.total}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Classes</span>
                    <span className="text-lg font-bold font-mono text-slate-100">{counts.classInstances.total}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Events</span>
                    <span className="text-lg font-bold font-mono text-slate-100">{counts.academicEvents.total}</span>
                  </div>
                </div>
              )}

              {/* Import Strategy Mode Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-200 block">
                  Select Import Strategy:
                </label>

                <div className="grid grid-cols-1 gap-2">
                  {/* Mode A: Safe Add Missing */}
                  <label
                    onClick={() => setImportMode('add_missing')}
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      importMode === 'add_missing'
                        ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/40 text-slate-200'
                        : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'add_missing'}
                      onChange={() => setImportMode('add_missing')}
                      className="mt-1 accent-indigo-500"
                    />
                    <div>
                      <p className="font-bold text-xs text-slate-100">Add Missing Data (Recommended)</p>
                      <p className="text-[11px] text-slate-400">
                        Existing records remain untouched. Any matching duplicate classes or courses are skipped safely.
                      </p>
                    </div>
                  </label>

                  {/* Mode B: Replace Selected Semester */}
                  <label
                    onClick={() => setImportMode('replace_semester')}
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      importMode === 'replace_semester'
                        ? 'bg-rose-950/40 border-rose-600 ring-1 ring-rose-600/40 text-slate-200'
                        : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace_semester'}
                      onChange={() => setImportMode('replace_semester')}
                      className="mt-1 accent-rose-500"
                    />
                    <div>
                      <p className="font-bold text-xs text-rose-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Replace Existing Semester
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Wipes and replaces the selected semester's courses and classes with the backup's data.
                      </p>
                    </div>
                  </label>
                </div>

                {importMode === 'replace_semester' && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 mt-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Target Semester to Replace:
                    </label>
                    <select
                      value={targetSemesterId}
                      onChange={(e) => setTargetSemesterId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-rose-500 transition cursor-pointer"
                    >
                      {semesters.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.year} {s.term})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {importError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {importError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!importSuccessMessage && (
          <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isValid || importMutation.isPending}
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              {importMutation.isPending ? 'Importing...' : 'Confirm & Restore'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
