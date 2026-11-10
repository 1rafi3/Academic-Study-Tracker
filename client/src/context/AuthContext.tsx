import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppwriteUser, AppwriteSession, AuthContextType } from '../types/auth.js';
import {
  getCurrentUser,
  login as appwriteLogin,
  register as appwriteRegister,
  logout as appwriteLogout,
  createJWT,
  sendPasswordRecovery as appwriteSendPasswordRecovery,
  completePasswordRecovery as appwriteCompletePasswordRecovery,
  sendEmailVerification as appwriteSendEmailVerification,
  completeEmailVerification as appwriteCompleteEmailVerification,
} from '../services/appwrite.js';
import { setAuthFailureHandler, clearCachedToken, apiRequest } from '../api/apiClient.js';
import {
  isPrimaryAccountCredentials,
  PRIMARY_TOKEN_STORAGE_KEY,
  PRIMARY_USER_STORAGE_KEY,
} from '../utils/authUtils.js';

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
      // Check if there is an active primary account session
      const primaryToken = localStorage.getItem(PRIMARY_TOKEN_STORAGE_KEY);
      const cachedPrimaryUser = localStorage.getItem(PRIMARY_USER_STORAGE_KEY);

      if (primaryToken && cachedPrimaryUser) {
        try {
          const verifyRes = await apiRequest<{
            success: boolean;
            user: AppwriteUser;
          }>('/auth/verify-session', { method: 'GET' });

          if (verifyRes && verifyRes.success) {
            const parsedUser = JSON.parse(cachedPrimaryUser) as AppwriteUser;
            setUser(parsedUser);
            return;
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem(PRIMARY_TOKEN_STORAGE_KEY);
          localStorage.removeItem(PRIMARY_USER_STORAGE_KEY);
        }
      }

      // Standard Appwrite session restoration
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
      const primaryToken = localStorage.getItem(PRIMARY_TOKEN_STORAGE_KEY);
      const cachedPrimaryUser = localStorage.getItem(PRIMARY_USER_STORAGE_KEY);
      if (primaryToken && cachedPrimaryUser) {
        const parsed = JSON.parse(cachedPrimaryUser) as AppwriteUser;
        setUser(parsed);
        return parsed;
      }

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

      // Primary account direct authentication
      if (isPrimaryAccountCredentials(email, password)) {
        const res = await apiRequest<{
          success: boolean;
          token: string;
          user: AppwriteUser;
        }>(
          '/auth/primary-login',
          {
            method: 'POST',
            body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
          },
          true
        );

        if (res && res.token && res.user) {
          localStorage.setItem(PRIMARY_TOKEN_STORAGE_KEY, res.token);
          localStorage.setItem(PRIMARY_USER_STORAGE_KEY, JSON.stringify(res.user));
          setUser(res.user);

          return {
            $id: 'primary_session',
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString(),
            userId: res.user.$id,
            expire: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            provider: 'primary',
            providerUid: res.user.email,
            providerAccessToken: res.token,
            providerAccessTokenExpiry: '',
            providerRefreshToken: '',
            ip: '127.0.0.1',
            osCode: 'Windows',
            osName: 'Windows',
            osVersion: '10',
            clientType: 'browser',
            clientCode: 'Chrome',
            clientName: 'Chrome',
            clientVersion: '120.0',
            clientEngine: 'Blink',
            clientEngineVersion: '120.0',
            deviceName: 'Desktop',
            deviceBrand: 'PC',
            deviceModel: 'PC',
            countryCode: 'BD',
            countryName: 'Bangladesh',
            current: true,
            factors: ['password'],
            secret: '',
            mfaUpdatedAt: '',
          } as AppwriteSession;
        }
      }

      // Standard Appwrite Cloud login for all other accounts
      localStorage.removeItem(PRIMARY_TOKEN_STORAGE_KEY);
      localStorage.removeItem(PRIMARY_USER_STORAGE_KEY);
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
      localStorage.removeItem(PRIMARY_TOKEN_STORAGE_KEY);
      localStorage.removeItem(PRIMARY_USER_STORAGE_KEY);
      await appwriteLogout();
    } catch {
      // Ignore if not logged in to Appwrite
    } finally {
      clearCachedToken();
      setUser(null);
      setAuthNotification(null);
    }
  }, []);

  // 6. Get JWT for future Express backend calls
  const getJWT = useCallback(async (): Promise<string | null> => {
    const primaryToken = localStorage.getItem(PRIMARY_TOKEN_STORAGE_KEY);
    if (primaryToken) return primaryToken;
    return createJWT();
  }, []);

  // 7. Password Recovery
  const sendPasswordRecovery = useCallback(async (email: string): Promise<void> => {
    await appwriteSendPasswordRecovery(email);
  }, []);

  const completePasswordRecovery = useCallback(
    async (userId: string, secret: string, password: string): Promise<void> => {
      await appwriteCompletePasswordRecovery(userId, secret, password);
    },
    []
  );

  // 8. Email Verification
  const sendEmailVerification = useCallback(async (): Promise<void> => {
    await appwriteSendEmailVerification();
  }, []);

  const completeEmailVerification = useCallback(
    async (userId: string, secret: string): Promise<void> => {
      await appwriteCompleteEmailVerification(userId, secret);
      // Immediately refresh user state to update emailVerification flag
      const updated = await getCurrentUser();
      setUser(updated);
    },
    []
  );

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
    sendPasswordRecovery,
    completePasswordRecovery,
    sendEmailVerification,
    completeEmailVerification,
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
