import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, RotateCw, LogOut, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const VerifyEmailScreen: React.FC = () => {
  const { user, refreshUser, sendEmailVerification, logout } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Decrement countdown cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isSending) return;
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      setIsSending(true);
      await sendEmailVerification();
      setInfoMessage(`A fresh verification link has been sent to ${user?.email}. Please check your inbox and spam folder.`);
      setCooldown(60); // 60s cooldown to prevent rate limits
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to send verification email. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckStatus = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      setIsChecking(true);
      const updated = await refreshUser();
      if (updated?.emailVerification) {
        setInfoMessage('Your email has been verified! Welcome to Academic Tracker.');
      } else {
        setInfoMessage('Your email is not verified yet. Please check your inbox and click the verification link.');
      }
    } catch {
      setErrorMessage('Could not check status. Please check your internet connection.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Dynamic ambient gradients */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-2xl backdrop-blur-xl space-y-6 text-center">
        {/* Verification Icon Badge */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-950/40">
          <Mail className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-bold tracking-wide uppercase">
            <ShieldAlert className="w-3.5 h-3.5" />
            Verification Required
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight pt-1">
            Verify Your Email
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            To protect student accounts and keep data secure, please verify your email address to access your academic dashboard.
          </p>
        </div>

        {/* User Email Pill */}
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-center gap-2">
          <span className="text-xs text-slate-400">Account:</span>
          <span className="text-xs font-mono font-bold text-indigo-300 truncate max-w-[260px]">
            {user?.email}
          </span>
        </div>

        {/* Info Message */}
        {infoMessage && (
          <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-800/80 text-indigo-200 text-xs flex items-start gap-2.5 text-left animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed text-[11px]">{infoMessage}</div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 text-left animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed text-[11px]">{errorMessage}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-1">
          {/* Check Status */}
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition cursor-pointer disabled:opacity-60"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking Verification...
              </>
            ) : (
              <>
                <RotateCw className="w-4 h-4" />
                I've Verified (Check Status)
              </>
            )}
          </button>

          {/* Resend Verification */}
          <button
            type="button"
            onClick={handleResend}
            disabled={isSending || cooldown > 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                Sending Link...
              </>
            ) : cooldown > 0 ? (
              <span>Resend available in {cooldown}s</span>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Resend Verification Email
              </>
            )}
          </button>
        </div>

        {/* Logout Option */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">Wrong email?</span>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold transition cursor-pointer hover:underline"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
