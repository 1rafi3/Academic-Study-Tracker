import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';
import { ClassInstance } from '../models/ClassInstance.js';
import {
  AttendanceAnalyticsResponse,
  CourseAnalyticsData,
  OverallAnalyticsSummary,
} from '../types/academic.types.js';
import {
  calculateAttendancePercentage,
  classifyAttendanceStatus,
  calculateBunkAllowance,
  calculateRecoveryRequirement,
} from '../utils/analyticsCalculator.js';

export const getAttendanceAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { semesterId, courseId, target } = req.query;

    // Parse and sanitize target percentage (default: 75, range: 1 to 100)
    let targetPercentage = 75;
    if (target !== undefined) {
      const parsed = parseFloat(String(target));
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
        targetPercentage = Math.round(parsed * 100) / 100;
      }
    }

    const filter: Record<string, unknown> = {};

    let targetSemesterId: string | null = null;
    if (semesterId) {
      if (!mongoose.Types.ObjectId.isValid(String(semesterId))) {
        res.status(400).json({ success: false, message: 'Invalid semester ID format' });
        return;
      }
      targetSemesterId = String(semesterId);
      filter.semesterId = new mongoose.Types.ObjectId(targetSemesterId);
    } else if (!courseId) {
      // Find active semester as default if none specified
      const activeSem = await Semester.findOne({ isActive: true });
      if (activeSem) {
        targetSemesterId = activeSem._id.toString();
        filter.semesterId = activeSem._id;
      }
    }

    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(String(courseId))) {
        res.status(400).json({ success: false, message: 'Invalid course ID format' });
        return;
      }
      filter.courseId = new mongoose.Types.ObjectId(String(courseId));
    }

    // 1. Group class instances by courseId, attendanceStatus, and class status
    const aggregationResult = await ClassInstance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            courseId: '$courseId',
            attendanceStatus: '$attendanceStatus',
            classStatus: '$status',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // 2. Fetch matched courses for metadata (code, name, color)
    let coursesToQuery: mongoose.Types.ObjectId[] = [];
    if (courseId) {
      coursesToQuery = [new mongoose.Types.ObjectId(String(courseId))];
    } else if (targetSemesterId) {
      const semCourses = await Course.find({ semesterId: targetSemesterId, isArchived: { $ne: true } });
      coursesToQuery = semCourses.map((c) => c._id as mongoose.Types.ObjectId);
    } else {
      const matchedCourseIds = Array.from(
        new Set(aggregationResult.map((item) => item._id.courseId.toString()))
      );
      coursesToQuery = matchedCourseIds.map((id) => new mongoose.Types.ObjectId(id));
    }

    const courses = await Course.find({ _id: { $in: coursesToQuery } });
    const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));

    // 3. Count future scheduled classes from today onwards for forecast
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));

    const futureClassesAggregation = await ClassInstance.aggregate([
      {
        $match: {
          ...filter,
          date: { $gte: todayUTC },
          status: 'scheduled',
          attendanceStatus: 'unmarked',
        },
      },
      {
        $group: {
          _id: '$courseId',
          count: { $sum: 1 },
        },
      },
    ]);

    const futureClassesMap = new Map<string, number>();
    for (const item of futureClassesAggregation) {
      futureClassesMap.set(item._id.toString(), item.count);
    }

    // 4. Build per-course analytics
    const courseDataMap = new Map<string, CourseAnalyticsData>();

    // Initialize map for all queried courses so zero-attendance courses are included
    for (const course of courses) {
      const cId = course._id.toString();
      courseDataMap.set(cId, {
        courseId: cId,
        courseCode: course.courseCode,
        courseName: course.courseName,
        color: course.color || '#6366f1',
        total: 0,
        attended: 0,
        missed: 0,
        unmarked: 0,
        cancelled: 0,
        holiday: 0,
        decided: 0,
        percentage: 0,
        targetPercentage,
        differenceFromTarget: 0,
        status: 'NO_DATA',
        canBunk: 0,
        needToAttend: 0,
        futureScheduledCount: futureClassesMap.get(cId) || 0,
      });
    }

    // Populate counts from aggregation result
    for (const item of aggregationResult) {
      const cId = item._id.courseId.toString();
      const attendanceStatus = item._id.attendanceStatus;
      const classStatus = item._id.classStatus || 'scheduled';
      const count: number = item.count;

      if (!courseDataMap.has(cId)) {
        const c = courseMap.get(cId);
        courseDataMap.set(cId, {
          courseId: cId,
          courseCode: c?.courseCode || 'Unknown',
          courseName: c?.courseName || 'Unknown Course',
          color: c?.color || '#6366f1',
          total: 0,
          attended: 0,
          missed: 0,
          unmarked: 0,
          cancelled: 0,
          holiday: 0,
          decided: 0,
          percentage: 0,
          targetPercentage,
          differenceFromTarget: 0,
          status: 'NO_DATA',
          canBunk: 0,
          needToAttend: 0,
          futureScheduledCount: futureClassesMap.get(cId) || 0,
        });
      }

      const data = courseDataMap.get(cId)!;
      data.total += count;

      if (classStatus === 'cancelled') {
        data.cancelled += count;
      } else if (classStatus === 'holiday') {
        data.holiday += count;
      } else {
        // Scheduled classes
        if (attendanceStatus === 'attended') data.attended += count;
        else if (attendanceStatus === 'missed') data.missed += count;
        else data.unmarked += count;
      }
    }

    // Compute mathematical metrics per course
    const courseList: CourseAnalyticsData[] = [];
    let overallTotal = 0;
    let overallAttended = 0;
    let overallMissed = 0;
    let overallUnmarked = 0;
    let overallCancelled = 0;
    let overallHoliday = 0;

    for (const data of courseDataMap.values()) {
      data.decided = data.attended + data.missed;
      data.percentage = calculateAttendancePercentage(data.attended, data.missed);
      data.differenceFromTarget =
        data.decided > 0
          ? Math.round((data.percentage - targetPercentage) * 100) / 100
          : 0;

      data.status = classifyAttendanceStatus(data.percentage, targetPercentage, data.decided > 0);
      data.canBunk = calculateBunkAllowance(data.attended, data.missed, targetPercentage);
      data.needToAttend = calculateRecoveryRequirement(data.attended, data.missed, targetPercentage);

      overallTotal += data.total;
      overallAttended += data.attended;
      overallMissed += data.missed;
      overallUnmarked += data.unmarked;
      overallCancelled += data.cancelled;
      overallHoliday += data.holiday;

      courseList.push(data);
    }

    // 5. Compute overall analytics summary
    const overallDecided = overallAttended + overallMissed;
    const overallPercentage = calculateAttendancePercentage(overallAttended, overallMissed);
    const overallDifference =
      overallDecided > 0
        ? Math.round((overallPercentage - targetPercentage) * 100) / 100
        : 0;
    const overallStatus = classifyAttendanceStatus(
      overallPercentage,
      targetPercentage,
      overallDecided > 0
    );
    const overallCanBunk = calculateBunkAllowance(
      overallAttended,
      overallMissed,
      targetPercentage
    );
    const overallNeedToAttend = calculateRecoveryRequirement(
      overallAttended,
      overallMissed,
      targetPercentage
    );

    const overallSummary: OverallAnalyticsSummary = {
      total: overallTotal,
      attended: overallAttended,
      missed: overallMissed,
      unmarked: overallUnmarked,
      cancelled: overallCancelled,
      holiday: overallHoliday,
      decided: overallDecided,
      percentage: overallPercentage,
      targetPercentage,
      differenceFromTarget: overallDifference,
      status: overallStatus,
      canBunk: overallCanBunk,
      needToAttend: overallNeedToAttend,
    };

    const responseData: AttendanceAnalyticsResponse = {
      targetPercentage,
      overall: overallSummary,
      courses: courseList.sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
    };

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve attendance analytics';
    res.status(500).json({ success: false, message });
  }
};
