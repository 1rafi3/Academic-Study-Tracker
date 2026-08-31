import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';
import { ClassInstance } from '../models/ClassInstance.js';
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
  await ClassInstance.deleteMany({});
  await Course.deleteMany({});
  await Semester.deleteMany({});
});

describe('=== Phase 6: Academic Calendar Events, Holidays & Exceptions Tests ===', () => {
  let semesterId: string;
  let courseId: string;
  let classInstanceId: string;

  beforeEach(async () => {
    const sem = await Semester.create({
      name: '2026 Fall',
      year: 2026,
      term: 'Fall',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
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
        { dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '11:30', room: 'Room 302' },
      ],
    });
    courseId = course._id.toString();

    const instance = await ClassInstance.create({
      courseId: course._id,
      semesterId: sem._id,
      date: new Date('2026-09-06T00:00:00.000Z'),
      dateString: '2026-09-06',
      dayOfWeek: 'Sunday',
      startTime: '10:00',
      endTime: '11:30',
      status: 'scheduled',
      attendanceStatus: 'unmarked',
    });
    classInstanceId = instance._id.toString();
  });

  describe('1. Academic Events CRUD', () => {
    it('creates a course-specific academic event (e.g. Quiz)', async () => {
      const res = await request(app)
        .post('/api/academic-events')
        .send({
          title: 'Polymorphism Mid-Term Quiz',
          eventType: 'Quiz',
          date: '2026-09-15',
          dateString: '2026-09-15',
          semesterId,
          courseId,
          startTime: '10:00',
          endTime: '10:45',
          room: 'Room 302',
          description: 'Covers inheritance, interfaces and polymorphism',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Polymorphism Mid-Term Quiz');
      expect(res.body.data.eventType).toBe('Quiz');
      expect(res.body.data.dateString).toBe('2026-09-15');
      expect(res.body.data.courseId._id || res.body.data.courseId).toBe(courseId);
    });

    it('creates a general / all-academic event without a courseId', async () => {
      const res = await request(app)
        .post('/api/academic-events')
        .send({
          title: 'University Department Orientation',
          eventType: 'Other',
          dateString: '2026-09-02',
          semesterId,
          startTime: '09:00',
          endTime: '12:00',
          room: 'Auditorium',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.courseId).toBeNull();
      expect(res.body.data.title).toBe('University Department Orientation');
    });

    it('rejects invalid event type and inverted time slots', async () => {
      // Invalid event type
      const res1 = await request(app)
        .post('/api/academic-events')
        .send({
          title: 'Invalid Type Event',
          eventType: 'UnknownType',
          dateString: '2026-09-15',
          semesterId,
        });
      expect(res1.status).toBe(400);

      // Inverted start/end time
      const res2 = await request(app)
        .post('/api/academic-events')
        .send({
          title: 'Bad Times',
          eventType: 'Final Exam',
          dateString: '2026-09-15',
          semesterId,
          startTime: '14:00',
          endTime: '11:00',
        });
      expect(res2.status).toBe(400);
      expect(res2.body.message).toContain('Start time cannot be after end time');
    });

    it('updates and deletes an academic event without deleting any ClassInstance', async () => {
      const event = await AcademicEvent.create({
        title: 'Project Submission 1',
        eventType: 'Project Submission',
        date: new Date('2026-09-20T00:00:00.000Z'),
        dateString: '2026-09-20',
        semesterId,
        courseId,
      });

      // Update
      const patchRes = await request(app)
        .patch(`/api/academic-events/${event._id}`)
        .send({ title: 'Final Project Submission (Updated)' });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.title).toBe('Final Project Submission (Updated)');

      // Delete event
      const deleteRes = await request(app).delete(`/api/academic-events/${event._id}`);
      expect(deleteRes.status).toBe(200);

      // Verify ClassInstance is intact
      const remainingClasses = await ClassInstance.countDocuments();
      expect(remainingClasses).toBe(1);
    });
  });

  describe('2. Class Cancellation & Exceptions', () => {
    it('cancels a class instance and preserves the historical record in database', async () => {
      const res = await request(app)
        .patch(`/api/class-instances/${classInstanceId}/status`)
        .send({
          status: 'cancelled',
          cancellationReason: 'Instructor attending faculty conference',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('cancelled');
      expect(res.body.data.cancellationReason).toBe('Instructor attending faculty conference');

      // Verify record still exists in DB
      const dbInstance = await ClassInstance.findById(classInstanceId);
      expect(dbInstance).not.toBeNull();
      expect(dbInstance?.status).toBe('cancelled');
    });

    it('allows restoring a cancelled class back to scheduled', async () => {
      await ClassInstance.findByIdAndUpdate(classInstanceId, {
        status: 'cancelled',
        cancellationReason: 'Cancelled',
      });

      const res = await request(app)
        .patch(`/api/class-instances/${classInstanceId}/status`)
        .send({ status: 'scheduled' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('scheduled');
      expect(res.body.data.cancellationReason).toBe('');
    });
  });

  describe('3. Automatic Bangladesh Public Holidays', () => {
    it('queries public holidays from backend holiday service for Victory Day', async () => {
      const res = await request(app).get('/api/holidays?year=2026&month=11'); // Month 11 = December (0-indexed)
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const victoryDay = res.body.data.find((h: any) => h.dateString === '2026-12-16');
      expect(victoryDay).toBeDefined();
      expect(victoryDay.name).toContain('Victory Day');
    });

    it('automatically recognizes holiday date on generation and sets status to holiday', async () => {
      // Generate classes across December 2026
      // Dec 16, 2026 is Wednesday (matches course schedule!)
      await request(app)
        .post('/api/class-instances/generate')
        .send({ semesterId });

      const victoryDayClass = await ClassInstance.findOne({
        courseId,
        dateString: '2026-12-16',
      });

      expect(victoryDayClass).not.toBeNull();
      expect(victoryDayClass?.status).toBe('holiday');
      expect(victoryDayClass?.holidayName).toContain('Victory Day');
    });
  });

  describe('4. Attendance Calculation Regression Test (Section 24)', () => {
    it('calculates attendance percentage strictly from attended + missed, excluding holiday & cancelled', async () => {
      // Setup Scenario: 5 total classes:
      // 2 Attended, 1 Missed, 1 Holiday, 1 Cancelled
      await ClassInstance.deleteMany({});

      await ClassInstance.create([
        {
          courseId,
          semesterId,
          date: new Date('2026-09-01T00:00:00.000Z'),
          dateString: '2026-09-01',
          dayOfWeek: 'Tuesday',
          startTime: '10:00',
          endTime: '11:30',
          status: 'scheduled',
          attendanceStatus: 'attended',
        },
        {
          courseId,
          semesterId,
          date: new Date('2026-09-03T00:00:00.000Z'),
          dateString: '2026-09-03',
          dayOfWeek: 'Thursday',
          startTime: '10:00',
          endTime: '11:30',
          status: 'scheduled',
          attendanceStatus: 'attended',
        },
        {
          courseId,
          semesterId,
          date: new Date('2026-09-06T00:00:00.000Z'),
          dateString: '2026-09-06',
          dayOfWeek: 'Sunday',
          startTime: '10:00',
          endTime: '11:30',
          status: 'scheduled',
          attendanceStatus: 'missed',
        },
        {
          courseId,
          semesterId,
          date: new Date('2026-09-08T00:00:00.000Z'),
          dateString: '2026-09-08',
          dayOfWeek: 'Tuesday',
          startTime: '10:00',
          endTime: '11:30',
          status: 'holiday',
          holidayName: 'Public Holiday',
          attendanceStatus: 'unmarked',
        },
        {
          courseId,
          semesterId,
          date: new Date('2026-09-10T00:00:00.000Z'),
          dateString: '2026-09-10',
          dayOfWeek: 'Thursday',
          startTime: '10:00',
          endTime: '11:30',
          status: 'cancelled',
          cancellationReason: 'Class Cancelled by Instructor',
          attendanceStatus: 'unmarked',
        },
      ]);

      const res = await request(app).get(`/api/class-instances/stats?courseId=${courseId}`);

      expect(res.status).toBe(200);
      const stats = res.body.data;

      expect(stats.total).toBe(5);
      expect(stats.attended).toBe(2);
      expect(stats.missed).toBe(1);
      expect(stats.decided).toBe(3); // 2 attended + 1 missed
      // 2 / 3 * 100 = 66.67%
      expect(stats.percentage).toBe(66.67);
    });
  });

  describe('5. Multiple Events and Classes on Same Date Independence', () => {
    it('supports a scheduled class and an academic quiz on the same calendar date', async () => {
      // Class already on 2026-09-06
      const event = await AcademicEvent.create({
        title: 'OOP Lab Quiz 1',
        eventType: 'Quiz',
        date: new Date('2026-09-06T00:00:00.000Z'),
        dateString: '2026-09-06',
        semesterId,
        courseId,
        startTime: '14:00',
        endTime: '14:45',
      });

      const classesRes = await request(app).get('/api/class-instances?date=2026-09-06');
      const eventsRes = await request(app).get('/api/academic-events?date=2026-09-06');

      expect(classesRes.body.count).toBe(1);
      expect(eventsRes.body.count).toBe(1);
      expect(classesRes.body.data[0].dateString).toBe('2026-09-06');
      expect(eventsRes.body.data[0].dateString).toBe('2026-09-06');
      expect(eventsRes.body.data[0].title).toBe('OOP Lab Quiz 1');
    });
  });
});
