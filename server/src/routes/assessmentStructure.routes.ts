import { Router } from 'express';
import {
  getAssessmentStructure,
  upsertAssessmentStructure,
  addAssessmentComponent,
  updateAssessmentComponent,
  deleteAssessmentComponent,
} from '../controllers/assessmentStructure.controller.js';

const router = Router();

// GET/PUT for a course's full structure
router.route('/:courseId')
  .get(getAssessmentStructure)
  .put(upsertAssessmentStructure);

// POST to add a component
router.post('/:courseId/components', addAssessmentComponent);

// PATCH/DELETE for a specific component
router.route('/:courseId/components/:componentId')
  .patch(updateAssessmentComponent)
  .delete(deleteAssessmentComponent);

export default router;

