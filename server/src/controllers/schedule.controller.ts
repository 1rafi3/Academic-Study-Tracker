import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { DAYS_OF_WEEK, DayOfWeek } from '../types/academic.types.js';
import { buildUserFilter } from '../utils/queryHelper.js';

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const getSchedules = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid course ID format',
      });
      return;
    }

    const course = await Course.findOne(buildUserFilter(req.userId, { _id: courseId }));

    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      count: course.schedules.length,
      data: course.schedules,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch schedules';
    res.status(500).json({ success: false, message });
  }
};

export const addSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;
    const { dayOfWeek, startTime, endTime, room, type } = req.body;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid course ID format',
      });
      return;
    }

    if (!dayOfWeek || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        message: 'Day of week, start time, and end time are required.',
      });
      return;
    }

    if (!DAYS_OF_WEEK.includes(dayOfWeek as DayOfWeek)) {
      res.status(400).json({
        success: false,
        message: `Invalid day of week. Allowed: ${DAYS_OF_WEEK.join(', ')}`,
      });
      return;
    }

    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      res.status(400).json({
        success: false,
        message: 'Start time and End time must be in HH:mm format (e.g. 09:30, 14:00)',
      });
      return;
    }

    if (startTime >= endTime) {
      res.status(400).json({
        success: false,
        message: 'End time must be after start time',
      });
      return;
    }

    const course = await Course.findOne(buildUserFilter(req.userId, { _id: courseId }));

    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found',
      });
      return;
    }

    const newSchedule = {
      dayOfWeek: dayOfWeek as DayOfWeek,
      startTime,
      endTime,
      room: room ? String(room).trim() : '',
      type: type || 'Lecture',
    };

    course.schedules.push(newSchedule as any);
    await course.save();

    const createdSchedule = course.schedules[course.schedules.length - 1];

    res.status(201).json({
      success: true,
      message: 'Schedule added successfully',
      data: createdSchedule,
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
    const message = error instanceof Error ? error.message : 'Failed to add schedule';
    res.status(500).json({ success: false, message });
  }
};

export const updateSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;
    const scheduleId = req.params.scheduleId as string;
    const { dayOfWeek, startTime, endTime, room, type } = req.body;

    if (!courseId || !scheduleId || !mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(scheduleId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid course or schedule ID format',
      });
      return;
    }

    const course = await Course.findOne(buildUserFilter(req.userId, { _id: courseId }));

    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found',
      });
      return;
    }

    const schedule = course.schedules.id(scheduleId);

    if (!schedule) {
      res.status(404).json({
        success: false,
        message: 'Schedule entry not found in this course',
      });
      return;
    }

    if (dayOfWeek !== undefined) {
      if (!DAYS_OF_WEEK.includes(dayOfWeek as DayOfWeek)) {
        res.status(400).json({
          success: false,
          message: `Invalid day of week. Allowed: ${DAYS_OF_WEEK.join(', ')}`,
        });
        return;
      }
      schedule.dayOfWeek = dayOfWeek;
    }

    const newStart = startTime !== undefined ? startTime : schedule.startTime;
    const newEnd = endTime !== undefined ? endTime : schedule.endTime;

    if (startTime !== undefined) {
      if (!timeRegex.test(startTime)) {
        res.status(400).json({
          success: false,
          message: 'Start time must be in HH:mm format (e.g. 09:30)',
        });
        return;
      }
      schedule.startTime = startTime;
    }

    if (endTime !== undefined) {
      if (!timeRegex.test(endTime)) {
        res.status(400).json({
          success: false,
          message: 'End time must be in HH:mm format (e.g. 11:00)',
        });
        return;
      }
      schedule.endTime = endTime;
    }

    if (newStart >= newEnd) {
      res.status(400).json({
        success: false,
        message: 'End time must be after start time',
      });
      return;
    }

    if (room !== undefined) schedule.room = String(room).trim();
    if (type !== undefined) schedule.type = type;

    await course.save();

    res.status(200).json({
      success: true,
      message: 'Schedule updated successfully',
      data: schedule,
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
    const message = error instanceof Error ? error.message : 'Failed to update schedule';
    res.status(500).json({ success: false, message });
  }
};

export const deleteSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.params.courseId as string;
    const scheduleId = req.params.scheduleId as string;

    if (!courseId || !scheduleId || !mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(scheduleId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid course or schedule ID format',
      });
      return;
    }

    const course = await Course.findOne(buildUserFilter(req.userId, { _id: courseId }));

    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found',
      });
      return;
    }

    const schedule = course.schedules.id(scheduleId);

    if (!schedule) {
      res.status(404).json({
        success: false,
        message: 'Schedule entry not found in this course',
      });
      return;
    }

    course.schedules.pull({ _id: scheduleId });
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Schedule removed successfully',
      data: { _id: scheduleId },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete schedule';
    res.status(500).json({ success: false, message });
  }
};
