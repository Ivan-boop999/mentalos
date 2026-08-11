import { useEffect, useState } from 'react';
import { api } from '../api/client';

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

/**
 * Календарь-месяц привычки (как GitHub contribution grid).
 */
export default function HabitCalendar({ habitId, months = 3 }) {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getCalendar(habitId, months)
      .then((d) => {
        if (cancelled) return;
        // бэкенд возвращает { logs: [{date, status, value}] }
        const logs = d.logs || [];
        const doneDates = logs.filter((l) => l.status === 'done').map((l) => l.date);
        setDates(doneDates);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [habitId, months]);

  if (loading) return null;

  const doneSet = new Set(dates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  // Строим сетку последних N недель
  const totalDays = months * 30;
  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1));
  // Выровнять по началу недели (понедельник)
  const startDow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - startDow);

  const cells = [];
  const cur = new Date(start);
  while (cur <= today) {
    const iso = cur.toISOString().slice(0, 10);
    cells.push({
      iso,
      day: cur.getDate(),
      done: doneSet.has(iso),
      isToday: iso === todayIso,
      isFuture: cur > today,
    });
    cur.setDate(cur.getDate() + 1);
  }

  return (
    <div className="calendar-card">
      <h3 className="card-title">📅 История за {MONTHS[today.getMonth()]}</h3>
      <div className="calendar-grid">
        {cells.map((c) => (
          <div
            key={c.iso}
            className={`cal-cell ${c.done ? 'done' : ''} ${c.isFuture ? 'future' : ''} ${c.isToday ? 'today' : ''}`}
          >
            {c.day}
          </div>
        ))}
      </div>
      <div className="cal-legend">
        <span>Меньше</span>
        <span className="cal-legend-dot" style={{ background: 'var(--day-dot-empty)' }} />
        <span className="cal-legend-dot" style={{ background: 'var(--accent-soft)' }} />
        <span className="cal-legend-dot" style={{ background: 'var(--accent)', opacity: 0.7 }} />
        <span className="cal-legend-dot" style={{ background: 'var(--accent)' }} />
        <span>Больше</span>
      </div>
    </div>
  );
}
