import { Router } from 'express';
import { claimLegacyData, getLegacyStatus } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

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
