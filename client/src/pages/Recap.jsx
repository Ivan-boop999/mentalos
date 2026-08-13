import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Flame, Target, Smile } from 'lucide-react';

export default function RecapPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api.getRecap().then(setData).catch(() => {}); }, []);

  if (!data) return <div className="page"><div className="empty-state">Загрузка отчёта…</div></div>;

  const chartData = data.perDay.map((d) => ({
    name: new Date(d.date).toLocaleDateString('ru-RU', { weekday: 'short' }),
    value: d.done,
  }));

  const TrendIcon = data.trend > 0 ? TrendingUp : data.trend < 0 ? TrendingDown : Minus;
  const trendColor = data.trend > 0 ? '#10B981' : data.trend < 0 ? '#EF4444' : '#94A3B8';

  const stats = [
    { icon: Target, label: 'Отметок', value: data.totalCheckins, color: '#7C3AED' },
    { icon: Flame, label: 'Лучший стрик', value: data.bestStreak, color: '#F59E0B' },
    { icon: TrendingUp, label: 'Идеальных дней', value: data.perfectDays, color: '#10B981' },
    { icon: Smile, label: 'Среднее настроение', value: data.avgMood || '—', color: '#06B6D4' },
  ];

  return (
    <div className="page recap">
      <div className="recap-hero glass">
        <h2>📊 Отчёт за неделю</h2>
        <p>{new Date(data.weekRange.from).toLocaleDateString('ru-RU')} — {new Date(data.weekRange.to).toLocaleDateString('ru-RU')}</p>
        <div className="recap-trend" style={{ color: trendColor }}>
          <TrendIcon size={20} />
          {data.trend > 0 ? `+${data.trend} к прошлой неделе` : data.trend < 0 ? `${data.trend} к прошлой неделе` : 'Как на прошлой неделе'}
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.color + '22', color: s.color }}><s.icon size={20} /></div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="chart-card">
          <h3 className="card-title">Активность по дням</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill="url(#barGrad)" />)}
              </Bar>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--accent-2)" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="settings-hint">
        {data.totalCheckins > 0 ? '💪 Отличная неделя! Продолжай в том же духе.' : '🌱 Новая неделя — отличный шанс начать!'}
      </p>
    </div>
  );
}
