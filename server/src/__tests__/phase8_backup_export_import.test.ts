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

describe('=== Phase 8: Data Backup, Export, Import & Summary Tests ===', () => {
  let semesterId: string;
  let courseId: string;

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

    const course = await Course.create({
      courseCode: 'CSE 331',
      courseName: 'Operating Systems',
      credit: 3,
      instructor: 'Dr. Alan Turing',
      color: '#6366f1',
      semesterId: sem._id,
      schedules: [
        { dayOfWeek: 'Sunday', startTime: '09:00', endTime: '10:30', room: 'Lab 3' },
      ],
    });
    courseId = course._id.toString();

    await ClassInstance.create([
      {
        courseId: course._id,
        semesterId: sem._id,
        date: new Date('2026-01-11T00:00:00.000Z'),
        dateString: '2026-01-11',
        dayOfWeek: 'Sunday',
        startTime: '09:00',
        endTime: '10:30',
        room: 'Lab 3',
        status: 'scheduled',
        attendanceStatus: 'attended',
        topic: 'Process Synchronization, Semaphores & "Deadlocks"',
        notes: 'Important lecture, read chapter 5.',
        hasHomework: true,
        homeworkDetails: 'Implement producer-consumer in C',
      },
    ]);

    await AcademicEvent.create([
      {
        title: 'Midterm Exam: Process & Memory',
        eventType: 'Final Exam',
        date: new Date('2026-03-15T00:00:00.000Z'),
        dateString: '2026-03-15',
        semesterId: sem._id,
        courseId: course._id,
        startTime: '10:00',
        endTime: '12:00',
        room: 'Auditorium',
        description: 'Comprehensive exam covering scheduling and synchronization.',
      },
    ]);
  });

  describe('1. Full JSON Backup Export', () => {
    it('exports complete structured academic data', async () => {
      const res = await request(app).get('/api/backup/export');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const backup = res.body.data;
      expect(backup.backupVersion).toBe(1);
      expect(backup.application).toBe('Academic Study Tracker');
      expect(backup.createdAt).toBeDefined();

      expect(backup.data.semesters.length).toBe(1);
      expect(backup.data.semesters[0].name).toBe('Spring 2026');

      expect(backup.data.courses.length).toBe(1);
      expect(backup.data.courses[0].courseCode).toBe('CSE 331');

      expect(backup.data.classInstances.length).toBe(1);
      expect(backup.data.classInstances[0].topic).toContain('Process Synchronization');

      expect(backup.data.academicEvents.length).toBe(1);
      expect(backup.data.academicEvents[0].title).toContain('Midterm Exam');
    });
  });

  describe('2. CSV Exports with RFC 4180 Escaping', () => {
    it('exports attendance CSV with correctly escaped quotes and commas', async () => {
      const res = await request(app).get('/api/backup/export/csv/attendance');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');

      const csv = res.text;
      expect(csv).toContain('Date,Day,Start Time,End Time,Course Code');
      expect(csv).toContain('CSE 331');
      // Escaped quote check: "Process Synchronization, Semaphores & ""Deadlocks"""
      expect(csv).toContain('""Deadlocks""');
    });

    it('exports courses CSV', async () => {
      const res = await request(app).get('/api/backup/export/csv/courses');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Semester,Course Code,Course Name,Credit,Instructor');
      expect(res.text).toContain('Dr. Alan Turing');
    });

    it('exports academic events CSV', async () => {
      const res = await request(app).get('/api/backup/export/csv/events');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Date,Event Type,Title,Semester,Course Code');
      expect(res.text).toContain('Midterm Exam: Process & Memory');
    });
  });

  describe('3. Pre-Import Validation', () => {
    it('validates a correct backup and returns accurate preview counts', async () => {
      const exportRes = await request(app).get('/api/backup/export');
      const backupData = exportRes.body.data;

      const res = await request(app).post('/api/backup/validate').send(backupData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isValid).toBe(true);
      expect(res.body.errors.length).toBe(0);
      expect(res.body.preview.counts.semesters.toSkip).toBe(1); // Already in DB
    });

    it('rejects invalid backup applications and unsupported versions', async () => {
      const invalidBackup = {
        backupVersion: 99,
        application: 'Foreign App',
        data: { semesters: [] },
      };

      const res = await request(app).post('/api/backup/validate').send(invalidBackup);

      expect(res.status).toBe(400);
      expect(res.body.isValid).toBe(false);
      expect(res.body.errors).toContain('Backup file is not from Academic Study Tracker.');
      expect(res.body.errors).toContain('Unsupported backup version (99). Supported versions: 1.');
    });
  });

  describe('4. Safe Import & Relationship Preservation', () => {
    it('imports backup data with new ObjectIds and mapped references into an empty DB', async () => {
      // Export current data
      const exportRes = await request(app).get('/api/backup/export');
      const backup = exportRes.body.data;

      // Wipe database
      await AcademicEvent.deleteMany({});
      await ClassInstance.deleteMany({});
      await Course.deleteMany({});
      await Semester.deleteMany({});

      // Import
      const importRes = await request(app)
        .post('/api/backup/import')
        .send({ backup, mode: 'add_missing' });

      expect(importRes.status).toBe(200);
      expect(importRes.body.success).toBe(true);
      expect(importRes.body.data.semesters.inserted).toBe(1);
      expect(importRes.body.data.courses.inserted).toBe(1);
      expect(importRes.body.data.classInstances.inserted).toBe(1);
      expect(importRes.body.data.academicEvents.inserted).toBe(1);

      // Verify relationship references were updated correctly in DB
      const newSemester = await Semester.findOne({ name: 'Spring 2026' });
      const newCourse = await Course.findOne({ courseCode: 'CSE 331' });
      const newClass = await ClassInstance.findOne({ dateString: '2026-01-11' });
      const newEvent = await AcademicEvent.findOne({ dateString: '2026-03-15' });

      expect(newSemester).not.toBeNull();
      expect(newCourse).not.toBeNull();
      expect(newClass).not.toBeNull();
      expect(newEvent).not.toBeNull();

      expect(newCourse?.semesterId.toString()).toBe(newSemester?._id.toString());
      expect(newClass?.courseId.toString()).toBe(newCourse?._id.toString());
      expect(newClass?.semesterId.toString()).toBe(newSemester?._id.toString());
      expect(newEvent?.courseId?.toString()).toBe(newCourse?._id.toString());
      expect(newEvent?.semesterId.toString()).toBe(newSemester?._id.toString());
    });

    it('skips duplicate records on second import (add_missing mode)', async () => {
      const exportRes = await request(app).get('/api/backup/export');
      const backup = exportRes.body.data;

      // Import again into non-empty DB
      const importRes = await request(app)
        .post('/api/backup/import')
        .send({ backup, mode: 'add_missing' });

      expect(importRes.status).toBe(200);
      expect(importRes.body.data.semesters.skipped).toBe(1);
      expect(importRes.body.data.courses.skipped).toBe(1);
      expect(importRes.body.data.classInstances.skipped).toBe(1);
      expect(importRes.body.data.academicEvents.skipped).toBe(1);

      // Total count remains 1
      expect(await Semester.countDocuments()).toBe(1);
      expect(await Course.countDocuments()).toBe(1);
      expect(await ClassInstance.countDocuments()).toBe(1);
      expect(await AcademicEvent.countDocuments()).toBe(1);
    });
  });

  describe('5. Semester Summary Report', () => {
    it('generates a complete semester summary with attendance and lecture metrics', async () => {
      const res = await request(app).get(`/api/backup/summary/${semesterId}?target=75`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { semester, overall, courses, events } = res.body.data;
      expect(semester.name).toBe('Spring 2026');
      expect(overall.totalClasses).toBe(1);
      expect(overall.attended).toBe(1);
      expect(overall.percentage).toBe(100);
      expect(overall.status).toBe('SAFE');
      expect(overall.lecturesWithNotes).toBe(1);
      expect(overall.homeworkCount).toBe(1);

      expect(courses.length).toBe(1);
      expect(courses[0].courseCode).toBe('CSE 331');
      expect(courses[0].topicsCovered).toContain('Process Synchronization, Semaphores & "Deadlocks"');

      expect(events.length).toBe(1);
      expect(events[0].title).toContain('Midterm Exam');
    });
  });
});
