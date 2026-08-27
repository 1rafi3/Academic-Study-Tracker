import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';

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
  await Course.deleteMany({});
  await Semester.deleteMany({});
});

describe('=== Semester API Endpoints ===', () => {
  it('POST /api/semesters - creates a new semester', async () => {
    const res = await request(app)
      .post('/api/semesters')
      .send({
        name: '2026 Fall',
        year: 2026,
        term: 'Fall',
        startDate: '2026-09-01',
        endDate: '2026-12-20',
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('2026 Fall');
    expect(res.body.data.isActive).toBe(true);
  });

  it('POST /api/semesters - rejects when start date is after end date', async () => {
    const res = await request(app)
      .post('/api/semesters')
      .send({
        name: 'Invalid Semester',
        year: 2026,
        term: 'Fall',
        startDate: '2026-12-25',
        endDate: '2026-09-01',
        isActive: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Start date cannot be after end date');
  });

  it('GET /api/semesters - retrieves list of semesters and filters active', async () => {
    await Semester.create([
      {
        name: '2025 Spring',
        year: 2025,
        term: 'Spring',
        startDate: new Date('2025-01-10'),
        endDate: new Date('2025-05-15'),
        isActive: false,
      },
      {
        name: '2026 Fall',
        year: 2026,
        term: 'Fall',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-20'),
        isActive: true,
      },
    ]);

    const allRes = await request(app).get('/api/semesters');
    expect(allRes.status).toBe(200);
    expect(allRes.body.count).toBe(2);

    const activeRes = await request(app).get('/api/semesters?active=true');
    expect(activeRes.status).toBe(200);
    expect(activeRes.body.count).toBe(1);
    expect(activeRes.body.data[0].name).toBe('2026 Fall');
  });

  it('GET /api/semesters/:id - handles valid, missing, and invalid IDs', async () => {
    const sem = await Semester.create({
      name: '2026 Fall',
      year: 2026,
      term: 'Fall',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-20'),
      isActive: true,
    });

    const validRes = await request(app).get(`/api/semesters/${sem._id}`);
    expect(validRes.status).toBe(200);
    expect(validRes.body.data.name).toBe('2026 Fall');

    const missingRes = await request(app).get(`/api/semesters/${new mongoose.Types.ObjectId()}`);
    expect(missingRes.status).toBe(404);

    const invalidRes = await request(app).get('/api/semesters/invalid-id-format');
    expect(invalidRes.status).toBe(400);
  });

  it('DELETE /api/semesters/:id - blocks deletion if courses exist', async () => {
    const sem = await Semester.create({
      name: '2026 Fall',
      year: 2026,
      term: 'Fall',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-20'),
      isActive: true,
    });

    await Course.create({
      courseCode: 'CSE 221',
      courseName: 'OOP',
      semesterId: sem._id,
      credit: 3,
    });

    const deleteRes = await request(app).delete(`/api/semesters/${sem._id}`);
    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.message).toContain('Cannot delete semester because it contains');
  });
});

describe('=== Course API Endpoints ===', () => {
  let semesterId: string;

  beforeEach(async () => {
    const sem = await Semester.create({
      name: '2026 Fall',
      year: 2026,
      term: 'Fall',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-20'),
      isActive: true,
    });
    semesterId = sem._id.toString();
  });

  it('POST /api/courses - creates a course in valid semester', async () => {
    const res = await request(app)
      .post('/api/courses')
      .send({
        courseCode: 'CSE 221',
        courseName: 'Object Oriented Programming',
        credit: 3.0,
        instructor: 'Dr. John Doe',
        semesterId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.courseCode).toBe('CSE 221');
  });

  it('POST /api/courses - rejects when semester does not exist', async () => {
    const fakeSemesterId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/courses')
      .send({
        courseCode: 'CSE 221',
        courseName: 'Object Oriented Programming',
        semesterId: fakeSemesterId,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Referenced semester does not exist');
  });

  it('POST /api/courses - prevents duplicate courseCode in the same semester', async () => {
    await Course.create({
      courseCode: 'CSE 221',
      courseName: 'OOP',
      semesterId,
      credit: 3,
    });

    const res = await request(app)
      .post('/api/courses')
      .send({
        courseCode: 'CSE 221',
        courseName: 'OOP Duplicate',
        semesterId,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already exists in this semester');
  });

  it('GET /api/courses - filters by semesterId', async () => {
    const otherSem = await Semester.create({
      name: '2027 Spring',
      year: 2027,
      term: 'Spring',
      startDate: new Date('2027-01-10'),
      endDate: new Date('2027-05-15'),
      isActive: false,
    });

    await Course.create([
      { courseCode: 'CSE 221', courseName: 'OOP', semesterId, credit: 3 },
      { courseCode: 'CSE 223', courseName: 'DBMS', semesterId, credit: 3 },
      { courseCode: 'CSE 110', courseName: 'Intro', semesterId: otherSem._id, credit: 3 },
    ]);

    const res = await request(app).get(`/api/courses?semesterId=${semesterId}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });
});

describe('=== Course Schedule API Endpoints ===', () => {
  let courseId: string;

  beforeEach(async () => {
    const sem = await Semester.create({
      name: '2026 Fall',
      year: 2026,
      term: 'Fall',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-20'),
      isActive: true,
    });

    const course = await Course.create({
      courseCode: 'CSE 221',
      courseName: 'Object Oriented Programming',
      semesterId: sem._id,
      credit: 3,
    });

    courseId = course._id.toString();
  });

  it('POST /api/courses/:courseId/schedules - adds recurring schedule slot', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/schedules`)
      .send({
        dayOfWeek: 'Sunday',
        startTime: '10:00',
        endTime: '11:30',
        room: 'Room 302',
        type: 'Lecture',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dayOfWeek).toBe('Sunday');
    expect(res.body.data.startTime).toBe('10:00');
    expect(res.body.data.endTime).toBe('11:30');

    // Verify course has 1 schedule
    const courseRes = await request(app).get(`/api/courses/${courseId}`);
    expect(courseRes.body.data.schedules.length).toBe(1);
  });

  it('POST /api/courses/:courseId/schedules - rejects invalid day and inverted times', async () => {
    const invalidDayRes = await request(app)
      .post(`/api/courses/${courseId}/schedules`)
      .send({
        dayOfWeek: 'Funday',
        startTime: '10:00',
        endTime: '11:30',
      });

    expect(invalidDayRes.status).toBe(400);

    const invertedTimeRes = await request(app)
      .post(`/api/courses/${courseId}/schedules`)
      .send({
        dayOfWeek: 'Monday',
        startTime: '14:00',
        endTime: '10:00',
      });

    expect(invertedTimeRes.status).toBe(400);
    expect(invertedTimeRes.body.message).toContain('End time must be after start time');
  });

  it('DELETE /api/courses/:courseId/schedules/:scheduleId - removes schedule slot', async () => {
    const addRes = await request(app)
      .post(`/api/courses/${courseId}/schedules`)
      .send({
        dayOfWeek: 'Tuesday',
        startTime: '10:00',
        endTime: '11:30',
        room: 'Room 302',
      });

    const scheduleId = addRes.body.data._id;

    const deleteRes = await request(app).delete(
      `/api/courses/${courseId}/schedules/${scheduleId}`
    );
    expect(deleteRes.status).toBe(200);

    const checkRes = await request(app).get(`/api/courses/${courseId}/schedules`);
    expect(checkRes.body.count).toBe(0);
  });
});
