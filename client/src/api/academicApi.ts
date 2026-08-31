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
  ApiResponse,
} from '../types/academic.js';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  const json: ApiResponse<T> = await res.json();
  if (!res.ok || !json.success) {
    const errorMsg = json.errors ? json.errors.join(', ') : json.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return json.data as T;
}

export const semesterApi = {
  async getAll(options?: { activeOnly?: boolean; archived?: boolean; all?: boolean }): Promise<ISemester[]> {
    const params = new URLSearchParams();
    if (options?.activeOnly) params.set('active', 'true');
    if (options?.archived) params.set('archived', 'true');
    if (options?.all) params.set('all', 'true');
    const qs = params.toString();
    const url = qs ? `${API_BASE}/semesters?${qs}` : `${API_BASE}/semesters`;
    const res = await fetch(url);
    return handleResponse<ISemester[]>(res);
  },

  async getById(id: string): Promise<ISemester> {
    const res = await fetch(`${API_BASE}/semesters/${id}`);
    return handleResponse<ISemester>(res);
  },

  async create(data: Partial<ISemester>): Promise<ISemester> {
    const res = await fetch(`${API_BASE}/semesters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ISemester>(res);
  },

  async update(id: string, data: Partial<ISemester>): Promise<ISemester> {
    const res = await fetch(`${API_BASE}/semesters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ISemester>(res);
  },

  async delete(id: string, options?: { force?: boolean; archive?: boolean }): Promise<{ semester: ISemester; archived: boolean }> {
    const params = new URLSearchParams();
    if (options?.force) params.set('force', 'true');
    if (options?.archive) params.set('archive', 'true');
    const qs = params.toString();
    const url = qs ? `${API_BASE}/semesters/${id}?${qs}` : `${API_BASE}/semesters/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    const json: ApiResponse<ISemester> & { archived?: boolean } = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to delete semester');
    }
    return { semester: json.data as ISemester, archived: Boolean(json.archived) };
  },
};

export const courseApi = {
  async getAll(semesterId?: string, options?: { archived?: boolean; all?: boolean }): Promise<ICourse[]> {
    const params = new URLSearchParams();
    if (semesterId) params.set('semesterId', semesterId);
    if (options?.archived) params.set('archived', 'true');
    if (options?.all) params.set('all', 'true');
    const qs = params.toString();
    const url = qs ? `${API_BASE}/courses?${qs}` : `${API_BASE}/courses`;
    const res = await fetch(url);
    return handleResponse<ICourse[]>(res);
  },

  async getById(id: string): Promise<ICourse> {
    const res = await fetch(`${API_BASE}/courses/${id}`);
    return handleResponse<ICourse>(res);
  },

  async create(data: Partial<ICourse>): Promise<ICourse> {
    const res = await fetch(`${API_BASE}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ICourse>(res);
  },

  async update(id: string, data: Partial<ICourse>): Promise<ICourse> {
    const res = await fetch(`${API_BASE}/courses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ICourse>(res);
  },

  async delete(id: string, force = false): Promise<{ course: ICourse; archived: boolean }> {
    const url = force ? `${API_BASE}/courses/${id}?force=true` : `${API_BASE}/courses/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    const json: ApiResponse<ICourse> & { archived?: boolean } = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to delete course');
    }
    return { course: json.data as ICourse, archived: Boolean(json.archived) };
  },
};

export const scheduleApi = {
  async getByCourse(courseId: string): Promise<ISchedule[]> {
    const res = await fetch(`${API_BASE}/courses/${courseId}/schedules`);
    return handleResponse<ISchedule[]>(res);
  },

  async add(courseId: string, data: Partial<ISchedule>): Promise<ISchedule> {
    const res = await fetch(`${API_BASE}/courses/${courseId}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ISchedule>(res);
  },

  async update(courseId: string, scheduleId: string, data: Partial<ISchedule>): Promise<ISchedule> {
    const res = await fetch(`${API_BASE}/courses/${courseId}/schedules/${scheduleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ISchedule>(res);
  },

  async delete(courseId: string, scheduleId: string): Promise<{ _id: string }> {
    const res = await fetch(`${API_BASE}/courses/${courseId}/schedules/${scheduleId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ _id: string }>(res);
  },
};

export const classInstanceApi = {
  async generate(semesterId: string, courseId?: string): Promise<ClassGenerationResult> {
    const res = await fetch(`${API_BASE}/class-instances/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semesterId, courseId }),
    });
    return handleResponse<ClassGenerationResult>(res);
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

    const queryString = query.toString();
    const url = queryString ? `${API_BASE}/class-instances?${queryString}` : `${API_BASE}/class-instances`;
    const res = await fetch(url);
    return handleResponse<IClassInstance[]>(res);
  },

  async getById(id: string): Promise<IClassInstance> {
    const res = await fetch(`${API_BASE}/class-instances/${id}`);
    return handleResponse<IClassInstance>(res);
  },

  async updateAttendance(id: string, status: AttendanceStatus): Promise<IClassInstance> {
    const res = await fetch(`${API_BASE}/class-instances/${id}/attendance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return handleResponse<IClassInstance>(res);
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
    const res = await fetch(`${API_BASE}/class-instances/${id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<IClassInstance>(res);
  },

  async updateStatus(
    id: string,
    data: {
      status: ClassStatus;
      cancellationReason?: string;
      holidayName?: string;
    }
  ): Promise<IClassInstance> {
    const res = await fetch(`${API_BASE}/class-instances/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<IClassInstance>(res);
  },

  async getStats(semesterId?: string, courseId?: string): Promise<OverallAttendanceStats> {
    const query = new URLSearchParams();
    if (semesterId) query.set('semesterId', semesterId);
    if (courseId) query.set('courseId', courseId);
    const res = await fetch(`${API_BASE}/class-instances/stats?${query.toString()}`);
    return handleResponse<OverallAttendanceStats>(res);
  },

  async delete(id: string): Promise<IClassInstance> {
    const res = await fetch(`${API_BASE}/class-instances/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<IClassInstance>(res);
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

    const queryString = query.toString();
    const url = queryString ? `${API_BASE}/academic-events?${queryString}` : `${API_BASE}/academic-events`;
    const res = await fetch(url);
    return handleResponse<IAcademicEvent[]>(res);
  },

  async getById(id: string): Promise<IAcademicEvent> {
    const res = await fetch(`${API_BASE}/academic-events/${id}`);
    return handleResponse<IAcademicEvent>(res);
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
    const res = await fetch(`${API_BASE}/academic-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<IAcademicEvent>(res);
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
    const res = await fetch(`${API_BASE}/academic-events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<IAcademicEvent>(res);
  },

  async delete(id: string): Promise<IAcademicEvent> {
    const res = await fetch(`${API_BASE}/academic-events/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<IAcademicEvent>(res);
  },
};

export const holidayApi = {
  async getHolidays(year: number, monthIndex?: number): Promise<IBangladeshHoliday[]> {
    const query = new URLSearchParams();
    query.set('year', String(year));
    if (monthIndex !== undefined) query.set('month', String(monthIndex));
    const res = await fetch(`${API_BASE}/holidays?${query.toString()}`);
    return handleResponse<IBangladeshHoliday[]>(res);
  },

  async checkHoliday(dateString: string): Promise<{ isHoliday: boolean; data: IBangladeshHoliday | null }> {
    const res = await fetch(`${API_BASE}/holidays/check?date=${dateString}`);
    const json = await res.json();
    return json;
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
    const url = queryString ? `${API_BASE}/analytics/attendance?${queryString}` : `${API_BASE}/analytics/attendance`;
    const res = await fetch(url);
    return handleResponse<AttendanceAnalyticsResponse>(res);
  },
};

export const backupApi = {
  async exportJson(): Promise<IBackupPayload> {
    const res = await fetch(`${API_BASE}/backup/export`);
    return handleResponse<IBackupPayload>(res);
  },

  async validateBackup(payload: IBackupPayload): Promise<IBackupValidationResult> {
    const res = await fetch(`${API_BASE}/backup/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: ApiResponse<unknown> = await res.json();
    return {
      isValid: Boolean(json.isValid),
      errors: json.errors || (json.message ? [json.message] : []),
      preview: json.preview,
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
    const res = await fetch(`${API_BASE}/backup/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{
      semesters: { inserted: number; skipped: number };
      courses: { inserted: number; skipped: number };
      classInstances: { inserted: number; skipped: number };
      academicEvents: { inserted: number; skipped: number };
    }>(res);
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

  async getSemesterSummary(semesterId: string, target?: number): Promise<ISemesterSummaryReport> {
    const query = new URLSearchParams();
    if (target !== undefined) query.set('target', String(target));
    const queryString = query.toString();
    const url = queryString
      ? `${API_BASE}/backup/summary/${semesterId}?${queryString}`
      : `${API_BASE}/backup/summary/${semesterId}`;
    const res = await fetch(url);
    return handleResponse<ISemesterSummaryReport>(res);
  },
};

