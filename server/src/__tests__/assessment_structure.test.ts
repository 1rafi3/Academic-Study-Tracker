import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';
import { CourseAssessmentStructure } from '../models/CourseAssessmentStructure.js';

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
  await CourseAssessmentStructure.deleteMany({});
  await Course.deleteMany({});
  await Semester.deleteMany({});
});

describe('=== Phase 11: Course Assessment Structure API Tests ===', () => {
  let semesterId: string;
  let courseId: string;

  beforeEach(async () => {
    const sem = await Semester.create({
      name: 'Spring 2026',
      year: 2026,
      term: 'Spring',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-05-31T00:00:00.000Z'),
      isActive: true,
    });
    semesterId = sem._id.toString();

    const course = await Course.create({
      courseCode: 'CSE 321',
      courseName: 'Operating Systems',
      credit: 3,
      color: '#6366f1',
      semesterId: sem._id,
      schedules: [],
    });
    courseId = course._id.toString();
  });

  it('returns empty structure for a new course without failing', async () => {
    const res = await request(app)
      .get(`/api/assessment-structures/${courseId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.components).toEqual([]);
    expect(res.body.data.courseId).toBe(courseId);
  });

  it('rejects invalid course ID with 400', async () => {
    const res = await request(app)
      .get('/api/assessment-structures/invalid-id')
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('returns 404 for non-existent course', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/assessment-structures/${fakeId}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('upserts full assessment structure with components', async () => {
    const components = [
      { name: 'Attendance', allocatedMarks: 10, isOptional: false, order: 0 },
      { name: 'Class Test-1', allocatedMarks: 15, isOptional: false, order: 1 },
      { name: 'Class Test-2', allocatedMarks: 15, isOptional: false, order: 2 },
      { name: 'Midterm', allocatedMarks: 20, isOptional: false, order: 3 },
      { name: 'Final Exam', allocatedMarks: 40, isOptional: false, order: 4 },
    ];

    const res = await request(app)
      .put(`/api/assessment-structures/${courseId}`)
      .send({ components })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.components.length).toBe(5);
    expect(res.body.data.components[0].name).toBe('Attendance');
    expect(res.body.data.components[0].allocatedMarks).toBe(10);
  });

  it('rejects negative marks in upsert', async () => {
    const components = [
      { name: 'CT-1', allocatedMarks: -5 },
    ];

    const res = await request(app)
      .put(`/api/assessment-structures/${courseId}`)
      .send({ components })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('adds a single component via POST', async () => {
    const res = await request(app)
      .post(`/api/assessment-structures/${courseId}/components`)
      .send({ name: 'Assignment 1', allocatedMarks: 10, isOptional: false })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.components.length).toBe(1);
    expect(res.body.data.components[0].name).toBe('Assignment 1');
    expect(res.body.data.components[0].allocatedMarks).toBe(10);
  });

  it('updates an existing component via PATCH', async () => {
    // Add component first
    const addRes = await request(app)
      .post(`/api/assessment-structures/${courseId}/components`)
      .send({ name: 'Quiz 1', allocatedMarks: 10 })
      .expect(201);

    const compId = addRes.body.data.components[0]._id;

    // Update marks and name
    const updateRes = await request(app)
      .patch(`/api/assessment-structures/${courseId}/components/${compId}`)
      .send({ name: 'Quiz 1 (Surprise)', allocatedMarks: 15 })
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    const updated = updateRes.body.data.components.find((c: any) => c._id === compId);
    expect(updated.name).toBe('Quiz 1 (Surprise)');
    expect(updated.allocatedMarks).toBe(15);
  });

  it('deletes a component via DELETE', async () => {
    // Add component
    const addRes = await request(app)
      .post(`/api/assessment-structures/${courseId}/components`)
      .send({ name: 'To Be Deleted', allocatedMarks: 5 })
      .expect(201);

    const compId = addRes.body.data.components[0]._id;

    // Delete it
    const delRes = await request(app)
      .delete(`/api/assessment-structures/${courseId}/components/${compId}`)
      .expect(200);

    expect(delRes.body.success).toBe(true);
    expect(delRes.body.data.components.length).toBe(0);
  });
});

