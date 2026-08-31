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
  await mongoServer?.stop();
});

beforeEach(async () => {
  await ClassInstance.deleteMany({});
  await Course.deleteMany({});
  await Semester.deleteMany({});
});

describe('=== Phase 5: Class Notes, Topics & Lecture Review Tests ===', () => {
  let semesterId: string;
  let courseId: string;
  let classInstanceId: string;

  beforeEach(async () => {
    const sem = await Semester.create({
      name: '2026 Fall',
      year: 2026,
      term: 'Fall',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-09-30T00:00:00.000Z'),
      isActive: true,
    });
    semesterId = sem._id.toString();

    const course = await Course.create({
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
    courseId = course._id.toString();

    // Create a specific class instance
    const instance = await ClassInstance.create({
      courseId: course._id,
      semesterId: sem._id,
      date: new Date('2026-09-06T00:00:00.000Z'),
      dateString: '2026-09-06',
      dayOfWeek: 'Sunday',
      startTime: '10:00',
      endTime: '11:30',
      attendanceStatus: 'attended',
    });
    classInstanceId = instance._id.toString();
  });

  it('1. Successfully adds topic, notes, and homework details to a class instance', async () => {
    const res = await request(app)
      .patch(`/api/class-instances/${classInstanceId}/notes`)
      .send({
        topic: 'Polymorphism & Dynamic Binding',
        notes: 'Learned method overloading vs overriding. Review for midterm.',
        hasHomework: true,
        homeworkDetails: 'Implement 3 polymorphism code examples in Java',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.topic).toBe('Polymorphism & Dynamic Binding');
    expect(res.body.data.notes).toBe('Learned method overloading vs overriding. Review for midterm.');
    expect(res.body.data.hasHomework).toBe(true);
    expect(res.body.data.homeworkDetails).toBe('Implement 3 polymorphism code examples in Java');
  });

  it('2. Updates existing notes and can toggle homework to false', async () => {
    // Initial note
    await ClassInstance.findByIdAndUpdate(classInstanceId, {
      topic: 'Inheritance',
      notes: 'Superclass and subclasses',
      hasHomework: true,
      homeworkDetails: 'Read chapter 4',
    });

    // Update
    const res = await request(app)
      .patch(`/api/class-instances/${classInstanceId}/notes`)
      .send({
        topic: 'Inheritance & Abstract Classes',
        notes: 'Updated lecture notes with abstract class rules.',
        hasHomework: false,
        homeworkDetails: '',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.topic).toBe('Inheritance & Abstract Classes');
    expect(res.body.data.hasHomework).toBe(false);
    expect(res.body.data.homeworkDetails).toBe('');
  });

  it('3. Rejects invalid class instance ID format with HTTP 400', async () => {
    const res = await request(app)
      .patch('/api/class-instances/invalid-id-format/notes')
      .send({ topic: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid class instance ID format');
  });

  it('4. Returns HTTP 404 when class instance does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/class-instances/${fakeId}/notes`)
      .send({ topic: 'Test' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Class instance not found');
  });

  it('5. Data Integrity: Updating notes does NOT alter attendance, course, or date', async () => {
    const res = await request(app)
      .patch(`/api/class-instances/${classInstanceId}/notes`)
      .send({
        topic: 'Encapsulation',
        notes: 'Getters and setters',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.attendanceStatus).toBe('attended');
    expect(res.body.data.dateString).toBe('2026-09-06');
    expect(res.body.data.startTime).toBe('10:00');
    expect(res.body.data.courseId._id || res.body.data.courseId).toBe(courseId);
  });

  it('6. Chronological Study Timeline: Returns classes sorted by date and start time ascending', async () => {
    // Add multiple classes out of order
    await ClassInstance.create([
      {
        courseId,
        semesterId,
        date: new Date('2026-09-13T00:00:00.000Z'),
        dateString: '2026-09-13',
        dayOfWeek: 'Sunday',
        startTime: '10:00',
        endTime: '11:30',
        attendanceStatus: 'unmarked',
        topic: 'Abstraction',
      },
      {
        courseId,
        semesterId,
        date: new Date('2026-09-08T00:00:00.000Z'),
        dateString: '2026-09-08',
        dayOfWeek: 'Tuesday',
        startTime: '10:00',
        endTime: '11:30',
        attendanceStatus: 'attended',
        topic: 'Constructors',
      },
      {
        courseId,
        semesterId,
        date: new Date('2026-09-01T00:00:00.000Z'),
        dateString: '2026-09-01',
        dayOfWeek: 'Tuesday',
        startTime: '10:00',
        endTime: '11:30',
        attendanceStatus: 'attended',
        topic: 'Introduction to Java',
      },
    ]);

    const res = await request(app).get(`/api/class-instances?courseId=${courseId}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(4);

    const dates = res.body.data.map((c: any) => c.dateString);
    expect(dates).toEqual(['2026-09-01', '2026-09-06', '2026-09-08', '2026-09-13']);

    const topics = res.body.data.map((c: any) => c.topic);
    expect(topics[0]).toBe('Introduction to Java');
    expect(topics[3]).toBe('Abstraction');
  });
});
