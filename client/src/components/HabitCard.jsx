import { Flame, Check, Trash2, Pencil } from 'lucide-react';

const WEEKDAY_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/**
 * Карточка одной привычки.
 * Показывает: чекбокс, эмодзи, название, текущий streak, полосу 7 дней и
 * кнопки редактирования/удаления (появляются по тапу на «⋯»).
 */
export default function HabitCard({ habit, onToggle, onDelete, onEdit }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);
  const doneToday = habit.logs.includes(todayIso);

  // Последние 7 дней
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

  const isExpected = (date) =>
    !habit.frequency?.days || habit.frequency.days.includes(date.getDay());

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
          {habit.reminder_time && <span className="reminder-chip">⏰ {String(habit.reminder_time).slice(0, 5)}</span>}
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

      <div className="habit-actions">
        <button className="icon-action" onClick={() => onEdit(habit)} aria-label="Изменить">
          <Pencil size={16} />
        </button>
        <button className="icon-action danger" onClick={() => onDelete(habit.id)} aria-label="Удалить">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
