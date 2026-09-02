import { Schema, model, Types } from 'mongoose';
import { ICourseDocument, ISchedule, DAYS_OF_WEEK } from '../types/academic.types.js';

const timeFormatRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const scheduleSchema = new Schema<ISchedule>(
  {
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
      match: [timeFormatRegex, 'Start time must be in HH:mm format (e.g., 09:30 or 14:00)'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [timeFormatRegex, 'End time must be in HH:mm format (e.g., 11:00 or 15:30)'],
      validate: {
        validator: function (this: ISchedule, value: string) {
          if (!this.startTime || !value) return true;
          return value > this.startTime;
        },
        message: 'End time must be later than start time',
      },
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
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

const courseSchema = new Schema<ICourseDocument>(
  {
    userId: {
      type: String,
      required: false,
      index: true,
      default: null,
      trim: true,
    },
    courseCode: {
      type: String,
      required: [true, 'Course code is required (e.g., CSE 221)'],
      trim: true,
      uppercase: true,
    },
    courseName: {
      type: String,
      required: [true, 'Course name is required (e.g., Database Management Systems)'],
      trim: true,
    },
    credit: {
      type: Number,
      required: [true, 'Credit value is required'],
      min: [0, 'Credit cannot be negative'],
      max: [30, 'Credit cannot exceed 30'],
      default: 3.0,
    },
    instructor: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    semesterId: {
      type: Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester ID reference is required'],
      index: true,
    },
    schedules: {
      type: [scheduleSchema],
      default: [],
    },
    isArchived: {
      type: Boolean,
      default: false,
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

// Compound index: A course code is unique WITHIN a semester, but reusable across different semesters
courseSchema.index({ semesterId: 1, courseCode: 1 }, { unique: true });
courseSchema.index({ semesterId: 1, isArchived: 1 });
courseSchema.index({ userId: 1, semesterId: 1 });

export const Course = model<ICourseDocument>('Course', courseSchema);
