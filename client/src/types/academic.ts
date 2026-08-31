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

export type ClassStatus = 'scheduled' | 'cancelled' | 'holiday';

export const CLASS_STATUSES: ClassStatus[] = ['scheduled', 'cancelled', 'holiday'];

export type AcademicEventType =
  | 'Quiz'
  | 'Class Test'
  | 'Assignment'
  | 'Viva'
  | 'Final Exam'
  | 'Presentation'
  | 'Project Submission'
  | 'Other';

export const ACADEMIC_EVENT_TYPES: AcademicEventType[] = [
  'Quiz',
  'Class Test',
  'Assignment',
  'Viva',
  'Final Exam',
  'Presentation',
  'Project Submission',
  'Other',
];

export interface IAcademicEvent {
  _id: string;
  id?: string;
  title: string;
  eventType: AcademicEventType;
  date: string;
  dateString: string;
  semesterId: ISemester | string;
  courseId?: ICourse | string | null;
  startTime?: string;
  endTime?: string;
  room?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IBangladeshHoliday {
  dateString: string;
  name: string;
  nameBangla?: string;
  isPublicHoliday: boolean;
  type: 'national' | 'religious' | 'cultural';
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
  status?: ClassStatus;
  cancellationReason?: string;
  holidayName?: string;
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

export type AttendanceRiskStatus = 'SAFE' | 'WARNING' | 'DANGER' | 'NO_DATA';

export interface CourseAnalyticsData {
  courseId: string;
  courseCode: string;
  courseName: string;
  color: string;
  total: number;
  attended: number;
  missed: number;
  unmarked: number;
  cancelled: number;
  holiday: number;
  decided: number;
  percentage: number;
  targetPercentage: number;
  differenceFromTarget: number;
  status: AttendanceRiskStatus;
  canBunk: number;
  needToAttend: number;
  futureScheduledCount: number;
}

export interface OverallAnalyticsSummary {
  total: number;
  attended: number;
  missed: number;
  unmarked: number;
  cancelled: number;
  holiday: number;
  decided: number;
  percentage: number;
  targetPercentage: number;
  differenceFromTarget: number;
  status: AttendanceRiskStatus;
  canBunk: number;
  needToAttend: number;
}

export interface AttendanceAnalyticsResponse {
  targetPercentage: number;
  overall: OverallAnalyticsSummary;
  courses: CourseAnalyticsData[];
}

export interface ClassGenerationResult {
  totalCandidates: number;
  created: number;
  skipped: number;
  semesterId: string;
  semesterName?: string;
}

export interface IBackupPayload {
  backupVersion: number;
  application: string;
  createdAt: string;
  data: {
    semesters: ISemester[];
    courses: ICourse[];
    classInstances: IClassInstance[];
    academicEvents: IAcademicEvent[];
  };
}

export interface IBackupValidationResult {
  isValid: boolean;
  errors: string[];
  preview?: {
    createdAt: string;
    counts: {
      semesters: { total: number; toInsert: number; toSkip: number };
      courses: { total: number; toInsert: number; toSkip: number };
      classInstances: { total: number };
      academicEvents: { total: number };
    };
  };
}

export interface ISemesterSummaryReport {
  semester: ISemester;
  targetPercentage: number;
  overall: {
    totalClasses: number;
    attended: number;
    missed: number;
    decided: number;
    percentage: number;
    status: AttendanceRiskStatus;
    canBunk: number;
    needToAttend: number;
    lecturesWithNotes: number;
    homeworkCount: number;
  };
  courses: Array<{
    courseId: string;
    courseCode: string;
    courseName: string;
    credit: number;
    instructor: string;
    color: string;
    total: number;
    attended: number;
    missed: number;
    cancelled: number;
    holiday: number;
    unmarked: number;
    decided: number;
    percentage: number;
    status: AttendanceRiskStatus;
    canBunk: number;
    needToAttend: number;
    topicsCovered: string[];
    lecturesWithNotes: number;
    homeworkAssigned: number;
  }>;
  events: IAcademicEvent[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  errors?: string[];
  isValid?: boolean;
  preview?: any;
}

