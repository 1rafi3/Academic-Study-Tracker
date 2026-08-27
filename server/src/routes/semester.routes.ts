import { Router } from 'express';
import {
  createSemester,
  getSemesters,
  getSemesterById,
  updateSemester,
  deleteSemester,
} from '../controllers/semester.controller.js';

const router = Router();

router.route('/')
  .post(createSemester)
  .get(getSemesters);

router.route('/:id')
  .get(getSemesterById)
  .patch(updateSemester)
  .delete(deleteSemester);

export default router;
