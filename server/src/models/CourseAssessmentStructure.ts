import { Schema, model } from 'mongoose';
import {
  IAssessmentComponentDocument,
  ICourseAssessmentStructureDocument,
} from '../types/academic.types.js';

const assessmentComponentSchema = new Schema<IAssessmentComponentDocument>(
  {
    name: {
      type: String,
      required: [true, 'Component name is required'],
      trim: true,
    },
    allocatedMarks: {
      type: Number,
      required: [true, 'Allocated marks is required'],
      min: [0, 'Allocated marks cannot be negative'],
    },
    isOptional: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
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

const courseAssessmentStructureSchema = new Schema<ICourseAssessmentStructureDocument>(
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
    components: {
      type: [assessmentComponentSchema],
      default: [],
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

// One assessment structure per course per user
courseAssessmentStructureSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const CourseAssessmentStructure = model<ICourseAssessmentStructureDocument>(
  'CourseAssessmentStructure',
  courseAssessmentStructureSchema
);

