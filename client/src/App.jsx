import { useEffect, useState } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { ThemeProvider } from './context/ThemeContext';
import { api, setInitData } from './api/client';
import BottomNav from './components/BottomNav.jsx';
import HomePage from './pages/Home.jsx';
import StatsPage from './pages/Stats.jsx';
import SettingsPage from './pages/Settings.jsx';
import AddHabitModal from './components/AddHabitModal.jsx';

export default function App() {
  const { initData, inTelegram, tgTheme, hapticFeedback } = useTelegram();
  const [page, setPage] = useState('home'); // home | stats | settings
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  // Авторизуем API-клиент
  useEffect(() => {
    setInitData(initData);
  }, [initData]);

  // Загружаем привычки
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

  // Сохранение темы на сервере
  const persistTheme = async (theme) => {
    try {
      await api.updateTheme(theme);
    } catch {
      /* вне сети — не критично */
    }
  };

  const handleToggle = async (habitId, date) => {
    hapticFeedback('light');
    // Оптимистичное обновление UI
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
      await api.toggleHabit(habitId, date);
      // Пересчитываем streak локально для моментального отклика
      loadHabits();
    } catch (e) {
      setError(e.message);
      loadHabits();
    }
  };

  const handleCreate = async (data) => {
    try {
      const created = await api.createHabit(data);
      setHabits((prev) => [...prev, { ...created, logs: [], streak: 0 }]);
      setAddOpen(false);
      hapticFeedback('medium');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteHabit(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
      hapticFeedback('heavy');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <ThemeProvider telegramTheme={tgTheme} onPersist={persistTheme}>
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">
            {page === 'home' && '🧠 MentalOS'}
            {page === 'stats' && '📊 Статистика'}
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
              onAdd={() => setAddOpen(true)}
            />
          )}
          {page === 'stats' && <StatsPage />}
          {page === 'settings' && <SettingsPage />}
        </main>

        {page === 'home' && (
          <button className="fab" onClick={() => setAddOpen(true)} aria-label="Добавить привычку">
            +
          </button>
        )}

        <BottomNav current={page} onChange={setPage} />

        {addOpen && <AddHabitModal onClose={() => setAddOpen(false)} onSubmit={handleCreate} />}

        {!inTelegram && (
          <div className="dev-banner">
            🛠 Режим разработки. Открой внутри Telegram для полноценной работы.
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}
