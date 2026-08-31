import { Router } from 'express';
import {
  getAcademicEvents,
  getAcademicEventById,
  createAcademicEvent,
  updateAcademicEvent,
  deleteAcademicEvent,
} from '../controllers/academicEvent.controller.js';

const router = Router();

router.route('/')
  .get(getAcademicEvents)
  .post(createAcademicEvent);

router.route('/:id')
  .get(getAcademicEventById)
  .patch(updateAcademicEvent)
  .delete(deleteAcademicEvent);

export default router;
