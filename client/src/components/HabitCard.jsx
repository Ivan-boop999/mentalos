import { useState } from 'react';
import { Flame, Check, Trash2, Pencil, ChevronDown, Minus, StickyNote } from 'lucide-react';
import HabitCalendar from './Calendar.jsx';

const WEEKDAY_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export default function HabitCard({ habit, onLog, onUnlog, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(habit.notes?.[new Date().toISOString().slice(0, 10)] || '');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);
  const todayLog = habit.logs?.find((l) => l.date === todayIso);
  const doneToday = todayLog?.status === 'done';
  const skippedToday = todayLog?.status === 'skip';

  const isMeasurable = habit.goal_type === 'measurable' && habit.goal_target > 1;
  const progress = isMeasurable ? Math.min(100, Math.round(((todayLog?.value || 0) / habit.goal_target) * 100)) : 0;

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const log = habit.logs?.find((l) => l.date === iso);
    week.push({
      iso, label: WEEKDAY_RU[d.getDay()],
      done: log?.status === 'done', skipped: log?.status === 'skip', isToday: iso === todayIso,
    });
  }
  const isExpected = (date) => !habit.frequency?.days || habit.frequency.days.includes(date.getDay());

  const cycle = (action) => {
    if (doneToday) onUnlog(habit.id, todayIso);
    else onLog(habit.id, { status: 'done', date: todayIso, value: isMeasurable ? habit.goal_target : null });
  };

  return (
    <div className={`habit-card ${doneToday ? 'all-done' : ''}`} style={{ '--accent': habit.color }}>
      <button className={`check ${doneToday ? 'checked' : ''} ${skippedToday ? 'skipped' : ''}`} onClick={cycle} aria-label="toggle">
        {doneToday && <Check size={22} strokeWidth={3} />}
        {skippedToday && <Minus size={18} />}
      </button>

      <div className="habit-body">
        <div className="habit-top">
          <span className="habit-emoji">{habit.emoji}</span>
          <span className="habit-title">{habit.title}</span>
          {habit.category && <span className="chip cat-chip">{habit.category.emoji}</span>}
          {habit.reminder_time && <span className="chip reminder-chip">⏰ {String(habit.reminder_time).slice(0, 5)}</span>}
          {habit.streak > 0 && <span className="chip streak-badge"><Flame size={13} /> {habit.streak}</span>}
        </div>

        {isMeasurable && (
          <div className="measurable-block">
            <div className="measurable-info">
              <span>{todayLog?.value || 0} / {habit.goal_target} {habit.goal_unit}</span>
              <div className="measurable-controls">
                <button className="meas-btn" onClick={() => onLog(habit.id, { status: 'done', date: todayIso, value: Math.max(0, (todayLog?.value || 0) - 1) })}>−</button>
                <button className="meas-btn" onClick={() => onLog(habit.id, { status: 'done', date: todayIso, value: (todayLog?.value || 0) + 1 })}>+</button>
              </div>
            </div>
            <div className="measurable-bar">
              <div className="measurable-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="week-strip">
          {week.map((d) => {
            const expected = isExpected(new Date(d.iso));
            return (
              <div key={d.iso} className={`day ${d.done ? 'done' : ''} ${d.skipped ? 'skipped' : ''} ${d.isToday ? 'today' : ''} ${expected ? '' : 'skipped'}`}>
                <span className="day-label">{d.label}</span>
                <span className="day-dot" />
              </div>
            );
          })}
        </div>

        {expanded && <HabitCalendar habitId={habit.id} />}

        <div className="habit-bottom-bar">
          <button onClick={() => setExpanded((v) => !v)} className="chip cat-chip ghost-chip">
            {expanded ? 'Скрыть' : '📅 Календарь'} <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : '' }} />
          </button>
          <button onClick={() => setNoteOpen((v) => !v)} className="chip cat-chip ghost-chip">
            <StickyNote size={12} /> {noteText ? 'Заметка ✓' : 'Заметка'}
          </button>
          {!skippedToday && !doneToday && (
            <button onClick={() => onLog(habit.id, { status: 'skip', date: todayIso })} className="chip cat-chip ghost-chip">
              <Minus size={12} /> Пропустить
            </button>
          )}
          {habit.best_streak > 0 && <span className="muted small">🏆 {habit.best_streak}</span>}
        </div>

        {noteOpen && (
          <textarea
            className="input habit-note-input"
            placeholder="Заметка на сегодня…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={() => {
              onLog(habit.id, { status: doneToday ? 'done' : 'skip', date: todayIso, note: noteText });
              setNoteOpen(false);
            }}
            rows={2}
            autoFocus
          />
        )}
      </div>

      <div className="habit-actions">
        <button className="icon-action" onClick={() => onEdit(habit)} aria-label="edit"><Pencil size={16} /></button>
        <button className="icon-action danger" onClick={() => onDelete(habit.id)} aria-label="delete"><Trash2 size={16} /></button>
      </div>
    </div>
  );
}
