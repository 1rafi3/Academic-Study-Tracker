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

export const STANDARD_SLOT_DURATION = 90; // minutes (1h 30m standard university period)

export const STANDARD_WEEKDAYS: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
];

/**
 * Returns active timetable days. By default, if Friday and Saturday have no classes,
 * returns Sunday through Thursday matching the standard university timetable structure.
 * Users can also explicitly force show or hide weekend days.
 */
export const getActiveRoutineDays = (
  items: RoutineBlockItem[],
  weekendPreference: 'auto' | 'show' | 'hide' | boolean = 'auto'
): DayOfWeek[] => {
  if (weekendPreference === true || weekendPreference === 'show') {
    return DAYS_OF_WEEK_ORDERED;
  }
  if (weekendPreference === 'hide') {
    return STANDARD_WEEKDAYS;
  }
  const hasFriday = items.some((i) => i.dayOfWeek === 'Friday');
  const hasSaturday = items.some((i) => i.dayOfWeek === 'Saturday');

  if (hasFriday || hasSaturday) {
    return DAYS_OF_WEEK_ORDERED;
  }
  return STANDARD_WEEKDAYS;
};

/**
 * Calculates how many 90-minute standard slots a class spans.
 * E.g., a 3-hour lab (180 mins) spans 2 slots (rowSpan = 2).
 */
export const calculateSlotSpan = (classItem: RoutineBlockItem): number => {
  const cStart = timeToMinutes(classItem.startTime);
  const cEnd = timeToMinutes(classItem.endTime);
  const duration = Math.max(0, cEnd - cStart);
  return Math.max(1, Math.round(duration / STANDARD_SLOT_DURATION));
};

/**
 * Finds a class for a specific day that starts within the given time slot row.
 */
export const findClassStartingInSlot = (
  day: DayOfWeek,
  slot: RoutineTimeSlotRow,
  items: RoutineBlockItem[]
): RoutineBlockItem | null => {
  // First priority: Class that starts at or within 20 mins of slot start
  const match = items.find((item) => {
    if (item.dayOfWeek !== day) return false;
    const cStart = timeToMinutes(item.startTime);
    return Math.abs(cStart - slot.startMinutes) <= 20;
  });

  if (match) return match;

  // Second priority: Class starting anywhere strictly inside this slot
  return (
    items.find((item) => {
      if (item.dayOfWeek !== day) return false;
      const cStart = timeToMinutes(item.startTime);
      return cStart >= slot.startMinutes && cStart < slot.endMinutes;
    }) || null
  );
};

/**
 * Generates uniform, consistent 90-minute timetable rows (1:30 intervals).
 * Anchored to standard university periods (09:00 - 10:30, 10:30 - 12:00, etc.),
 * expanding automatically if classes start earlier or end later.
 */
export const generateStandardTimeSlots = (
  items: RoutineBlockItem[]
): RoutineTimeSlotRow[] => {
  let minMinute = 9 * 60;   // 09:00 AM (540)
  let maxMinute = 18 * 60;  // 06:00 PM (1080)

  for (const item of items) {
    const sMin = timeToMinutes(item.startTime);
    const eMin = timeToMinutes(item.endTime);
    if (sMin < minMinute && sMin >= 6 * 60) {
      minMinute = Math.floor(sMin / STANDARD_SLOT_DURATION) * STANDARD_SLOT_DURATION;
    }
    if (eMin > maxMinute && eMin <= 23 * 60) {
      maxMinute = Math.ceil(eMin / STANDARD_SLOT_DURATION) * STANDARD_SLOT_DURATION;
    }
  }

  const slots: RoutineTimeSlotRow[] = [];
  for (
    let current = minMinute;
    current + STANDARD_SLOT_DURATION <= maxMinute;
    current += STANDARD_SLOT_DURATION
  ) {
    const startStr = minutesToTime(current);
    const endStr = minutesToTime(current + STANDARD_SLOT_DURATION);
    const label12 = `${formatTimeDisplay(startStr, true)} - ${formatTimeDisplay(endStr, true)}`;
    const label24 = `${startStr} - ${endStr}`;
    const key = `${startStr}-${endStr}`;

    slots.push({
      slotKey: key,
      startTime: startStr,
      endTime: endStr,
      startMinutes: current,
      endMinutes: current + STANDARD_SLOT_DURATION,
      label12,
      label24,
    });
  }

  return slots;
};

/**
 * Backward-compatible helper that delegates to generateStandardTimeSlots.
 */
export const extractUniqueTimeSlots = (
  items: RoutineBlockItem[]
): RoutineTimeSlotRow[] => {
  return generateStandardTimeSlots(items);
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
