import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';
import { ClassInstance } from '../models/ClassInstance.js';
import {
  DAYS_OF_WEEK,
  ATTENDANCE_STATUSES,
  AttendanceStatus,
  CourseAttendanceStats,
  OverallAttendanceStats,
} from '../types/academic.types.js';

// Helper to format Date to YYYY-MM-DD in UTC
export const formatDateToUTCString = (date: Date): string => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to normalize date to UTC midnight
export const normalizeToUTCMidnight = (date: Date | string): Date => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

export const generateClassInstances = async (req: Request, res: Response): Promise<void> => {
  try {
    const { semesterId, courseId } = req.body;

    if (!semesterId) {
      res.status(400).json({
        success: false,
        message: 'semesterId is required to generate class instances',
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

    const semester = await Semester.findById(semesterId);
    if (!semester) {
      res.status(404).json({
        success: false,
        message: 'Semester not found',
      });
      return;
    }

    const courseFilter: Record<string, unknown> = {
      semesterId,
      isArchived: { $ne: true },
    };
    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid course ID format',
        });
        return;
      }
      courseFilter._id = courseId;
    }

    const courses = await Course.find(courseFilter);
    if (courses.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No courses with schedules found for this semester',
        data: {
          totalGenerated: 0,
          created: 0,
          skipped: 0,
          semesterId,
        },
      });
      return;
    }

    const start = normalizeToUTCMidnight(semester.startDate);
    const end = normalizeToUTCMidnight(semester.endDate);

    const bulkOps: any[] = [];
    let candidateCount = 0;

    // Loop through each calendar day in the semester range
    const current = new Date(start);
    while (current.getTime() <= end.getTime()) {
      const dayIndex = current.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
      const dayOfWeek = DAYS_OF_WEEK[dayIndex];
      const dateString = formatDateToUTCString(current);
      const instanceDate = new Date(current);

      for (const course of courses) {
        if (!course.schedules || course.schedules.length === 0) continue;

        for (const schedule of course.schedules) {
          if (schedule.dayOfWeek === dayOfWeek) {
            candidateCount++;
            bulkOps.push({
              updateOne: {
                filter: {
                  courseId: course._id,
                  date: instanceDate,
                  startTime: schedule.startTime,
                },
                update: {
                  $setOnInsert: {
                    courseId: course._id,
                    semesterId: semester._id,
                    scheduleId: schedule._id,
                    date: instanceDate,
                    dateString,
                    dayOfWeek,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    room: schedule.room || '',
                    type: schedule.type || 'Lecture',
                    attendanceStatus: 'unmarked',
                    topic: '',
                  },
                },
                upsert: true,
              },
            });
          }
        }
      }

      // Increment by 1 day
      current.setUTCDate(current.getUTCDate() + 1);
    }

    let createdCount = 0;
    if (bulkOps.length > 0) {
      const bulkResult = await ClassInstance.bulkWrite(bulkOps);
      createdCount = bulkResult.upsertedCount;
    }

    const skippedCount = candidateCount - createdCount;

    res.status(200).json({
      success: true,
      message: `Generated class instances. ${createdCount} created, ${skippedCount} already existed.`,
      data: {
        totalCandidates: candidateCount,
        created: createdCount,
        skipped: skippedCount,
        semesterId,
        semesterName: semester.name,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate class instances';
    res.status(500).json({ success: false, message });
  }
};

export const getClassInstances = async (req: Request, res: Response): Promise<void> => {
  try {
    const { semesterId, courseId, date, startDate, endDate, status, limit } = req.query;
    const filter: Record<string, unknown> = {};

    if (semesterId) {
      if (!mongoose.Types.ObjectId.isValid(String(semesterId))) {
        res.status(400).json({ success: false, message: 'Invalid semester ID format' });
        return;
      }
      filter.semesterId = semesterId;
    }

    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(String(courseId))) {
        res.status(400).json({ success: false, message: 'Invalid course ID format' });
        return;
      }
      filter.courseId = courseId;
    }

    if (status) {
      if (!ATTENDANCE_STATUSES.includes(status as AttendanceStatus)) {
        res.status(400).json({
          success: false,
          message: `Invalid attendance status. Allowed: ${ATTENDANCE_STATUSES.join(', ')}`,
        });
        return;
      }
      filter.attendanceStatus = status;
    }

    if (date) {
      const parsed = normalizeToUTCMidnight(String(date));
      filter.date = parsed;
    } else if (startDate || endDate) {
      const dateRange: Record<string, Date> = {};
      if (startDate) dateRange.$gte = normalizeToUTCMidnight(String(startDate));
      if (endDate) dateRange.$lte = normalizeToUTCMidnight(String(endDate));
      filter.date = dateRange;
    }

    let query = ClassInstance.find(filter)
      .populate('courseId', 'courseCode courseName color instructor')
      .populate('semesterId', 'name year term isActive')
      .sort({ date: 1, startTime: 1 });

    if (limit) {
      const parsedLimit = parseInt(String(limit), 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        query = query.limit(parsedLimit);
      }
    }

    const instances = await query.exec();

    res.status(200).json({
      success: true,
      count: instances.length,
      data: instances,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch class instances';
    res.status(500).json({ success: false, message });
  }
};

export const getClassInstanceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid class instance ID format' });
      return;
    }

    const instance = await ClassInstance.findById(id)
      .populate('courseId', 'courseCode courseName color instructor credit')
      .populate('semesterId', 'name year term isActive');

    if (!instance) {
      res.status(404).json({ success: false, message: 'Class instance not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: instance,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch class instance';
    res.status(500).json({ success: false, message });
  }
};

export const updateAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid class instance ID format' });
      return;
    }

    if (!status || !ATTENDANCE_STATUSES.includes(status as AttendanceStatus)) {
      res.status(400).json({
        success: false,
        message: `Invalid attendance status. Allowed values: ${ATTENDANCE_STATUSES.join(', ')}`,
      });
      return;
    }

    const updated = await ClassInstance.findByIdAndUpdate(
      id,
      { attendanceStatus: status },
      { new: true, runValidators: true }
    ).populate('courseId', 'courseCode courseName color instructor');

    if (!updated) {
      res.status(404).json({ success: false, message: 'Class instance not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Attendance updated to ${status}`,
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update attendance';
    res.status(500).json({ success: false, message });
  }
};

export const getAttendanceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { semesterId, courseId } = req.query;

    if (!semesterId && !courseId) {
      res.status(400).json({
        success: false,
        message: 'Either semesterId or courseId is required to calculate statistics',
      });
      return;
    }

    const filter: Record<string, unknown> = {};
    if (semesterId) {
      if (!mongoose.Types.ObjectId.isValid(String(semesterId))) {
        res.status(400).json({ success: false, message: 'Invalid semester ID format' });
        return;
      }
      filter.semesterId = new mongoose.Types.ObjectId(String(semesterId));
    }

    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(String(courseId))) {
        res.status(400).json({ success: false, message: 'Invalid course ID format' });
        return;
      }
      filter.courseId = new mongoose.Types.ObjectId(String(courseId));
    }

    // Aggregation pipeline to count attendance statuses grouped by course
    const aggregationResult = await ClassInstance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            courseId: '$courseId',
            status: '$attendanceStatus',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Fetch course details for the matched courses
    const matchedCourseIds = Array.from(
      new Set(aggregationResult.map((item) => item._id.courseId.toString()))
    );

    const courses = await Course.find({ _id: { $in: matchedCourseIds } });
    const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));

    // Aggregate stats per course
    const courseStatsMap = new Map<string, CourseAttendanceStats>();

    for (const item of aggregationResult) {
      const cId = item._id.courseId.toString();
      const status: AttendanceStatus = item._id.status;
      const count: number = item.count;

      if (!courseStatsMap.has(cId)) {
        const c = courseMap.get(cId);
        courseStatsMap.set(cId, {
          courseId: cId,
          courseCode: c?.courseCode || 'Unknown',
          courseName: c?.courseName || 'Unknown Course',
          color: c?.color || '#6366f1',
          total: 0,
          attended: 0,
          missed: 0,
          unmarked: 0,
          decided: 0,
          percentage: 0,
        });
      }

      const stat = courseStatsMap.get(cId)!;
      stat.total += count;
      if (status === 'attended') stat.attended += count;
      if (status === 'missed') stat.missed += count;
      if (status === 'unmarked') stat.unmarked += count;
    }

    // Compute percentage for each course
    const courseStatsList: CourseAttendanceStats[] = [];
    let overallTotal = 0;
    let overallAttended = 0;
    let overallMissed = 0;
    let overallUnmarked = 0;

    for (const stat of courseStatsMap.values()) {
      stat.decided = stat.attended + stat.missed;
      stat.percentage =
        stat.decided === 0
          ? 0
          : Math.round((stat.attended / stat.decided) * 10000) / 100;

      overallTotal += stat.total;
      overallAttended += stat.attended;
      overallMissed += stat.missed;
      overallUnmarked += stat.unmarked;
      courseStatsList.push(stat);
    }

    const overallDecided = overallAttended + overallMissed;
    const overallPercentage =
      overallDecided === 0
        ? 0
        : Math.round((overallAttended / overallDecided) * 10000) / 100;

    const statsResponse: OverallAttendanceStats = {
      total: overallTotal,
      attended: overallAttended,
      missed: overallMissed,
      unmarked: overallUnmarked,
      decided: overallDecided,
      percentage: overallPercentage,
      courses: courseStatsList.sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
    };

    res.status(200).json({
      success: true,
      data: statsResponse,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to calculate attendance statistics';
    res.status(500).json({ success: false, message });
  }
};

export const deleteClassInstance = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid class instance ID format' });
      return;
    }

    const deleted = await ClassInstance.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({ success: false, message: 'Class instance not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Class instance deleted successfully',
      data: deleted,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete class instance';
    res.status(500).json({ success: false, message });
  }
};
