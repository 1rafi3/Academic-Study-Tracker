import { describe, it, expect } from 'vitest';
import { isEmailVerificationRequired, EXEMPT_UNVERIFIED_EMAILS } from '../utils/authUtils.js';
import type { AppwriteUser } from '../types/auth.js';

describe('=== Auth Utilities & Email Verification Exemption Tests ===', () => {
  it('identifies rafi2nd@gmail.com in the exempt list', () => {
    expect(EXEMPT_UNVERIFIED_EMAILS).toContain('rafi2nd@gmail.com');
  });

  it('exempts rafi2nd@gmail.com even when emailVerification is false', () => {
    const exemptUser = {
      $id: 'user_rafi_1',
      email: 'rafi2nd@gmail.com',
      name: 'Rafi',
      emailVerification: false,
    } as unknown as AppwriteUser;

    expect(isEmailVerificationRequired(exemptUser)).toBe(false);
  });

  it('exempts rafi2nd@gmail.com with case-insensitive and whitespace handling', () => {
    const uppercaseUser = {
      $id: 'user_rafi_2',
      email: '  RAFI2ND@GMAIL.COM  ',
      name: 'Rafi',
      emailVerification: false,
    } as unknown as AppwriteUser;

    expect(isEmailVerificationRequired(uppercaseUser)).toBe(false);
  });

  it('requires email verification for any other user when emailVerification is false', () => {
    const standardUser = {
      $id: 'user_other_1',
      email: 'other.student@university.edu',
      name: 'Other Student',
      emailVerification: false,
    } as unknown as AppwriteUser;

    expect(isEmailVerificationRequired(standardUser)).toBe(true);
  });

  it('does not require email verification for other users once emailVerification is true', () => {
    const verifiedUser = {
      $id: 'user_other_2',
      email: 'verified.student@university.edu',
      name: 'Verified Student',
      emailVerification: true,
    } as unknown as AppwriteUser;

    expect(isEmailVerificationRequired(verifiedUser)).toBe(false);
  });

  it('handles null or missing user safely', () => {
    expect(isEmailVerificationRequired(null)).toBe(false);
    expect(isEmailVerificationRequired({} as unknown as AppwriteUser)).toBe(false);
  });
});

