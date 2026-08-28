import { Router } from 'express';
import {
  generateClassInstances,
  getClassInstances,
  getClassInstanceById,
  updateAttendance,
  getAttendanceStats,
  deleteClassInstance,
} from '../controllers/classInstance.controller.js';

const router = Router();

// Generation & Stats
router.post('/generate', generateClassInstances);
router.get('/stats', getAttendanceStats);

// List and detail
router.route('/')
  .get(getClassInstances);

router.route('/:id')
  .get(getClassInstanceById)
  .delete(deleteClassInstance);

// Attendance status update
router.patch('/:id/attendance', updateAttendance);

export default router;
