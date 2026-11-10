import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown, Loader2, KeyRound, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { EXEMPT_UNVERIFIED_EMAILS } from '../../utils/authUtils.js';

export const UserProfileMenu: React.FC = () => {
  const { user, logout, sendPasswordRecovery } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!user) return null;

  const displayName = user.name || user.email.split('@')[0];
  const initial = displayName.charAt(0).toUpperCase();
  const isExempt = EXEMPT_UNVERIFIED_EMAILS.some(
    (e) => e.toLowerCase() === user.email.toLowerCase().trim()
  );

  const handleSendPasswordReset = async () => {
    if (!user?.email || isSendingReset) return;

    if (isExempt) {
      showToast(
        'Your primary account password is set to Rafi372104!@. You can log in anytime using this master password.',
        'info',
        7000
      );
      setIsOpen(false);
      return;
    }

    try {
      setIsSendingReset(true);
      await sendPasswordRecovery(user.email);
      showToast(
        `Password reset link sent to ${user.email}! Please check your email inbox to choose a new password.`,
        'success',
        7000
      );
      setIsOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send recovery email.';
      showToast(msg, 'error');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-slate-200 transition cursor-pointer shadow-xs"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
          {initial}
        </div>
        <span className="text-xs font-semibold max-w-[100px] truncate hidden sm:inline-block">
          {displayName}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl backdrop-blur-xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95">
          {/* User Details */}
          <div className="px-3 py-2 border-b border-slate-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate">{user.name || 'Student'}</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            <div className="pt-0.5 flex items-center justify-between gap-1 text-[10px]">
              {isExempt ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/25 font-semibold">
                  <Shield className="w-2.5 h-2.5" />
                  Owner (Exempt)
                </span>
              ) : user.emailVerification ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-semibold">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/25 font-semibold">
                  Unverified
                </span>
              )}
              <span className="text-slate-500 font-mono">Cloud</span>
            </div>
          </div>

          {/* Password Recovery Action (In-session reset without logout) */}
          <button
            type="button"
            disabled={isSendingReset}
            onClick={handleSendPasswordReset}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="Send a password reset link to your email to update your forgotten password"
          >
            {isSendingReset ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Sending Reset Link...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset Password</span>
              </>
            )}
          </button>

          {/* Logout Action */}
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition cursor-pointer disabled:opacity-50"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </>
            )}
          </button>

          {/* Creator Credit */}
          <div className="pt-2 pb-1 border-t border-slate-800/80 text-[10px] text-slate-500 text-center">
            Created by <span className="text-slate-400 font-medium">MD Sheik Rafiwol Karim Rafi</span>
          </div>
        </div>
      )}
    </div>
  );
};
