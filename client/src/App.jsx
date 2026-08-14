import { useEffect, useRef, useState, useCallback } from 'react';
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
import LeaderboardPage from './pages/Leaderboard.jsx';
import ArchivePage from './pages/Archive.jsx';
import BuddiesPage from './pages/Buddies.jsx';
import MissionsPage from './pages/Missions.jsx';
import DuelsPage from './pages/Duels.jsx';
import RecapPage from './pages/Recap.jsx';
import HabitTreePage from './pages/HabitTree.jsx';
import CompanionShopPage from './pages/CompanionShop.jsx';
import DailyBrief from './pages/DailyBrief.jsx';
import AddHabitModal from './components/AddHabitModal.jsx';
import AchievementToast from './components/AchievementToast.jsx';
import LevelUpToast from './components/LevelUpToast.jsx';
import SurpriseToast from './components/SurpriseToast.jsx';
import Celebration from './components/Celebration.jsx';
import Onboarding from './components/Onboarding.jsx';

export default function App() {
  const { initData, inTelegram, tgTheme, hapticFeedback, tg, showBackButton, hideBackButton, cloudGet, cloudSet } = useTelegram();
  const timezone = useTimezone(initData);
  const [settings, setSettings] = useState(null);
  const [onboarded, setOnboarded] = useState(null);
  const { play: playSound, enabled: soundEnabled, setEnabled: setSoundEnabled } = useSound(settings?.active_theme || 'default');
  const [page, setPage] = useState('home');
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [celebrate, setCelebrate] = useState(0);
  // Очередь тостов: показываем по одному, чтобы не наслаивались.
  // РАУНД-2 ФИКС: useRef вместо stale activeToast — двойной вызов за один tick больше не теряет тосты
  const toastQueue = useRef([]);
  const showingToast = useRef(false);
  const [activeToast, setActiveToast] = useState(null); // {type, data}

  const processQueue = useCallback(() => {
    if (showingToast.current) return;
    const next = toastQueue.current.shift();
    if (next) {
      showingToast.current = true;
      setActiveToast(next);
    }
  }, []);

  const enqueueToast = useCallback((type, data) => {
    toastQueue.current.push({ type, data });
    processQueue();
  }, [processQueue]);

  const dequeueToast = useCallback(() => {
    showingToast.current = false;
    setActiveToast(null);
    // Показываем следующий в очереди (в следующем tick, чтобы успел скрыться текущий)
    setTimeout(() => processQueue(), 50);
  }, [processQueue]);
  const [showBrief, setShowBrief] = useState(false);
  const [buddiesList, setBuddiesList] = useState([]);

  const loadBuddies = () => api.getBuddies().then(setBuddiesList).catch(() => {});
  useEffect(() => { if (initData) loadBuddies(); }, [initData]);

  // Daily Brief показывается 1 раз в день (проверяем по дате в localStorage)
  useEffect(() => {
    if (!initData || habits.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const lastBrief = localStorage.getItem('mentalos-brief-date');
    if (lastBrief !== today) {
      setShowBrief(true);
      localStorage.setItem('mentalos-brief-date', today);
    }
  }, [initData, habits.length]);

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
        enqueueToast('achievement', res.newAchievements[0]);
        hapticFeedback('heavy');
        playSound('success');
      }
      if (res.leveledUp) {
        enqueueToast('levelup', res.leveledUp);
        hapticFeedback('heavy');
        playSound('levelup');
        loadSettings();
      }
      if (res.surprise) {
        enqueueToast('surprise', res.surprise);
        hapticFeedback('heavy');
        playSound('success');
        if (res.surprise.type === 'streak_shield') loadHabits();
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

  // BackButton: показываем на вложенных экранах (Telegram нативная навигация)
  const rootPages = ['home', 'more'];
  useEffect(() => {
    if (!inTelegram) return;
    if (rootPages.includes(page)) {
      hideBackButton();
    } else {
      showBackButton(() => navigate('home'));
    }
    return () => { hideBackButton(); };
  }, [page, inTelegram]);

  // CloudStorage: кэшируем привычки для мгновенной загрузки (офлайн-буфер)
  useEffect(() => {
    if (habits.length > 0) {
      cloudSet('mentalos_habits_cache', JSON.stringify({ d: new Date().toISOString().slice(0, 10), h: habits.slice(0, 20).map((h) => ({ id: h.id, t: h.title, e: h.emoji })) }));
    }
  }, [habits]);

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
            {page === 'leaderboard' && '👑 Топ'}
            {page === 'archive' && '🗄️ Архив'}
            {page === 'buddies' && '🤝 Бадди'}
            {page === 'missions' && '🎯 Миссии'}
            {page === 'duels' && '⚔️ Битвы'}
            {page === 'recap' && '📊 Отчёт'}
            {page === 'tree' && '🌳 Дерево'}
            {page === 'companion-shop' && '🎭 Компаньон'}
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
          {page === 'leaderboard' && <LeaderboardPage settings={settings} onChange={loadSettings} />}
          {page === 'archive' && <ArchivePage />}
          {page === 'buddies' && <BuddiesPage />}
          {page === 'missions' && <MissionsPage />}
          {page === 'duels' && <DuelsPage buddies={buddiesList} />}
          {page === 'recap' && <RecapPage />}
          {page === 'tree' && <HabitTreePage habits={habits} />}
          {page === 'companion-shop' && <CompanionShopPage />}
        </main>

        {page === 'home' && <button className="fab" onClick={openCreate} aria-label="Добавить">+</button>}

        <BottomNav current={page} onChange={navigate} />

        {modalOpen && (
          <AddHabitModal
            onClose={() => { setModalOpen(false); setEditingHabit(null); }}
            onSubmit={handleSubmitHabit}
            habit={editingHabit}
            allHabits={habits}
            timezone={timezone}
          />
        )}

        {/* Единая очередь тостов — показываем по одному */}
        {activeToast?.type === 'achievement' && (
          <AchievementToast achievement={activeToast.data} onDone={dequeueToast} />
        )}
        {activeToast?.type === 'levelup' && (
          <LevelUpToast levelUp={activeToast.data} onDone={dequeueToast} />
        )}
        {activeToast?.type === 'surprise' && (
          <SurpriseToast surprise={activeToast.data} onDone={dequeueToast} />
        )}

        {showBrief && (
          <DailyBrief habits={habits} userName={userName} onClose={() => setShowBrief(false)} />
        )}
        <Celebration trigger={celebrate} />

        {onboarded === false && <Onboarding onDone={() => setOnboarded(true)} />}

        {!inTelegram && <div className="dev-banner">🛠 Режим разработки. Открой внутри Telegram.</div>}
      </div>
    </ThemeProvider>
  );
}
