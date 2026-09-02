import type {
  ISemester,
  ICourse,
  ISchedule,
  IClassInstance,
  AttendanceStatus,
  ClassStatus,
  IAcademicEvent,
  AcademicEventType,
  IBangladeshHoliday,
  OverallAttendanceStats,
  AttendanceAnalyticsResponse,
  IBackupPayload,
  IBackupValidationResult,
  ISemesterSummaryReport,
  ClassGenerationResult,
} from '../types/academic.js';
import { apiRequest, apiBlobRequest, API_BASE } from './apiClient.js';

export const semesterApi = {
  async getAll(options?: { activeOnly?: boolean; archived?: boolean; all?: boolean }): Promise<ISemester[]> {
    const params = new URLSearchParams();
    if (options?.activeOnly) params.set('active', 'true');
    if (options?.archived) params.set('archived', 'true');
    if (options?.all) params.set('all', 'true');
    const qs = params.toString();
    const endpoint = qs ? `/semesters?${qs}` : '/semesters';
    return apiRequest<ISemester[]>(endpoint);
  },

  async getById(id: string): Promise<ISemester> {
    return apiRequest<ISemester>(`/semesters/${id}`);
  },

  async create(data: Partial<ISemester>): Promise<ISemester> {
    return apiRequest<ISemester>('/semesters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<ISemester>): Promise<ISemester> {
    return apiRequest<ISemester>(`/semesters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string, options?: { force?: boolean; archive?: boolean }): Promise<{ semester: ISemester; archived: boolean }> {
    const params = new URLSearchParams();
    if (options?.force) params.set('force', 'true');
    if (options?.archive) params.set('archive', 'true');
    const qs = params.toString();
    const endpoint = qs ? `/semesters/${id}?${qs}` : `/semesters/${id}`;
    
    // Custom response mapping because delete returns { semester, archived }
    const res = await apiRequest<{ semester?: ISemester; data?: ISemester; archived?: boolean }>(endpoint, {
      method: 'DELETE',
    });
    return {
      semester: (res.semester || res.data || res) as ISemester,
      archived: Boolean(res.archived),
    };
  },
};

export const courseApi = {
  async getAll(semesterId?: string, options?: { archived?: boolean; all?: boolean }): Promise<ICourse[]> {
    const params = new URLSearchParams();
    if (semesterId) params.set('semesterId', semesterId);
    if (options?.archived) params.set('archived', 'true');
    if (options?.all) params.set('all', 'true');
    const qs = params.toString();
    const endpoint = qs ? `/courses?${qs}` : '/courses';
    return apiRequest<ICourse[]>(endpoint);
  },

  async getById(id: string): Promise<ICourse> {
    return apiRequest<ICourse>(`/courses/${id}`);
  },

  async create(data: Partial<ICourse>): Promise<ICourse> {
    return apiRequest<ICourse>('/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<ICourse>): Promise<ICourse> {
    return apiRequest<ICourse>(`/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string, options?: { force?: boolean }): Promise<{ course: ICourse; archived: boolean }> {
    const params = new URLSearchParams();
    if (options?.force) params.set('force', 'true');
    const qs = params.toString();
    const endpoint = qs ? `/courses/${id}?${qs}` : `/courses/${id}`;
    const res = await apiRequest<{ course?: ICourse; data?: ICourse; archived?: boolean }>(endpoint, {
      method: 'DELETE',
    });
    return {
      course: (res.course || res.data || res) as ICourse,
      archived: Boolean(res.archived),
    };
  },
};

export const scheduleApi = {
  async getByCourse(courseId: string): Promise<ISchedule[]> {
    return apiRequest<ISchedule[]>(`/courses/${courseId}/schedules`);
  },

  async getAll(courseId: string): Promise<ISchedule[]> {
    return apiRequest<ISchedule[]>(`/courses/${courseId}/schedules`);
  },

  async add(courseId: string, data: Partial<ISchedule>): Promise<ISchedule> {
    return apiRequest<ISchedule>(`/courses/${courseId}/schedules`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    courseId: string,
    scheduleId: string,
    data: Partial<ISchedule>
  ): Promise<ISchedule> {
    return apiRequest<ISchedule>(`/courses/${courseId}/schedules/${scheduleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(courseId: string, scheduleId: string): Promise<{ _id: string }> {
    return apiRequest<{ _id: string }>(`/courses/${courseId}/schedules/${scheduleId}`, {
      method: 'DELETE',
    });
  },
};

export const classInstanceApi = {
  async generate(semesterId: string, courseId?: string): Promise<ClassGenerationResult> {
    return apiRequest<ClassGenerationResult>('/class-instances/generate', {
      method: 'POST',
      body: JSON.stringify({ semesterId, courseId }),
    });
  },

  async getAll(params?: {
    semesterId?: string;
    courseId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
  }): Promise<IClassInstance[]> {
    const query = new URLSearchParams();
    if (params?.semesterId) query.set('semesterId', params.semesterId);
    if (params?.courseId) query.set('courseId', params.courseId);
    if (params?.date) query.set('date', params.date);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const endpoint = qs ? `/class-instances?${qs}` : '/class-instances';
    return apiRequest<IClassInstance[]>(endpoint);
  },

  async getById(id: string): Promise<IClassInstance> {
    return apiRequest<IClassInstance>(`/class-instances/${id}`);
  },

  async updateAttendance(id: string, status: AttendanceStatus): Promise<IClassInstance> {
    return apiRequest<IClassInstance>(`/class-instances/${id}/attendance`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async updateNotes(
    id: string,
    data: {
      topic?: string;
      notes?: string;
      hasHomework?: boolean;
      homeworkDetails?: string;
    }
  ): Promise<IClassInstance> {
    return apiRequest<IClassInstance>(`/class-instances/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateStatus(
    id: string,
    data: {
      status: ClassStatus;
      cancellationReason?: string;
      holidayName?: string;
    }
  ): Promise<IClassInstance> {
    return apiRequest<IClassInstance>(`/class-instances/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getStats(semesterId?: string, courseId?: string): Promise<OverallAttendanceStats> {
    const query = new URLSearchParams();
    if (semesterId) query.set('semesterId', semesterId);
    if (courseId) query.set('courseId', courseId);
    const qs = query.toString();
    const endpoint = qs ? `/class-instances/stats?${qs}` : '/class-instances/stats';
    return apiRequest<OverallAttendanceStats>(endpoint);
  },

  async delete(id: string): Promise<IClassInstance> {
    return apiRequest<IClassInstance>(`/class-instances/${id}`, {
      method: 'DELETE',
    });
  },
};

export const academicEventApi = {
  async getAll(params?: {
    semesterId?: string;
    courseId?: string;
    startDate?: string;
    endDate?: string;
    date?: string;
  }): Promise<IAcademicEvent[]> {
    const query = new URLSearchParams();
    if (params?.semesterId) query.set('semesterId', params.semesterId);
    if (params?.courseId) query.set('courseId', params.courseId);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.date) query.set('date', params.date);
    const qs = query.toString();
    const endpoint = qs ? `/academic-events?${qs}` : '/academic-events';
    return apiRequest<IAcademicEvent[]>(endpoint);
  },

  async getById(id: string): Promise<IAcademicEvent> {
    return apiRequest<IAcademicEvent>(`/academic-events/${id}`);
  },

  async create(data: {
    title: string;
    eventType: AcademicEventType;
    dateString: string;
    semesterId: string;
    courseId?: string | null;
    startTime?: string;
    endTime?: string;
    room?: string;
    description?: string;
  }): Promise<IAcademicEvent> {
    return apiRequest<IAcademicEvent>('/academic-events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: {
      title?: string;
      eventType?: AcademicEventType;
      dateString?: string;
      courseId?: string | null;
      startTime?: string;
      endTime?: string;
      room?: string;
      description?: string;
    }
  ): Promise<IAcademicEvent> {
    return apiRequest<IAcademicEvent>(`/academic-events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<IAcademicEvent> {
    return apiRequest<IAcademicEvent>(`/academic-events/${id}`, {
      method: 'DELETE',
    });
  },
};

export const holidayApi = {
  // Public endpoint
  async getHolidays(year: number, monthIndex?: number): Promise<IBangladeshHoliday[]> {
    const query = new URLSearchParams();
    query.set('year', String(year));
    if (monthIndex !== undefined) query.set('month', String(monthIndex));
    return apiRequest<IBangladeshHoliday[]>(`/holidays?${query.toString()}`, {}, true);
  },

  // Public endpoint
  async checkHoliday(dateString: string): Promise<{ isHoliday: boolean; data: IBangladeshHoliday | null }> {
    return apiRequest<{ isHoliday: boolean; data: IBangladeshHoliday | null }>(`/holidays/check?date=${dateString}`, {}, true);
  },
};

export const analyticsApi = {
  async getAttendance(params?: {
    semesterId?: string;
    courseId?: string;
    target?: number;
  }): Promise<AttendanceAnalyticsResponse> {
    const query = new URLSearchParams();
    if (params?.semesterId) query.set('semesterId', params.semesterId);
    if (params?.courseId) query.set('courseId', params.courseId);
    if (params?.target !== undefined) query.set('target', String(params.target));

    const queryString = query.toString();
    const endpoint = queryString ? `/analytics/attendance?${queryString}` : '/analytics/attendance';
    return apiRequest<AttendanceAnalyticsResponse>(endpoint);
  },
};

export const backupApi = {
  async exportJson(): Promise<IBackupPayload> {
    return apiRequest<IBackupPayload>('/backup/export');
  },

  async validateBackup(payload: IBackupPayload): Promise<IBackupValidationResult> {
    const res = await apiRequest<{ isValid?: boolean; errors?: string[]; preview?: IBackupValidationResult['preview'] }>('/backup/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      isValid: Boolean(res.isValid),
      errors: res.errors || [],
      preview: res.preview,
    };
  },

  async importBackup(data: {
    backup: IBackupPayload;
    mode: 'add_missing' | 'replace_semester';
    targetSemesterId?: string;
  }): Promise<{
    semesters: { inserted: number; skipped: number };
    courses: { inserted: number; skipped: number };
    classInstances: { inserted: number; skipped: number };
    academicEvents: { inserted: number; skipped: number };
  }> {
    return apiRequest<{
      semesters: { inserted: number; skipped: number };
      courses: { inserted: number; skipped: number };
      classInstances: { inserted: number; skipped: number };
      academicEvents: { inserted: number; skipped: number };
    }>('/backup/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAttendanceCsvUrl(semesterId?: string, courseId?: string): string {
    const query = new URLSearchParams();
    if (semesterId) query.set('semesterId', semesterId);
    if (courseId) query.set('courseId', courseId);
    const queryString = query.toString();
    return queryString ? `${API_BASE}/backup/export/csv/attendance?${queryString}` : `${API_BASE}/backup/export/csv/attendance`;
  },

  getCoursesCsvUrl(semesterId?: string): string {
    const query = new URLSearchParams();
    if (semesterId) query.set('semesterId', semesterId);
    const queryString = query.toString();
    return queryString ? `${API_BASE}/backup/export/csv/courses?${queryString}` : `${API_BASE}/backup/export/csv/courses`;
  },

  getEventsCsvUrl(semesterId?: string): string {
    const query = new URLSearchParams();
    if (semesterId) query.set('semesterId', semesterId);
    const queryString = query.toString();
    return queryString ? `${API_BASE}/backup/export/csv/events?${queryString}` : `${API_BASE}/backup/export/csv/events`;
  },

  async downloadAttendanceCsv(semesterId?: string, courseId?: string): Promise<Blob> {
    const query = new URLSearchParams();
    if (semesterId) query.set('semesterId', semesterId);
    if (courseId) query.set('courseId', courseId);
    const queryString = query.toString();
    const endpoint = queryString ? `/backup/export/csv/attendance?${queryString}` : '/backup/export/csv/attendance';
    return apiBlobRequest(endpoint);
  },

  async downloadCoursesCsv(semesterId?: string): Promise<Blob> {
    const query = new URLSearchParams();
    if (semesterId) query.set('semesterId', semesterId);
    const queryString = query.toString();
    const endpoint = queryString ? `/backup/export/csv/courses?${queryString}` : '/backup/export/csv/courses';
    return apiBlobRequest(endpoint);
  },

  async downloadEventsCsv(semesterId?: string): Promise<Blob> {
    const query = new URLSearchParams();
    if (semesterId) query.set('semesterId', semesterId);
    const queryString = query.toString();
    const endpoint = queryString ? `/backup/export/csv/events?${queryString}` : '/backup/export/csv/events';
    return apiBlobRequest(endpoint);
  },

  async getSemesterSummary(semesterId: string, target?: number): Promise<ISemesterSummaryReport> {
    const query = new URLSearchParams();
    if (target !== undefined) query.set('target', String(target));
    const queryString = query.toString();
    const endpoint = queryString
      ? `/backup/summary/${semesterId}?${queryString}`
      : `/backup/summary/${semesterId}`;
    return apiRequest<ISemesterSummaryReport>(endpoint);
  },
};

export interface LegacyMigrationResult {
  success: boolean;
  message: string;
  migrated: {
    semesters: number;
    courses: number;
    classInstances: number;
    academicEvents: number;
  };
  totalMigrated: number;
}

export interface LegacyStatusResult {
  success: boolean;
  hasUnclaimedData: boolean;
  isLocked: boolean;
  claimedBy: string | null;
  unclaimedCounts: {
    semesters: number;
    courses: number;
    classInstances: number;
    academicEvents: number;
  };
  totalUnclaimed: number;
}

export const authApi = {
  async getLegacyStatus(): Promise<LegacyStatusResult> {
    return apiRequest<LegacyStatusResult>('/auth/legacy-status');
  },

  async claimLegacyData(migrationSecret?: string): Promise<LegacyMigrationResult> {
    return apiRequest<LegacyMigrationResult>('/auth/claim-legacy-data', {
      method: 'POST',
      body: JSON.stringify({ migrationSecret }),
    });
  },
};


