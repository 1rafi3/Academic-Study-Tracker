import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';

export const createSemester = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, year, term, startDate, endDate, isActive } = req.body;

    if (!name || !year || !term || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'Name, year, term, startDate, and endDate are required fields.',
      });
      return;
    }

    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date.',
      });
      return;
    }

    // If setting this semester as active, optionally unset other active semesters
    if (isActive) {
      await Semester.updateMany({ isActive: true }, { isActive: false });
    }

    const semester = await Semester.create({
      name,
      year: Number(year),
      term,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: Boolean(isActive),
    });

    res.status(201).json({
      success: true,
      message: 'Semester created successfully',
      data: semester,
    });
  } catch (error: unknown) {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e) => e.message);
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create semester';
    res.status(500).json({ success: false, message });
  }
};

export const getSemesters = async (req: Request, res: Response): Promise<void> => {
  try {
    const { active } = req.query;
    const filter: Record<string, unknown> = {};

    if (active === 'true') {
      filter.isActive = true;
    }

    const semesters = await Semester.find(filter).sort({ year: -1, startDate: -1 });

    res.status(200).json({
      success: true,
      count: semesters.length,
      data: semesters,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch semesters';
    res.status(500).json({ success: false, message });
  }
};

export const getSemesterById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid semester ID format',
      });
      return;
    }

    const semester = await Semester.findById(id);

    if (!semester) {
      res.status(404).json({
        success: false,
        message: 'Semester not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: semester,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch semester';
    res.status(500).json({ success: false, message });
  }
};

export const updateSemester = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, year, term, startDate, endDate, isActive } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid semester ID format',
      });
      return;
    }

    if (startDate && endDate && new Date(startDate).getTime() > new Date(endDate).getTime()) {
      res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date.',
      });
      return;
    }

    if (isActive === true) {
      await Semester.updateMany({ _id: { $ne: id }, isActive: true }, { isActive: false });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (year !== undefined) updateData.year = Number(year);
    if (term !== undefined) updateData.term = term;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updatedSemester = await Semester.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedSemester) {
      res.status(404).json({
        success: false,
        message: 'Semester not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Semester updated successfully',
      data: updatedSemester,
    });
  } catch (error: unknown) {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e) => e.message);
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to update semester';
    res.status(500).json({ success: false, message });
  }
};

export const deleteSemester = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid semester ID format',
      });
      return;
    }

    // Safety check: Prevent deletion if courses exist for this semester
    const courseCount = await Course.countDocuments({ semesterId: id });
    if (courseCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete semester because it contains ${courseCount} course(s). Please remove all courses in this semester first.`,
      });
      return;
    }

    const deletedSemester = await Semester.findByIdAndDelete(id);

    if (!deletedSemester) {
      res.status(404).json({
        success: false,
        message: 'Semester not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Semester deleted successfully',
      data: deletedSemester,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete semester';
    res.status(500).json({ success: false, message });
  }
};
