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

describe('=== Phase 3.5 Corrections & Enhancements ===', () => {
  let semesterId: string;

  beforeEach(async () => {
    const sem = await Semester.create({
      name: '2026 Fall Test',
      year: 2026,
      term: 'Fall',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-09-14T00:00:00.000Z'),
      isActive: true,
    });
    semesterId = sem._id.toString();
  });

  it('1. DELETE /api/class-instances/:id - removes a specific class instance', async () => {
    const course = await Course.create({
      courseCode: 'CSE 221',
      courseName: 'OOP',
      semesterId,
      credit: 3,
      schedules: [
        { dayOfWeek: 'Sunday', startTime: '10:00', endTime: '11:30', room: 'Room 302' },
      ],
    });

    await request(app).post('/api/class-instances/generate').send({ semesterId });

    const instances = await ClassInstance.find({ semesterId });
    expect(instances.length).toBeGreaterThan(0);

    const targetId = instances[0]._id.toString();
    const delRes = await request(app).delete(`/api/class-instances/${targetId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const check = await ClassInstance.findById(targetId);
    expect(check).toBeNull();
  });

  it('2. PUT /api/courses/:id - allows updating inline schedules atomically', async () => {
    const course = await Course.create({
      courseCode: 'CSE 301',
      courseName: 'Algorithms',
      semesterId,
      credit: 3,
      schedules: [
        { dayOfWeek: 'Sunday', startTime: '09:00', endTime: '10:30', room: 'Room 101' },
      ],
    });

    const updateRes = await request(app)
      .put(`/api/courses/${course._id}`)
      .send({
        courseCode: 'CSE 301',
        courseName: 'Algorithms & Complexity',
        schedules: [
          { dayOfWeek: 'Sunday', startTime: '09:00', endTime: '10:30', room: 'Room 101' },
          { dayOfWeek: 'Wednesday', startTime: '14:00', endTime: '15:30', room: 'Lab 2' },
        ],
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.courseName).toBe('Algorithms & Complexity');
    expect(updateRes.body.data.schedules.length).toBe(2);
    expect(updateRes.body.data.schedules[1].dayOfWeek).toBe('Wednesday');
  });

  it('3. PUT /api/courses/:id - allows unarchiving/restoring an archived course', async () => {
    const course = await Course.create({
      courseCode: 'CSE 400',
      courseName: 'Thesis',
      semesterId,
      credit: 6,
      isArchived: true,
    });

    const restoreRes = await request(app)
      .put(`/api/courses/${course._id}`)
      .send({ isArchived: false });

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.isArchived).toBe(false);

    // Should now show up in default active course list
    const listRes = await request(app).get(`/api/courses?semesterId=${semesterId}`);
    expect(listRes.body.count).toBe(1);
    expect(listRes.body.data[0].courseCode).toBe('CSE 400');
  });

  it('4. PUT /api/semesters/:id - allows unarchiving/restoring an archived semester', async () => {
    const sem = await Semester.create({
      name: '2025 Summer',
      year: 2025,
      term: 'Summer',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-08-15'),
      isActive: false,
      isArchived: true,
    });

    const restoreRes = await request(app)
      .put(`/api/semesters/${sem._id}`)
      .send({ isArchived: false });

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.isArchived).toBe(false);

    const listRes = await request(app).get('/api/semesters');
    const found = listRes.body.data.some((s: any) => s._id === sem._id.toString());
    expect(found).toBe(true);
  });
});
