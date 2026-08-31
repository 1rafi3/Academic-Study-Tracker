import type {
  ISemester,
  ICourse,
  ISchedule,
  IClassInstance,
  AttendanceStatus,
  OverallAttendanceStats,
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

