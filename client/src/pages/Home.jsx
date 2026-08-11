import { useMemo } from 'react';
import HabitCard from '../components/HabitCard.jsx';
import { Plus } from 'lucide-react';

const WEEKDAY_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTH_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export default function HomePage({ habits, loading, onToggle, onDelete, onAdd }) {
  const today = new Date();
  const dateStr = `${WEEKDAY_RU[today.getDay()]}, ${today.getDate()} ${MONTH_RU[today.getMonth()]}`;

  const todayIso = today.toISOString().slice(0, 10);
  const doneCount = useMemo(
    () => habits.filter((h) => h.logs.includes(todayIso)).length,
    [habits, todayIso],
  );
  const progress = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;

  return (
    <div className="page home">
      <div className="date-line">Сегодня · {dateStr}</div>

      {habits.length > 0 && (
        <div className="progress-block">
          <div className="progress-info">
            <span>Выполнено сегодня</span>
            <strong>{doneCount} / {habits.length}</strong>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Загрузка…</div>
      ) : habits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">🌱</div>
          <h3>Пока нет привычек</h3>
          <p>Добавь первую привычку, чтобы начать путь</p>
          <button className="primary-btn" onClick={onAdd}>
            <Plus size={18} /> Добавить привычку
          </button>
        </div>
      ) : (
        <div className="habits-list">
          {habits.map((h) => (
            <HabitCard key={h.id} habit={h} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
