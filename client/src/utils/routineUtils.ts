import type { DayOfWeek, ICourse } from '../types/academic.js';
import { getCourseShortName } from './courseUtils.js';

export const DAYS_OF_WEEK_ORDERED: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface RoutineBlockItem {
  courseId: string;
  courseCode: string;
  courseName: string;
  color: string;
  instructor?: string;
  scheduleId?: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  room?: string;
  type?: string;
}

export interface RoutineTimeSlotRow {
  slotKey: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  label12: string;
  label24: string;
}

export interface WeeklyRoutineSummary {
  totalCoursesWithSchedule: number;
  totalWeeklyClasses: number;
  totalWeeklyMinutes: number;
  totalWeeklyHours: number;
  busiestDay: DayOfWeek | 'None';
  busiestDayMinutes: number;
}

/**
 * Converts "HH:mm" string to integer minutes from 00:00.
 */
export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h * 60 + m;
};

/**
 * Converts integer minutes from 00:00 to "HH:mm".
 */
export const minutesToTime = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Calculates duration in minutes between start and end time.
 */
export const calculateDurationMinutes = (startTime: string, endTime: string): number => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return Math.max(0, end - start);
};

/**
 * Formats minutes into human-readable duration (e.g. "1h 30m" or "50m").
 */
export const formatDurationMinutes = (minutes: number): string => {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

/**
 * Formats "HH:mm" to 12-hour (e.g. "9 AM" or "10:30 AM") or 24-hour ("14:30") display.
 */
export const formatTimeDisplay = (timeStr: string, is12Hour: boolean = false): string => {
  if (!timeStr) return '';
  if (!is12Hour) return timeStr;

  const totalMin = timeToMinutes(timeStr);
  const h24 = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

  if (m === 0) {
    return `${h12} ${period}`;
  }
  const mStr = String(m).padStart(2, '0');
  return `${h12}:${mStr} ${period}`;
};

/**
 * Extracts all routine items from a course list.
 */
export const extractRoutineItemsFromCourses = (courses: ICourse[]): RoutineBlockItem[] => {
  const items: RoutineBlockItem[] = [];

  for (const course of courses) {
    if (course.isArchived) continue;
    for (const sched of course.schedules || []) {
      items.push({
        courseId: course._id,
        courseCode: getCourseShortName(course),
        courseName: course.courseName,
        color: course.color || '#6366f1',
        instructor: course.instructor || '',
        scheduleId: sched._id,
        dayOfWeek: sched.dayOfWeek,
        startTime: sched.startTime,
        endTime: sched.endTime,
        room: sched.room || '',
        type: sched.type || 'Lecture',
      });
    }
  }

  return items;
};

/**
 * Extracts distinct scheduled class time intervals to generate exact timetable rows
 * (e.g. "9 AM - 10:30 AM", "10:30 AM - 12 PM", "1:30 PM - 3 PM", etc.).
 */
export const extractUniqueTimeSlots = (
  items: RoutineBlockItem[]
): RoutineTimeSlotRow[] => {
  if (items.length === 0) return [];

  const slotMap = new Map<string, RoutineTimeSlotRow>();

  for (const item of items) {
    const key = `${item.startTime}-${item.endTime}`;
    if (!slotMap.has(key)) {
      const startMin = timeToMinutes(item.startTime);
      const endMin = timeToMinutes(item.endTime);
      const label12 = `${formatTimeDisplay(item.startTime, true)} - ${formatTimeDisplay(item.endTime, true)}`;
      const label24 = `${item.startTime} - ${item.endTime}`;

      slotMap.set(key, {
        slotKey: key,
        startTime: item.startTime,
        endTime: item.endTime,
        startMinutes: startMin,
        endMinutes: endMin,
        label12,
        label24,
      });
    }
  }

  return Array.from(slotMap.values()).sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return a.endMinutes - b.endMinutes;
  });
};

/**
 * Calculates high-level summary metrics across all courses.
 */
export const calculateWeeklySummary = (courses: ICourse[]): WeeklyRoutineSummary => {
  let coursesWithSchedCount = 0;
  let totalClasses = 0;
  let totalMinutes = 0;

  const dayMinutesMap: Record<DayOfWeek, number> = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };

  for (const course of courses) {
    if (course.isArchived) continue;
    const scheds = course.schedules || [];
    if (scheds.length > 0) {
      coursesWithSchedCount++;
    }

    for (const s of scheds) {
      totalClasses++;
      const dur = calculateDurationMinutes(s.startTime, s.endTime);
      totalMinutes += dur;
      if (dayMinutesMap[s.dayOfWeek] !== undefined) {
        dayMinutesMap[s.dayOfWeek] += dur;
      }
    }
  }

  let busiestDay: DayOfWeek | 'None' = 'None';
  let busiestMinutes = 0;

  for (const day of DAYS_OF_WEEK_ORDERED) {
    if (dayMinutesMap[day] > busiestMinutes) {
      busiestMinutes = dayMinutesMap[day];
      busiestDay = day;
    }
  }

  return {
    totalCoursesWithSchedule: coursesWithSchedCount,
    totalWeeklyClasses: totalClasses,
    totalWeeklyMinutes: totalMinutes,
    totalWeeklyHours: Math.round((totalMinutes / 60) * 10) / 10,
    busiestDay: busiestMinutes > 0 ? busiestDay : 'None',
    busiestDayMinutes: busiestMinutes,
  };
};
