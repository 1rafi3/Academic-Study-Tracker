import { Router } from 'express';
import { getAttendanceAnalytics } from '../controllers/analytics.controller.js';

const router = Router();

// GET /api/analytics/attendance?semesterId=...&courseId=...&target=75
router.get('/attendance', getAttendanceAnalytics);

export default router;
