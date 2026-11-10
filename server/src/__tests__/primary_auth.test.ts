import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import authRoutes from '../routes/auth.routes.js';
import {
  validatePrimaryCredentials,
  createPrimaryToken,
  verifyPrimaryToken,
  PRIMARY_ACCOUNT_EMAIL,
  PRIMARY_ACCOUNT_PASSWORD,
  PRIMARY_ACCOUNT_USER_ID,
  PRIMARY_ACCOUNT_NAME,
} from '../utils/primaryAuth.js';

describe('=== Primary Account Authentication Tests ===', () => {
  let app: Express;

  beforeEach(() => {
    process.env.TEST_AUTH_BYPASS = 'false';
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterEach(() => {
    process.env.TEST_AUTH_BYPASS = 'true';
  });

  describe('Utility: validatePrimaryCredentials', () => {
    it('returns true for exact match credentials', () => {
      expect(
        validatePrimaryCredentials('rafi2nd@gmail.com', 'Rafi372104!@')
      ).toBe(true);
    });

    it('returns true for case-insensitive and trimmed email', () => {
      expect(
        validatePrimaryCredentials('  RAFI2nd@Gmail.Com  ', 'Rafi372104!@')
      ).toBe(true);
    });

    it('returns false for wrong password', () => {
      expect(
        validatePrimaryCredentials('rafi2nd@gmail.com', 'WrongPassword123')
      ).toBe(false);
    });

    it('returns false for different email', () => {
      expect(
        validatePrimaryCredentials('other@university.edu', 'Rafi372104!@')
      ).toBe(false);
    });

    it('returns false for missing fields', () => {
      expect(validatePrimaryCredentials('', 'Rafi372104!@')).toBe(false);
      expect(validatePrimaryCredentials('rafi2nd@gmail.com', '')).toBe(false);
    });
  });

  describe('Utility: createPrimaryToken & verifyPrimaryToken', () => {
    it('creates a token that can be successfully verified', () => {
      const token = createPrimaryToken({
        userId: PRIMARY_ACCOUNT_USER_ID,
        email: PRIMARY_ACCOUNT_EMAIL,
        name: PRIMARY_ACCOUNT_NAME,
      });

      expect(token).toMatch(/^at_primary\./);

      const payload = verifyPrimaryToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(PRIMARY_ACCOUNT_USER_ID);
      expect(payload?.email).toBe(PRIMARY_ACCOUNT_EMAIL);
      expect(payload?.name).toBe(PRIMARY_ACCOUNT_NAME);
    });

    it('fails verification if token structure or signature is invalid', () => {
      expect(verifyPrimaryToken('not_a_valid_token')).toBeNull();
      expect(verifyPrimaryToken('at_primary.invalid.sig')).toBeNull();
    });
  });

  describe('Route: POST /api/auth/primary-login', () => {
    it('logs in successfully with primary email and master password', async () => {
      const res = await request(app)
        .post('/api/auth/primary-login')
        .send({
          email: 'rafi2nd@gmail.com',
          password: 'Rafi372104!@',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toMatch(/^at_primary\./);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.$id).toBe(PRIMARY_ACCOUNT_USER_ID);
      expect(res.body.user.email).toBe(PRIMARY_ACCOUNT_EMAIL);
      expect(res.body.user.emailVerification).toBe(true);
    });

    it('rejects wrong password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/primary-login')
        .send({
          email: 'rafi2nd@gmail.com',
          password: 'wrong_password',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('rejects unrecognised email with 401', async () => {
      const res = await request(app)
        .post('/api/auth/primary-login')
        .send({
          email: 'random@example.com',
          password: 'Rafi372104!@',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('rejects missing credentials with 400', async () => {
      const res = await request(app)
        .post('/api/auth/primary-login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email and password are required');
    });
  });

  describe('Route: GET /api/auth/verify-session', () => {
    it('returns user profile when bearer token is a valid primary token', async () => {
      const token = createPrimaryToken({
        userId: PRIMARY_ACCOUNT_USER_ID,
        email: PRIMARY_ACCOUNT_EMAIL,
        name: PRIMARY_ACCOUNT_NAME,
      });

      const res = await request(app)
        .get('/api/auth/verify-session')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.userId).toBe(PRIMARY_ACCOUNT_USER_ID);
      expect(res.body.user.email).toBe(PRIMARY_ACCOUNT_EMAIL);
    });
  });
});

