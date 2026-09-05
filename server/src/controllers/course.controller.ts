import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { Semester } from '../models/Semester.js';
import { ClassInstance } from '../models/ClassInstance.js';
import { buildUserFilter } from '../utils/queryHelper.js';

function generateCourseCode(name: string): string {
  if (!name) return 'COURSE';
  const clean = String(name).replace(/\([^)]*\)/g, '').trim();
  const tokens = clean.split(/[\s/-]+/).filter(Boolean);
  const stopWords = new Set(['of', 'in', 'to', 'for', 'the', 'a', 'an', 'on', 'with', 'by']);
  let abbr = '';
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower === 'and' || token === '&') {
      abbr += '&';
      continue;
    }
    if (stopWords.has(lower) && tokens.length > 2) continue;
    const ch = token.charAt(0).toUpperCase();
    if (/[A-Z0-9]/.test(ch)) abbr += ch;
  }
  return abbr || clean.slice(0, 4).toUpperCase();
}

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseCode, courseName, credit, instructor, description, color, semesterId, schedules, isArchived } = req.body;

    if (!courseName || !semesterId) {
      res.status(400).json({
        success: false,
        message: 'Course name and semester ID are required.',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(semesterId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid semester ID format',
      });
      return;
    }

    // Verify referenced semester actually exists AND belongs to the authenticated user
    const semesterExists = await Semester.findOne(buildUserFilter(req.userId, { _id: semesterId }));
    if (!semesterExists) {
      res.status(400).json({
        success: false,
        message: 'Referenced semester does not exist or does not belong to you',
      });
      return;
    }

    const finalCode = courseCode && String(courseCode).trim()
      ? String(courseCode).trim().toUpperCase()
      : generateCourseCode(String(courseName));

    const course = await Course.create({
      userId: req.userId,
      courseCode: finalCode,
      courseName: String(courseName).trim(),
      credit: credit !== undefined && credit !== '' && !isNaN(Number(credit)) ? Number(credit) : 3.0,
      instructor: instructor ? String(instructor).trim() : '',
      description: description ? String(description).trim() : '',
      color: color || '#6366f1',
      semesterId,
      schedules: Array.isArray(schedules) ? schedules : [],
      isArchived: Boolean(isArchived),
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'A course with this course code already exists in this semester.',
      });
      return;
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e) => e.message);
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
      return;
    }

    const message = error instanceof Error ? error.message : 'Failed to create course';
    res.status(500).json({ success: false, message });
  }
};

export const getCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { semesterId, archived, all } = req.query;
    const baseFilter: Record<string, unknown> = {};

    if (semesterId) {
      if (!mongoose.Types.ObjectId.isValid(String(semesterId))) {
        res.status(400).json({
          success: false,
          message: 'Invalid semester ID format',
        });
        return;
      }
      baseFilter.semesterId = semesterId;
    }

    // Filter archived courses
    if (all !== 'true') {
      if (archived === 'true') {
        baseFilter.isArchived = true;
      } else {
        baseFilter.isArchived = { $ne: true };
      }
    }

    const filter = buildUserFilter(req.userId, baseFilter);
    const courses = await Course.find(filter)
      .populate('semesterId', 'name year term isActive')
      .sort({ courseCode: 1 });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch courses';
    res.status(500).json({ success: false, message });
  }
};

export const getCourseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid course ID format',
      });
      return;
    }

    const course = await Course.findOne(buildUserFilter(req.userId, { _id: id })).populate('semesterId', 'name year term isActive');

    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch course';
    res.status(500).json({ success: false, message });
  }
};

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { courseCode, courseName, credit, instructor, description, color, semesterId, schedules, isArchived } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid course ID format',
      });
      return;
    }

    if (semesterId) {
      if (!mongoose.Types.ObjectId.isValid(semesterId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid semester ID format',
        });
        return;
      }
      const semesterExists = await Semester.findOne(buildUserFilter(req.userId, { _id: semesterId }));
      if (!semesterExists) {
        res.status(400).json({
          success: false,
          message: 'Referenced semester does not exist or does not belong to you',
        });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (courseCode !== undefined) {
      const trimmed = String(courseCode).trim();
      updateData.courseCode = trimmed ? trimmed.toUpperCase() : generateCourseCode(String(courseName || 'COURSE'));
    }
    if (courseName !== undefined) updateData.courseName = String(courseName).trim();
    if (credit !== undefined && credit !== '' && !isNaN(Number(credit))) updateData.credit = Number(credit);
    if (instructor !== undefined) updateData.instructor = String(instructor).trim();
    if (description !== undefined) updateData.description = String(description).trim();
    if (color !== undefined) updateData.color = color;
    if (semesterId !== undefined) updateData.semesterId = semesterId;
    if (schedules !== undefined && Array.isArray(schedules)) updateData.schedules = schedules;
    if (isArchived !== undefined) updateData.isArchived = Boolean(isArchived);

    const updatedCourse = await Course.findOneAndUpdate(
      buildUserFilter(req.userId, { _id: id }),
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).populate('semesterId', 'name year term isActive');

    if (!updatedCourse) {
      res.status(404).json({
        success: false,
        message: 'Course not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'A course with this course code already exists in this semester.',
      });
      return;
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e) => e.message);
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
      return;
    }

    const message = error instanceof Error ? error.message : 'Failed to update course';
    res.status(500).json({ success: false, message });
  }
};

export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { force } = req.query;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid course ID format',
      });
      return;
    }

    const course = await Course.findOne(buildUserFilter(req.userId, { _id: id }));
    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found',
      });
      return;
    }

    // Check if class instances / attendance history exist for this course belonging to this user
    const classCount = await ClassInstance.countDocuments(buildUserFilter(req.userId, { courseId: id }));

    if (classCount > 0 && force !== 'true') {
      // Safe Archive strategy: Hide from active lists while preserving all class instance & attendance history
      const archivedCourse = await Course.findOneAndUpdate(
        buildUserFilter(req.userId, { _id: id }),
        { isArchived: true },
        { new: true }
      ).populate('semesterId', 'name year term isActive');

      res.status(200).json({
        success: true,
        message: `Course has ${classCount} historical class occurrence(s). It has been safely archived to preserve attendance history.`,
        data: archivedCourse,
        archived: true,
      });
      return;
    }

    // If no class instances exist or force delete is explicitly requested
    const deletedCourse = await Course.findOneAndDelete(buildUserFilter(req.userId, { _id: id }));
    await ClassInstance.deleteMany(buildUserFilter(req.userId, { courseId: id }));

    res.status(200).json({
      success: true,
      message: 'Course permanently removed successfully',
      data: deletedCourse,
      archived: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete course';
    res.status(500).json({ success: false, message });
  }
};
