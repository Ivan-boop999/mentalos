import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { getQuoteOfTheDay } from '../utils/quotes.js';
import { Flame, Target, ArrowRight } from 'lucide-react';

const MOODS = ['😢', '😞', '😐', '🙂', '😄'];

/**
 * Daily Brief — стартовый экран дня (как Morning Brief в Calm/Apple Health).
 * Снижает cognitive load: показывает ТОП-3 приоритета, быстрый mood, цитату.
 */
export default function DailyBrief({ habits, userName, onClose }) {
  const [mood, setMood] = useState(null);
  const quote = getQuoteOfTheDay();
  const todayIso = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    api.getMoods(1).then((m) => {
      const t = m.find((x) => x.date === todayIso);
      if (t) setMood(t.mood);
    }).catch(() => {});
  }, []);

  const setMoodNow = async (m) => {
    setMood(m);
    try { await api.setMood(m, ''); } catch {}
  };

  // Топ-3 невыполненные привычки с reminder или просто первые
  const top3 = habits
    .filter((h) => !(h.logs || []).some((l) => l.date === todayIso && l.status === 'done'))
    .slice(0, 3);

  const doneCount = habits.filter((h) => (h.logs || []).some((l) => l.date === todayIso && l.status === 'done')).length;
  const hour = new Date().getHours();
  const greet = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <div className="daily-brief-overlay" onClick={onClose}>
      <div className="daily-brief" onClick={(e) => e.stopPropagation()}>
        <div className="brief-emoji">{hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌆'}</div>
        <h2 className="brief-title">{greet}{userName ? `, ${userName}` : ''}!</h2>

        {habits.length > 0 && (
          <div className="brief-stat">
            <Flame size={16} /> Сегодня выполнено <strong>{doneCount}</strong> из <strong>{habits.length}</strong>
          </div>
        )}

        {/* Настроение дня */}
        <div className="brief-mood">
          <p className="brief-label">Как ты сегодня?</p>
          <div className="brief-mood-row">
            {MOODS.map((m, i) => (
              <button key={i} className={`brief-mood-btn ${mood === (i + 1) ? 'active' : ''}`} onClick={() => setMoodNow(i + 1)}>{m}</button>
            ))}
          </div>
        </div>

        {/* Топ-3 приоритета */}
        {top3.length > 0 && (
          <div className="brief-priorities">
            <p className="brief-label"><Target size={14} /> В фокусе сегодня</p>
            {top3.map((h) => (
              <div key={h.id} className="brief-priority">
                <span className="brief-prio-emoji">{h.emoji}</span>
                <span className="brief-prio-title">{h.title}</span>
                {h.cue && <span className="muted small">после: {h.cue}</span>}
                {h.identity && <span className="brief-identity">→ {h.identity}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Цитата дня */}
        <div className="brief-quote">
          <p>{quote.text}</p>
          <span>— {quote.author}</span>
        </div>

        <button className="primary-btn" onClick={onClose}>
          К привычкам <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
