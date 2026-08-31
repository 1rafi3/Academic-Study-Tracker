import { Schema, model } from 'mongoose';
import {
  IAcademicEventDocument,
  ACADEMIC_EVENT_TYPES,
} from '../types/academic.types.js';

const academicEventSchema = new Schema<IAcademicEventDocument>(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: {
        values: ACADEMIC_EVENT_TYPES,
        message: '{VALUE} is not a valid academic event type',
      },
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
      index: true,
    },
    dateString: {
      type: String,
      required: [true, 'Event date string (YYYY-MM-DD) is required'],
      index: true,
    },
    semesterId: {
      type: Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester reference is required'],
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },
    startTime: {
      type: String,
      trim: true,
      default: '',
    },
    endTime: {
      type: String,
      trim: true,
      default: '',
    },
    room: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
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

academicEventSchema.index({ semesterId: 1, date: 1 });
academicEventSchema.index({ courseId: 1, date: 1 });

export const AcademicEvent = model<IAcademicEventDocument>(
  'AcademicEvent',
  academicEventSchema
);
