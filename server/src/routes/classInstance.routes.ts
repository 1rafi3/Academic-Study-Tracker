import { Router } from 'express';
import {
  generateClassInstances,
  syncScheduleInstances,
  getClassInstances,
  getClassInstanceById,
  updateAttendance,
  updateClassNotes,
  updateClassStatus,
  getAttendanceStats,
  deleteClassInstance,
} from '../controllers/classInstance.controller.js';

const router = Router();

// Generation, Sync & Stats
router.post('/generate', generateClassInstances);
router.post('/sync-schedule', syncScheduleInstances);
router.get('/stats', getAttendanceStats);

// List and detail
router.route('/')
  .get(getClassInstances);

router.route('/:id')
  .get(getClassInstanceById)
  .delete(deleteClassInstance);

// Attendance, Notes, and Status/Exception updates
router.patch('/:id/attendance', updateAttendance);
router.patch('/:id/notes', updateClassNotes);
router.patch('/:id/status', updateClassStatus);

export default router;
