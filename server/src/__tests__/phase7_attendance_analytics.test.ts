import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';
import { ClassInstance } from '../models/ClassInstance.js';
import {
  calculateAttendancePercentage,
  calculateBunkAllowance,
  calculateRecoveryRequirement,
  classifyAttendanceStatus,
} from '../utils/analyticsCalculator.js';

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
  await ClassInstance.deleteMany({});
  await Course.deleteMany({});
  await Semester.deleteMany({});
});

describe('=== Phase 7: Pure Mathematical Calculator Unit Tests ===', () => {
  it('calculates attendance percentage correctly and avoids NaN', () => {
    expect(calculateAttendancePercentage(0, 0)).toBe(0);
    expect(calculateAttendancePercentage(15, 3)).toBe(83.33);
    expect(calculateAttendancePercentage(20, 0)).toBe(100);
    expect(calculateAttendancePercentage(0, 5)).toBe(0);
  });

  it('classifies attendance status correctly', () => {
    expect(classifyAttendanceStatus(0, 75, false)).toBe('NO_DATA');
    expect(classifyAttendanceStatus(82, 75, true)).toBe('SAFE');      // 82 >= 75 + 5
    expect(classifyAttendanceStatus(77, 75, true)).toBe('WARNING');   // 75 <= 77 < 80
    expect(classifyAttendanceStatus(75, 75, true)).toBe('WARNING');   // 75 == target
    expect(classifyAttendanceStatus(74.9, 75, true)).toBe('DANGER');  // < 75
  });

  it('calculates bunk allowance accurately for normal cases and edge cases', () => {
    // 20 Attended, 4 Missed (83.33%), Target 75% -> Can miss 2
    expect(calculateBunkAllowance(20, 4, 75)).toBe(2);

    // After missing 2, attendance is 20 / 26 = 76.92% (>= 75%)
    // If we missed 3, attendance would be 20 / 27 = 74.07% (< 75%)

    // Exactly at target: 15 Attended, 5 Missed (75%), Target 75% -> Can miss 0
    expect(calculateBunkAllowance(15, 5, 75)).toBe(0);

    // Below target: 14 Attended, 6 Missed (70%), Target 75% -> Cannot miss any (0)
    expect(calculateBunkAllowance(14, 6, 75)).toBe(0);

    // No attendance data -> 0
    expect(calculateBunkAllowance(0, 0, 75)).toBe(0);

    // Target 100% with perfect attendance -> Cannot miss any (0)
    expect(calculateBunkAllowance(10, 0, 100)).toBe(0);
  });

  it('calculates recovery requirement accurately', () => {
    // 15 Attended, 7 Missed (68.18%), Target 75% -> Need 6 classes
    // (15 + 6) / (22 + 6) = 21 / 28 = 75.0%
    expect(calculateRecoveryRequirement(15, 7, 75)).toBe(6);

    // Already above target (20 Attended, 4 Missed = 83.33% >= 75%) -> 0 needed
    expect(calculateRecoveryRequirement(20, 4, 75)).toBe(0);

    // Exactly at target (15 Attended, 5 Missed = 75%) -> 0 needed
    expect(calculateRecoveryRequirement(15, 5, 75)).toBe(0);

    // No attendance history -> 0
    expect(calculateRecoveryRequirement(0, 0, 75)).toBe(0);

    // Target 100% when 1 class missed -> Impossible (-1)
    expect(calculateRecoveryRequirement(10, 1, 100)).toBe(-1);
  });
});

describe('=== Phase 7: Analytics API Endpoints Integration Tests ===', () => {
  let semesterId: string;
  let course1Id: string;
  let course2Id: string;

  beforeEach(async () => {
    const sem = await Semester.create({
      name: 'Spring 2026',
      year: 2026,
      term: 'Spring',
      startDate: new Date('2026-01-10T00:00:00.000Z'),
      endDate: new Date('2026-05-30T00:00:00.000Z'),
      isActive: true,
    });
    semesterId = sem._id.toString();

    const c1 = await Course.create({
      courseCode: 'CSE 221',
      courseName: 'Algorithms',
      credit: 3,
      color: '#6366f1',
      semesterId: sem._id,
      schedules: [{ dayOfWeek: 'Sunday', startTime: '10:00', endTime: '11:30' }],
    });
    course1Id = c1._id.toString();

    const c2 = await Course.create({
      courseCode: 'CSE 202',
      courseName: 'Database Systems',
      credit: 3,
      color: '#10b981',
      semesterId: sem._id,
      schedules: [{ dayOfWeek: 'Monday', startTime: '12:00', endTime: '13:30' }],
    });
    course2Id = c2._id.toString();

    // Course 1: 20 Attended, 4 Missed, 1 Cancelled, 1 Holiday (Safe: 83.33% vs 75%)
    const c1Instances = [];
    for (let i = 0; i < 20; i++) {
      c1Instances.push({
        courseId: c1._id,
        semesterId: sem._id,
        date: new Date(`2026-02-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
        dateString: `2026-02-${String(i + 1).padStart(2, '0')}`,
        dayOfWeek: 'Sunday',
        startTime: '10:00',
        endTime: '11:30',
        status: 'scheduled',
        attendanceStatus: 'attended',
      });
    }
    for (let i = 0; i < 4; i++) {
      c1Instances.push({
        courseId: c1._id,
        semesterId: sem._id,
        date: new Date(`2026-03-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
        dateString: `2026-03-${String(i + 1).padStart(2, '0')}`,
        dayOfWeek: 'Sunday',
        startTime: '10:00',
        endTime: '11:30',
        status: 'scheduled',
        attendanceStatus: 'missed',
      });
    }
    c1Instances.push({
      courseId: c1._id,
      semesterId: sem._id,
      date: new Date('2026-03-10T00:00:00.000Z'),
      dateString: '2026-03-10',
      dayOfWeek: 'Sunday',
      startTime: '10:00',
      endTime: '11:30',
      status: 'cancelled',
      cancellationReason: 'Storm',
      attendanceStatus: 'unmarked',
    });
    c1Instances.push({
      courseId: c1._id,
      semesterId: sem._id,
      date: new Date('2026-03-17T00:00:00.000Z'),
      dateString: '2026-03-17',
      dayOfWeek: 'Sunday',
      startTime: '10:00',
      endTime: '11:30',
      status: 'holiday',
      holidayName: 'National Holiday',
      attendanceStatus: 'unmarked',
    });
    await ClassInstance.create(c1Instances);

    // Course 2: 15 Attended, 7 Missed (Danger: 68.18% vs 75%)
    const c2Instances = [];
    for (let i = 0; i < 15; i++) {
      c2Instances.push({
        courseId: c2._id,
        semesterId: sem._id,
        date: new Date(`2026-02-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
        dateString: `2026-02-${String(i + 1).padStart(2, '0')}`,
        dayOfWeek: 'Monday',
        startTime: '12:00',
        endTime: '13:30',
        status: 'scheduled',
        attendanceStatus: 'attended',
      });
    }
    for (let i = 0; i < 7; i++) {
      c2Instances.push({
        courseId: c2._id,
        semesterId: sem._id,
        date: new Date(`2026-03-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
        dateString: `2026-03-${String(i + 1).padStart(2, '0')}`,
        dayOfWeek: 'Monday',
        startTime: '12:00',
        endTime: '13:30',
        status: 'scheduled',
        attendanceStatus: 'missed',
      });
    }
    await ClassInstance.create(c2Instances);
  });

  it('retrieves full attendance analytics with default 75% target', async () => {
    const res = await request(app).get(`/api/analytics/attendance?semesterId=${semesterId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { targetPercentage, overall, courses } = res.body.data;
    expect(targetPercentage).toBe(75);

    // Course 1 (CSE 221): 20 Attended, 4 Missed -> 83.33%, SAFE, canBunk: 2, needToAttend: 0
    const cse221 = courses.find((c: any) => c.courseCode === 'CSE 221');
    expect(cse221).toBeDefined();
    expect(cse221.attended).toBe(20);
    expect(cse221.missed).toBe(4);
    expect(cse221.cancelled).toBe(1);
    expect(cse221.holiday).toBe(1);
    expect(cse221.percentage).toBe(83.33);
    expect(cse221.status).toBe('SAFE');
    expect(cse221.canBunk).toBe(2);
    expect(cse221.needToAttend).toBe(0);

    // Course 2 (CSE 202): 15 Attended, 7 Missed -> 68.18%, DANGER, canBunk: 0, needToAttend: 6
    const cse202 = courses.find((c: any) => c.courseCode === 'CSE 202');
    expect(cse202).toBeDefined();
    expect(cse202.attended).toBe(15);
    expect(cse202.missed).toBe(7);
    expect(cse202.percentage).toBe(68.18);
    expect(cse202.status).toBe('DANGER');
    expect(cse202.canBunk).toBe(0);
    expect(cse202.needToAttend).toBe(6);

    // Overall: 35 Attended, 11 Missed (Total 46 decided) -> 35/46 = 76.09% (WARNING vs 75% because 75 <= 76.09 < 80)
    expect(overall.attended).toBe(35);
    expect(overall.missed).toBe(11);
    expect(overall.decided).toBe(46);
    expect(overall.percentage).toBe(76.09);
    expect(overall.status).toBe('WARNING');
  });

  it('supports custom target percentage (e.g. 85%) and re-evaluates risk dynamically', async () => {
    const res = await request(app).get(
      `/api/analytics/attendance?semesterId=${semesterId}&target=85`
    );

    expect(res.status).toBe(200);
    const { targetPercentage, courses } = res.body.data;
    expect(targetPercentage).toBe(85);

    // For CSE 221 at 83.33%, against 85% target it is now in DANGER!
    const cse221 = courses.find((c: any) => c.courseCode === 'CSE 221');
    expect(cse221.status).toBe('DANGER');
    expect(cse221.canBunk).toBe(0);
    // (15 * 0.85 - 20 * 0.15) / 0.15 = (3.4 - 3.0) / 0.15 = 0.4 / 0.15 = 2.66 -> 3 classes
    expect(cse221.needToAttend).toBe(3);
  });

  it('filters analytics strictly by specific courseId', async () => {
    const res = await request(app).get(`/api/analytics/attendance?courseId=${course1Id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.courses.length).toBe(1);
    expect(res.body.data.courses[0].courseCode).toBe('CSE 221');
  });
});
