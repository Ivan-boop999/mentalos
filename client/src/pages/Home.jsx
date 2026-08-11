import { useMemo, useState } from 'react';
import HabitCard from '../components/HabitCard.jsx';
import ProgressRing from '../components/ProgressRing.jsx';
import { Plus } from 'lucide-react';

const WEEKDAY_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTH_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const SORTS = [
  { key: 'default', label: 'По умолчанию' },
  { key: 'streak', label: '🔥 По серии' },
  { key: 'az', label: 'А-Я' },
  { key: 'undone', label: 'Сначала невыполненные' },
];

function greeting(h) {
  if (h < 6) return { text: 'Доброй ночи', emoji: '🌙' };
  if (h < 12) return { text: 'Доброе утро', emoji: '☀️' };
  if (h < 18) return { text: 'Добрый день', emoji: '🌤️' };
  return { text: 'Добрый вечер', emoji: '🌆' };
}

export default function HomePage({ habits, loading, onToggle, onDelete, onEdit, onAdd, userName }) {
  const [sort, setSort] = useState('default');
  const today = new Date();
  const dateStr = `${WEEKDAY_RU[today.getDay()]}, ${today.getDate()} ${MONTH_RU[today.getMonth()]}`;
  const greet = greeting(today.getHours());

  const todayIso = today.toISOString().slice(0, 10);
  const doneCount = useMemo(() => habits.filter((h) => h.logs.includes(todayIso)).length, [habits, todayIso]);
  const progress = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;
  const allDone = habits.length > 0 && doneCount === habits.length;

  const sorted = useMemo(() => {
    const arr = [...habits];
    if (sort === 'streak') arr.sort((a, b) => b.streak - a.streak);
    else if (sort === 'az') arr.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'undone') arr.sort((a, b) => Number(a.logs.includes(todayIso)) - Number(b.logs.includes(todayIso)));
    return arr;
  }, [habits, sort, todayIso]);

  return (
    <div className="page home">
      <div className="greeting-block">
        <div className="greeting-line">{greet.emoji} {dateStr}</div>
        <h1 className="greeting-title">{greet.text}{userName ? `, ${userName}` : ''}!</h1>
      </div>

      {habits.length > 0 && (
        <div className="hero-card">
          <div className="hero-row">
            <div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>Сегодня</div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {doneCount} <span style={{ opacity: 0.6 }}>/ {habits.length}</span>
              </div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>{allDone ? '🎉 Все выполнено!' : 'Продолжай в том же духе'}</div>
            </div>
            <ProgressRing progress={progress}>{progress}%</ProgressRing>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <strong>{habits.reduce((m, h) => Math.max(m, h.streak), 0)}</strong>
              <span>🔥 Лучшая серия</span>
            </div>
            <div className="hero-stat">
              <strong>{habits.reduce((m, h) => Math.max(m, h.best_streak || 0), 0)}</strong>
              <span>🏆 Рекорд</span>
            </div>
          </div>
        </div>
      )}

      {habits.length > 1 && (
        <div className="sort-bar">
          {SORTS.map((s) => (
            <button key={s.key} className={`sort-chip ${sort === s.key ? 'active' : ''}`} onClick={() => setSort(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="empty-state">Загрузка…</div>
      ) : habits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">🌱</div>
          <h3>Пока нет привычек</h3>
          <p>Добавь первую привычку, чтобы начать путь</p>
          <button className="primary-btn" onClick={onAdd}><Plus size={18} /> Добавить привычку</button>
        </div>
      ) : (
        <div className="habits-list">
          {sorted.map((h) => (
            <HabitCard key={h.id} habit={h} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
