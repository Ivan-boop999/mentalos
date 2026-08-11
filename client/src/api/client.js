let _initData = '';

export function setInitData(value) {
  _initData = value || '';
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (_initData && _initData !== 'dev') headers['X-Telegram-Init-Data'] = _initData;
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    let msg = `Ошибка ${res.status}`;
    try { const b = await res.json(); msg = b.error || msg; } catch {}
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  // Habits
  getHabits: () => request('/api/habits'),
  createHabit: (data) => request('/api/habits', { method: 'POST', body: JSON.stringify(data) }),
  updateHabit: (id, data) => request(`/api/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHabit: (id) => request(`/api/habits/${id}`, { method: 'DELETE' }),
  toggleHabit: (id, date) => request(`/api/habits/${id}/toggle`, { method: 'POST', body: JSON.stringify({ date }) }),
  getCalendar: (id, months = 3) => request(`/api/habits/${id}/calendar?months=${months}`),

  // Stats
  getStats: (days = 7) => request(`/api/stats?days=${days}`),

  // Settings
  getSettings: () => request('/api/settings'),
  updateSettings: (data) => request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Achievements
  getAchievements: () => request('/api/achievements'),

  // Categories
  getCategories: () => request('/api/categories'),
  createCategory: (data) => request('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),

  // Referral & Shop
  getReferral: () => request('/api/referral'),
  getShop: () => request('/api/referral/shop'),
  buyItem: (code) => request('/api/referral/buy', { method: 'POST', body: JSON.stringify({ code }) }),
};
