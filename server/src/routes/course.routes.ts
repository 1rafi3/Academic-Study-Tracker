import { Router } from 'express';
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} from '../controllers/course.controller.js';
import {
  getSchedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/schedule.controller.js';

const router = Router();

// Course CRUD
router.route('/')
  .post(createCourse)
  .get(getCourses);

router.route('/:id')
  .get(getCourseById)
  .put(updateCourse)
  .patch(updateCourse)
  .delete(deleteCourse);

// Nested Schedule routes: /api/courses/:courseId/schedules
router.route('/:courseId/schedules')
  .get(getSchedules)
  .post(addSchedule);

router.route('/:courseId/schedules/:scheduleId')
  .put(updateSchedule)
  .patch(updateSchedule)
  .delete(deleteSchedule);

export default router;
