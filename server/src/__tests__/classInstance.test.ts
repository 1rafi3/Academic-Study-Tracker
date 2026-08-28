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

describe('=== Phase 3: Class Instance Generation & Attendance Tests ===', () => {
  let semesterId: string;
  let course1Id: string;
  let course2Id: string;

  beforeEach(async () => {
    // 2-week semester: Sept 1, 2026 (Tuesday) to Sept 14, 2026 (Monday)
    // Calendar days:
    // Sep 1: Tue
    // Sep 2: Wed
    // Sep 3: Thu
    // Sep 4: Fri
    // Sep 5: Sat
    // Sep 6: Sun
    // Sep 7: Mon
    // Sep 8: Tue
    // Sep 9: Wed
    // Sep 10: Thu
    // Sep 11: Fri
    // Sep 12: Sat
    // Sep 13: Sun
    // Sep 14: Mon
    const sem = await Semester.create({
      name: '2026 Fall Test',
      year: 2026,
      term: 'Fall',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-09-14T00:00:00.000Z'),
      isActive: true,
    });
    semesterId = sem._id.toString();

    // Course 1: Sunday 10:00-11:30 & Tuesday 10:00-11:30 (Multiple schedules per course)
    const c1 = await Course.create({
      courseCode: 'CSE 221',
      courseName: 'Object Oriented Programming',
      credit: 3,
      semesterId: sem._id,
      schedules: [
        { dayOfWeek: 'Sunday', startTime: '10:00', endTime: '11:30', room: 'Room 302' },
        { dayOfWeek: 'Tuesday', startTime: '10:00', endTime: '11:30', room: 'Room 302' },
      ],
    });
    course1Id = c1._id.toString();

    // Course 2: Sunday 14:00-15:30 (Multiple courses on same day - Sunday)
    const c2 = await Course.create({
      courseCode: 'CSE 223',
      courseName: 'Database Management Systems',
      credit: 3,
      semesterId: sem._id,
      schedules: [
        { dayOfWeek: 'Sunday', startTime: '14:00', endTime: '15:30', room: 'Lab 4' },
      ],
    });
    course2Id = c2._id.toString();
  });

  it('1. Generates correct weekday instances strictly within semester date boundaries', async () => {
    const res = await request(app)
      .post('/api/class-instances/generate')
      .send({ semesterId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // In 2-week range (Sept 1 to Sept 14):
    // Tuesdays: Sept 1, Sept 8 -> 2 classes for CSE 221
    // Sundays: Sept 6, Sept 13 -> 2 classes for CSE 221, 2 classes for CSE 223
    // Total = 4 for CSE 221 + 2 for CSE 223 = 6 classes
    expect(res.body.data.created).toBe(6);

    const listRes = await request(app).get(`/api/class-instances?semesterId=${semesterId}`);
    expect(listRes.body.count).toBe(6);

    // Verify all instances are on Sunday or Tuesday
    const validDays = ['Sunday', 'Tuesday'];
    for (const inst of listRes.body.data) {
      expect(validDays).toContain(inst.dayOfWeek);
      expect(new Date(inst.date).getTime()).toBeGreaterThanOrEqual(new Date('2026-09-01T00:00:00.000Z').getTime());
      expect(new Date(inst.date).getTime()).toBeLessThanOrEqual(new Date('2026-09-14T00:00:00.000Z').getTime());
    }
  });

  it('2. Supports multiple courses on the same day as independent records', async () => {
    await request(app).post('/api/class-instances/generate').send({ semesterId });

    // Filter Sunday, Sept 6, 2026
    const res = await request(app).get(
      `/api/class-instances?semesterId=${semesterId}&date=2026-09-06`
    );

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);

    const codes = res.body.data.map((c: any) => c.courseId.courseCode);
    expect(codes).toContain('CSE 221');
    expect(codes).toContain('CSE 223');
  });

  it('3. Prevents duplicate class generation on re-run (idempotency)', async () => {
    // Run 1
    const run1 = await request(app).post('/api/class-instances/generate').send({ semesterId });
    expect(run1.body.data.created).toBe(6);
    expect(run1.body.data.skipped).toBe(0);

    // Run 2 (re-run)
    const run2 = await request(app).post('/api/class-instances/generate').send({ semesterId });
    expect(run2.body.data.created).toBe(0);
    expect(run2.body.data.skipped).toBe(6);

    // Verify total count in DB is still exactly 6
    const totalInDb = await ClassInstance.countDocuments({ semesterId });
    expect(totalInDb).toBe(6);
  });

  it('4. Default attendance status is "unmarked"', async () => {
    await request(app).post('/api/class-instances/generate').send({ semesterId });

    const instances = await ClassInstance.find({ semesterId });
    for (const inst of instances) {
      expect(inst.attendanceStatus).toBe('unmarked');
    }
  });

  it('5. Allows attendance state transitions: unmarked -> attended -> missed -> unmarked', async () => {
    await request(app).post('/api/class-instances/generate').send({ semesterId });

    const instance = await ClassInstance.findOne({ courseId: course1Id });
    expect(instance).not.toBeNull();
    const instId = instance!._id.toString();

    // 1. unmarked -> attended
    const toAttended = await request(app)
      .patch(`/api/class-instances/${instId}/attendance`)
      .send({ status: 'attended' });
    expect(toAttended.status).toBe(200);
    expect(toAttended.body.data.attendanceStatus).toBe('attended');

    // 2. attended -> missed
    const toMissed = await request(app)
      .patch(`/api/class-instances/${instId}/attendance`)
      .send({ status: 'missed' });
    expect(toMissed.status).toBe(200);
    expect(toMissed.body.data.attendanceStatus).toBe('missed');

    // 3. missed -> unmarked
    const toUnmarked = await request(app)
      .patch(`/api/class-instances/${instId}/attendance`)
      .send({ status: 'unmarked' });
    expect(toUnmarked.status).toBe(200);
    expect(toUnmarked.body.data.attendanceStatus).toBe('unmarked');
  });

  it('6. Rejects invalid attendance status with HTTP 400', async () => {
    await request(app).post('/api/class-instances/generate').send({ semesterId });

    const instance = await ClassInstance.findOne({ courseId: course1Id });
    const instId = instance!._id.toString();

    const res = await request(app)
      .patch(`/api/class-instances/${instId}/attendance`)
      .send({ status: 'absent_with_reason' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid attendance status');
  });

  it('7. Handles invalid and nonexistent class instance IDs correctly', async () => {
    const invalidIdRes = await request(app)
      .patch('/api/class-instances/invalid-id/attendance')
      .send({ status: 'attended' });
    expect(invalidIdRes.status).toBe(400);

    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const missingRes = await request(app)
      .patch(`/api/class-instances/${nonExistentId}/attendance`)
      .send({ status: 'attended' });
    expect(missingRes.status).toBe(404);
  });

  it('8. Correctly calculates attendance stats and excludes unmarked classes from denominator', async () => {
    // Generate 4 classes for CSE 221:
    // Mark 2 Attended, 1 Missed, 1 Unmarked
    await request(app).post('/api/class-instances/generate').send({ semesterId });

    const c1Instances = await ClassInstance.find({ courseId: course1Id }).sort({ date: 1 });
    expect(c1Instances.length).toBe(4);

    await ClassInstance.findByIdAndUpdate(c1Instances[0]._id, { attendanceStatus: 'attended' });
    await ClassInstance.findByIdAndUpdate(c1Instances[1]._id, { attendanceStatus: 'attended' });
    await ClassInstance.findByIdAndUpdate(c1Instances[2]._id, { attendanceStatus: 'missed' });
    // c1Instances[3] remains 'unmarked'

    const statsRes = await request(app).get(
      `/api/class-instances/stats?semesterId=${semesterId}&courseId=${course1Id}`
    );

    expect(statsRes.status).toBe(200);
    const c1Stats = statsRes.body.data.courses.find((c: any) => c.courseId === course1Id);

    expect(c1Stats).toBeDefined();
    expect(c1Stats.total).toBe(4);
    expect(c1Stats.attended).toBe(2);
    expect(c1Stats.missed).toBe(1);
    expect(c1Stats.unmarked).toBe(1);
    expect(c1Stats.decided).toBe(3); // 2 attended + 1 missed
    // Attendance formula: 2 / (2 + 1) * 100 = 66.67%
    expect(c1Stats.percentage).toBe(66.67);
  });

  it('9. Returns 0% when all classes are unmarked (attended + missed == 0)', async () => {
    await request(app).post('/api/class-instances/generate').send({ semesterId });

    const statsRes = await request(app).get(
      `/api/class-instances/stats?semesterId=${semesterId}&courseId=${course2Id}`
    );

    expect(statsRes.status).toBe(200);
    const c2Stats = statsRes.body.data.courses.find((c: any) => c.courseId === course2Id);

    expect(c2Stats.total).toBe(2);
    expect(c2Stats.unmarked).toBe(2);
    expect(c2Stats.decided).toBe(0);
    expect(c2Stats.percentage).toBe(0);
  });
});
