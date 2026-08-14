import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const MOODS = [
  { value: 1, emoji: '😢', label: 'Плохо', color: '#EF4444' },
  { value: 2, emoji: '😞', label: 'Так себе', color: '#F97316' },
  { value: 3, emoji: '😐', label: 'Норм', color: '#EAB308' },
  { value: 4, emoji: '🙂', label: 'Хорошо', color: '#22C55E' },
  { value: 5, emoji: '😄', label: 'Отлично', color: '#10B981' },
];

export default function MoodPage() {
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [note, setNote] = useState('');

  const load = async () => {
    try {
      const all = await api.getMoods(30);
      setHistory(all);
      const t = all.find((m) => m.date === new Date().toISOString().slice(0, 10));
      if (t) { setToday(t.mood); setNote(t.note || ''); }
    } catch {}
  };

  useEffect(() => { load(); }, []);

  // РАУНД-2 ФИКС: select использует свежую заметку через ref (не stale)
  const noteRef = useRef('');
  useEffect(() => { noteRef.current = note; }, [note]);

  const select = async (mood) => {
    setToday(mood);
    try { await api.setMood(mood, noteRef.current); load(); } catch {}
  };

  const saveNote = async () => {
    try { await api.setMood(today || 3, note); load(); } catch {}
  };

  const chartData = [...history].reverse().map((m) => ({
    date: new Date(m.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    value: m.mood,
  }));

  const avg = history.length ? (history.reduce((s, m) => s + m.mood, 0) / history.length).toFixed(1) : '—';

  return (
    <div className="page mood">
      <div className="mood-today-card">
        <h3 className="card-title">Как ты сегодня?</h3>
        <div className="mood-row">
          {MOODS.map((m) => (
            <button
              key={m.value}
              className={`mood-btn ${today === m.value ? 'active' : ''}`}
              style={{ '--mood-color': m.color }}
              onClick={() => select(m.value)}
            >
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-label">{m.label}</span>
            </button>
          ))}
        </div>
        <textarea
          className="input mood-note"
          placeholder="Заметка о дне (необязательно)…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          rows={2}
        />
      </div>

      <div className="mood-stats">
        <div className="mood-stat-card">
          <strong>{avg}</strong>
          <span>Среднее за 30 дней</span>
        </div>
        <div className="mood-stat-card">
          <strong>{history.length}</strong>
          <span>Отмечено дней</span>
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="chart-card">
          <h3 className="card-title">📈 Динамика настроения</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }} />
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={3} dot={{ fill: 'var(--accent)', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
