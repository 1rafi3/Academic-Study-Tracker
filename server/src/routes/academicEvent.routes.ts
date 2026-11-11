import { Router } from 'express';
import {
  getAcademicEvents,
  getAcademicEventById,
  createAcademicEvent,
  updateAcademicEvent,
  deleteAcademicEvent,
  updateEventResult,
} from '../controllers/academicEvent.controller.js';

const router = Router();

router.route('/')
  .get(getAcademicEvents)
  .post(createAcademicEvent);

router.route('/:id')
  .get(getAcademicEventById)
  .patch(updateAcademicEvent)
  .delete(deleteAcademicEvent);

// Phase 11: Course Academic Hub - event result endpoint
router.patch('/:id/result', updateEventResult);

export default router;
