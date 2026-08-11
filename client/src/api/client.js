// Простой API-клиент. initData передаётся в заголовке для авторизации.
let _initData = '';

export function setInitData(value) {
  _initData = value || '';
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (_initData && _initData !== 'dev') {
    headers['X-Telegram-Init-Data'] = _initData;
  }

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    let msg = `Ошибка ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error || msg;
    } catch {
      /* noop */
    }
    throw new Error(msg);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  // Привычки
  getHabits: () => request('/api/habits'),
  createHabit: (data) => request('/api/habits', { method: 'POST', body: JSON.stringify(data) }),
  updateHabit: (id, data) => request(`/api/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHabit: (id) => request(`/api/habits/${id}`, { method: 'DELETE' }),
  toggleHabit: (id, date) => request(`/api/habits/${id}/toggle`, { method: 'POST', body: JSON.stringify({ date }) }),

  // Статистика
  getStats: (days = 7) => request(`/api/stats?days=${days}`),

  // Настройки
  getSettings: () => request('/api/settings'),
  updateSettings: (data) => request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Достижения
  getAchievements: () => request('/api/achievements'),
};
