// Update API to support OpenCode proxy
// ... existing imports

const API_BASE = '/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('lmf_auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  const authHeader = getAuthHeader();
  if (authHeader.Authorization) {
    headers.set('Authorization', authHeader.Authorization);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  // Handle empty responses
  if (res.status === 204) return {} as T;

  // Handle auth errors - redirect to login
  if (res.status === 401) {
    localStorage.removeItem('lmf_auth_token');
    // Don't redirect if we're already checking auth status
    if (!endpoint.includes('/auth/status')) {
      window.location.href = '/login';
    }
    throw new Error('Not authenticated');
  }

  const text = await res.text();
  if (!res.ok) {
    let errorMessage = 'Request failed';
    try {
      const json = JSON.parse(text);
      errorMessage = json.error || json.message || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }
  
  try {
    return text ? JSON.parse(text) : ({} as T);
  } catch {
    return {} as T;
  }
}

export const api = {
  // Auth
  getAuthStatus: () => request<{ needsSetup: boolean; authenticated: boolean }>('/auth/status'),
  setup: async (password: string) => {
    const res = await request<{ success: boolean; token: string }>('/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    if (res.token) localStorage.setItem('lmf_auth_token', res.token);
    return res;
  },
  login: async (password: string) => {
    const res = await request<{ success: boolean; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    if (res.token) localStorage.setItem('lmf_auth_token', res.token);
    return res;
  },
  logout: async () => {
    const res = await request<{ success: boolean }>('/auth/logout', { method: 'POST' });
    localStorage.removeItem('lmf_auth_token');
    return res;
  },

  // System
  getStats: () => request<any>('/system/stats'),
  getContainers: () => request<any[]>('/system/containers'),
  getProcesses: () => request<any>('/system/processes'),
  killProcess: (pid: number) => request<{ success: boolean }>(`/system/processes/${pid}/kill`, { method: 'POST' }),

  // Apps
  getApps: () => request<any[]>('/apps'),
  getApp: (id: string) => request<any>(`/apps/${id}`),
  deployApp: (data: { githubUrl: string; name: string; domain: string; port: number; envVars?: Record<string, string> }) =>
    request<{ success: boolean; appId: string }>('/apps', { method: 'POST', body: JSON.stringify(data) }),
  updateApp: (id: string) => request<{ success: boolean }>(`/apps/${id}/update`, { method: 'POST' }),
  startApp: (id: string) => request<{ success: boolean }>(`/apps/${id}/start`, { method: 'POST' }),
  stopApp: (id: string) => request<{ success: boolean }>(`/apps/${id}/stop`, { method: 'POST' }),
  restartApp: (id: string) => request<{ success: boolean }>(`/apps/${id}/restart`, { method: 'POST' }),
  deleteApp: (id: string) => request<{ success: boolean }>(`/apps/${id}`, { method: 'DELETE' }),
  getAppLogs: (id: string) => request<{ logs: string }>(`/apps/${id}/logs`),
  getDeployments: (id: string) => request<any[]>(`/apps/${id}/deployments`),

  // DNS
  getDnsConfig: () => request<{ configured: boolean; zoneId: string | null }>('/dns/config'),
  setDnsConfig: (token: string, zoneId: string) =>
    request<{ success: boolean }>('/dns/config', { method: 'POST', body: JSON.stringify({ token, zoneId }) }),
  getDnsRecords: () => request<any[]>('/dns'),
  createDnsRecord: (data: { name: string; content: string; type?: string; proxied?: boolean }) =>
    request<any>('/dns', { method: 'POST', body: JSON.stringify(data) }),
  updateDnsRecord: (id: string, data: { name?: string; content?: string; type?: string; proxied?: boolean }) =>
    request<any>(`/dns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDnsRecord: (id: string) => request<{ success: boolean }>(`/dns/${id}`, { method: 'DELETE' }),

  // Sessions (via OpenCode)
  getSessions: (directory = '/home/fedora') => 
    request<any[]>(`/sessions?directory=${encodeURIComponent(directory)}`),
  getSession: (id: string) => request<any>(`/sessions/${id}`),
  createSession: (directory = '/home/fedora', model?: string, initialPrompt?: string) => 
    request<any>('/sessions', { method: 'POST', body: JSON.stringify({ directory, model, initialPrompt }) }),
  deleteSession: (id: string) => request<{ success: boolean }>(`/sessions/${id}`, { method: 'DELETE' }),

  // OpenCode API Proxy
  opencode: {
    createSession: (workingDir: string) => 
      request<any>(`/opencode/session?directory=${encodeURIComponent(workingDir)}`, { method: 'POST', body: JSON.stringify({}) }),
    getMessages: (sessionId: string, workingDir: string) =>
      request<any>(`/opencode/session/${sessionId}/message?directory=${encodeURIComponent(workingDir)}`),
    sendMessage: (sessionId: string, workingDir: string, message: string) =>
      request<any>(`/opencode/session/${sessionId}/message?directory=${encodeURIComponent(workingDir)}`, {
        method: 'POST',
        body: JSON.stringify({
          parts: [{ type: 'text', text: message }]
        })
      })
  },

  // Settings
  getSettings: () => request<any>('/settings'),
  setDiscordWebhook: (webhookUrl: string) =>
    request<{ success: boolean }>('/settings/discord', { method: 'POST', body: JSON.stringify({ webhookUrl }) }),
  testDiscordWebhook: () => request<{ success: boolean }>('/settings/discord/test', { method: 'POST' }),
  setDefaultModel: (model: string) =>
    request<{ success: boolean }>('/settings/model', { method: 'POST', body: JSON.stringify({ model }) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    })
};
