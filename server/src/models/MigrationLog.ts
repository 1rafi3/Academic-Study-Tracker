import { Schema, model, Document } from 'mongoose';

export interface IMigrationLogDocument extends Document {
  key: string;
  claimedBy: string;
  migratedCounts: {
    semesters: number;
    courses: number;
    classInstances: number;
    academicEvents: number;
  };
  totalMigrated: number;
  createdAt: Date;
  updatedAt: Date;
}

const migrationLogSchema = new Schema<IMigrationLogDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    claimedBy: {
      type: String,
      required: true,
      trim: true,
    },
    migratedCounts: {
      semesters: { type: Number, default: 0 },
      courses: { type: Number, default: 0 },
      classInstances: { type: Number, default: 0 },
      academicEvents: { type: Number, default: 0 },
    },
    totalMigrated: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const MigrationLog = model<IMigrationLogDocument>('MigrationLog', migrationLogSchema);
