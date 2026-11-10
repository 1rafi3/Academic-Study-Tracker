import type { AppwriteUser } from '../types/auth.js';

/**
 * Primary account credentials & storage keys.
 */
export const PRIMARY_ACCOUNT_EMAIL = 'rafi2nd@gmail.com';
export const PRIMARY_ACCOUNT_USER_ID = '6a9b0428002d0ef059af';
export const PRIMARY_ACCOUNT_PASSWORD = 'Rafi372104!@';
export const PRIMARY_TOKEN_STORAGE_KEY = 'academic_tracker_primary_token';
export const PRIMARY_USER_STORAGE_KEY = 'academic_tracker_primary_user';

/**
 * Strips whitespace and accidental surrounding quotation marks from entered password.
 */
export function sanitizePrimaryPassword(pwd?: string): string {
  if (!pwd) return '';
  return pwd.trim().replace(/^["']|["']$/g, '');
}

/**
 * Creates an AppwriteUser-compatible object for the primary account.
 */
export function createPrimaryClientUser(): AppwriteUser {
  return {
    $id: PRIMARY_ACCOUNT_USER_ID,
    $createdAt: '2026-08-31T00:00:00.000Z',
    $updatedAt: new Date().toISOString(),
    name: 'Rafi',
    registration: '2026-08-31T00:00:00.000Z',
    status: true,
    labels: ['primary'],
    passwordUpdate: '2026-11-10T00:00:00.000Z',
    email: PRIMARY_ACCOUNT_EMAIL,
    phone: '',
    emailVerification: true,
    phoneVerification: false,
    mfa: false,
    prefs: {},
    targets: [],
    accessedAt: new Date().toISOString(),
  };
}

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
 * Supports trimmed passwords, stripped quotation marks, and case-insensitive matching.
 */
export function isPrimaryAccountCredentials(
  email?: string,
  password?: string
): boolean {
  if (!email || !password) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const cleanPassword = sanitizePrimaryPassword(password);

  if (normalizedEmail !== PRIMARY_ACCOUNT_EMAIL) {
    return false;
  }

  return (
    cleanPassword === PRIMARY_ACCOUNT_PASSWORD ||
    cleanPassword.toLowerCase() === PRIMARY_ACCOUNT_PASSWORD.toLowerCase()
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

