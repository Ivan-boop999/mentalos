import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '../api/client';
import { Flame, CheckCircle2, TrendingUp, Trophy } from 'lucide-react';
import ShareButton from '../components/ShareButton.jsx';

export default function StatsPage({ habits = [], userName = '', tg }) {
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.getStats(days);
        if (!cancelled) setStats(data);
      } catch {
        /* noop */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (loading) return <div className="page"><div className="empty-state">Загрузка статистики…</div></div>;
  if (!stats) return <div className="page"><div className="empty-state">Не удалось загрузить</div></div>;

  const chartData = (stats.perDay||[]).map((d) => ({
    name: d.weekday,
    value: d.total ? Math.round((d.done / d.total) * 100) : 0,
    raw: `${d.done}/${d.total}`,
  }));

  return (
    <div className="page stats">
      <div className="seg-control period-control">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            className={`seg-btn ${days === d ? 'active' : ''}`}
            onClick={() => setDays(d)}
          >
            {d} дн
          </button>
        ))}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(124,58,237,.15)', color: '#7C3AED' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-value">{stats.completionRate}%</div>
          <div className="stat-label">Средняя regularность</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,.15)', color: '#F59E0B' }}>
            <Flame size={20} />
          </div>
          <div className="stat-value">{stats.bestStreak}</div>
          <div className="stat-label">Лучшая серия 🔥</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,.15)', color: '#10B981' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-value">{stats.perfectDays}</div>
          <div className="stat-label">Идеальных дней</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,.15)', color: '#6366F1' }}>
            <Trophy size={20} />
          </div>
          <div className="stat-value">{stats.currentPerfectStreak || 0}</div>
          <div className="stat-label">Дней подряд 100%</div>
        </div>
      </div>

      <div className="chart-card">
        <h3 className="card-title">
          Активность за период
          {stats.trend && (
            <span className={`trend-badge ${stats.trend}`}>
              {stats.trend === 'up' ? '↗️' : stats.trend === 'down' ? '↘️' : '→'} {stats.trendDelta > 0 ? '+' : ''}{stats.trendDelta}%
            </span>
          )}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-default, #7C3AED)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--accent-default, #7C3AED)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
              formatter={(v) => [`${v}%`, 'Выполнено']}
            />
            <Area type="monotone" dataKey="value" stroke="var(--accent-default, #7C3AED)" strokeWidth={2.5} fill="url(#g)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="per-habit-list">
        <h3 className="card-title">По привычкам</h3>
        {(stats.perHabit||[]).map((h) => (
          <div key={h.id} className="per-habit">
            <span className="per-habit-emoji">{h.emoji}</span>
            <div className="per-habit-body">
              <div className="per-habit-top">
                <span>{h.title}</span>
                {h.streak > 0 && <span className="mini-streak"><Flame size={12} /> {h.streak}</span>}
              </div>
              <div className="per-habit-bar">
                <div className="per-habit-fill" style={{ width: `${h.completionRate}%`, background: h.color }} />
              </div>
            </div>
            <span className="per-habit-pct">{h.completionRate}%</span>
          </div>
        ))}
      </div>

      <ShareButton userName={userName} stats={stats} habits={habits} tg={tg} />
    </div>
  );
}
