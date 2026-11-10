import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface ResetPasswordProps {
  userId: string;
  secret: string;
  onComplete: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({
  userId,
  secret,
  onComplete,
}) => {
  const { completePasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    if (!userId || !secret) {
      setErrorMessage('Missing recovery tokens. Please request a new password reset link.');
      return;
    }

    try {
      setIsSubmitting(true);
      await completePasswordRecovery(userId, secret, password);
      setIsSuccess(true);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to reset password. The link may have expired.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-2xl backdrop-blur-xl space-y-6">
      <div className="text-center space-y-1.5">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-950/90 border border-indigo-700/60 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-950/40">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight pt-2">
          Set New Password
        </h2>
        <p className="text-xs text-slate-400">
          Choose a strong, memorable password to secure your academic workspace.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {/* Success Notification */}
      {isSuccess ? (
        <div className="space-y-5 animate-in fade-in">
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-300">Password Reset Complete!</p>
              <p className="text-[11px] leading-relaxed text-emerald-200/90">
                Your new password has been securely saved. You can now log into your account with your updated credentials.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onComplete}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            Sign In with New Password
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                disabled={isSubmitting}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-medium placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              Confirm New Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              value={passwordConfirm}
              disabled={isSubmitting}
              onChange={(e) => {
                setPasswordConfirm(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-medium placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Updating Password...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Update Password
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

