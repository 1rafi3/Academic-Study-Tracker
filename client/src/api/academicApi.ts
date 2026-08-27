import type { ISemester, ICourse, ISchedule, ApiResponse } from '../types/academic.js';

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
  async getAll(activeOnly = false): Promise<ISemester[]> {
    const url = activeOnly ? `${API_BASE}/semesters?active=true` : `${API_BASE}/semesters`;
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

  async delete(id: string): Promise<ISemester> {
    const res = await fetch(`${API_BASE}/semesters/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<ISemester>(res);
  },
};

export const courseApi = {
  async getAll(semesterId?: string): Promise<ICourse[]> {
    const url = semesterId ? `${API_BASE}/courses?semesterId=${semesterId}` : `${API_BASE}/courses`;
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

  async delete(id: string): Promise<ICourse> {
    const res = await fetch(`${API_BASE}/courses/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<ICourse>(res);
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
