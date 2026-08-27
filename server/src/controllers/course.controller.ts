import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { Semester } from '../models/Semester.js';

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseCode, courseName, credit, instructor, description, color, semesterId, schedules } = req.body;

    if (!courseCode || !courseName || !semesterId) {
      res.status(400).json({
        success: false,
        message: 'Course code, course name, and semester ID are required.',
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

    // Verify referenced semester actually exists
    const semesterExists = await Semester.findById(semesterId);
    if (!semesterExists) {
      res.status(400).json({
        success: false,
        message: 'Referenced semester does not exist',
      });
      return;
    }

    const course = await Course.create({
      courseCode: String(courseCode).trim().toUpperCase(),
      courseName: String(courseName).trim(),
      credit: credit !== undefined ? Number(credit) : 3.0,
      instructor: instructor ? String(instructor).trim() : '',
      description: description ? String(description).trim() : '',
      color: color || '#6366f1',
      semesterId,
      schedules: Array.isArray(schedules) ? schedules : [],
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
    const { semesterId } = req.query;
    const filter: Record<string, unknown> = {};

    if (semesterId) {
      if (!mongoose.Types.ObjectId.isValid(String(semesterId))) {
        res.status(400).json({
          success: false,
          message: 'Invalid semester ID format',
        });
        return;
      }
      filter.semesterId = semesterId;
    }

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

    const course = await Course.findById(id).populate('semesterId', 'name year term isActive');

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
    const { courseCode, courseName, credit, instructor, description, color, semesterId } = req.body;

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
      const semesterExists = await Semester.findById(semesterId);
      if (!semesterExists) {
        res.status(400).json({
          success: false,
          message: 'Referenced semester does not exist',
        });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (courseCode !== undefined) updateData.courseCode = String(courseCode).trim().toUpperCase();
    if (courseName !== undefined) updateData.courseName = String(courseName).trim();
    if (credit !== undefined) updateData.credit = Number(credit);
    if (instructor !== undefined) updateData.instructor = String(instructor).trim();
    if (description !== undefined) updateData.description = String(description).trim();
    if (color !== undefined) updateData.color = color;
    if (semesterId !== undefined) updateData.semesterId = semesterId;

    const updatedCourse = await Course.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('semesterId', 'name year term isActive');

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

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid course ID format',
      });
      return;
    }

    const deletedCourse = await Course.findByIdAndDelete(id);

    if (!deletedCourse) {
      res.status(404).json({
        success: false,
        message: 'Course not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
      data: deletedCourse,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete course';
    res.status(500).json({ success: false, message });
  }
};
