import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AcademicEvent } from '../models/AcademicEvent.js';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';
import { ACADEMIC_EVENT_TYPES, AcademicEventType } from '../types/academic.types.js';

// Safe date normalization helper to UTC midnight
const normalizeToUTCMidnight = (d: Date | string): Date => {
  if (typeof d === 'string') {
    const parts = d.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }
  }
  const dateObj = new Date(d);
  return new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 0, 0, 0, 0));
};

export const getAcademicEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { semesterId, courseId, startDate, endDate, date } = req.query;

    const filter: Record<string, unknown> = {};

    if (semesterId) {
      if (!mongoose.Types.ObjectId.isValid(String(semesterId))) {
        res.status(400).json({ success: false, message: 'Invalid semester ID format' });
        return;
      }
      filter.semesterId = new mongoose.Types.ObjectId(String(semesterId));
    }

    if (courseId) {
      if (courseId === 'general') {
        filter.courseId = null;
      } else if (mongoose.Types.ObjectId.isValid(String(courseId))) {
        filter.courseId = new mongoose.Types.ObjectId(String(courseId));
      } else {
        res.status(400).json({ success: false, message: 'Invalid course ID format' });
        return;
      }
    }

    if (date) {
      filter.dateString = String(date);
    } else if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        dateFilter.$gte = normalizeToUTCMidnight(String(startDate));
      }
      if (endDate) {
        dateFilter.$lte = normalizeToUTCMidnight(String(endDate));
      }
      filter.date = dateFilter;
    }

    const events = await AcademicEvent.find(filter)
      .populate('courseId', 'courseCode courseName color instructor')
      .populate('semesterId', 'name year term isActive')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve academic events';
    res.status(500).json({ success: false, message });
  }
};

export const getAcademicEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid academic event ID format' });
      return;
    }

    const event = await AcademicEvent.findById(id)
      .populate('courseId', 'courseCode courseName color instructor')
      .populate('semesterId', 'name year term isActive');

    if (!event) {
      res.status(404).json({ success: false, message: 'Academic event not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve academic event';
    res.status(500).json({ success: false, message });
  }
};

export const createAcademicEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      eventType,
      date,
      dateString: reqDateString,
      semesterId,
      courseId,
      startTime,
      endTime,
      room,
      description,
    } = req.body;

    // Validate required fields
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ success: false, message: 'Event title is required' });
      return;
    }

    if (!eventType || !ACADEMIC_EVENT_TYPES.includes(eventType as AcademicEventType)) {
      res.status(400).json({
        success: false,
        message: `Invalid event type. Allowed types: ${ACADEMIC_EVENT_TYPES.join(', ')}`,
      });
      return;
    }

    if (!semesterId || !mongoose.Types.ObjectId.isValid(String(semesterId))) {
      res.status(400).json({ success: false, message: 'Valid semester ID is required' });
      return;
    }

    // Verify semester exists
    const semester = await Semester.findById(semesterId);
    if (!semester) {
      res.status(404).json({ success: false, message: 'Referenced semester does not exist' });
      return;
    }

    // Verify course exists if provided
    let finalCourseId: mongoose.Types.ObjectId | null = null;
    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(String(courseId))) {
        res.status(400).json({ success: false, message: 'Invalid course ID format' });
        return;
      }
      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ success: false, message: 'Referenced course does not exist' });
        return;
      }
      finalCourseId = course._id;
    }

    const eventDateInput = date || reqDateString;
    if (!eventDateInput) {
      res.status(400).json({ success: false, message: 'Event date is required' });
      return;
    }

    const eventDate = normalizeToUTCMidnight(eventDateInput);
    const dateString =
      reqDateString ||
      `${eventDate.getUTCFullYear()}-${String(eventDate.getUTCMonth() + 1).padStart(2, '0')}-${String(
        eventDate.getUTCDate()
      ).padStart(2, '0')}`;

    // Optional time range validation
    if (startTime && endTime && startTime > endTime) {
      res.status(400).json({ success: false, message: 'Start time cannot be after end time' });
      return;
    }

    const newEvent = await AcademicEvent.create({
      title: title.trim(),
      eventType,
      date: eventDate,
      dateString,
      semesterId: semester._id,
      courseId: finalCourseId,
      startTime: typeof startTime === 'string' ? startTime.trim() : '',
      endTime: typeof endTime === 'string' ? endTime.trim() : '',
      room: typeof room === 'string' ? room.trim() : '',
      description: typeof description === 'string' ? description.trim() : '',
    });

    const populated = await AcademicEvent.findById(newEvent._id)
      .populate('courseId', 'courseCode courseName color instructor')
      .populate('semesterId', 'name year term isActive');

    res.status(201).json({
      success: true,
      message: 'Academic event created successfully',
      data: populated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create academic event';
    res.status(500).json({ success: false, message });
  }
};

export const updateAcademicEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid academic event ID format' });
      return;
    }

    const {
      title,
      eventType,
      date,
      dateString: reqDateString,
      courseId,
      startTime,
      endTime,
      room,
      description,
    } = req.body;

    const updateFields: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        res.status(400).json({ success: false, message: 'Event title cannot be empty' });
        return;
      }
      updateFields.title = title.trim();
    }

    if (eventType !== undefined) {
      if (!ACADEMIC_EVENT_TYPES.includes(eventType as AcademicEventType)) {
        res.status(400).json({
          success: false,
          message: `Invalid event type. Allowed types: ${ACADEMIC_EVENT_TYPES.join(', ')}`,
        });
        return;
      }
      updateFields.eventType = eventType;
    }

    if (date !== undefined || reqDateString !== undefined) {
      const eventDateInput = date || reqDateString;
      const eventDate = normalizeToUTCMidnight(eventDateInput);
      updateFields.date = eventDate;
      updateFields.dateString =
        reqDateString ||
        `${eventDate.getUTCFullYear()}-${String(eventDate.getUTCMonth() + 1).padStart(2, '0')}-${String(
          eventDate.getUTCDate()
        ).padStart(2, '0')}`;
    }

    if (courseId !== undefined) {
      if (courseId === null || courseId === '') {
        updateFields.courseId = null;
      } else if (mongoose.Types.ObjectId.isValid(String(courseId))) {
        const course = await Course.findById(courseId);
        if (!course) {
          res.status(404).json({ success: false, message: 'Referenced course does not exist' });
          return;
        }
        updateFields.courseId = course._id;
      } else {
        res.status(400).json({ success: false, message: 'Invalid course ID format' });
        return;
      }
    }

    if (startTime !== undefined) updateFields.startTime = typeof startTime === 'string' ? startTime.trim() : '';
    if (endTime !== undefined) updateFields.endTime = typeof endTime === 'string' ? endTime.trim() : '';
    if (room !== undefined) updateFields.room = typeof room === 'string' ? room.trim() : '';
    if (description !== undefined) updateFields.description = typeof description === 'string' ? description.trim() : '';

    const updated = await AcademicEvent.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .populate('courseId', 'courseCode courseName color instructor')
      .populate('semesterId', 'name year term isActive');

    if (!updated) {
      res.status(404).json({ success: false, message: 'Academic event not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Academic event updated successfully',
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update academic event';
    res.status(500).json({ success: false, message });
  }
};

export const deleteAcademicEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid academic event ID format' });
      return;
    }

    const deleted = await AcademicEvent.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({ success: false, message: 'Academic event not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Academic event deleted successfully',
      data: deleted,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete academic event';
    res.status(500).json({ success: false, message });
  }
};
