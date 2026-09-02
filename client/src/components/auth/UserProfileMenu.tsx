import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const UserProfileMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
          <div className="px-3 py-2 border-b border-slate-800/80 space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate">{user.name || 'Student'}</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            <div className="pt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>Appwrite Authenticated</span>
            </div>
          </div>

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
        </div>
      )}
    </div>
  );
};
