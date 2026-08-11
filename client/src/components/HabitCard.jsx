import { Flame, Check, Trash2 } from 'lucide-react';

const WEEKDAY_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/**
 * Карточка одной привычки.
 * Показывает: чекбокс, эмодзи, название, текущий streak и полосу последних 7 дней.
 */
export default function HabitCard({ habit, onToggle, onDelete }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);
  const doneToday = habit.logs.includes(todayIso);

  // Последние 7 дней для мини-полосы
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    week.push({
      iso,
      label: WEEKDAY_RU[d.getDay()],
      done: habit.logs.includes(iso),
      isToday: iso === todayIso,
    });
  }

  // Должна ли привычка выполняться в конкретный день недели
  const isExpected = (date) => {
    if (!habit.frequency?.days) return true; // daily
    return habit.frequency.days.includes(date.getDay());
  };

  return (
    <div className="habit-card" style={{ '--accent': habit.color }}>
      <button
        className={`check ${doneToday ? 'checked' : ''}`}
        onClick={() => onToggle(habit.id, todayIso)}
        aria-label={doneToday ? 'Снять отметку' : 'Отметить выполнение'}
      >
        {doneToday && <Check size={22} strokeWidth={3} />}
      </button>

      <div className="habit-body">
        <div className="habit-top">
          <span className="habit-emoji">{habit.emoji}</span>
          <span className="habit-title">{habit.title}</span>
          {habit.streak > 0 && (
            <span className="streak-badge">
              <Flame size={14} /> {habit.streak}
            </span>
          )}
        </div>

        <div className="week-strip">
          {week.map((d) => {
            const expected = isExpected(new Date(d.iso));
            return (
              <div
                key={d.iso}
                className={`day ${d.done ? 'done' : ''} ${d.isToday ? 'today' : ''} ${
                  expected ? '' : 'skipped'
                }`}
              >
                <span className="day-label">{d.label}</span>
                <span className="day-dot" />
              </div>
            );
          })}
        </div>
      </div>

      <button className="delete-btn" onClick={() => onDelete(habit.id)} aria-label="Удалить">
        <Trash2 size={18} />
      </button>
    </div>
  );
}
