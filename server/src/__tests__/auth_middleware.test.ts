import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { AppwriteException } from 'node-appwrite';
import {
  requireAuth,
  setAppwriteVerifier,
  resetAppwriteVerifier,
  AppwriteVerifier,
  DefaultAppwriteVerifier,
} from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';

describe('=== Backend Authentication Middleware Unit Tests ===', () => {
  let app: Express;

  beforeEach(() => {
    process.env.TEST_AUTH_BYPASS = 'false';
    app = express();
    app.use(express.json());

    // Test protected route
    app.get('/test/protected', requireAuth, (req: AuthenticatedRequest, res) => {
      res.status(200).json({
        success: true,
        userId: req.userId,
        user: req.user,
      });
    });
  });

  afterEach(() => {
    process.env.TEST_AUTH_BYPASS = 'true';
    resetAppwriteVerifier();
  });

  it('rejects request with 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/test/protected');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Authorization header is missing');
  });

  it('rejects request with 401 when Authorization header does not start with Bearer', async () => {
    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Format must be 'Bearer <jwt>'");
  });

  it('rejects request with 401 when Bearer token is empty', async () => {
    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', 'Bearer    ');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('JWT token is missing');
  });

  it('rejects request with 401 when Appwrite verification fails (e.g. invalid/expired JWT)', async () => {
    const mockVerifier: AppwriteVerifier = {
      verifyToken: vi.fn().mockRejectedValue(new AppwriteException('Invalid JWT', 401, 'user_jwt_invalid')),
    };
    setAppwriteVerifier(mockVerifier);

    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', 'Bearer invalid_or_expired_jwt_token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid or expired authentication token');
  });

  it('authenticates successfully and attaches req.userId and req.user when JWT is valid', async () => {
    const mockUser = {
      userId: 'appwrite_user_999',
      email: 'student@university.edu',
      name: 'Rafi',
    };

    const mockVerifier: AppwriteVerifier = {
      verifyToken: vi.fn().mockResolvedValue(mockUser),
    };
    setAppwriteVerifier(mockVerifier);

    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', 'Bearer valid_mocked_jwt_token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.userId).toBe('appwrite_user_999');
    expect(res.body.user).toEqual(mockUser);
  });

  it('handles server configuration error with 500 when APPWRITE_PROJECT_ID is empty', async () => {
    const verifierWithNoProject = new DefaultAppwriteVerifier('https://fra.cloud.appwrite.io/v1', '');
    setAppwriteVerifier(verifierWithNoProject);

    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', 'Bearer some_token');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Server authentication configuration error');
  });
});
