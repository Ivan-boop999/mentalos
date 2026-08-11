import { useState } from 'react';
import { X } from 'lucide-react';

const EMOJIS = ['✨', '💪', '📚', '🏃', '💧', '🧘', '🥗', '😴', '✍️', '🎯', '🎨', '🎸', '💊', '🦷', '☀️', '🌙'];
const COLORS = ['#7C3AED', '#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'];
const DAYS = [
  { n: 1, label: 'Пн' }, { n: 2, label: 'Вт' }, { n: 3, label: 'Ср' },
  { n: 4, label: 'Чт' }, { n: 5, label: 'Пт' }, { n: 6, label: 'Сб' }, { n: 0, label: 'Вс' },
];

export default function AddHabitModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [color, setColor] = useState('#7C3AED');
  const [freqType, setFreqType] = useState('daily'); // daily | weekly
  const [days, setDays] = useState([1, 2, 3, 4, 5]); // будни по умолчанию
  const [reminder, setReminder] = useState('');

  const toggleDay = (n) =>
    setDays((prev) => (prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n].sort()));

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      emoji,
      color,
      frequency: freqType === 'weekly' ? { type: 'weekly', days } : { type: 'daily' },
      reminderTime: reminder || null,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Новая привычка</h2>
          <button className="icon-btn" onClick={onClose}><X size={22} /></button>
        </header>

        <form onSubmit={submit} className="modal-form">
          <input
            className="input"
            placeholder="Например: Зарядка"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            maxLength={40}
          />

          <label className="field-label">Иконка</label>
          <div className="emoji-grid">
            {EMOJIS.map((e) => (
              <button
                type="button"
                key={e}
                className={`emoji-chip ${emoji === e ? 'active' : ''}`}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>

          <label className="field-label">Цвет</label>
          <div className="color-grid">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`color-chip ${color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          <label className="field-label">Частота</label>
          <div className="seg-control">
            <button
              type="button"
              className={`seg-btn ${freqType === 'daily' ? 'active' : ''}`}
              onClick={() => setFreqType('daily')}
            >
              Каждый день
            </button>
            <button
              type="button"
              className={`seg-btn ${freqType === 'weekly' ? 'active' : ''}`}
              onClick={() => setFreqType('weekly')}
            >
              По дням
            </button>
          </div>

          {freqType === 'weekly' && (
            <div className="days-grid">
              {DAYS.map(({ n, label }) => (
                <button
                  type="button"
                  key={n}
                  className={`day-chip ${days.includes(n) ? 'active' : ''}`}
                  onClick={() => toggleDay(n)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <label className="field-label">Напоминание (время UTC)</label>
          <input
            type="time"
            className="input"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
          />
          <p className="hint">Оставь пустым, если без напоминания. Время по UTC — учитывай смещение твоего часового пояса.</p>

          <button type="submit" className="primary-btn" disabled={!title.trim()}>
            Создать привычку
          </button>
        </form>
      </div>
    </div>
  );
}
