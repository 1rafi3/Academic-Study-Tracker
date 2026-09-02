import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';
import { ClassInstance } from '../models/ClassInstance.js';
import { AcademicEvent } from '../models/AcademicEvent.js';
import { MigrationLog } from '../models/MigrationLog.js';
import {
  setAppwriteVerifier,
  resetAppwriteVerifier,
  AppwriteVerifier,
} from '../middleware/auth.middleware.js';
import type { AuthenticatedUser } from '../types/auth.types.js';
import { AppwriteException } from 'node-appwrite';

const TEST_SECRET = 'AcademicTrackerOwner2026!';

class MigrationMockVerifier implements AppwriteVerifier {
  async verifyToken(jwt: string): Promise<AuthenticatedUser> {
    if (jwt === 'token_owner') {
      return { userId: 'owner_user_id', email: 'owner@university.edu', name: 'Original Owner' };
    }
    if (jwt === 'token_other_user') {
      return { userId: 'other_user_id', email: 'other@university.edu', name: 'Other User' };
    }
    throw new AppwriteException('Invalid token', 401, 'user_jwt_invalid');
  }
}

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  setAppwriteVerifier(new MigrationMockVerifier());
  process.env.LEGACY_MIGRATION_SECRET = TEST_SECRET;
});

afterAll(async () => {
  resetAppwriteVerifier();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  process.env.TEST_AUTH_BYPASS = 'false';
  await MigrationLog.deleteMany({});
  await AcademicEvent.deleteMany({});
  await ClassInstance.deleteMany({});
  await Course.deleteMany({});
  await Semester.deleteMany({});
});

afterEach(() => {
  process.env.TEST_AUTH_BYPASS = 'true';
});

describe('=== Phase 10: Step 9 — Safe Legacy MongoDB Data Migration Tests ===', () => {
  describe('1. Authentication & Secret Authorization Protection', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/auth/claim-legacy-data')
        .send({ migrationSecret: TEST_SECRET });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects requests with missing or incorrect migration secret with 403', async () => {
      const resMissing = await request(app)
        .post('/api/auth/claim-legacy-data')
        .set('Authorization', 'Bearer token_owner')
        .send({});

      expect(resMissing.status).toBe(403);
      expect(resMissing.body.success).toBe(false);
      expect(resMissing.body.message).toContain('migration secret');

      const resWrong = await request(app)
        .post('/api/auth/claim-legacy-data')
        .set('Authorization', 'Bearer token_owner')
        .send({ migrationSecret: 'wrong_password_123' });

      expect(resWrong.status).toBe(403);
      expect(resWrong.body.success).toBe(false);
    });
  });

  describe('2. Legacy Data Migration & Relationship Preservation', () => {
    it('safely assigns unowned legacy records across all 4 collections to authenticated user', async () => {
      // Create legacy records without userId
      const sem = await Semester.create({
        name: 'Spring 2026',
        year: 2026,
        term: 'Spring',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-05-30'),
        isActive: true,
        // userId omitted
      });

      const course = await Course.create({
        courseCode: 'CSE 310',
        courseName: 'Operating Systems',
        credit: 3.0,
        semesterId: sem._id,
        // userId omitted
      });

      const classInst = await ClassInstance.create({
        courseId: course._id,
        semesterId: sem._id,
        date: new Date('2026-02-10'),
        dateString: '2026-02-10',
        dayOfWeek: 'Tuesday',
        startTime: '10:00',
        endTime: '11:30',
        status: 'scheduled',
        attendanceStatus: 'attended',
        // userId omitted
      });

      const event = await AcademicEvent.create({
        title: 'Midterm Exam',
        eventType: 'Final Exam',
        date: new Date('2026-03-20'),
        dateString: '2026-03-20',
        semesterId: sem._id,
        courseId: course._id,
        // userId omitted
      });

      // Verify they are initially unowned
      expect((await Semester.findById(sem._id))?.userId).toBeFalsy();
      expect((await Course.findById(course._id))?.userId).toBeFalsy();
      expect((await ClassInstance.findById(classInst._id))?.userId).toBeFalsy();
      expect((await AcademicEvent.findById(event._id))?.userId).toBeFalsy();

      // Execute migration
      const res = await request(app)
        .post('/api/auth/claim-legacy-data')
        .set('Authorization', 'Bearer token_owner')
        .send({ migrationSecret: TEST_SECRET });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.migrated).toEqual({
        semesters: 1,
        courses: 1,
        classInstances: 1,
        academicEvents: 1,
      });
      expect(res.body.totalMigrated).toBe(4);

      // Verify all 4 documents received owner_user_id
      const updatedSem = await Semester.findById(sem._id);
      const updatedCourse = await Course.findById(course._id);
      const updatedClass = await ClassInstance.findById(classInst._id);
      const updatedEvent = await AcademicEvent.findById(event._id);

      expect(updatedSem?.userId).toBe('owner_user_id');
      expect(updatedCourse?.userId).toBe('owner_user_id');
      expect(updatedClass?.userId).toBe('owner_user_id');
      expect(updatedEvent?.userId).toBe('owner_user_id');

      // Verify relationships remain 100% intact
      expect(updatedCourse?.semesterId.toString()).toBe(sem._id.toString());
      expect(updatedClass?.semesterId.toString()).toBe(sem._id.toString());
      expect(updatedClass?.courseId.toString()).toBe(course._id.toString());
      expect(updatedEvent?.semesterId.toString()).toBe(sem._id.toString());
      expect(updatedEvent?.courseId?.toString()).toBe(course._id.toString());
    });

    it('does NOT overwrite or touch records already owned by another user', async () => {
      // User B owns a semester
      const otherUserSem = await Semester.create({
        name: 'Fall 2025',
        year: 2025,
        term: 'Fall',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-12-20'),
        userId: 'other_user_id',
      });

      // Legacy unowned semester
      const legacySem = await Semester.create({
        name: 'Spring 2026',
        year: 2026,
        term: 'Spring',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-05-30'),
      });

      // Owner claims data
      const res = await request(app)
        .post('/api/auth/claim-legacy-data')
        .set('Authorization', 'Bearer token_owner')
        .send({ migrationSecret: TEST_SECRET });

      expect(res.status).toBe(200);
      expect(res.body.migrated.semesters).toBe(1);

      // Verify other user's semester was untouched
      const checkedOtherSem = await Semester.findById(otherUserSem._id);
      expect(checkedOtherSem?.userId).toBe('other_user_id');

      // Verify legacy semester received owner ID
      const checkedLegacySem = await Semester.findById(legacySem._id);
      expect(checkedLegacySem?.userId).toBe('owner_user_id');
    });
  });

  describe('3. Idempotency & Permanent Migration Lock', () => {
    it('returns 0 migrated when owner re-runs migration after completion', async () => {
      // 1. Initial run with legacy data
      await Semester.create({
        name: 'Spring 2026',
        year: 2026,
        term: 'Spring',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-05-30'),
      });

      const firstRun = await request(app)
        .post('/api/auth/claim-legacy-data')
        .set('Authorization', 'Bearer token_owner')
        .send({ migrationSecret: TEST_SECRET });

      expect(firstRun.status).toBe(200);
      expect(firstRun.body.migrated.semesters).toBe(1);

      // 2. Second run by the same owner
      const secondRun = await request(app)
        .post('/api/auth/claim-legacy-data')
        .set('Authorization', 'Bearer token_owner')
        .send({ migrationSecret: TEST_SECRET });

      expect(secondRun.status).toBe(200);
      expect(secondRun.body.success).toBe(true);
      expect(secondRun.body.totalMigrated).toBe(0);
      expect(secondRun.body.message).toContain('already claimed');
    });

    it('rejects attempt by another user to claim after migration lock with 409 Conflict', async () => {
      // 1. Owner claims legacy data
      await Semester.create({
        name: 'Spring 2026',
        year: 2026,
        term: 'Spring',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-05-30'),
      });

      await request(app)
        .post('/api/auth/claim-legacy-data')
        .set('Authorization', 'Bearer token_owner')
        .send({ migrationSecret: TEST_SECRET });

      // 2. Another user attempts to claim
      const otherUserRun = await request(app)
        .post('/api/auth/claim-legacy-data')
        .set('Authorization', 'Bearer token_other_user')
        .send({ migrationSecret: TEST_SECRET });

      expect(otherUserRun.status).toBe(409);
      expect(otherUserRun.body.success).toBe(false);
      expect(otherUserRun.body.message).toContain('already been claimed and locked');
    });

    it('handles empty legacy dataset gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/claim-legacy-data')
        .set('Authorization', 'Bearer token_owner')
        .send({ migrationSecret: TEST_SECRET });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.totalMigrated).toBe(0);
      expect(res.body.message).toContain('No legacy data found');
    });
  });
});
