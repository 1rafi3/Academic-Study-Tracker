import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';
import { AcademicEvent } from '../models/AcademicEvent.js';

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
  await AcademicEvent.deleteMany({});
  await Course.deleteMany({});
  await Semester.deleteMany({});
});

describe('=== Phase 11: Academic Event Results, Marks & Notes Tests ===', () => {
  let semesterId: string;
  let courseId: string;
  let eventId: string;

  beforeEach(async () => {
    const sem = await Semester.create({
      name: 'Fall 2026',
      year: 2026,
      term: 'Fall',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      isActive: true,
    });
    semesterId = sem._id.toString();

    const course = await Course.create({
      courseCode: 'CSE 221',
      courseName: 'Algorithms',
      credit: 3,
      color: '#6366f1',
      semesterId: sem._id,
      schedules: [],
    });
    courseId = course._id.toString();

    const event = await AcademicEvent.create({
      title: 'Class Test 1: Dynamic Programming',
      eventType: 'Class Test',
      date: new Date('2026-10-15T00:00:00.000Z'),
      dateString: '2026-10-15',
      semesterId: sem._id,
      courseId: course._id,
      description: 'Covers Memoization and Tabulation chapters 1-4',
    });
    eventId = event._id.toString();
  });

  it('updates event result with obtainedMarks, fullMarks, personalNotes, isCompleted', async () => {
    const res = await request(app)
      .patch(`/api/academic-events/${eventId}/result`)
      .send({
        obtainedMarks: 16.5,
        fullMarks: 20,
        personalNotes: 'Made mistakes in problem 2 traceback. Need revision.',
        isCompleted: true,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.obtainedMarks).toBe(16.5);
    expect(res.body.data.fullMarks).toBe(20);
    expect(res.body.data.personalNotes).toBe('Made mistakes in problem 2 traceback. Need revision.');
    expect(res.body.data.isCompleted).toBe(true);
    // Ensure existing event description is preserved!
    expect(res.body.data.description).toBe('Covers Memoization and Tabulation chapters 1-4');
    expect(res.body.data.title).toBe('Class Test 1: Dynamic Programming');
  });

  it('rejects obtainedMarks greater than fullMarks', async () => {
    const res = await request(app)
      .patch(`/api/academic-events/${eventId}/result`)
      .send({
        obtainedMarks: 25,
        fullMarks: 20,
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('cannot exceed');
  });

  it('rejects negative marks', async () => {
    const res1 = await request(app)
      .patch(`/api/academic-events/${eventId}/result`)
      .send({
        obtainedMarks: -5,
        fullMarks: 20,
      })
      .expect(400);

    expect(res1.body.success).toBe(false);

    const res2 = await request(app)
      .patch(`/api/academic-events/${eventId}/result`)
      .send({
        fullMarks: -10,
      })
      .expect(400);

    expect(res2.body.success).toBe(false);
  });

  it('allows clearing marks by passing null', async () => {
    // First set marks
    await request(app)
      .patch(`/api/academic-events/${eventId}/result`)
      .send({ obtainedMarks: 18, fullMarks: 20 })
      .expect(200);

    // Then clear marks
    const res = await request(app)
      .patch(`/api/academic-events/${eventId}/result`)
      .send({ obtainedMarks: null, fullMarks: null })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.obtainedMarks).toBeNull();
    expect(res.body.data.fullMarks).toBeNull();
  });

  it('rejects invalid event ID format', async () => {
    const res = await request(app)
      .patch('/api/academic-events/bad-id/result')
      .send({ obtainedMarks: 10 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('returns 404 for non-existent event', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/academic-events/${fakeId}/result`)
      .send({ obtainedMarks: 10 })
      .expect(404);

    expect(res.body.success).toBe(false);
  });
});

