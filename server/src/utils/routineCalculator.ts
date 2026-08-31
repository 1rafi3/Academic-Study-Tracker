import { DayOfWeek } from '../types/academic.types.js';

export const DAYS_OF_WEEK_ORDERED: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface SimpleSchedule {
  courseCode: string;
  courseName: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
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

export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h * 60 + m;
};

export const minutesToTime = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const calculateDurationMinutes = (startTime: string, endTime: string): number => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return Math.max(0, end - start);
};

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

export const getRoutineTimeRange = (
  schedules: Array<{ startTime: string; endTime: string }>
): {
  startHour: number;
  endHour: number;
  totalMinutes: number;
  hours: number[];
} => {
  if (!schedules || schedules.length === 0) {
    const startHour = 9;
    const endHour = 17;
    const hours: number[] = [];
    for (let h = startHour; h < endHour; h++) hours.push(h);
    return { startHour, endHour, totalMinutes: (endHour - startHour) * 60, hours };
  }

  let minMinutes = 24 * 60;
  let maxMinutes = 0;

  for (const s of schedules) {
    if (s.startTime) {
      const sm = timeToMinutes(s.startTime);
      if (sm < minMinutes) minMinutes = sm;
    }
    if (s.endTime) {
      const em = timeToMinutes(s.endTime);
      if (em > maxMinutes) maxMinutes = em;
    }
  }

  if (minMinutes >= maxMinutes) {
    minMinutes = 9 * 60;
    maxMinutes = 17 * 60;
  }

  const startHour = Math.max(0, Math.floor(minMinutes / 60));
  const endHour = Math.min(24, Math.ceil(maxMinutes / 60));
  const totalMinutes = Math.max(60, (endHour - startHour) * 60);

  const hours: number[] = [];
  for (let h = startHour; h < endHour; h++) {
    hours.push(h);
  }
  if (hours.length === 0) hours.push(startHour);

  return { startHour, endHour, totalMinutes, hours };
};

export const generateDiscreteTimeSlots = (
  startHour: number,
  endHour: number
) => {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    const startMin = h * 60;
    const endMin = (h + 1) * 60;
    const timeStr = `${String(h).padStart(2, '0')}:00`;
    slots.push({
      slotIndex: h - startHour,
      hour: h,
      startMinutes: startMin,
      endMinutes: endMin,
      timeStr,
      label: timeStr,
    });
  }
  return slots;
};

export const extractUniqueTimeSlots = (
  schedules: Array<{ startTime: string; endTime: string }>
): RoutineTimeSlotRow[] => {
  if (!schedules || schedules.length === 0) return [];

  const slotMap = new Map<string, RoutineTimeSlotRow>();

  for (const item of schedules) {
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

export const calculateWeeklySummary = (
  schedules: SimpleSchedule[]
): {
  totalClasses: number;
  totalHours: number;
  busiestDay: DayOfWeek | 'None';
} => {
  let totalMinutes = 0;
  const dayMinutes: Record<DayOfWeek, number> = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };

  for (const s of schedules) {
    const dur = calculateDurationMinutes(s.startTime, s.endTime);
    totalMinutes += dur;
    if (dayMinutes[s.dayOfWeek] !== undefined) {
      dayMinutes[s.dayOfWeek] += dur;
    }
  }

  let busiestDay: DayOfWeek | 'None' = 'None';
  let maxM = 0;
  for (const d of DAYS_OF_WEEK_ORDERED) {
    if (dayMinutes[d] > maxM) {
      maxM = dayMinutes[d];
      busiestDay = d;
    }
  }

  return {
    totalClasses: schedules.length,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    busiestDay: maxM > 0 ? busiestDay : 'None',
  };
};
