import type { AppwriteUser } from '../types/auth.js';

/**
 * List of email addresses that are explicitly exempt from mandatory email verification.
 * The primary account owner (rafi2nd@gmail.com) is grandfathered in and remains active
 * even in an unverified state, protecting existing account data from lockout.
 */
export const EXEMPT_UNVERIFIED_EMAILS: readonly string[] = [
  'rafi2nd@gmail.com',
];

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

