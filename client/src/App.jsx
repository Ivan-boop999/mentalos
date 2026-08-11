import { useEffect, useState } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { useTimezone } from './hooks/useTimezone';
import { useSound } from './hooks/useSound';
import { ThemeProvider } from './context/ThemeContext';
import { api, setInitData } from './api/client';
import BottomNav from './components/BottomNav.jsx';
import HomePage from './pages/Home.jsx';
import StatsPage from './pages/Stats.jsx';
import SettingsPage from './pages/Settings.jsx';
import AchievementsPage from './pages/Achievements.jsx';
import ReferralPage from './pages/Referral.jsx';
import MoodPage from './pages/Mood.jsx';
import JournalPage from './pages/Journal.jsx';
import ChallengesPage from './pages/Challenges.jsx';
import MorePage from './pages/More.jsx';
import AddHabitModal from './components/AddHabitModal.jsx';
import AchievementToast from './components/AchievementToast.jsx';
import Celebration from './components/Celebration.jsx';
import Onboarding from './components/Onboarding.jsx';

export default function App() {
  const { initData, inTelegram, tgTheme, hapticFeedback, tg } = useTelegram();
  const timezone = useTimezone(initData);
  const { play: playSound, enabled: soundEnabled, setEnabled: setSoundEnabled } = useSound();
  const [page, setPage] = useState('home');
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [achievement, setAchievement] = useState(null);
  const [celebrate, setCelebrate] = useState(0);
  const [settings, setSettings] = useState(null);
  const [onboarded, setOnboarded] = useState(null);

  useEffect(() => { setInitData(initData); }, [initData]);

  const loadSettings = async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
      setOnboarded(s.onboarded);
    } catch {}
  };

  const loadHabits = async () => {
    try {
      setError('');
      const data = await api.getHabits();
      setHabits(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => {
    if (initData) { loadHabits(); loadSettings(); }
  }, [initData]);

  const persistTheme = async (theme) => {
    try { await api.updateSettings({ theme }); } catch {}
  };

  const handleLog = async (habitId, payload) => {
    hapticFeedback('light');
    // Звук отметки (или success при выполнении цели)
    if (payload.status === 'done') {
      const habit = habits.find((h) => h.id === habitId);
      const isMeasurableDone = habit?.goal_type === 'measurable' && payload.value >= habit?.goal_target;
      playSound(isMeasurableDone || habit?.goal_type === 'boolean' ? 'tick' : 'pop');
    } else {
      playSound('toggle'); // skip
    }
    const prevHabits = habits;
    setHabits((prev) => prev.map((h) => {
      if (h.id !== habitId) return h;
      const logs = (h.logs || []).filter((l) => l.date !== payload.date);
      return { ...h, logs: [...logs, { date: payload.date, status: payload.status, value: payload.value }] };
    }));
    try {
      const res = await api.logHabit(habitId, payload);
      if (res.newAchievements?.length > 0) {
        setAchievement(res.newAchievements[0]);
        hapticFeedback('heavy');
        playSound('success'); // фанфары достижения
      }
      if (typeof res.streak === 'number') {
        setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, streak: res.streak, best_streak: res.best_streak || h.best_streak } : h)));
      }
      // Конфетти при 100% дня
      if (res.ok && payload.status === 'done') {
        const doneCount = habits.filter((h) => (h.logs || []).some((l) => l.date === payload.date && l.status === 'done') || h.id === habitId).length;
        const total = habits.length;
        const wasAllDone = prevHabits.filter((h) => (h.logs || []).some((l) => l.date === payload.date && l.status === 'done')).length === total;
        if (doneCount === total && !wasAllDone && total > 0) {
          setCelebrate((c) => c + 1);
          hapticFeedback('heavy');
          playSound('success'); // победный аккорд при 100% дня
        }
      }
    } catch (e) {
      setError(e.message);
      playSound('error');
      loadHabits();
    }
  };

  const handleUnlog = async (habitId, date) => {
    hapticFeedback('light');
    playSound('toggle');
    setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, logs: (h.logs || []).filter((l) => l.date !== date) } : h)));
    try { await api.unlogHabit(habitId, date); }
    catch (e) { setError(e.message); playSound('error'); loadHabits(); }
  };

  // Звук при смене страницы
  const navigate = (page) => {
    if (page !== 'home' || habits.length > 0) playSound('whoosh');
    setPage(page);
  };

  const openCreate = () => { setEditingHabit(null); setModalOpen(true); playSound('pop'); };
  const openEdit = (habit) => { setEditingHabit(habit); setModalOpen(true); playSound('click'); };

  const handleSubmitHabit = async (data) => {
    try {
      if (editingHabit) {
        const updated = await api.updateHabit(editingHabit.id, data);
        setHabits((prev) => prev.map((h) => (h.id === editingHabit.id ? { ...h, ...updated } : h)));
      } else {
        const created = await api.createHabit(data);
        setHabits((prev) => [...prev, { ...created, logs: [], notes: {}, streak: 0 }]);
      }
      hapticFeedback('medium');
      setModalOpen(false); setEditingHabit(null);
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
  const activeSkin = settings?.active_theme || 'default';

  return (
    <ThemeProvider telegramTheme={tgTheme} activeSkin={activeSkin} onPersist={persistTheme}>
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">
            {page === 'home' && '🧠 MentalOS'}
            {page === 'stats' && '📊 Статистика'}
            {page === 'challenges' && '🎯 Челленджи'}
            {page === 'mood' && '😊 Настроение'}
            {page === 'rewards' && '🎁 Награды'}
            {page === 'more' && '☰ Ещё'}
            {page === 'settings' && '⚙️ Настройки'}
            {page === 'journal' && '📖 Дневник'}
            {page === 'achievements' && '🏆 Достижения'}
          </h1>
          {settings?.level > 0 && (
            <div className="level-badge">Lv {settings.level}</div>
          )}
        </header>

        {error && <div className="error-toast">{error}</div>}

        <main className="app-content">
          {page === 'home' && (
            <HomePage
              habits={habits}
              loading={loading}
              onLog={handleLog}
              onUnlog={handleUnlog}
              onDelete={handleDelete}
              onEdit={openEdit}
              onAdd={openCreate}
              userName={userName}
            />
          )}
          {page === 'stats' && <StatsPage habits={habits} userName={userName} tg={tg} />}
          {page === 'challenges' && <ChallengesPage />}
          {page === 'mood' && <MoodPage />}
          {page === 'rewards' && <ReferralPage tg={tg} onChange={loadSettings} />}
          {page === 'more' && <MorePage onNavigate={navigate} />}
          {page === 'settings' && <SettingsPage timezone={timezone} settings={settings} onChange={loadSettings} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(!soundEnabled)} />}
          {page === 'journal' && <JournalPage />}
          {page === 'achievements' && <AchievementsPage />}
        </main>

        {page === 'home' && <button className="fab" onClick={openCreate} aria-label="Добавить">+</button>}

        <BottomNav current={page} onChange={navigate} />

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

        {onboarded === false && <Onboarding onDone={() => setOnboarded(true)} />}

        {!inTelegram && <div className="dev-banner">🛠 Режим разработки. Открой внутри Telegram.</div>}
      </div>
    </ThemeProvider>
  );
}
