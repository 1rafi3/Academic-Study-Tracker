import type { Models } from 'appwrite';

/**
 * Strongly typed Appwrite User representation.
 */
export type AppwriteUser = Models.User<Models.Preferences>;

/**
 * Strongly typed Appwrite Session representation.
 */
export type AppwriteSession = Models.Session;

/**
 * Authentication Context contract exposing user state and methods.
 */
export interface AuthContextType {
  user: AppwriteUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (email: string, password: string, name?: string) => Promise<AppwriteUser>;
  login: (email: string, password: string) => Promise<AppwriteSession>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AppwriteUser | null>;
  getJWT: () => Promise<string | null>;
  authNotification: string | null;
  clearAuthNotification: () => void;
}
