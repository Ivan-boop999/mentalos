import { useEffect, useState } from 'react';
import { api } from '../api/client';

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

/**
 * Годовой heatmap активности как на GitHub.
 * Цвет ячейки зависит от количества выполненных привычек.
 */
export default function YearHeatmap() {
  const [days, setDays] = useState([]);

  useEffect(() => {
    api.getYearHeatmap().then((d) => setDays(d.days || [])).catch(() => {});
  }, []);

  const countMap = {};
  for (const d of days) countMap[d.date] = Number(d.cnt);

  // Строим сетку 53 недели × 7 дней
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const startDow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - startDow);

  const weeks = [];
  let cur = new Date(start);
  while (cur <= today) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const iso = cur.toISOString().slice(0, 10);
      week.push({
        iso,
        count: countMap[iso] || 0,
        future: cur > today,
        before: cur < start,
      });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const maxCount = Math.max(1, ...days.map((d) => Number(d.cnt)));
  const colorFor = (c) => {
    if (c === 0) return 'var(--day-dot-empty)';
    const ratio = c / maxCount;
    if (ratio < 0.25) return 'var(--accent-soft)';
    if (ratio < 0.5) return 'color-mix(in srgb, var(--accent) 45%, transparent)';
    if (ratio < 0.75) return 'color-mix(in srgb, var(--accent) 70%, transparent)';
    return 'var(--accent)';
  };

  const totalDone = days.reduce((s, d) => s + Number(d.cnt), 0);
  const activeDays = days.length;

  return (
    <div className="heatmap-card">
      <div className="heatmap-header">
        <h3 className="card-title">📅 За год</h3>
        <div className="heatmap-stats">
          <span><strong>{totalDone}</strong> отметок</span>
          <span><strong>{activeDays}</strong> активных дней</span>
        </div>
      </div>
      <div className="heatmap-scroll">
        <div className="heatmap-grid">
          {weeks.map((w, i) => (
            <div key={i} className="heatmap-col">
              {w.map((d, j) => (
                <div
                  key={j}
                  className={`heat-cell ${d.future ? 'future' : ''}`}
                  style={{ background: d.future ? 'transparent' : colorFor(d.count) }}
                  title={`${d.iso}: ${d.count}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="cal-legend">
        <span>Меньше</span>
        <span className="cal-legend-dot" style={{ background: 'var(--day-dot-empty)' }} />
        <span className="cal-legend-dot" style={{ background: 'var(--accent-soft)' }} />
        <span className="cal-legend-dot" style={{ background: 'color-mix(in srgb, var(--accent) 50%, transparent)' }} />
        <span className="cal-legend-dot" style={{ background: 'var(--accent)' }} />
        <span>Больше</span>
      </div>
    </div>
  );
}
