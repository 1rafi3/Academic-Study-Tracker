import type { AppwriteUser } from '../types/auth.js';

/**
 * Primary account credentials & storage keys.
 */
export const PRIMARY_ACCOUNT_EMAIL = 'rafi2nd@gmail.com';
export const PRIMARY_ACCOUNT_PASSWORD = 'Rafi372104!@';
export const PRIMARY_TOKEN_STORAGE_KEY = 'academic_tracker_primary_token';
export const PRIMARY_USER_STORAGE_KEY = 'academic_tracker_primary_user';

/**
 * List of email addresses that are explicitly exempt from mandatory email verification.
 * The primary account owner (rafi2nd@gmail.com) is grandfathered in and remains active
 * even in an unverified state, protecting existing account data from lockout.
 */
export const EXEMPT_UNVERIFIED_EMAILS: readonly string[] = [
  PRIMARY_ACCOUNT_EMAIL,
];

/**
 * Validates whether the given email and password match the primary owner credentials.
 */
export function isPrimaryAccountCredentials(
  email?: string,
  password?: string
): boolean {
  if (!email || !password) return false;
  return (
    email.trim().toLowerCase() === PRIMARY_ACCOUNT_EMAIL &&
    password === PRIMARY_ACCOUNT_PASSWORD
  );
}

/**
 * Determines whether the given user is required to verify their email before accessing the application.
 * 
 * Rules:
 * 1. If user is null -> false (not logged in).
 * 2. If user's email matches EXEMPT_UNVERIFIED_EMAILS -> false (explicitly allowed unverified).
 * 3. All other user emails -> true if user.emailVerification is false.
 */
export function isEmailVerificationRequired(user: AppwriteUser | null): boolean {
  if (!user || !user.email) {
    return false;
  }

  const normalizedEmail = user.email.trim().toLowerCase();

  // Primary account owner exemption
  if (EXEMPT_UNVERIFIED_EMAILS.some((exemptEmail) => exemptEmail.toLowerCase() === normalizedEmail)) {
    return false;
  }

  // All other users require verified email
  return !user.emailVerification;
}

