import { Schema, model } from 'mongoose';
import {
  IClassInstanceDocument,
  DAYS_OF_WEEK,
  ATTENDANCE_STATUSES,
  CLASS_STATUSES,
} from '../types/academic.types.js';

const classInstanceSchema = new Schema<IClassInstanceDocument>(
  {
    userId: {
      type: String,
      required: false,
      index: true,
      default: null,
      trim: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true,
    },
    semesterId: {
      type: Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester reference is required'],
      index: true,
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    date: {
      type: Date,
      required: [true, 'Class date is required'],
      index: true,
    },
    dateString: {
      type: String,
      required: [true, 'Date string (YYYY-MM-DD) is required'],
      index: true,
    },
    dayOfWeek: {
      type: String,
      required: [true, 'Day of week is required'],
      enum: {
        values: DAYS_OF_WEEK,
        message: '{VALUE} is not a valid day of the week',
      },
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
    },
    room: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['Lecture', 'Lab', 'Tutorial', 'Seminar', 'Other'],
      default: 'Lecture',
    },
    status: {
      type: String,
      enum: {
        values: CLASS_STATUSES,
        message: '{VALUE} is not a valid class status. Allowed: scheduled, cancelled, holiday',
      },
      default: 'scheduled',
      index: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
    },
    holidayName: {
      type: String,
      trim: true,
      default: '',
    },
    attendanceStatus: {
      type: String,
      enum: {
        values: ATTENDANCE_STATUSES,
        message: '{VALUE} is not a valid attendance status. Allowed: unmarked, attended, missed',
      },
      default: 'unmarked',
      index: true,
    },
    topic: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    hasHomework: {
      type: Boolean,
      default: false,
    },
    homeworkDetails: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

// Compound unique index: Guarantees no duplicate class instance can exist for the same course, date, and start time
classInstanceSchema.index({ courseId: 1, date: 1, startTime: 1 }, { unique: true });

// Compound index for querying a semester's classes in chronological order
classInstanceSchema.index({ semesterId: 1, date: 1 });

// Compound index for fast course-level attendance status counting
classInstanceSchema.index({ courseId: 1, attendanceStatus: 1 });

// User-scoped compound indexes
classInstanceSchema.index({ userId: 1, semesterId: 1, date: 1 });
classInstanceSchema.index({ userId: 1, courseId: 1 });

export const ClassInstance = model<IClassInstanceDocument>('ClassInstance', classInstanceSchema);
