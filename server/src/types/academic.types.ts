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

export type AttendanceStatus = 'unmarked' | 'attended' | 'missed';

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'unmarked',
  'attended',
  'missed',
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
  isArchived?: boolean;
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
  isArchived?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICourseDocument extends Omit<ICourse, 'schedules'>, Document {
  schedules: Types.DocumentArray<ISchedule & Document>;
}

export interface IClassInstance {
  courseId: Types.ObjectId | string;
  semesterId: Types.ObjectId | string;
  scheduleId?: Types.ObjectId | string;
  date: Date;          // UTC midnight Date
  dateString: string;  // "YYYY-MM-DD"
  dayOfWeek: DayOfWeek;
  startTime: string;   // "HH:mm"
  endTime: string;     // "HH:mm"
  room?: string;
  type?: 'Lecture' | 'Lab' | 'Tutorial' | 'Seminar' | 'Other';
  attendanceStatus: AttendanceStatus;
  topic?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IClassInstanceDocument extends IClassInstance, Document {}

export interface CourseAttendanceStats {
  courseId: string;
  courseCode: string;
  courseName: string;
  color: string;
  total: number;
  attended: number;
  missed: number;
  unmarked: number;
  decided: number;     // attended + missed
  percentage: number;  // (attended / decided) * 100, 0 if decided == 0
}

export interface OverallAttendanceStats {
  total: number;
  attended: number;
  missed: number;
  unmarked: number;
  decided: number;
  percentage: number;
  courses: CourseAttendanceStats[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  errors?: string[];
}
