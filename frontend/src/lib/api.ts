import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ─── Auth ──────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }).then(r => r.data),
  logout: (refreshToken?: string) =>
    api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me').then(r => r.data),
};

// ─── Tickets ───────────────────────────────────────────────
export const ticketsApi = {
  list:      (params?: Record<string, any>) => api.get('/tickets', { params }).then(r => r.data),
  get:       (id: string) => api.get(`/tickets/${id}`).then(r => r.data),
  create:    (data: any) => api.post('/tickets', data).then(r => r.data),
  update:    (id: string, data: any) => api.patch(`/tickets/${id}`, data).then(r => r.data),
  delete:    (id: string) => api.delete(`/tickets/${id}`).then(r => r.data),
  stats:     () => api.get('/tickets/stats').then(r => r.data),
  addComment:(id: string, data: any) => api.post(`/tickets/${id}/comments`, data).then(r => r.data),
  deleteComment: (id: string, commentId: string) => api.delete(`/tickets/${id}/comments/${commentId}`),
  slaPolicies: () => api.get('/tickets/meta/sla-policies').then(r => r.data),
};

// ─── Assets ────────────────────────────────────────────────
export const assetsApi = {
  list:     (params?: Record<string, any>) => api.get('/assets', { params }).then(r => r.data),
  get:      (id: string) => api.get(`/assets/${id}`).then(r => r.data),
  create:   (data: any) => api.post('/assets', data).then(r => r.data),
  update:   (id: string, data: any) => api.patch(`/assets/${id}`, data).then(r => r.data),
  delete:   (id: string) => api.delete(`/assets/${id}`),
  assign:   (id: string, data: any) => api.post(`/assets/${id}/assign`, data).then(r => r.data),
  unassign: (id: string) => api.post(`/assets/${id}/unassign`).then(r => r.data),
  stats:    () => api.get('/assets/stats').then(r => r.data),
};

// ─── Users ─────────────────────────────────────────────────
export const usersApi = {
  list:           (params?: Record<string, any>) => api.get('/users', { params }).then(r => r.data),
  get:            (id: string) => api.get(`/users/${id}`).then(r => r.data),
  create:         (data: any) => api.post('/users', data).then(r => r.data),
  update:         (id: string, data: any) => api.patch(`/users/${id}`, data).then(r => r.data),
  delete:         (id: string) => api.delete(`/users/${id}`),
  roles:          () => api.get('/users/roles').then(r => r.data),
  departments:    () => api.get('/users/departments').then(r => r.data),
  permissions:    () => api.get('/users/permissions').then(r => r.data),
  createDept:     (name: string) => api.post('/users/departments', { name }).then(r => r.data),
};

// ─── Reports ───────────────────────────────────────────────
export const reportsApi = {
  dashboard:       () => api.get('/reports/dashboard').then(r => r.data),
  ticketVolume:    (days?: number) => api.get('/reports/ticket-volume', { params: { days } }).then(r => r.data),
  byStatus:        () => api.get('/reports/tickets-by-status').then(r => r.data),
  byPriority:      () => api.get('/reports/tickets-by-priority').then(r => r.data),
  agentPerformance:(days?: number) => api.get('/reports/agent-performance', { params: { days } }).then(r => r.data),
  mttr:            (days?: number) => api.get('/reports/mttr', { params: { days } }).then(r => r.data),
  assetUtil:       () => api.get('/reports/asset-utilization').then(r => r.data),
};

// ─── Notifications ─────────────────────────────────────────
export const notificationsApi = {
  list:        (params?: Record<string, any>) => api.get('/notifications', { params }).then(r => r.data),
  unreadCount: () => api.get('/notifications/unread-count').then(r => r.data),
  markRead:    (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete:      (id: string) => api.delete(`/notifications/${id}`),
};

// ─── SLA ───────────────────────────────────────────────────
export const slaApi = {
  policies:   () => api.get('/sla/policies').then(r => r.data),
  create:     (data: any) => api.post('/sla/policies', data).then(r => r.data),
  update:     (id: string, data: any) => api.patch(`/sla/policies/${id}`, data).then(r => r.data),
  delete:     (id: string) => api.delete(`/sla/policies/${id}`),
  metrics:    (days?: number) => api.get('/sla/metrics', { params: { days } }).then(r => r.data),
  atRisk:     () => api.get('/sla/at-risk').then(r => r.data),
};

// ─── Automation ────────────────────────────────────────────
export const automationApi = {
  list:   (params?: Record<string, any>) => api.get('/automation/rules', { params }).then(r => r.data),
  get:    (id: string) => api.get(`/automation/rules/${id}`).then(r => r.data),
  create: (data: any) => api.post('/automation/rules', data).then(r => r.data),
  update: (id: string, data: any) => api.patch(`/automation/rules/${id}`, data).then(r => r.data),
  toggle: (id: string) => api.patch(`/automation/rules/${id}/toggle`).then(r => r.data),
  delete: (id: string) => api.delete(`/automation/rules/${id}`),
};

// ─── Knowledge Base ────────────────────────────────────────
export const kbApi = {
  list:    (params?: Record<string, any>) => api.get('/kb', { params }).then(r => r.data),
  get:     (id: string) => api.get(`/kb/${id}`).then(r => r.data),
  create:  (data: any) => api.post('/kb', data).then(r => r.data),
  update:  (id: string, data: any) => api.patch(`/kb/${id}`, data).then(r => r.data),
  delete:  (id: string) => api.delete(`/kb/${id}`),
  popular: (limit?: number) => api.get('/kb/popular', { params: { limit } }).then(r => r.data),
};

// ─── Audit Logs ────────────────────────────────────────────
export const auditApi = {
  list: (params?: Record<string, any>) => api.get('/audit-logs', { params }).then(r => r.data),
};
