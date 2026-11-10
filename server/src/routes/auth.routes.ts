import { Router } from 'express';
import {
  claimLegacyData,
  getLegacyStatus,
  primaryLogin,
  verifySession,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/auth/primary-login
 * Direct login for the primary creator account (rafi2nd@gmail.com).
 */
router.post('/primary-login', primaryLogin);

/**
 * GET /api/auth/verify-session
 * Checks whether the current authorization header (primary token or Appwrite JWT) is valid.
 */
router.get('/verify-session', requireAuth, verifySession);

/**
 * GET /api/auth/legacy-status
 * Checks if there is unassigned legacy data to claim.
 */
router.get('/legacy-status', requireAuth, getLegacyStatus);

/**
 * POST /api/auth/claim-legacy-data
 * Protected endpoint to claim unassigned legacy data.
 */
router.post('/claim-legacy-data', requireAuth, claimLegacyData);

export default router;
