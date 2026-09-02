import { Client, Account, ID, AppwriteException } from 'appwrite';
import type { AppwriteUser, AppwriteSession } from '../types/auth.js';

// Read configuration from client environment variables
const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';

// 1. Initialize Appwrite Client
export const client = new Client();

if (endpoint && projectId) {
  client.setEndpoint(endpoint).setProject(projectId);
}

// 2. Initialize Account Service
export const account = new Account(client);

/**
 * Translates Appwrite authentication errors into friendly, readable user messages.
 */
export const parseAppwriteError = (error: unknown): string => {
  if (error instanceof AppwriteException) {
    switch (error.type) {
      case 'user_already_exists':
        return 'An account with this email address already exists. Please log in instead.';
      case 'user_invalid_credentials':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'password_recently_used':
      case 'user_password_mismatch':
        return 'Password must be at least 8 characters long.';
      case 'user_email_already_exists':
        return 'This email address is already in use by another account.';
      case 'general_rate_limit_exceeded':
        return 'Too many attempts. Please wait a few moments before trying again.';
      case 'user_session_already_exists':
        return 'A user session is already active. Please refresh the page.';
      default:
        return error.message || 'An authentication error occurred. Please try again.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

/**
 * Creates a new user account with Appwrite Authentication.
 */
export const register = async (
  email: string,
  password: string,
  name?: string
): Promise<AppwriteUser> => {
  try {
    const user = await account.create(ID.unique(), email, password, name);
    return user;
  } catch (err: unknown) {
    throw new Error(parseAppwriteError(err));
  }
};

/**
 * Creates an Appwrite email and password session (logs the user in).
 */
export const login = async (
  email: string,
  password: string
): Promise<AppwriteSession> => {
  try {
    const session = await account.createEmailPasswordSession(email, password);
    return session;
  } catch (err: unknown) {
    throw new Error(parseAppwriteError(err));
  }
};

/**
 * Terminates the currently active Appwrite session (logs the user out).
 */
export const logout = async (): Promise<void> => {
  try {
    await account.deleteSession('current');
  } catch (err: unknown) {
    throw new Error(parseAppwriteError(err));
  }
};

/**
 * Retrieves the currently authenticated Appwrite user, or returns null if no session exists.
 */
export const getCurrentUser = async (): Promise<AppwriteUser | null> => {
  try {
    const user = await account.get();
    return user;
  } catch (err: unknown) {
    // 401 means the user is simply not logged in (guest). This is not a fatal error.
    if (
      err instanceof AppwriteException &&
      (err.code === 401 || err.type === 'general_unauthorized_scope')
    ) {
      return null;
    }
    return null;
  }
};

/**
 * Generates an Appwrite JWT (JSON Web Token) for future authenticated Express backend calls.
 * Preparation for later steps; does not send the token anywhere yet.
 */
export const createJWT = async (): Promise<string | null> => {
  try {
    const response = await account.createJWT();
    return response.jwt;
  } catch (err: unknown) {
    if (err instanceof AppwriteException) {
      if (err.code === 501) {
        console.error(
          '[Appwrite Auth Notice]: JWT authentication is disabled in your Appwrite project. ' +
          'Please enable it in Appwrite Console -> Auth -> Settings -> Auth Methods -> JWT.'
        );
      } else {
        console.warn('[Appwrite createJWT]:', err.code, err.message);
      }
    }
    return null;
  }
};
