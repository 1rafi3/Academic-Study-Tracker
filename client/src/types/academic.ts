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
  _id?: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  room?: string;
  type?: 'Lecture' | 'Lab' | 'Tutorial' | 'Seminar' | 'Other';
}

export interface ISemester {
  _id: string;
  id?: string;
  name: string;
  year: number;
  term: 'Fall' | 'Spring' | 'Summer' | 'Winter' | 'Other';
  startDate: string;
  endDate: string;
  isActive: boolean;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICourse {
  _id: string;
  id?: string;
  courseCode: string;
  courseName: string;
  credit: number;
  instructor?: string;
  description?: string;
  color?: string;
  semesterId: string | ISemester;
  schedules: ISchedule[];
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IClassInstance {
  _id: string;
  id?: string;
  courseId: ICourse | string;
  semesterId: ISemester | string;
  scheduleId?: string;
  date: string;
  dateString: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room?: string;
  type?: 'Lecture' | 'Lab' | 'Tutorial' | 'Seminar' | 'Other';
  attendanceStatus: AttendanceStatus;
  topic?: string;
  notes?: string;
  hasHomework?: boolean;
  homeworkDetails?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseAttendanceStats {
  courseId: string;
  courseCode: string;
  courseName: string;
  color: string;
  total: number;
  attended: number;
  missed: number;
  unmarked: number;
  decided: number;
  percentage: number;
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

export interface ClassGenerationResult {
  totalCandidates: number;
  created: number;
  skipped: number;
  semesterId: string;
  semesterName?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  errors?: string[];
}
