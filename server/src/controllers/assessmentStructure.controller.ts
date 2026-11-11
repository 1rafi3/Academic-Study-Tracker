import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { CourseAssessmentStructure } from '../models/CourseAssessmentStructure.js';
import { Course } from '../models/Course.js';
import { buildUserFilter } from '../utils/queryHelper.js';

/**
 * GET /api/assessment-structures/:courseId
 * Returns the assessment structure for a course. Creates an empty one if none exists.
 */
export const getAssessmentStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ success: false, message: 'Invalid course ID format' });
      return;
    }

    // Verify course belongs to this user
    const course = await Course.findOne(buildUserFilter(req.userId, { _id: courseId }));
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found or does not belong to you' });
      return;
    }

    const structure = await CourseAssessmentStructure.findOne(
      buildUserFilter(req.userId, { courseId: new mongoose.Types.ObjectId(courseId) })
    )
      .populate('courseId', 'courseCode courseName color credit instructor semesterId')
      .lean();

    if (!structure) {
      // Return an empty structure (don't auto-create in DB until user saves)
      res.status(200).json({
        success: true,
        data: {
          _id: null,
          userId: req.userId,
          courseId: courseId,
          semesterId: course.semesterId,
          components: [],
          createdAt: null,
          updatedAt: null,
        },
      });
      return;
    }

    res.status(200).json({ success: true, data: structure });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve assessment structure';
    res.status(500).json({ success: false, message });
  }
};

/**
 * PUT /api/assessment-structures/:courseId
 * Full upsert: replace all components with provided array.
 */
export const upsertAssessmentStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ success: false, message: 'Invalid course ID format' });
      return;
    }

    // Verify course belongs to this user
    const course = await Course.findOne(buildUserFilter(req.userId, { _id: courseId }));
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found or does not belong to you' });
      return;
    }

    const { components } = req.body;

    if (!Array.isArray(components)) {
      res.status(400).json({ success: false, message: 'components must be an array' });
      return;
    }

    // Validate each component
    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      if (!comp.name || typeof comp.name !== 'string' || !comp.name.trim()) {
        res.status(400).json({ success: false, message: `Component ${i + 1}: name is required` });
        return;
      }
      const marks = Number(comp.allocatedMarks);
      if (isNaN(marks) || marks < 0) {
        res.status(400).json({ success: false, message: `Component ${i + 1}: allocatedMarks must be a non-negative number` });
        return;
      }
      comp.name = comp.name.trim();
      comp.allocatedMarks = marks;
      comp.isOptional = Boolean(comp.isOptional);
      comp.order = typeof comp.order === 'number' ? comp.order : i;
    }

    const courseObjId = new mongoose.Types.ObjectId(courseId);
    const filter = buildUserFilter(req.userId, { courseId: courseObjId });

    const structure = await CourseAssessmentStructure.findOneAndUpdate(
      filter,
      {
        $set: {
          userId: req.userId,
          courseId: courseObjId,
          semesterId: course.semesterId,
          components,
        },
      },
      { new: true, upsert: true, runValidators: true }
    )
      .populate('courseId', 'courseCode courseName color credit instructor semesterId');

    res.status(200).json({
      success: true,
      message: 'Assessment structure saved successfully',
      data: structure,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save assessment structure';
    res.status(500).json({ success: false, message });
  }
};

/**
 * POST /api/assessment-structures/:courseId/components
 * Add a single component to the assessment structure.
 */
export const addAssessmentComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ success: false, message: 'Invalid course ID format' });
      return;
    }

    const course = await Course.findOne(buildUserFilter(req.userId, { _id: courseId }));
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found or does not belong to you' });
      return;
    }

    const { name, allocatedMarks, isOptional, order } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: 'Component name is required' });
      return;
    }
    const marks = Number(allocatedMarks);
    if (isNaN(marks) || marks < 0) {
      res.status(400).json({ success: false, message: 'allocatedMarks must be a non-negative number' });
      return;
    }

    const courseObjId = new mongoose.Types.ObjectId(courseId);
    const filter = buildUserFilter(req.userId, { courseId: courseObjId });

    const newComponent = {
      name: name.trim(),
      allocatedMarks: marks,
      isOptional: Boolean(isOptional),
      order: typeof order === 'number' ? order : 0,
    };

    const structure = await CourseAssessmentStructure.findOneAndUpdate(
      filter,
      {
        $push: { components: newComponent },
        $setOnInsert: {
          userId: req.userId,
          courseId: courseObjId,
          semesterId: course.semesterId,
        },
      },
      { new: true, upsert: true, runValidators: true }
    )
      .populate('courseId', 'courseCode courseName color credit instructor semesterId');

    res.status(201).json({
      success: true,
      message: 'Assessment component added successfully',
      data: structure,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add assessment component';
    res.status(500).json({ success: false, message });
  }
};

/**
 * PATCH /api/assessment-structures/:courseId/components/:componentId
 * Update a single component in the assessment structure.
 */
export const updateAssessmentComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;
    const componentId = req.params.componentId as string;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ success: false, message: 'Invalid course ID format' });
      return;
    }
    if (!componentId || !mongoose.Types.ObjectId.isValid(componentId)) {
      res.status(400).json({ success: false, message: 'Invalid component ID format' });
      return;
    }

    const course = await Course.findOne(buildUserFilter(req.userId, { _id: courseId }));
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found or does not belong to you' });
      return;
    }

    const { name, allocatedMarks, isOptional, order } = req.body;
    const updateSet: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ success: false, message: 'Component name cannot be empty' });
        return;
      }
      updateSet['components.$.name'] = name.trim();
    }
    if (allocatedMarks !== undefined) {
      const marks = Number(allocatedMarks);
      if (isNaN(marks) || marks < 0) {
        res.status(400).json({ success: false, message: 'allocatedMarks must be a non-negative number' });
        return;
      }
      updateSet['components.$.allocatedMarks'] = marks;
    }
    if (isOptional !== undefined) updateSet['components.$.isOptional'] = Boolean(isOptional);
    if (order !== undefined) updateSet['components.$.order'] = Number(order);

    if (Object.keys(updateSet).length === 0) {
      res.status(400).json({ success: false, message: 'No valid fields to update' });
      return;
    }

    const courseObjId = new mongoose.Types.ObjectId(courseId);
    const componentObjId = new mongoose.Types.ObjectId(componentId);
    const filter = buildUserFilter(req.userId, { courseId: courseObjId, 'components._id': componentObjId });

    const structure = await CourseAssessmentStructure.findOneAndUpdate(
      filter,
      { $set: updateSet },
      { new: true, runValidators: true }
    )
      .populate('courseId', 'courseCode courseName color credit instructor semesterId');

    if (!structure) {
      res.status(404).json({ success: false, message: 'Assessment structure or component not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Assessment component updated successfully',
      data: structure,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update assessment component';
    res.status(500).json({ success: false, message });
  }
};

/**
 * DELETE /api/assessment-structures/:courseId/components/:componentId
 * Remove a single component from the assessment structure.
 */
export const deleteAssessmentComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;
    const componentId = req.params.componentId as string;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ success: false, message: 'Invalid course ID format' });
      return;
    }
    if (!componentId || !mongoose.Types.ObjectId.isValid(componentId)) {
      res.status(400).json({ success: false, message: 'Invalid component ID format' });
      return;
    }

    const course = await Course.findOne(buildUserFilter(req.userId, { _id: courseId }));
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found or does not belong to you' });
      return;
    }

    const courseObjId = new mongoose.Types.ObjectId(courseId);
    const componentObjId = new mongoose.Types.ObjectId(componentId);
    const filter = buildUserFilter(req.userId, { courseId: courseObjId });

    const structure = await CourseAssessmentStructure.findOneAndUpdate(
      filter,
      { $pull: { components: { _id: componentObjId } } },
      { new: true }
    )
      .populate('courseId', 'courseCode courseName color credit instructor semesterId');

    if (!structure) {
      res.status(404).json({ success: false, message: 'Assessment structure not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Assessment component deleted successfully',
      data: structure,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete assessment component';
    res.status(500).json({ success: false, message });
  }
};
