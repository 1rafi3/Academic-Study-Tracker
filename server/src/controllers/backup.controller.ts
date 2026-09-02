import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';
import { ClassInstance } from '../models/ClassInstance.js';
import { AcademicEvent } from '../models/AcademicEvent.js';
import { toCsv } from '../utils/csvFormatter.js';
import {
  calculateAttendancePercentage,
  classifyAttendanceStatus,
  calculateBunkAllowance,
  calculateRecoveryRequirement,
} from '../utils/analyticsCalculator.js';
import { buildUserFilter } from '../utils/queryHelper.js';

export interface BackupPayload {
  backupVersion: number;
  application: string;
  createdAt: string;
  data: {
    semesters: any[];
    courses: any[];
    classInstances: any[];
    academicEvents: any[];
  };
}

/**
 * 1. GET /api/backup/export
 * Exports complete academic data as versioned JSON.
 */
export const exportBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const semesters = await Semester.find(buildUserFilter(userId)).lean();
    const courses = await Course.find(buildUserFilter(userId)).lean();
    const classInstances = await ClassInstance.find(buildUserFilter(userId)).lean();
    const academicEvents = await AcademicEvent.find(buildUserFilter(userId)).lean();

    const cleanDocs = (docs: any[]) =>
      docs.map((doc) => {
        const copy = { ...doc };
        delete copy.__v;
        return copy;
      });

    const backupData: BackupPayload = {
      backupVersion: 1,
      application: 'Academic Study Tracker',
      createdAt: new Date().toISOString(),
      data: {
        semesters: cleanDocs(semesters),
        courses: cleanDocs(courses),
        classInstances: cleanDocs(classInstances),
        academicEvents: cleanDocs(academicEvents),
      },
    };

    res.status(200).json({
      success: true,
      data: backupData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export backup';
    res.status(500).json({ success: false, message });
  }
};

/**
 * 2. POST /api/backup/validate
 * Validates a backup JSON payload without modifying the database and computes preview counts.
 */
export const validateBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: BackupPayload = req.body;

    const errors: string[] = [];

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ success: false, message: 'Invalid backup file format' });
      return;
    }

    if (payload.application !== 'Academic Study Tracker') {
      errors.push('Backup file is not from Academic Study Tracker.');
    }

    if (payload.backupVersion !== 1) {
      errors.push(`Unsupported backup version (${payload.backupVersion}). Supported versions: 1.`);
    }

    if (!payload.data || typeof payload.data !== 'object') {
      errors.push('Backup is missing the data payload container.');
    }

    const {
      semesters = [],
      courses = [],
      classInstances = [],
      academicEvents = [],
    } = payload.data || {};

    if (!Array.isArray(semesters) || !Array.isArray(courses) || !Array.isArray(classInstances) || !Array.isArray(academicEvents)) {
      errors.push('One or more data collections (semesters, courses, classes, events) are not valid arrays.');
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        isValid: false,
        errors,
      });
      return;
    }

    // Check existing records in DB for this user to calculate toInsert vs toSkip
    const existingSemesters = await Semester.find(buildUserFilter(req.userId)).lean();
    const existingSemesterKeySet = new Set(
      existingSemesters.map((s) => `${s.name}_${s.year}_${s.term}`.toLowerCase())
    );

    let semestersToInsert = 0;
    let semestersToSkip = 0;
    for (const sem of semesters) {
      if (!sem.name || !sem.year || !sem.term) {
        errors.push(`A semester record is missing name, year, or term.`);
        continue;
      }
      const key = `${sem.name}_${sem.year}_${sem.term}`.toLowerCase();
      if (existingSemesterKeySet.has(key)) {
        semestersToSkip++;
      } else {
        semestersToInsert++;
      }
    }

    const existingCourses = await Course.find(buildUserFilter(req.userId)).lean();
    const existingCourseCodes = new Set(existingCourses.map((c) => `${c.courseCode}`.toUpperCase()));

    let coursesToInsert = 0;
    let coursesToSkip = 0;
    for (const c of courses) {
      if (!c.courseCode || !c.courseName) {
        errors.push(`A course record is missing courseCode or courseName.`);
        continue;
      }
      if (existingCourseCodes.has(c.courseCode.toUpperCase())) {
        coursesToSkip++;
      } else {
        coursesToInsert++;
      }
    }

    const totalClasses = classInstances.length;
    const totalEvents = academicEvents.length;

    const isValid = errors.length === 0;

    res.status(200).json({
      success: true,
      isValid,
      errors,
      preview: {
        createdAt: payload.createdAt,
        counts: {
          semesters: { total: semesters.length, toInsert: semestersToInsert, toSkip: semestersToSkip },
          courses: { total: courses.length, toInsert: coursesToInsert, toSkip: coursesToSkip },
          classInstances: { total: totalClasses },
          academicEvents: { total: totalEvents },
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to validate backup';
    res.status(500).json({ success: false, message });
  }
};

/**
 * 3. POST /api/backup/import
 * Imports backup with relationship preservation (old ID -> new ID mapping) and duplicate protection.
 */
export const importBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { backup, mode = 'add_missing', targetSemesterId } = req.body;

    if (!backup || !backup.data) {
      res.status(400).json({ success: false, message: 'Invalid backup payload' });
      return;
    }

    const {
      semesters = [],
      courses = [],
      classInstances = [],
      academicEvents = [],
    } = backup.data;

    // ID Mapping lookup tables: oldId -> new ObjectId
    const semesterIdMap = new Map<string, mongoose.Types.ObjectId>();
    const courseIdMap = new Map<string, mongoose.Types.ObjectId>();
    const scheduleIdMap = new Map<string, mongoose.Types.ObjectId>();

    let semestersInserted = 0;
    let semestersSkipped = 0;
    let coursesInserted = 0;
    let coursesSkipped = 0;
    let classesInserted = 0;
    let classesSkipped = 0;
    let eventsInserted = 0;
    let eventsSkipped = 0;

    // If Mode is 'replace_semester' and targetSemesterId provided
    if (mode === 'replace_semester' && targetSemesterId) {
      if (mongoose.Types.ObjectId.isValid(String(targetSemesterId))) {
        const semObjId = new mongoose.Types.ObjectId(String(targetSemesterId));
        await ClassInstance.deleteMany(buildUserFilter(req.userId, { semesterId: semObjId }));
        await AcademicEvent.deleteMany(buildUserFilter(req.userId, { semesterId: semObjId }));
        await Course.deleteMany(buildUserFilter(req.userId, { semesterId: semObjId }));
        await Semester.findOneAndDelete(buildUserFilter(req.userId, { _id: semObjId }));
      }
    }

    // A. Process Semesters
    for (const sem of semesters) {
      const oldId = sem._id ? sem._id.toString() : null;

      // Find existing matching semester for this user by business key (name + year + term)
      let existing = await Semester.findOne(buildUserFilter(req.userId, {
        name: sem.name,
        year: sem.year,
        term: sem.term,
      }));

      if (existing) {
        semestersSkipped++;
        if (oldId) semesterIdMap.set(oldId, existing._id as mongoose.Types.ObjectId);
      } else {
        const newSem = await Semester.create({
          userId: req.userId,
          name: sem.name,
          year: sem.year,
          term: sem.term,
          startDate: sem.startDate ? new Date(sem.startDate) : new Date(),
          endDate: sem.endDate ? new Date(sem.endDate) : new Date(),
          isActive: Boolean(sem.isActive),
          isArchived: Boolean(sem.isArchived),
        });
        semestersInserted++;
        if (oldId) semesterIdMap.set(oldId, newSem._id as mongoose.Types.ObjectId);
      }
    }

    // B. Process Courses
    for (const c of courses) {
      const oldCourseId = c._id ? c._id.toString() : null;
      const oldSemesterId = typeof c.semesterId === 'object' && c.semesterId ? c.semesterId._id?.toString() : c.semesterId?.toString();
      
      const newSemesterId = oldSemesterId ? semesterIdMap.get(oldSemesterId) : null;
      if (!newSemesterId) {
        coursesSkipped++;
        continue;
      }

      // Check if course already exists in this semester for this user
      let existingCourse = await Course.findOne(buildUserFilter(req.userId, {
        semesterId: newSemesterId,
        courseCode: c.courseCode,
      }));

      if (existingCourse) {
        coursesSkipped++;
        if (oldCourseId) courseIdMap.set(oldCourseId, existingCourse._id as mongoose.Types.ObjectId);

        // Map schedules if available
        if (c.schedules && existingCourse.schedules) {
          c.schedules.forEach((oldSched: any, idx: number) => {
            if (oldSched._id && existingCourse!.schedules[idx]?._id) {
              scheduleIdMap.set(oldSched._id.toString(), existingCourse!.schedules[idx]._id as mongoose.Types.ObjectId);
            }
          });
        }
      } else {
        const schedulesWithNewIds = (c.schedules || []).map((s: any) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room || '',
          type: s.type || 'Lecture',
        }));

        const newCourse = await Course.create({
          userId: req.userId,
          courseCode: c.courseCode,
          courseName: c.courseName,
          credit: c.credit || 3,
          instructor: c.instructor || '',
          description: c.description || '',
          color: c.color || '#6366f1',
          semesterId: newSemesterId,
          schedules: schedulesWithNewIds,
          isArchived: Boolean(c.isArchived),
        });

        coursesInserted++;
        if (oldCourseId) courseIdMap.set(oldCourseId, newCourse._id as mongoose.Types.ObjectId);

        // Map schedule IDs
        (c.schedules || []).forEach((oldSched: any, idx: number) => {
          if (oldSched._id && newCourse.schedules[idx]?._id) {
            scheduleIdMap.set(oldSched._id.toString(), newCourse.schedules[idx]._id as mongoose.Types.ObjectId);
          }
        });
      }
    }

    // C. Process ClassInstances
    for (const inst of classInstances) {
      const oldCourseId = typeof inst.courseId === 'object' && inst.courseId ? inst.courseId._id?.toString() : inst.courseId?.toString();
      const oldSemesterId = typeof inst.semesterId === 'object' && inst.semesterId ? inst.semesterId._id?.toString() : inst.semesterId?.toString();
      const oldSchedId = inst.scheduleId ? inst.scheduleId.toString() : null;

      const newCourseId = oldCourseId ? courseIdMap.get(oldCourseId) : null;
      const newSemesterId = oldSemesterId ? semesterIdMap.get(oldSemesterId) : null;
      const newSchedId = oldSchedId ? scheduleIdMap.get(oldSchedId) : undefined;

      if (!newCourseId || !newSemesterId) {
        classesSkipped++;
        continue;
      }

      // Business duplicate check: courseId + dateString + startTime for this user
      const existingInstance = await ClassInstance.findOne(buildUserFilter(req.userId, {
        courseId: newCourseId,
        dateString: inst.dateString,
        startTime: inst.startTime,
      }));

      if (existingInstance) {
        classesSkipped++;
      } else {
        await ClassInstance.create({
          userId: req.userId,
          courseId: newCourseId,
          semesterId: newSemesterId,
          scheduleId: newSchedId,
          date: inst.date ? new Date(inst.date) : new Date(inst.dateString),
          dateString: inst.dateString,
          dayOfWeek: inst.dayOfWeek,
          startTime: inst.startTime,
          endTime: inst.endTime,
          room: inst.room || '',
          type: inst.type || 'Lecture',
          status: inst.status || 'scheduled',
          cancellationReason: inst.cancellationReason || '',
          holidayName: inst.holidayName || '',
          attendanceStatus: inst.attendanceStatus || 'unmarked',
          topic: inst.topic || '',
          notes: inst.notes || '',
          hasHomework: Boolean(inst.hasHomework),
          homeworkDetails: inst.homeworkDetails || '',
        });
        classesInserted++;
      }
    }

    // D. Process AcademicEvents
    for (const ev of academicEvents) {
      const oldSemesterId = typeof ev.semesterId === 'object' && ev.semesterId ? ev.semesterId._id?.toString() : ev.semesterId?.toString();
      const oldCourseId = typeof ev.courseId === 'object' && ev.courseId ? ev.courseId._id?.toString() : ev.courseId?.toString();

      const newSemesterId = oldSemesterId ? semesterIdMap.get(oldSemesterId) : null;
      const newCourseId = oldCourseId ? courseIdMap.get(oldCourseId) || null : null;

      if (!newSemesterId) {
        eventsSkipped++;
        continue;
      }

      // Duplicate check: semesterId + dateString + title for this user
      const existingEvent = await AcademicEvent.findOne(buildUserFilter(req.userId, {
        semesterId: newSemesterId,
        dateString: ev.dateString,
        title: ev.title,
      }));

      if (existingEvent) {
        eventsSkipped++;
      } else {
        await AcademicEvent.create({
          userId: req.userId,
          title: ev.title,
          eventType: ev.eventType,
          date: ev.date ? new Date(ev.date) : new Date(ev.dateString),
          dateString: ev.dateString,
          semesterId: newSemesterId,
          courseId: newCourseId,
          startTime: ev.startTime || '',
          endTime: ev.endTime || '',
          room: ev.room || '',
          description: ev.description || '',
        });
        eventsInserted++;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Backup imported successfully',
      data: {
        semesters: { inserted: semestersInserted, skipped: semestersSkipped },
        courses: { inserted: coursesInserted, skipped: coursesSkipped },
        classInstances: { inserted: classesInserted, skipped: classesSkipped },
        academicEvents: { inserted: eventsInserted, skipped: eventsSkipped },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to import backup';
    res.status(500).json({ success: false, message });
  }
};

/**
 * 4. GET /api/backup/export/csv/attendance
 * Exports attendance records as RFC 4180 CSV.
 */
export const exportAttendanceCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    const { semesterId, courseId } = req.query;

    const baseFilter: Record<string, unknown> = {};
    if (semesterId && mongoose.Types.ObjectId.isValid(String(semesterId))) {
      baseFilter.semesterId = new mongoose.Types.ObjectId(String(semesterId));
    }
    if (courseId && mongoose.Types.ObjectId.isValid(String(courseId))) {
      baseFilter.courseId = new mongoose.Types.ObjectId(String(courseId));
    }

    const filter = buildUserFilter(req.userId, baseFilter);
    const classes = await ClassInstance.find(filter)
      .populate('courseId', 'courseCode courseName')
      .populate('semesterId', 'name year term')
      .sort({ date: 1, startTime: 1 })
      .lean();

    const headers = [
      'Date',
      'Day',
      'Start Time',
      'End Time',
      'Course Code',
      'Course Name',
      'Class Status',
      'Attendance Status',
      'Topic',
      'Notes',
      'Has Homework',
      'Homework Details',
    ];

    const rows = classes.map((cls) => {
      const course = typeof cls.courseId === 'object' && cls.courseId ? (cls.courseId as any) : null;
      return [
        cls.dateString,
        cls.dayOfWeek,
        cls.startTime,
        cls.endTime,
        course?.courseCode || 'N/A',
        course?.courseName || 'N/A',
        cls.status || 'scheduled',
        cls.attendanceStatus || 'unmarked',
        cls.topic || '',
        cls.notes || '',
        cls.hasHomework ? 'Yes' : 'No',
        cls.homeworkDetails || '',
      ];
    });

    const csvContent = toCsv(headers, rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_export.csv"');
    res.status(200).send(csvContent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export attendance CSV';
    res.status(500).json({ success: false, message });
  }
};

/**
 * 5. GET /api/backup/export/csv/courses
 * Exports courses as RFC 4180 CSV.
 */
export const exportCoursesCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    const { semesterId } = req.query;

    const baseFilter: Record<string, unknown> = {};
    if (semesterId && mongoose.Types.ObjectId.isValid(String(semesterId))) {
      baseFilter.semesterId = new mongoose.Types.ObjectId(String(semesterId));
    }

    const filter = buildUserFilter(req.userId, baseFilter);
    const courses = await Course.find(filter)
      .populate('semesterId', 'name year term')
      .sort({ courseCode: 1 })
      .lean();

    const headers = [
      'Semester',
      'Course Code',
      'Course Name',
      'Credit',
      'Instructor',
      'Color',
      'Weekly Schedules',
    ];

    const rows = courses.map((c) => {
      const sem = typeof c.semesterId === 'object' && c.semesterId ? (c.semesterId as any) : null;
      const schedSummary = (c.schedules || [])
        .map((s) => `${s.dayOfWeek} ${s.startTime}-${s.endTime}`)
        .join('; ');
      return [
        sem?.name || 'N/A',
        c.courseCode,
        c.courseName,
        c.credit,
        c.instructor || '',
        c.color || '#6366f1',
        schedSummary,
      ];
    });

    const csvContent = toCsv(headers, rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="courses_export.csv"');
    res.status(200).send(csvContent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export courses CSV';
    res.status(500).json({ success: false, message });
  }
};

/**
 * 6. GET /api/backup/export/csv/events
 * Exports academic events as RFC 4180 CSV.
 */
export const exportEventsCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    const { semesterId } = req.query;

    const baseFilter: Record<string, unknown> = {};
    if (semesterId && mongoose.Types.ObjectId.isValid(String(semesterId))) {
      baseFilter.semesterId = new mongoose.Types.ObjectId(String(semesterId));
    }

    const filter = buildUserFilter(req.userId, baseFilter);
    const events = await AcademicEvent.find(filter)
      .populate('courseId', 'courseCode courseName')
      .populate('semesterId', 'name year term')
      .sort({ date: 1, startTime: 1 })
      .lean();

    const headers = [
      'Date',
      'Event Type',
      'Title',
      'Semester',
      'Course Code',
      'Course Name',
      'Start Time',
      'End Time',
      'Room',
      'Description',
    ];

    const rows = events.map((ev) => {
      const sem = typeof ev.semesterId === 'object' && ev.semesterId ? (ev.semesterId as any) : null;
      const course = typeof ev.courseId === 'object' && ev.courseId ? (ev.courseId as any) : null;
      return [
        ev.dateString,
        ev.eventType,
        ev.title,
        sem?.name || 'N/A',
        course?.courseCode || 'General',
        course?.courseName || 'All Academic',
        ev.startTime || '',
        ev.endTime || '',
        ev.room || '',
        ev.description || '',
      ];
    });

    const csvContent = toCsv(headers, rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="academic_events_export.csv"');
    res.status(200).send(csvContent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export academic events CSV';
    res.status(500).json({ success: false, message });
  }
};

/**
 * 7. GET /api/backup/summary/:semesterId
 * Consolidated academic summary report for a semester.
 */
export const getSemesterSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const semesterId = req.params.semesterId as string;
    const target = req.query.target ? parseFloat(String(req.query.target)) : 75;

    if (!semesterId || !mongoose.Types.ObjectId.isValid(semesterId)) {
      res.status(400).json({ success: false, message: 'Invalid semester ID format' });
      return;
    }

    const semester = await Semester.findOne(buildUserFilter(req.userId, { _id: semesterId })).lean();
    if (!semester) {
      res.status(404).json({ success: false, message: 'Semester not found' });
      return;
    }

    const courses = await Course.find(buildUserFilter(req.userId, { semesterId, isArchived: { $ne: true } })).lean();
    const classInstances = await ClassInstance.find(buildUserFilter(req.userId, { semesterId })).lean();
    const events = await AcademicEvent.find(buildUserFilter(req.userId, { semesterId })).populate('courseId', 'courseCode courseName').sort({ date: 1 }).lean();

    // Group class instances by course
    const courseStatsMap = new Map<string, any>();
    for (const c of courses) {
      const cId = c._id.toString();
      courseStatsMap.set(cId, {
        courseId: cId,
        courseCode: c.courseCode,
        courseName: c.courseName,
        credit: c.credit,
        instructor: c.instructor || '',
        color: c.color || '#6366f1',
        total: 0,
        attended: 0,
        missed: 0,
        cancelled: 0,
        holiday: 0,
        unmarked: 0,
        decided: 0,
        percentage: 0,
        topicsCovered: [] as string[],
        lecturesWithNotes: 0,
        homeworkAssigned: 0,
      });
    }

    for (const inst of classInstances) {
      const cId = inst.courseId.toString();
      const stat = courseStatsMap.get(cId);
      if (!stat) continue;

      stat.total++;
      if (inst.status === 'cancelled') stat.cancelled++;
      else if (inst.status === 'holiday') stat.holiday++;
      else {
        if (inst.attendanceStatus === 'attended') stat.attended++;
        else if (inst.attendanceStatus === 'missed') stat.missed++;
        else stat.unmarked++;
      }

      if (inst.topic && inst.topic.trim()) {
        stat.topicsCovered.push(inst.topic.trim());
      }
      if (inst.notes && inst.notes.trim()) {
        stat.lecturesWithNotes++;
      }
      if (inst.hasHomework) {
        stat.homeworkAssigned++;
      }
    }

    let overallAttended = 0;
    let overallMissed = 0;
    let overallTotal = 0;
    let totalLecturesWithNotes = 0;
    let totalHomework = 0;

    const courseSummaries = Array.from(courseStatsMap.values()).map((stat) => {
      stat.decided = stat.attended + stat.missed;
      stat.percentage = calculateAttendancePercentage(stat.attended, stat.missed);
      stat.status = classifyAttendanceStatus(stat.percentage, target, stat.decided > 0);
      stat.canBunk = calculateBunkAllowance(stat.attended, stat.missed, target);
      stat.needToAttend = calculateRecoveryRequirement(stat.attended, stat.missed, target);

      overallAttended += stat.attended;
      overallMissed += stat.missed;
      overallTotal += stat.total;
      totalLecturesWithNotes += stat.lecturesWithNotes;
      totalHomework += stat.homeworkAssigned;

      return stat;
    });

    const overallDecided = overallAttended + overallMissed;
    const overallPercentage = calculateAttendancePercentage(overallAttended, overallMissed);
    const overallStatus = classifyAttendanceStatus(overallPercentage, target, overallDecided > 0);
    const overallCanBunk = calculateBunkAllowance(overallAttended, overallMissed, target);
    const overallNeedToAttend = calculateRecoveryRequirement(overallAttended, overallMissed, target);

    res.status(200).json({
      success: true,
      data: {
        semester,
        targetPercentage: target,
        overall: {
          totalClasses: overallTotal,
          attended: overallAttended,
          missed: overallMissed,
          decided: overallDecided,
          percentage: overallPercentage,
          status: overallStatus,
          canBunk: overallCanBunk,
          needToAttend: overallNeedToAttend,
          lecturesWithNotes: totalLecturesWithNotes,
          homeworkCount: totalHomework,
        },
        courses: courseSummaries.sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
        events,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate semester summary';
    res.status(500).json({ success: false, message });
  }
};
