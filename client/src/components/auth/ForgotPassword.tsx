import React, { useState } from 'react';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
  initialEmail?: string;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onBackToLogin,
  initialEmail = '',
}) => {
  const { sendPasswordRecovery } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your account email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      await sendPasswordRecovery(trimmedEmail);
      setIsSuccess(true);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to send recovery email. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-2xl backdrop-blur-xl space-y-6">
      <div className="text-center space-y-1.5">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-950/90 border border-indigo-700/60 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-950/40">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight pt-2">
          Forgot Password?
        </h2>
        <p className="text-xs text-slate-400">
          Enter your registered email address and we'll send you a secure link to reset your password.
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
              <p className="font-semibold text-emerald-300">Recovery Link Sent!</p>
              <p className="text-[11px] leading-relaxed text-emerald-200/90">
                We've sent a password reset link to <strong className="font-mono text-white">{email}</strong>.
                Please check your inbox (and spam folder) and click the link to choose a new password.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              Your Account Email
            </label>
            <input
              type="email"
              autoComplete="email"
              placeholder="e.g. rafi2nd@gmail.com"
              value={email}
              disabled={isSubmitting}
              onChange={(e) => {
                setEmail(e.target.value);
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
                Sending Recovery Link...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Send Reset Link
              </>
            )}
          </button>

          <div className="pt-2 text-center border-t border-slate-800/80">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition font-medium cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

