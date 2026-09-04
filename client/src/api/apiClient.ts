import { createJWT } from '../services/appwrite.js';
import type { ApiResponse } from '../types/academic.js';

// Base API URL: Supports VITE_API_URL for production deployments (e.g. Vercel + Render),
// falling back to local Vite proxy '/api' when not configured.
export const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '/api';


// In-memory token cache to prevent redundant createJWT requests on rapid concurrent queries
let cachedJWT: string | null = null;
let tokenExpiresAt = 0;

// Auth failure callback (e.g., when 401 is received from Express backend)
type AuthFailureHandler = (message: string) => void;
let authFailureHandler: AuthFailureHandler | null = null;

export const setAuthFailureHandler = (handler: AuthFailureHandler | null) => {
  authFailureHandler = handler;
};

/**
 * Retrieves a valid Appwrite JWT for authenticating requests to the Express backend.
 * Uses an in-memory cache to minimize Appwrite API calls, refreshing when close to expiry.
 */
export const getOrRefreshJWT = async (): Promise<string | null> => {
  const now = Date.now();
  // If we have a cached JWT with at least 60 seconds of validity remaining, reuse it
  if (cachedJWT && tokenExpiresAt - now > 60 * 1000) {
    return cachedJWT;
  }

  try {
    const jwt = await createJWT();
    if (jwt) {
      cachedJWT = jwt;
      // Appwrite JWTs are typically valid for 15 minutes (900 seconds). Cache for 13 minutes.
      tokenExpiresAt = now + 13 * 60 * 1000;
      return jwt;
    }
    cachedJWT = null;
    tokenExpiresAt = 0;
    return null;
  } catch {
    cachedJWT = null;
    tokenExpiresAt = 0;
    return null;
  }
};

/**
 * Clears the in-memory token cache (used on logout or session expiration).
 */
export const clearCachedToken = () => {
  cachedJWT = null;
  tokenExpiresAt = 0;
};

/**
 * Unified JSON API Request function.
 * Automatically injects Appwrite JWT into the Authorization header for protected endpoints.
 * Handles 401 Session Expiration and formats error messages cleanly.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  isPublic = false
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});

  // Ensure JSON content type by default unless body is FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach JWT Authorization header if the endpoint is protected
  if (!isPublic) {
    const jwt = await getOrRefreshJWT();
    if (jwt) {
      headers.set('Authorization', `Bearer ${jwt}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    clearCachedToken();
    const expiryMsg = 'Your session has expired. Please log in again.';
    if (authFailureHandler) {
      authFailureHandler(expiryMsg);
    }
    throw new Error(expiryMsg);
  }

  // Parse JSON response
  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
    }
    return {} as T;
  }

  if (!response.ok || json.success === false) {
    const errorMsg = json.errors && json.errors.length > 0
      ? json.errors.join(', ')
      : json.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  // Return data directly (or the entire json if data is not keyed)
  return (json.data !== undefined ? json.data : json) as T;
}

/**
 * Blob API Request function for authenticated binary/file downloads (e.g., CSV exports).
 */
export async function apiBlobRequest(
  endpoint: string,
  options: RequestInit = {},
  isPublic = false
): Promise<Blob> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});

  if (!isPublic) {
    const jwt = await getOrRefreshJWT();
    if (jwt) {
      headers.set('Authorization', `Bearer ${jwt}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearCachedToken();
    const expiryMsg = 'Your session has expired. Please log in again.';
    if (authFailureHandler) {
      authFailureHandler(expiryMsg);
    }
    throw new Error(expiryMsg);
  }

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}: ${response.statusText}`);
  }

  return response.blob();
}
