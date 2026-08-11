import { useEffect, useState } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { useTimezone } from './hooks/useTimezone';
import { ThemeProvider } from './context/ThemeContext';
import { api, setInitData } from './api/client';
import BottomNav from './components/BottomNav.jsx';
import HomePage from './pages/Home.jsx';
import StatsPage from './pages/Stats.jsx';
import SettingsPage from './pages/Settings.jsx';
import AchievementsPage from './pages/Achievements.jsx';
import ReferralPage from './pages/Referral.jsx';
import AddHabitModal from './components/AddHabitModal.jsx';
import AchievementToast from './components/AchievementToast.jsx';
import Celebration from './components/Celebration.jsx';

export default function App() {
  const { initData, inTelegram, tgTheme, hapticFeedback, tg } = useTelegram();
  const timezone = useTimezone(initData);
  const [page, setPage] = useState('home');
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [achievement, setAchievement] = useState(null);
  const [celebrate, setCelebrate] = useState(0);

  useEffect(() => { setInitData(initData); }, [initData]);

  const loadHabits = async () => {
    try {
      setError('');
      const data = await api.getHabits();
      setHabits(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { if (initData) loadHabits(); }, [initData]);

  const persistTheme = async (theme) => {
    try { await api.updateSettings({ theme }); } catch {}
  };

  const handleToggle = async (habitId, date) => {
    hapticFeedback('light');
    const wasAllDone = habits.length > 0 && habits.filter((h) => h.logs.includes(date)).length === habits.length;

    setHabits((prev) => prev.map((h) => {
      if (h.id !== habitId) return h;
      const has = h.logs.includes(date);
      return { ...h, logs: has ? h.logs.filter((d) => d !== date) : [...h.logs, date] };
    }));

    try {
      const res = await api.toggleHabit(habitId, date);
      if (res.newAchievements?.length > 0) {
        setAchievement(res.newAchievements[0]);
        hapticFeedback('heavy');
      }
      if (typeof res.streak === 'number') {
        setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, streak: res.streak, best_streak: res.best_streak || h.best_streak } : h)));
      }
      // Конфетти, если после отметки все привычки выполнены и до этого не были
      const doneCount = habits.filter((h) => h.logs.includes(date) || h.id === habitId).length;
      if (res.done && !wasAllDone && doneCount === habits.length && habits.length > 0) {
        setCelebrate((c) => c + 1);
        hapticFeedback('heavy');
      }
    } catch (e) {
      setError(e.message);
      loadHabits();
    }
  };

  const openCreate = () => { setEditingHabit(null); setModalOpen(true); };
  const openEdit = (habit) => { setEditingHabit(habit); setModalOpen(true); };

  const handleSubmitHabit = async (data) => {
    try {
      if (editingHabit) {
        const updated = await api.updateHabit(editingHabit.id, data);
        setHabits((prev) => prev.map((h) => (h.id === editingHabit.id ? { ...h, ...updated, logs: h.logs, streak: h.streak } : h)));
        hapticFeedback('medium');
      } else {
        const created = await api.createHabit(data);
        setHabits((prev) => [...prev, { ...created, logs: [], streak: 0 }]);
        hapticFeedback('medium');
      }
      setModalOpen(false);
      setEditingHabit(null);
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить привычку?')) return;
    try {
      await api.deleteHabit(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
      hapticFeedback('heavy');
    } catch (e) { setError(e.message); }
  };

  const userName = inTelegram ? tg?.initDataUnsafe?.user?.first_name : '';

  return (
    <ThemeProvider telegramTheme={tgTheme} onPersist={persistTheme}>
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">
            {page === 'home' && '🧠 MentalOS'}
            {page === 'stats' && '📊 Статистика'}
            {page === 'rewards' && '🎁 Награды'}
            {page === 'achievements' && '🏆 Достижения'}
            {page === 'settings' && '⚙️ Настройки'}
          </h1>
        </header>

        {error && <div className="error-toast">{error}</div>}

        <main className="app-content">
          {page === 'home' && (
            <HomePage
              habits={habits}
              loading={loading}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={openEdit}
              onAdd={openCreate}
              userName={userName}
            />
          )}
          {page === 'stats' && <StatsPage habits={habits} userName={userName} tg={tg} />}
          {page === 'rewards' && <ReferralPage tg={tg} />}
          {page === 'achievements' && <AchievementsPage />}
          {page === 'settings' && <SettingsPage timezone={timezone} />}
        </main>

        {page === 'home' && (
          <button className="fab" onClick={openCreate} aria-label="Добавить">+</button>
        )}

        <BottomNav current={page} onChange={setPage} />

        {modalOpen && (
          <AddHabitModal
            onClose={() => { setModalOpen(false); setEditingHabit(null); }}
            onSubmit={handleSubmitHabit}
            habit={editingHabit}
            timezone={timezone}
          />
        )}

        <AchievementToast achievement={achievement} onDone={() => setAchievement(null)} />
        <Celebration trigger={celebrate} />

        {!inTelegram && (
          <div className="dev-banner">🛠 Режим разработки. Открой внутри Telegram.</div>
        )}
      </div>
    </ThemeProvider>
  );
}
