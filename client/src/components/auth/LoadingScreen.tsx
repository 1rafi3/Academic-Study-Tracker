import React from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center space-y-4 text-center">
        <div className="relative">
          <div className="p-4 rounded-3xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400 shadow-2xl shadow-indigo-950/60 animate-pulse">
            <GraduationCap className="w-10 h-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-slate-950 border border-indigo-600 text-indigo-400 shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-100">
            Academic Study Tracker
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Verifying secure session...
          </p>
        </div>
      </div>
    </div>
  );
};
