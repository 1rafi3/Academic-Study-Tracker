import { Schema, model } from 'mongoose';
import { ISemesterDocument } from '../types/academic.types.js';

const semesterSchema = new Schema<ISemesterDocument>(
  {
    userId: {
      type: String,
      required: false,
      index: true,
      default: null,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Semester name is required'],
      trim: true,
      maxlength: [100, 'Semester name cannot exceed 100 characters'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [1900, 'Year must be after 1900'],
      max: [2100, 'Year must be before 2100'],
    },
    term: {
      type: String,
      required: [true, 'Term is required'],
      enum: {
        values: ['Fall', 'Spring', 'Summer', 'Winter', 'Other'],
        message: '{VALUE} is not a valid academic term',
      },
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (this: ISemesterDocument, value: Date) {
          if (!this.startDate || !value) return true;
          return new Date(value).getTime() >= new Date(this.startDate).getTime();
        },
        message: 'End date must be on or after start date',
      },
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
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

// Index to query semesters efficiently by year and term
semesterSchema.index({ year: -1, term: 1 });
semesterSchema.index({ isActive: 1 });
semesterSchema.index({ userId: 1, year: -1, term: 1 });
semesterSchema.index({ userId: 1, isActive: 1 });

export const Semester = model<ISemesterDocument>('Semester', semesterSchema);
