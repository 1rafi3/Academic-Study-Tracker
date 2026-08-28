import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';
import { ClassInstance } from '../models/ClassInstance.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await ClassInstance.deleteMany({});
  await Course.deleteMany({});
  await Semester.deleteMany({});
});

describe('=== Phase 4: Academic Calendar & Daily Class View Tests ===', () => {
  let semesterId: string;
  let course1Id: string;
  let course2Id: string;
  let course3Id: string;

  beforeEach(async () => {
    // Semester running September 1, 2026 to October 31, 2026 (2 full months)
    const sem = await Semester.create({
      name: '2026 Fall',
      year: 2026,
      term: 'Fall',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-10-31T00:00:00.000Z'),
      isActive: true,
    });
    semesterId = sem._id.toString();

    // Course 1 (CSE 221): Sunday & Tuesday 10:00 - 11:30
    const c1 = await Course.create({
      courseCode: 'CSE 221',
      courseName: 'Object Oriented Programming',
      credit: 3,
      color: '#6366f1',
      semesterId: sem._id,
      schedules: [
        { dayOfWeek: 'Sunday', startTime: '10:00', endTime: '11:30', room: 'Room 302' },
        { dayOfWeek: 'Tuesday', startTime: '10:00', endTime: '11:30', room: 'Room 302' },
      ],
    });
    course1Id = c1._id.toString();

    // Course 2 (CSE 222): Sunday 12:00 - 13:30 (Multiple courses on same day - Sunday)
    const c2 = await Course.create({
      courseCode: 'CSE 222',
      courseName: 'Database Systems',
      credit: 3,
      color: '#10b981',
      semesterId: sem._id,
      schedules: [
        { dayOfWeek: 'Sunday', startTime: '12:00', endTime: '13:30', room: 'Room 304' },
      ],
    });
    course2Id = c2._id.toString();

    // Course 3 (CSE 223): Sunday 15:00 - 16:30 (Third course on same day - Sunday)
    const c3 = await Course.create({
      courseCode: 'CSE 223',
      courseName: 'Data Structures',
      credit: 3,
      color: '#f59e0b',
      semesterId: sem._id,
      schedules: [
        { dayOfWeek: 'Sunday', startTime: '15:00', endTime: '16:30', room: 'Lab 2' },
      ],
    });
    course3Id = c3._id.toString();

    // Generate class instances across the semester
    await request(app).post('/api/class-instances/generate').send({ semesterId });
  });

  it('1. Month Date Range: retrieves all and only classes within September 2026', async () => {
    const res = await request(app).get(
      `/api/class-instances?semesterId=${semesterId}&startDate=2026-09-01&endDate=2026-09-30`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);

    // Verify all returned classes have dates strictly in September 2026
    for (const inst of res.body.data) {
      expect(inst.dateString).toMatch(/^2026-09-/);
      expect(inst.semesterId._id || inst.semesterId).toBe(semesterId);
    }
  });

  it('2. Multiple courses on the same day: Sunday September 6 contains 3 distinct class instances', async () => {
    const res = await request(app).get(
      `/api/class-instances?semesterId=${semesterId}&date=2026-09-06`
    );

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);

    const codes = res.body.data.map((c: any) => c.courseId.courseCode);
    expect(codes).toContain('CSE 221');
    expect(codes).toContain('CSE 222');
    expect(codes).toContain('CSE 223');

    // Verify each class instance has distinct time slot
    const startTimes = res.body.data.map((c: any) => c.startTime);
    expect(startTimes).toEqual(['10:00', '12:00', '15:00']);
  });

  it('3. Attendance Independence: marking one class as attended and another as missed on the same day works independently', async () => {
    const res = await request(app).get(
      `/api/class-instances?semesterId=${semesterId}&date=2026-09-06`
    );
    const classes = res.body.data;
    expect(classes.length).toBe(3);

    const cse221 = classes.find((c: any) => c.courseId.courseCode === 'CSE 221');
    const cse222 = classes.find((c: any) => c.courseId.courseCode === 'CSE 222');
    const cse223 = classes.find((c: any) => c.courseId.courseCode === 'CSE 223');

    // 1. Mark CSE 221 as attended
    await request(app)
      .patch(`/api/class-instances/${cse221._id}/attendance`)
      .send({ status: 'attended' });

    // 2. Mark CSE 222 as missed
    await request(app)
      .patch(`/api/class-instances/${cse222._id}/attendance`)
      .send({ status: 'missed' });

    // CSE 223 remains 'unmarked'

    // Verify each record independently
    const checkRes = await request(app).get(
      `/api/class-instances?semesterId=${semesterId}&date=2026-09-06`
    );

    const updatedC1 = checkRes.body.data.find((c: any) => c.courseId.courseCode === 'CSE 221');
    const updatedC2 = checkRes.body.data.find((c: any) => c.courseId.courseCode === 'CSE 222');
    const updatedC3 = checkRes.body.data.find((c: any) => c.courseId.courseCode === 'CSE 223');

    expect(updatedC1.attendanceStatus).toBe('attended');
    expect(updatedC2.attendanceStatus).toBe('missed');
    expect(updatedC3.attendanceStatus).toBe('unmarked');
  });

  it('4. Course Filter: filtering calendar query by courseId returns only that course', async () => {
    const res = await request(app).get(
      `/api/class-instances?semesterId=${semesterId}&courseId=${course1Id}&startDate=2026-09-01&endDate=2026-09-30`
    );

    expect(res.status).toBe(200);
    for (const inst of res.body.data) {
      expect(inst.courseId._id).toBe(course1Id);
      expect(inst.courseId.courseCode).toBe('CSE 221');
    }
  });

  it('5. Date Exclusion: classes outside requested date range are completely excluded', async () => {
    // Request a 3-day window (Sep 7 to Sep 9)
    // Sep 7 (Mon): No classes
    // Sep 8 (Tue): CSE 221 (1 class)
    // Sep 9 (Wed): No classes
    const res = await request(app).get(
      `/api/class-instances?semesterId=${semesterId}&startDate=2026-09-07&endDate=2026-09-09`
    );

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].dateString).toBe('2026-09-08');
    expect(res.body.data[0].courseId.courseCode).toBe('CSE 221');
  });

  it('6. Upcoming Classes Query: supports limit parameter for fast dashboard widgets', async () => {
    const res = await request(app).get(
      `/api/class-instances?semesterId=${semesterId}&startDate=2026-09-01&limit=5`
    );

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(5);
    expect(res.body.data.length).toBe(5);
  });

  it('7. Unrelated Semester Isolation: querying with another semesterId returns 0 classes', async () => {
    const otherSem = await Semester.create({
      name: '2027 Spring',
      year: 2027,
      term: 'Spring',
      startDate: new Date('2027-01-10'),
      endDate: new Date('2027-05-15'),
      isActive: false,
    });

    const res = await request(app).get(
      `/api/class-instances?semesterId=${otherSem._id}&startDate=2026-09-01&endDate=2026-09-30`
    );

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});
