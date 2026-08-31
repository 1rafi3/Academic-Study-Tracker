import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';
import {
  timeToMinutes,
  calculateDurationMinutes,
  formatTimeDisplay,
  getRoutineTimeRange,
  calculateWeeklySummary,
  generateDiscreteTimeSlots,
  extractUniqueTimeSlots,
} from '../utils/routineCalculator.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

beforeEach(async () => {
  await Course.deleteMany({});
  await Semester.deleteMany({});
});

describe('=== Phase 9: Pure Routine Calculations Unit Tests ===', () => {
  it('converts time strings to minutes accurately', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('10:00')).toBe(600);
    expect(timeToMinutes('14:45')).toBe(885);
    expect(timeToMinutes('')).toBe(0);
  });

  it('calculates class duration in minutes correctly', () => {
    expect(calculateDurationMinutes('09:00', '10:30')).toBe(90);
    expect(calculateDurationMinutes('10:00', '11:30')).toBe(90);
    expect(calculateDurationMinutes('11:00', '14:00')).toBe(180);
    expect(calculateDurationMinutes('10:00', '09:00')).toBe(0); // Inverted safe guard
  });

  it('formats time to 12-hour and 24-hour display correctly', () => {
    expect(formatTimeDisplay('09:00', false)).toBe('09:00');
    expect(formatTimeDisplay('09:00', true)).toBe('9 AM');
    expect(formatTimeDisplay('12:00', true)).toBe('12 PM');
    expect(formatTimeDisplay('14:30', true)).toBe('2:30 PM');
    expect(formatTimeDisplay('00:15', true)).toBe('12:15 AM');
  });

  it('determines dynamic time bounding range strictly matching scheduled class hours', () => {
    // 09:00 to 16:30 -> grid starts at 9:00 (not 8:00) to 17:00
    const range1 = getRoutineTimeRange([
      { startTime: '09:00', endTime: '10:30' },
      { startTime: '15:00', endTime: '16:30' },
    ]);
    expect(range1.startHour).toBe(9);
    expect(range1.endHour).toBe(17);

    // 11:00 to 14:30 -> grid starts at 11:00 to 15:00 (no unused 08:00 rows)
    const range2 = getRoutineTimeRange([
      { startTime: '11:00', endTime: '12:30' },
      { startTime: '13:00', endTime: '14:30' },
    ]);
    expect(range2.startHour).toBe(11);
    expect(range2.endHour).toBe(15);
  });

  it('calculates weekly summary metrics and busiest day correctly', () => {
    const schedules = [
      { courseCode: 'CSE 221', courseName: 'OOP', dayOfWeek: 'Sunday' as const, startTime: '10:00', endTime: '11:30' },
      { courseCode: 'CSE 221', courseName: 'OOP', dayOfWeek: 'Wednesday' as const, startTime: '10:00', endTime: '11:30' },
      { courseCode: 'CSE 223', courseName: 'DB', dayOfWeek: 'Sunday' as const, startTime: '12:00', endTime: '14:00' },
    ];

    const summary = calculateWeeklySummary(schedules);
    expect(summary.totalClasses).toBe(3);
    // Sunday: 90 + 120 = 210 mins (3.5 hrs), Wednesday: 90 mins (1.5 hrs) -> Total 300 mins = 5.0 hrs
    expect(summary.totalHours).toBe(5);
    expect(summary.busiestDay).toBe('Sunday');
  });

  it('extracts unique time slots matching university routine format (e.g. 9 AM - 10:30 AM, 1:30 PM - 3 PM)', () => {
    const schedules = [
      { startTime: '09:00', endTime: '10:30' },
      { startTime: '10:30', endTime: '12:00' },
      { startTime: '13:30', endTime: '15:00' },
      { startTime: '15:00', endTime: '16:30' },
      { startTime: '09:00', endTime: '10:30' }, // duplicate slot on different day
    ];

    const slots = extractUniqueTimeSlots(schedules);
    expect(slots.length).toBe(4);
    expect(slots[0].label12).toBe('9 AM - 10:30 AM');
    expect(slots[1].label12).toBe('10:30 AM - 12 PM');
    expect(slots[2].label12).toBe('1:30 PM - 3 PM');
    expect(slots[3].label12).toBe('3 PM - 4:30 PM');
  });
});

describe('=== Phase 9: Course Schedule Integration for Routine Tests ===', () => {
  it('retrieves courses with schedules to build routine dynamically without duplicate data', async () => {
    const sem = await Semester.create({
      name: 'Spring 2026',
      year: 2026,
      term: 'Spring',
      startDate: new Date('2026-01-10T00:00:00.000Z'),
      endDate: new Date('2026-05-30T00:00:00.000Z'),
      isActive: true,
    });

    await Course.create({
      courseCode: 'CSE 221',
      courseName: 'Object Oriented Programming',
      credit: 3,
      instructor: 'Dr. John',
      color: '#6366f1',
      semesterId: sem._id,
      schedules: [
        { dayOfWeek: 'Sunday', startTime: '10:00', endTime: '11:30', room: 'Room 302', type: 'Lecture' },
        { dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '11:30', room: 'Room 302', type: 'Lecture' },
      ],
    });

    await Course.create({
      courseCode: 'CSE 222',
      courseName: 'OOP Lab',
      credit: 1.5,
      instructor: 'Lab Instructor',
      color: '#10b981',
      semesterId: sem._id,
      schedules: [
        { dayOfWeek: 'Sunday', startTime: '12:00', endTime: '15:00', room: 'Lab 2', type: 'Lab' },
      ],
    });

    const res = await request(app).get(`/api/courses?semesterId=${sem._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);

    const allSchedules = res.body.data.flatMap((c: any) =>
      c.schedules.map((s: any) => ({ ...s, courseCode: c.courseCode, courseName: c.courseName }))
    );

    expect(allSchedules.length).toBe(3);
    const sundayClasses = allSchedules.filter((s: any) => s.dayOfWeek === 'Sunday');
    expect(sundayClasses.length).toBe(2);
    expect(sundayClasses[0].room).toBe('Room 302');
    expect(sundayClasses[1].room).toBe('Lab 2');
  });
});
