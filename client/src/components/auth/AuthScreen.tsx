import React, { useState } from 'react';
import { GraduationCap, Sparkles } from 'lucide-react';
import { Login } from './Login.js';
import { Register } from './Register.js';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Dynamic ambient gradients */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="relative z-10 flex flex-col items-center mb-6 text-center space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-950/90 border border-indigo-700/70 text-indigo-400 shadow-xl shadow-indigo-950/50">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-tight text-slate-100 flex items-center gap-2">
              Academic Tracker
              <span className="px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                Cloud
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Personal Semester, Attendance & Routine Management
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Multi-User Appwrite Cloud Security</span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="relative z-10 w-full flex justify-center">
        {mode === 'login' ? (
          <Login onSwitchToRegister={() => setMode('register')} />
        ) : (
          <Register onSwitchToLogin={() => setMode('login')} />
        )}
      </div>

      {/* Footer copyright */}
      <footer className="relative z-10 mt-8 text-center text-xs text-slate-500">
        Academic Study Tracker &bull; Appwrite Authentication &bull; MongoDB Atlas
      </footer>
    </div>
  );
};
