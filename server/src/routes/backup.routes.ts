import { Router } from 'express';
import {
  exportBackup,
  validateBackup,
  importBackup,
  exportAttendanceCsv,
  exportCoursesCsv,
  exportEventsCsv,
  getSemesterSummary,
} from '../controllers/backup.controller.js';

const router = Router();

// Full JSON Backup & Restore
router.get('/export', exportBackup);
router.post('/validate', validateBackup);
router.post('/import', importBackup);

// CSV Exports
router.get('/export/csv/attendance', exportAttendanceCsv);
router.get('/export/csv/courses', exportCoursesCsv);
router.get('/export/csv/events', exportEventsCsv);

// Semester Summary Report
router.get('/summary/:semesterId', getSemesterSummary);

export default router;
