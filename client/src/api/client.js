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
  getArchived: () => request('/api/habits/archived'),
  restoreHabit: (id) => request(`/api/habits/${id}/restore`, { method: 'POST' }),
  createHabit: (data) => request('/api/habits', { method: 'POST', body: JSON.stringify(data) }),
  updateHabit: (id, data) => request(`/api/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHabit: (id) => request(`/api/habits/${id}`, { method: 'DELETE' }),
  logHabit: (id, data) => request(`/api/habits/${id}/log`, { method: 'POST', body: JSON.stringify(data) }),
  unlogHabit: (id, date) => request(`/api/habits/${id}/unlog`, { method: 'POST', body: JSON.stringify({ date }) }),
  getCalendar: (id, months = 3) => request(`/api/habits/calendar?id=${id}&months=${months}`),
  getYearHeatmap: () => request('/api/habits/year-heatmap'),
  getStrength: (id) => request(`/api/habits/${id}/strength`),

  // Sub-tasks
  getSubtasks: (habitId) => request(`/api/habits/${habitId}/subtasks`),
  addSubtask: (habitId, title) => request(`/api/habits/${habitId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) }),
  updateSubtask: (habitId, subId, data) => request(`/api/habits/${habitId}/subtasks/${subId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubtask: (habitId, subId) => request(`/api/habits/${habitId}/subtasks/${subId}`, { method: 'DELETE' }),

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
  activateTheme: (theme) => request('/api/referral/activate-theme', { method: 'POST', body: JSON.stringify({ theme }) }),

  // Mood
  getMoods: (days = 30) => request(`/api/mood?days=${days}`),
  setMood: (mood, note) => request('/api/mood', { method: 'POST', body: JSON.stringify({ mood, note }) }),
  deleteMood: () => request('/api/mood', { method: 'DELETE' }),

  // Journal
  getJournal: () => request('/api/journal'),
  createJournal: (data) => request('/api/journal', { method: 'POST', body: JSON.stringify(data) }),
  updateJournal: (id, data) => request(`/api/journal/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteJournal: (id) => request(`/api/journal/${id}`, { method: 'DELETE' }),

  // Challenges
  getChallenges: () => request('/api/challenges'),
  joinChallenge: (id) => request(`/api/challenges/${id}/join`, { method: 'POST' }),
  abandonChallenge: (id) => request(`/api/challenges/${id}/abandon`, { method: 'POST' }),

  // Leaderboard
  getLeaderboard: () => request('/api/leaderboard'),
  setPublicProfile: (pub) => request('/api/leaderboard/visibility', { method: 'PUT', body: JSON.stringify({ public: pub }) }),

  // Buddies (бадди-механика с согласием)
  getBuddies: () => request('/api/buddies'),
  inviteBuddy: (code) => request('/api/buddies/invite', { method: 'POST', body: JSON.stringify({ code }) }),
  acceptBuddy: (id) => request(`/api/buddies/${id}/accept`, { method: 'POST' }),
  declineBuddy: (id) => request(`/api/buddies/${id}/decline`, { method: 'POST' }),
  removeBuddy: (id) => request(`/api/buddies/${id}`, { method: 'DELETE' }),

  // Missions (Mission of the Day)
  getMissions: () => request('/api/missions'),

  // Duels (PvP с согласием)
  getDuels: () => request('/api/duels'),
  createDuel: (opponentId, wager) => request('/api/duels', { method: 'POST', body: JSON.stringify({ opponentId, wager }) }),
  acceptDuel: (id) => request(`/api/duels/${id}/accept`, { method: 'POST' }),
  declineDuel: (id) => request(`/api/duels/${id}/decline`, { method: 'POST' }),
  finishDuel: (id) => request(`/api/duels/${id}/finish`, { method: 'POST' }),

  // Recap (Weekly Recap)
  getRecap: () => request('/api/recap'),

  // Streak Insurance
  buyStreakInsurance: () => request('/api/habits/buy-streak-insurance', { method: 'POST' }),

  // Export
  exportData: () => '/api/export',
  exportCsvUrl: () => '/api/export/csv',
};
