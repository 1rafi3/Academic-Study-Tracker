import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';
import { ClassInstance } from '../models/ClassInstance.js';
import { AcademicEvent } from '../models/AcademicEvent.js';
import {
  setAppwriteVerifier,
  resetAppwriteVerifier,
  AppwriteVerifier,
} from '../middleware/auth.middleware.js';
import type { AuthenticatedUser } from '../types/auth.types.js';
import { AppwriteException } from 'node-appwrite';

class MultiUserMockVerifier implements AppwriteVerifier {
  async verifyToken(jwt: string): Promise<AuthenticatedUser> {
    if (jwt === 'token_user_a') {
      return { userId: 'user_a_id', email: 'user_a@university.edu', name: 'User A' };
    }
    if (jwt === 'token_user_b') {
      return { userId: 'user_b_id', email: 'user_b@university.edu', name: 'User B' };
    }
    throw new AppwriteException('Invalid token', 401, 'user_jwt_invalid');
  }
}

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  setAppwriteVerifier(new MultiUserMockVerifier());
});

afterAll(async () => {
  resetAppwriteVerifier();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Enforce strict authentication check in these security tests
  process.env.TEST_AUTH_BYPASS = 'false';
  await AcademicEvent.deleteMany({});
  await ClassInstance.deleteMany({});
  await Course.deleteMany({});
  await Semester.deleteMany({});
});

afterEach(() => {
  process.env.TEST_AUTH_BYPASS = 'true';
});

describe('=== Phase 10: API Scoping & Route Protection Security Tests ===', () => {
  describe('1. Route Protection & Public Endpoints', () => {
    it('rejects unauthenticated requests with 401 on protected routes', async () => {
      const endpoints = [
        { method: 'get', url: '/api/semesters' },
        { method: 'get', url: '/api/courses' },
        { method: 'get', url: '/api/class-instances' },
        { method: 'get', url: '/api/academic-events' },
        { method: 'get', url: '/api/analytics/attendance' },
        { method: 'get', url: '/api/backup/export' },
      ];

      for (const ep of endpoints) {
        const res = await (request(app) as any)[ep.method](ep.url);
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Authorization header is missing');
      }
    });

    it('keeps public endpoints accessible without authentication', async () => {
      const healthRes = await request(app).get('/api/health');
      expect(healthRes.status).toBe(200);

      const holidayRes = await request(app).get('/api/holidays');
      expect(holidayRes.status).toBe(200);

      const rootRes = await request(app).get('/');
      expect(rootRes.status).toBe(200);
    });

    it('rejects malformed Authorization header formats with 401', async () => {
      // Missing Bearer scheme
      const resNoBearer = await request(app)
        .get('/api/semesters')
        .set('Authorization', 'Basic 12345');
      expect(resNoBearer.status).toBe(401);
      expect(resNoBearer.body.message).toContain('Invalid authorization format');

      // Empty Bearer token
      const resEmptyToken = await request(app)
        .get('/api/semesters')
        .set('Authorization', 'Bearer   ');
      expect(resEmptyToken.status).toBe(401);
      expect(resEmptyToken.body.message).toContain('JWT token is missing');
    });
  });

  describe('2. User Ownership on Creation & Scoped Reads', () => {
    it('stamps new records with req.userId and limits getSemesters to own records', async () => {
      // User A creates a semester
      const semARes = await request(app)
        .post('/api/semesters')
        .set('Authorization', 'Bearer token_user_a')
        .send({
          name: 'User A Fall 2026',
          year: 2026,
          term: 'Fall',
          startDate: '2026-09-01',
          endDate: '2026-12-20',
          isActive: true,
        });
      expect(semARes.status).toBe(201);
      expect(semARes.body.data.userId).toBe('user_a_id');

      // User B creates a semester
      const semBRes = await request(app)
        .post('/api/semesters')
        .set('Authorization', 'Bearer token_user_b')
        .send({
          name: 'User B Fall 2026',
          year: 2026,
          term: 'Fall',
          startDate: '2026-09-01',
          endDate: '2026-12-20',
          isActive: true,
        });
      expect(semBRes.status).toBe(201);
      expect(semBRes.body.data.userId).toBe('user_b_id');

      // User A queries semesters: should only see User A's semester
      const userAList = await request(app)
        .get('/api/semesters')
        .set('Authorization', 'Bearer token_user_a');
      expect(userAList.status).toBe(200);
      expect(userAList.body.count).toBe(1);
      expect(userAList.body.data[0].name).toBe('User A Fall 2026');

      // User B queries semesters: should only see User B's semester
      const userBList = await request(app)
        .get('/api/semesters')
        .set('Authorization', 'Bearer token_user_b');
      expect(userBList.status).toBe(200);
      expect(userBList.body.count).toBe(1);
      expect(userBList.body.data[0].name).toBe('User B Fall 2026');
    });
  });

  describe('3. IDOR Prevention (Cross-User Isolation)', () => {
    it('prevents User A from reading, updating, or deleting User B semester by ID', async () => {
      // Create semester belonging to User B
      const semB = await Semester.create({
        userId: 'user_b_id',
        name: 'Secret Semester B',
        year: 2026,
        term: 'Spring',
        startDate: new Date('2026-01-10'),
        endDate: new Date('2026-05-20'),
        isActive: true,
      });

      // User A tries to GET User B's semester
      const getRes = await request(app)
        .get(`/api/semesters/${semB._id}`)
        .set('Authorization', 'Bearer token_user_a');
      expect(getRes.status).toBe(404);

      // User A tries to UPDATE User B's semester
      const updateRes = await request(app)
        .put(`/api/semesters/${semB._id}`)
        .set('Authorization', 'Bearer token_user_a')
        .send({ name: 'Hacked Semester' });
      expect(updateRes.status).toBe(404);

      // User A tries to DELETE User B's semester
      const deleteRes = await request(app)
        .delete(`/api/semesters/${semB._id}`)
        .set('Authorization', 'Bearer token_user_a');
      expect(deleteRes.status).toBe(404);

      // Verify User B's semester is untouched
      const untouched = await Semester.findById(semB._id);
      expect(untouched).not.toBeNull();
      expect(untouched?.name).toBe('Secret Semester B');
    });

    it('prevents User A from creating a course inside User B semester', async () => {
      // Semester belonging to User B
      const semB = await Semester.create({
        userId: 'user_b_id',
        name: 'User B Semester',
        year: 2026,
        term: 'Fall',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-20'),
      });

      // User A tries to create a course referencing User B's semester
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', 'Bearer token_user_a')
        .send({
          courseCode: 'CSE 101',
          courseName: 'Intro to Programming',
          semesterId: semB._id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('does not belong to you');
    });

    it('prevents User A from creating an academic event inside User B semester', async () => {
      const semB = await Semester.create({
        userId: 'user_b_id',
        name: 'User B Semester For Events',
        year: 2026,
        term: 'Spring',
        startDate: new Date('2026-01-10'),
        endDate: new Date('2026-05-20'),
      });

      const res = await request(app)
        .post('/api/academic-events')
        .set('Authorization', 'Bearer token_user_a')
        .send({
          title: 'Hacked Event',
          eventType: 'Final Exam',
          dateString: '2026-04-10',
          semesterId: semB._id,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Referenced semester does not exist or does not belong to you');
    });

    it('prevents User A from generating class instances for User B semester', async () => {
      const semB = await Semester.create({
        userId: 'user_b_id',
        name: 'User B Semester For Generator',
        year: 2026,
        term: 'Spring',
        startDate: new Date('2026-01-10'),
        endDate: new Date('2026-05-20'),
      });

      const res = await request(app)
        .post('/api/class-instances/generate')
        .set('Authorization', 'Bearer token_user_a')
        .send({
          semesterId: semB._id,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Semester not found');
    });

    it('prevents User A from adding schedules to User B course', async () => {
      const semB = await Semester.create({
        userId: 'user_b_id',
        name: 'User B Semester For Course',
        year: 2026,
        term: 'Spring',
        startDate: new Date('2026-01-10'),
        endDate: new Date('2026-05-20'),
      });

      const courseB = await Course.create({
        userId: 'user_b_id',
        courseCode: 'SEC 404',
        courseName: 'Security Testing',
        semesterId: semB._id,
      });

      const res = await request(app)
        .post(`/api/courses/${courseB._id}/schedules`)
        .set('Authorization', 'Bearer token_user_a')
        .send({
          dayOfWeek: 'Monday',
          startTime: '09:00',
          endTime: '10:30',
          room: 'Lab 1',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Course not found');
    });
  });

  describe('4. User-Scoped Analytics & Backup Export/Import', () => {
    it('isolates analytics so User A only counts their own classes', async () => {
      // User A setup: 1 semester, 1 course, 2 attended classes
      const semA = await Semester.create({
        userId: 'user_a_id',
        name: 'Sem A',
        year: 2026,
        term: 'Fall',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-20'),
        isActive: true,
      });

      const courseA = await Course.create({
        userId: 'user_a_id',
        courseCode: 'A101',
        courseName: 'Course A',
        semesterId: semA._id,
      });

      await ClassInstance.create({
        userId: 'user_a_id',
        courseId: courseA._id,
        semesterId: semA._id,
        date: new Date('2026-09-05'),
        dateString: '2026-09-05',
        dayOfWeek: 'Saturday',
        startTime: '10:00',
        endTime: '11:30',
        attendanceStatus: 'attended',
        status: 'scheduled',
      });

      // User B setup: 1 semester, 1 course, 5 missed classes
      const semB = await Semester.create({
        userId: 'user_b_id',
        name: 'Sem B',
        year: 2026,
        term: 'Fall',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-20'),
        isActive: true,
      });

      const courseB = await Course.create({
        userId: 'user_b_id',
        courseCode: 'B101',
        courseName: 'Course B',
        semesterId: semB._id,
      });

      await ClassInstance.create({
        userId: 'user_b_id',
        courseId: courseB._id,
        semesterId: semB._id,
        date: new Date('2026-09-05'),
        dateString: '2026-09-05',
        dayOfWeek: 'Saturday',
        startTime: '10:00',
        endTime: '11:30',
        attendanceStatus: 'missed',
        status: 'scheduled',
      });

      // User A calls analytics: should have 1 attended, 0 missed, 100%
      const analyticsA = await request(app)
        .get('/api/analytics/attendance')
        .set('Authorization', 'Bearer token_user_a');
      expect(analyticsA.status).toBe(200);
      expect(analyticsA.body.data.overall.attended).toBe(1);
      expect(analyticsA.body.data.overall.missed).toBe(0);
      expect(analyticsA.body.data.overall.percentage).toBe(100);

      // User B calls analytics: should have 0 attended, 1 missed, 0%
      const analyticsB = await request(app)
        .get('/api/analytics/attendance')
        .set('Authorization', 'Bearer token_user_b');
      expect(analyticsB.status).toBe(200);
      expect(analyticsB.body.data.overall.attended).toBe(0);
      expect(analyticsB.body.data.overall.missed).toBe(1);
      expect(analyticsB.body.data.overall.percentage).toBe(0);
    });

    it('exports only the authenticated user data in backup', async () => {
      // User A creates a semester
      await Semester.create({
        userId: 'user_a_id',
        name: 'A Semester Backup',
        year: 2026,
        term: 'Fall',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-20'),
      });

      // User B creates a semester
      await Semester.create({
        userId: 'user_b_id',
        name: 'B Semester Backup',
        year: 2026,
        term: 'Fall',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-20'),
      });

      const exportResA = await request(app)
        .get('/api/backup/export')
        .set('Authorization', 'Bearer token_user_a');

      expect(exportResA.status).toBe(200);
      expect(exportResA.body.data.data.semesters.length).toBe(1);
      expect(exportResA.body.data.data.semesters[0].name).toBe('A Semester Backup');
    });
  });
});
