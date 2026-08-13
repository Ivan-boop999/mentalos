import { useMemo, useState } from 'react';
import HabitCard from '../components/HabitCard.jsx';
import ProgressRing from '../components/ProgressRing.jsx';
import YearHeatmap from '../components/YearHeatmap.jsx';
import Companion from '../components/Companion.jsx';
import { getQuoteOfTheDay } from '../utils/quotes.js';
import { Plus, Search } from 'lucide-react';

const WEEKDAY_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTH_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const SORTS = [
  { key: 'default', label: 'По умолчанию' },
  { key: 'streak', label: '🔥 По серии' },
  { key: 'az', label: 'А-Я' },
  { key: 'undone', label: 'Сначала невып.' },
];

function greeting(h) {
  if (h < 6) return { text: 'Доброй ночи', emoji: '🌙' };
  if (h < 12) return { text: 'Доброе утро', emoji: '☀️' };
  if (h < 18) return { text: 'Добрый день', emoji: '🌤️' };
  return { text: 'Добрый вечер', emoji: '🌆' };
}

export default function HomePage({ habits, loading, onLog, onUnlog, onDelete, onEdit, onAdd, userName }) {
  const [sort, setSort] = useState('default');
  const [query, setQuery] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const today = new Date();
  const dateStr = `${WEEKDAY_RU[today.getDay()]}, ${today.getDate()} ${MONTH_RU[today.getMonth()]}`;
  const greet = greeting(today.getHours());

  const todayIso = today.toISOString().slice(0, 10);
  const doneCount = useMemo(() => habits.filter((h) => (h.logs || []).some((l) => l.date === todayIso && l.status === 'done')).length, [habits, todayIso]);
  const progress = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;
  const allDone = habits.length > 0 && doneCount === habits.length;
  const quote = useMemo(() => getQuoteOfTheDay(), []);

  const sorted = useMemo(() => {
    let arr = habits;
    if (query.trim()) arr = arr.filter((h) => h.title.toLowerCase().includes(query.toLowerCase()));
    arr = [...arr];
    if (sort === 'streak') arr.sort((a, b) => b.streak - a.streak);
    else if (sort === 'az') arr.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'undone') arr.sort((a, b) => Number((a.logs || []).some((l) => l.date === todayIso && l.status === 'done')) - Number((b.logs || []).some((l) => l.date === todayIso && l.status === 'done')));
    return arr;
  }, [habits, sort, query, todayIso]);

  // Smart Grouping по времени дня (снижение cognitive load)
  const useGrouping = sort === 'default' && !query.trim();
  const groups = useGrouping ? {
    morning: { label: '🌅 Утро', items: sorted.filter((h) => h.time_of_day === 'morning') },
    afternoon: { label: '☀️ День', items: sorted.filter((h) => h.time_of_day === 'afternoon') },
    evening: { label: '🌙 Вечер', items: sorted.filter((h) => h.time_of_day === 'evening') },
    any: { label: '📋 В любое время', items: sorted.filter((h) => !h.time_of_day || h.time_of_day === 'any') },
  } : null;
  const hasGroups = groups && Object.values(groups).some((g) => g.items.length > 0);

  // Fresh Start Effect (Milkman): особый баннер в понедельник / 1-е число
  const showFreshStart = today.getDate() === 1 || today.getDay() === 1;

  return (
    <div className="page home">
      {showFreshStart && (
        <div className="fresh-start-banner">
          <span className="fs-emoji">✨</span>
          <div>
            <strong>{today.getDate() === 1 ? 'Новый месяц — новый старт!' : 'Новая неделя — чистый лист!'}</strong>
            <span>Идеальный момент, чтобы пересмотреть привычки</span>
          </div>
        </div>
      )}

      <div className="greeting-block">
        <div className="greeting-line">{greet.emoji} {dateStr}</div>
        <h1 className="greeting-title">{greet.text}{userName ? `, ${userName}` : ''}!</h1>
      </div>

      {habits.length > 0 && <Companion />}

      {habits.length > 0 && (
        <div className="hero-card">
          <div className="hero-row">
            <div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>Сегодня</div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{doneCount} <span style={{ opacity: 0.6 }}>/ {habits.length}</span></div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>{allDone ? '🎉 Все выполнено!' : 'Продолжай в том же духе'}</div>
            </div>
            <ProgressRing progress={progress}>{progress}%</ProgressRing>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><strong>{habits.reduce((m, h) => Math.max(m, h.streak), 0)}</strong><span>🔥 Серия</span></div>
            <div className="hero-stat"><strong>{habits.reduce((m, h) => Math.max(m, h.best_streak || 0), 0)}</strong><span>🏆 Рекорд</span></div>
          </div>
        </div>
      )}

      <div className="quote-card glass">
        <div className="quote-mark">“</div>
        <p className="quote-text">{quote.text}</p>
        <span className="quote-author">— {quote.author}</span>
      </div>

      {habits.length > 0 && (
        <div className="search-row">
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Поиск привычки…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {habits.length > 1 && (
        <div className="sort-bar">
          {SORTS.map((s) => <button key={s.key} className={`sort-chip ${sort === s.key ? 'active' : ''}`} onClick={() => setSort(s.key)}>{s.label}</button>)}
          <button className={`sort-chip ${showHeatmap ? 'active' : ''}`} onClick={() => setShowHeatmap((v) => !v)}>📅 За год</button>
        </div>
      )}

      {showHeatmap && <YearHeatmap />}

      {loading ? (
        <div className="empty-state">Загрузка…</div>
      ) : habits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">🌱</div>
          <h3>Пока нет привычек</h3>
          <p>Добавь первую привычку или начни челлендж во вкладке «Челленджи» 🎯</p>
          <button className="primary-btn" onClick={onAdd}><Plus size={18} /> Добавить привычку</button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="empty-state"><p>Ничего не найдено по запросу «{query}»</p></div>
      ) : hasGroups ? (
        <div className="habits-grouped">
          {Object.values(groups).filter((g) => g.items.length > 0).map((g) => (
            <div key={g.label} className="habit-group">
              <h3 className="group-label">{g.label} <span className="muted small">{g.items.filter((h) => (h.logs || []).some((l) => l.date === todayIso && l.status === 'done')).length}/{g.items.length}</span></h3>
              <div className="habits-list">
                {g.items.map((h) => <HabitCard key={h.id} habit={h} onLog={onLog} onUnlog={onUnlog} onDelete={onDelete} onEdit={onEdit} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="habits-list">
          {sorted.map((h) => <HabitCard key={h.id} habit={h} onLog={onLog} onUnlog={onUnlog} onDelete={onDelete} onEdit={onEdit} />)}
        </div>
      )}
    </div>
  );
}
