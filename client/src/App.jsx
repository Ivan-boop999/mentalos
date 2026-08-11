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
import AddHabitModal from './components/AddHabitModal.jsx';
import AchievementToast from './components/AchievementToast.jsx';

export default function App() {
  const { initData, inTelegram, tgTheme, hapticFeedback, tg } = useTelegram();
  const timezone = useTimezone(initData);
  const [page, setPage] = useState('home'); // home | stats | achievements | settings
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [achievement, setAchievement] = useState(null); // для тоста

  useEffect(() => {
    setInitData(initData);
  }, [initData]);

  const loadHabits = async () => {
    try {
      setError('');
      const data = await api.getHabits();
      setHabits(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initData) loadHabits();
  }, [initData]);

  const persistTheme = async (theme) => {
    try {
      await api.updateSettings({ theme });
    } catch {
      /* noop */
    }
  };

  const handleToggle = async (habitId, date) => {
    hapticFeedback('light');
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const has = h.logs.includes(date);
        return {
          ...h,
          logs: has ? h.logs.filter((d) => d !== date) : [...h.logs, date],
        };
      }),
    );
    try {
      const res = await api.toggleHabit(habitId, date);
      // Если сервер вернул новое достижение — показываем тост
      if (res.newAchievements && res.newAchievements.length > 0) {
        setAchievement(res.newAchievements[0]);
        hapticFeedback('heavy');
      }
      // Пересчитываем streak
      if (typeof res.streak === 'number') {
        setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, streak: res.streak } : h)));
      }
    } catch (e) {
      setError(e.message);
      loadHabits();
    }
  };

  const openCreate = () => {
    setEditingHabit(null);
    setModalOpen(true);
  };

  const openEdit = (habit) => {
    setEditingHabit(habit);
    setModalOpen(true);
  };

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
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить привычку? История сохранится в отчётах.')) return;
    try {
      await api.deleteHabit(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
      hapticFeedback('heavy');
    } catch (e) {
      setError(e.message);
    }
  };

  const userName = inTelegram ? tg?.initDataUnsafe?.user?.first_name : '';

  return (
    <ThemeProvider telegramTheme={tgTheme} onPersist={persistTheme}>
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">
            {page === 'home' && '🧠 MentalOS'}
            {page === 'stats' && '📊 Статистика'}
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
            />
          )}
          {page === 'stats' && <StatsPage habits={habits} userName={userName} tg={tg} />}
          {page === 'achievements' && <AchievementsPage />}
          {page === 'settings' && <SettingsPage timezone={timezone} />}
        </main>

        {page === 'home' && (
          <button className="fab" onClick={openCreate} aria-label="Добавить привычку">
            +
          </button>
        )}

        <BottomNav current={page} onChange={setPage} />

        {modalOpen && (
          <AddHabitModal
            onClose={() => {
              setModalOpen(false);
              setEditingHabit(null);
            }}
            onSubmit={handleSubmitHabit}
            habit={editingHabit}
            timezone={timezone}
          />
        )}

        <AchievementToast achievement={achievement} onDone={() => setAchievement(null)} />

        {!inTelegram && (
          <div className="dev-banner">
            🛠 Режим разработки. Открой внутри Telegram для полноценной работы.
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}
