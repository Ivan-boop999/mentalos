import { useEffect, useState } from 'react';
import { Flame, Trash2, Pencil, ChevronDown, StickyNote, ListChecks, Plus, Gauge, X, Check, Minus } from 'lucide-react';
import HabitCalendar from './Calendar.jsx';
import { api } from '../api/client';

const WEEKDAY_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/**
 * Карточка привычки (v2): 3 явных состояния внизу.
 *   ✅ Готово   — стрик растёт, засчитывается
 *   ⏭️ Пропуск  — нейтрально, не прерывает и не растит стрик
 *   ❌ Снять     — вернуть в нейтральное (или отметить как «не выполнено»)
 *
 * Активное состояние подсвечивается. Невозможно не понять, как отметить.
 */
export default function HabitCard({ habit, onLog, onUnlog, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [noteText, setNoteText] = useState(habit.notes?.[new Date().toISOString().slice(0, 10)] || '');
  const [subtasks, setSubtasks] = useState([]);
  const [newSub, setNewSub] = useState('');
  const [strength, setStrength] = useState(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);
  const todayLog = habit.logs?.find((l) => l.date === todayIso);
  const status = todayLog?.status || null; // 'done' | 'skip' | null

  const isMeasurable = habit.goal_type === 'measurable' && habit.goal_target > 1;
  const progress = isMeasurable ? Math.min(100, Math.round(((todayLog?.value || 0) / habit.goal_target) * 100)) : 0;

  const loadExtras = async () => {
    try {
      const subs = await api.getSubtasks(habit.id);
      setSubtasks(subs);
    } catch {}
  };

  useEffect(() => { loadExtras(); }, [habit.id]);
  useEffect(() => { if (expanded && !strength) api.getStrength(habit.id).then(setStrength).catch(() => {}); }, [expanded]);

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const log = habit.logs?.find((l) => l.date === iso);
    week.push({ iso, label: WEEKDAY_RU[d.getDay()], done: log?.status === 'done', skipped: log?.status === 'skip', isToday: iso === todayIso });
  }
  const isExpected = (date) => !habit.frequency?.days || habit.frequency.days.includes(date.getDay());

  // 3 явных действия
  const setDone = () => {
    if (status === 'done') return onUnlog(habit.id, todayIso);
    onLog(habit.id, { status: 'done', date: todayIso, value: isMeasurable ? habit.goal_target : null });
  };
  const setSkip = () => {
    if (status === 'skip') return onUnlog(habit.id, todayIso);
    onLog(habit.id, { status: 'skip', date: todayIso });
  };
  const setNone = () => { if (status !== null) onUnlog(habit.id, todayIso); };

  const addSub = async (e) => {
    e.preventDefault();
    if (!newSub.trim()) return;
    const s = await api.addSubtask(habit.id, newSub.trim());
    setSubtasks((p) => [...p, s]);
    setNewSub('');
  };
  const toggleSub = async (s) => {
    await api.updateSubtask(habit.id, s.id, { done: !s.done });
    setSubtasks((p) => p.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)));
  };
  const removeSub = async (s) => {
    await api.deleteSubtask(habit.id, s.id);
    setSubtasks((p) => p.filter((x) => x.id !== s.id));
  };

  return (
    <div className={`habit-card-v2 status-${status || 'none'} ${status === 'done' ? 'all-done' : ''}`} style={{ '--accent': habit.color }}>
      {/* Шапка: эмодзи + название + стрик */}
      <div className="hv2-head">
        <div className="hv2-title-row">
          <span className="habit-emoji">{habit.emoji}</span>
          <span className="habit-title">{habit.title}</span>
          {habit.streak > 0 && <span className="chip streak-badge"><Flame size={13} /> {habit.streak}</span>}
          <div className="hv2-actions">
            <button className="icon-action" onClick={() => onEdit(habit)} aria-label="edit"><Pencil size={15} /></button>
            <button className="icon-action danger" onClick={() => onDelete(habit.id)} aria-label="delete"><Trash2 size={15} /></button>
          </div>
        </div>
        <div className="hv2-meta">
          {habit.category && <span className="chip cat-chip">{habit.category.emoji} {habit.category.name}</span>}
          {habit.reminder_time && <span className="chip reminder-chip">⏰ {String(habit.reminder_time).slice(0, 5)}</span>}
          {habit.best_streak > 0 && <span className="muted small">🏆 {habit.best_streak}</span>}
        </div>
      </div>

      {/* Measurable прогресс */}
      {isMeasurable && (
        <div className="measurable-block">
          <div className="measurable-info">
            <span>{todayLog?.value || 0} / {habit.goal_target} {habit.goal_unit}</span>
            <div className="measurable-controls">
              <button className="meas-btn" onClick={() => onLog(habit.id, { status: 'done', date: todayIso, value: Math.max(0, (todayLog?.value || 0) - 1) })}>−</button>
              <button className="meas-btn" onClick={() => onLog(habit.id, { status: 'done', date: todayIso, value: (todayLog?.value || 0) + 1 })}>+</button>
            </div>
          </div>
          <div className="measurable-bar"><div className="measurable-fill" style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      {/* Неделя */}
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

      {/* 3 БОЛЬШИЕ КНОПКИ СОСТОЯНИЙ — главное изменение */}
      <div className="hv2-status-row">
        <button className={`hv2-status-btn none-btn ${status === null ? 'active' : ''}`} onClick={setNone}>
          <X size={18} strokeWidth={3} />
          <span>Не выполнено</span>
        </button>
        <button className={`hv2-status-btn skip-btn ${status === 'skip' ? 'active' : ''}`} onClick={setSkip}>
          <Minus size={18} strokeWidth={3} />
          <span>Пропустить</span>
        </button>
        <button className={`hv2-status-btn done-btn ${status === 'done' ? 'active' : ''}`} onClick={setDone}>
          <Check size={20} strokeWidth={3} />
          <span>Готово</span>
        </button>
      </div>

      {/* Доп опции (свернуты) */}
      <div className="hv2-extras-row">
        <button onClick={() => setExpanded((v) => !v)} className="chip cat-chip ghost-chip">
          {expanded ? 'Скрыть' : 'Детали'} <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : '' }} />
        </button>
        <button onClick={() => setSubOpen((v) => !v)} className="chip cat-chip ghost-chip">
          <ListChecks size={12} /> {subtasks.length || ''}
        </button>
        <button onClick={() => setNoteOpen((v) => !v)} className="chip cat-chip ghost-chip">
          <StickyNote size={12} /> {noteText ? '✓' : ''}
        </button>
      </div>

      {expanded && strength && (
        <div className="strength-block">
          <div className="strength-header"><Gauge size={14} /> Сила привычки</div>
          <div className="strength-bar"><div className="strength-fill" style={{ width: `${strength.score}%` }} /></div>
          <span className="muted small">{strength.score}% · {strength.doneDays}/{strength.totalDays} дней</span>
        </div>
      )}

      {expanded && <HabitCalendar habitId={habit.id} />}

      {subOpen && (
        <div className="subtasks-block">
          {subtasks.length > 0 && (
            <div className="subtask-list">
              {subtasks.map((s) => (
                <div key={s.id} className="subtask-row">
                  <button className={`subtask-check ${s.done ? 'done' : ''}`} onClick={() => toggleSub(s)}>
                    {s.done && <Check size={12} strokeWidth={3} />}
                  </button>
                  <span className={`subtask-title ${s.done ? 'done' : ''}`}>{s.title}</span>
                  <button className="icon-action danger" onClick={() => removeSub(s)}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
          <form className="subtask-add" onSubmit={addSub}>
            <input className="subtask-input" placeholder="Новая подзадача…" value={newSub} onChange={(e) => setNewSub(e.target.value)} />
            <button type="submit" className="subtask-add-btn"><Plus size={14} /></button>
          </form>
        </div>
      )}

      {noteOpen && (
        <textarea
          className="input habit-note-input"
          placeholder="Заметка на сегодня…"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
            onBlur={() => {
              // P1 FIX: не создаём skip-лог при сохранении заметки, если отметки нет
              if (status === 'done' || status === 'skip') {
                onLog(habit.id, { status, date: todayIso, note: noteText });
              }
              setNoteOpen(false);
            }}
          rows={2}
          autoFocus
        />
      )}
    </div>
  );
}
