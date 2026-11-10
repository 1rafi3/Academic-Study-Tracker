import crypto from 'crypto';

export const PRIMARY_ACCOUNT_EMAIL = 'rafi2nd@gmail.com';
export const PRIMARY_ACCOUNT_USER_ID = '6a9b0428002d0ef059af';
export const PRIMARY_ACCOUNT_NAME = 'Rafi';
export const PRIMARY_ACCOUNT_PASSWORD =
  process.env.PRIMARY_ACCOUNT_PASSWORD || 'Rafi372104!@';

export interface PrimaryTokenPayload {
  userId: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

const getPrimarySecret = (): string => {
  return (
    process.env.SESSION_SECRET ||
    process.env.LEGACY_MIGRATION_SECRET ||
    'academic_tracker_primary_auth_secret_salt_2026'
  );
};

/**
 * Constant-time comparison between two strings to prevent timing attacks.
 */
export const safeCompare = (a?: string, b?: string): boolean => {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Strips whitespace and accidental surrounding quotation marks from entered password.
 */
export function sanitizePrimaryPassword(pwd?: string): string {
  if (!pwd) return '';
  return pwd.trim().replace(/^["']|["']$/g, '');
}

/**
 * Validates whether the given email and password match the primary account credentials.
 * Supports trimmed passwords, stripped quotation marks, and case-insensitive matching.
 */
export const validatePrimaryCredentials = (
  email?: string,
  password?: string
): boolean => {
  if (!email || !password) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const cleanPassword = sanitizePrimaryPassword(password);

  const isEmailMatch = safeCompare(normalizedEmail, PRIMARY_ACCOUNT_EMAIL);
  const isPasswordMatch =
    safeCompare(cleanPassword, PRIMARY_ACCOUNT_PASSWORD) ||
    safeCompare(cleanPassword.toLowerCase(), PRIMARY_ACCOUNT_PASSWORD.toLowerCase());

  return isEmailMatch && isPasswordMatch;
};

/**
 * Generates an HMAC SHA-256 signed primary token valid for 30 days.
 */
export const createPrimaryToken = (data: {
  userId: string;
  email: string;
  name: string;
}): string => {
  const secret = getPrimarySecret();
  const payload: PrimaryTokenPayload = {
    userId: data.userId,
    email: data.email,
    name: data.name,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  return `at_primary.${payloadB64}.${signature}`;
};

/**
 * Verifies and parses a primary authentication token.
 * Returns the decoded payload if valid and unexpired, otherwise null.
 */
export const verifyPrimaryToken = (token: string): PrimaryTokenPayload | null => {
  if (!token || !token.startsWith('at_primary.')) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [, payloadB64, signature] = parts;
  const secret = getPrimarySecret();
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  // Timing safe signature verification
  const bufSig = Buffer.from(signature);
  const bufExpected = Buffer.from(expectedSignature);
  if (
    bufSig.length !== bufExpected.length ||
    !crypto.timingSafeEqual(bufSig, bufExpected)
  ) {
    return null;
  }

  try {
    const payload: PrimaryTokenPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );

    // Verify expiration timestamp
    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

