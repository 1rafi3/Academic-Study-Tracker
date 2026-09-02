import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppwriteUser, AppwriteSession, AuthContextType } from '../types/auth.js';
import {
  getCurrentUser,
  login as appwriteLogin,
  register as appwriteRegister,
  logout as appwriteLogout,
  createJWT,
} from '../services/appwrite.js';
import { setAuthFailureHandler, clearCachedToken } from '../api/apiClient.js';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppwriteUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authNotification, setAuthNotification] = useState<string | null>(null);

  const clearAuthNotification = useCallback(() => {
    setAuthNotification(null);
  }, []);

  // 1. Session Restoration on application mount / browser refresh
  const initAuth = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Handle background 401 session expiration from API calls
  useEffect(() => {
    setAuthFailureHandler((msg: string) => {
      setUser(null);
      setAuthNotification(msg);
    });

    return () => {
      setAuthFailureHandler(null);
    };
  }, []);

  // 2. Re-fetch current user profile
  const refreshUser = useCallback(async (): Promise<AppwriteUser | null> => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  // 3. Login with email & password
  const login = useCallback(
    async (email: string, password: string): Promise<AppwriteSession> => {
      clearAuthNotification();
      const session = await appwriteLogin(email, password);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return session;
    },
    [clearAuthNotification]
  );

  // 4. Register new user account
  const register = useCallback(
    async (email: string, password: string, name?: string): Promise<AppwriteUser> => {
      clearAuthNotification();
      const newUser = await appwriteRegister(email, password, name);
      // Automatically establish session upon registration for immediate authentication
      try {
        await appwriteLogin(email, password);
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(newUser);
      }
      return newUser;
    },
    [clearAuthNotification]
  );

  // 5. Logout and terminate session
  const logout = useCallback(async (): Promise<void> => {
    try {
      await appwriteLogout();
    } finally {
      clearCachedToken();
      setUser(null);
      setAuthNotification(null);
    }
  }, []);

  // 6. Get JWT for future Express backend calls
  const getJWT = useCallback(async (): Promise<string | null> => {
    return createJWT();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    register,
    login,
    logout,
    refreshUser,
    getJWT,
    authNotification,
    clearAuthNotification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to consume the AuthContext safely.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
