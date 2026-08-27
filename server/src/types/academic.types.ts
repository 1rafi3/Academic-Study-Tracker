import { Document, Types } from 'mongoose';

export type DayOfWeek =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface ISchedule {
  _id?: Types.ObjectId | string;
  dayOfWeek: DayOfWeek;
  startTime: string; // Format: "HH:mm" (24-hour, e.g., "10:00")
  endTime: string;   // Format: "HH:mm" (24-hour, e.g., "11:30")
  room?: string;
  type?: 'Lecture' | 'Lab' | 'Tutorial' | 'Seminar' | 'Other';
}

export interface ISemester {
  name: string;      // e.g. "Fall 2026"
  year: number;      // e.g. 2026
  term: 'Fall' | 'Spring' | 'Summer' | 'Winter' | 'Other';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISemesterDocument extends ISemester, Document {}

export interface ICourse {
  courseCode: string; // e.g. "CSE 221"
  courseName: string; // e.g. "Object Oriented Programming"
  credit: number;     // e.g. 3.0
  instructor?: string;
  description?: string;
  color?: string;     // e.g. "#6366f1"
  semesterId: Types.ObjectId | string;
  schedules: ISchedule[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICourseDocument extends Omit<ICourse, 'schedules'>, Document {
  schedules: Types.DocumentArray<ISchedule & Document>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}
