import { Request, Response } from 'express';
import crypto from 'crypto';
import { Semester } from '../models/Semester.js';
import { Course } from '../models/Course.js';
import { ClassInstance } from '../models/ClassInstance.js';
import { AcademicEvent } from '../models/AcademicEvent.js';
import { MigrationLog } from '../models/MigrationLog.js';

export interface MigrationSummaryResponse {
  success: boolean;
  message: string;
  migrated: {
    semesters: number;
    courses: number;
    classInstances: number;
    academicEvents: number;
  };
  totalMigrated: number;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
const safeCompare = (a?: string, b?: string): boolean => {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * POST /api/auth/claim-legacy-data
 * Safely assigns all unowned legacy records (userId is null or missing) to the authenticated user.
 * Protected by requireAuth and a migration secret passkey.
 * Enforces one-time execution and idempotency via MigrationLog.
 */
export const claimLegacyData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. No authenticated user identity found.',
      });
      return;
    }

    // 1. Check if legacy migration was already permanently locked
    const existingLock = await MigrationLog.findOne({ key: 'legacy_data_migration' });
    if (existingLock) {
      if (existingLock.claimedBy === userId) {
        res.status(200).json({
          success: true,
          message: 'You have already claimed legacy academic data. Your account is up to date.',
          migrated: {
            semesters: 0,
            courses: 0,
            classInstances: 0,
            academicEvents: 0,
          },
          totalMigrated: 0,
        });
        return;
      }

      res.status(409).json({
        success: false,
        message: 'Legacy academic data has already been claimed and locked by another account.',
      });
      return;
    }

    // 2. Validate Migration Secret using timing-safe comparison
    const configuredSecret = process.env.LEGACY_MIGRATION_SECRET;
    if (configuredSecret) {
      const providedSecret = req.body?.migrationSecret;
      if (!safeCompare(providedSecret, configuredSecret)) {
        res.status(403).json({
          success: false,
          message: 'Invalid or missing migration secret. Unauthorized migration attempt.',
        });
        return;
      }
    }

    // 3. Filter for unowned documents only (userId: null or non-existent)
    const unownedFilter = {
      $or: [{ userId: null }, { userId: { $exists: false } }],
    };

    // 4. In-place sequential updates (Additive & Idempotent)
    const semResult = await Semester.updateMany(unownedFilter, { $set: { userId } });
    const courseResult = await Course.updateMany(unownedFilter, { $set: { userId } });
    const classResult = await ClassInstance.updateMany(unownedFilter, { $set: { userId } });
    const eventResult = await AcademicEvent.updateMany(unownedFilter, { $set: { userId } });

    const totalMigrated =
      semResult.modifiedCount +
      courseResult.modifiedCount +
      classResult.modifiedCount +
      eventResult.modifiedCount;

    // 5. Create permanent Migration Lock if data was migrated or records were processed
    await MigrationLog.create({
      key: 'legacy_data_migration',
      claimedBy: userId,
      migratedCounts: {
        semesters: semResult.modifiedCount,
        courses: courseResult.modifiedCount,
        classInstances: classResult.modifiedCount,
        academicEvents: eventResult.modifiedCount,
      },
      totalMigrated,
    });

    res.status(200).json({
      success: true,
      message:
        totalMigrated > 0
          ? 'Legacy data migration completed successfully.'
          : 'No legacy data found. Your account is already up to date.',
      migrated: {
        semesters: semResult.modifiedCount,
        courses: courseResult.modifiedCount,
        classInstances: classResult.modifiedCount,
        academicEvents: eventResult.modifiedCount,
      },
      totalMigrated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Legacy data migration failed';
    res.status(500).json({
      success: false,
      message,
    });
  }
};

/**
 * GET /api/auth/legacy-status
 * Checks if unassigned legacy records exist in the database.
 */
export const getLegacyStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const unownedFilter = {
      $or: [{ userId: null }, { userId: { $exists: false } }],
    };

    const existingLock = await MigrationLog.findOne({ key: 'legacy_data_migration' });
    const semesters = await Semester.countDocuments(unownedFilter);
    const courses = await Course.countDocuments(unownedFilter);
    const classInstances = await ClassInstance.countDocuments(unownedFilter);
    const academicEvents = await AcademicEvent.countDocuments(unownedFilter);

    const totalUnclaimed = semesters + courses + classInstances + academicEvents;

    res.status(200).json({
      success: true,
      hasUnclaimedData: totalUnclaimed > 0 && !existingLock,
      isLocked: Boolean(existingLock),
      claimedBy: existingLock?.claimedBy || null,
      unclaimedCounts: {
        semesters,
        courses,
        classInstances,
        academicEvents,
      },
      totalUnclaimed,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve legacy data status',
    });
  }
};

