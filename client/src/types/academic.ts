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
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  errors?: string[];
}
