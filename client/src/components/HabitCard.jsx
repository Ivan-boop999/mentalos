import { useState } from 'react';
import { Flame, Check, Trash2, Pencil, ChevronDown } from 'lucide-react';
import HabitCalendar from './Calendar.jsx';

const WEEKDAY_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export default function HabitCard({ habit, onToggle, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);
  const doneToday = habit.logs.includes(todayIso);

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    week.push({ iso, label: WEEKDAY_RU[d.getDay()], done: habit.logs.includes(iso), isToday: iso === todayIso });
  }
  const isExpected = (date) => !habit.frequency?.days || habit.frequency.days.includes(date.getDay());

  return (
    <div className={`habit-card ${doneToday ? 'all-done' : ''}`} style={{ '--accent': habit.color }}>
      <button
        className={`check ${doneToday ? 'checked' : ''}`}
        onClick={() => onToggle(habit.id, todayIso)}
        aria-label="toggle"
      >
        {doneToday && <Check size={22} strokeWidth={3} />}
      </button>

      <div className="habit-body">
        <div className="habit-top">
          <span className="habit-emoji">{habit.emoji}</span>
          <span className="habit-title">{habit.title}</span>
          {habit.category && <span className="chip cat-chip">{habit.category.emoji} {habit.category.name}</span>}
          {habit.reminder_time && <span className="chip reminder-chip">⏰ {String(habit.reminder_time).slice(0, 5)}</span>}
          {habit.streak > 0 && <span className="chip streak-badge"><Flame size={13} /> {habit.streak}</span>}
        </div>

        <div className="week-strip">
          {week.map((d) => {
            const expected = isExpected(new Date(d.iso));
            return (
              <div key={d.iso} className={`day ${d.done ? 'done' : ''} ${d.isToday ? 'today' : ''} ${expected ? '' : 'skipped'}`}>
                <span className="day-label">{d.label}</span>
                <span className="day-dot" />
              </div>
            );
          })}
        </div>

        {expanded && <HabitCalendar habitId={habit.id} />}

        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <button onClick={() => setExpanded((v) => !v)} className="chip cat-chip" style={{ background: 'transparent', border: '1px solid var(--border)' }}>
            {expanded ? 'Скрыть' : 'Календарь'} <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : '' }} />
          </button>
          {habit.best_streak > 0 && <span className="muted small">🏆 Рекорд: {habit.best_streak}</span>}
        </div>
      </div>

      <div className="habit-actions">
        <button className="icon-action" onClick={() => onEdit(habit)} aria-label="edit"><Pencil size={16} /></button>
        <button className="icon-action danger" onClick={() => onDelete(habit.id)} aria-label="delete"><Trash2 size={16} /></button>
      </div>
    </div>
  );
}
