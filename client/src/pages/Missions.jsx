import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Target, Check } from 'lucide-react';

export default function MissionsPage() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.getMissions().then(setMissions).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  // РАУНД-2 ФИКС: re-fetch при возврате на экран (прогресс обновляется после отметок)
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (loading) return <div className="page"><div className="empty-state">Загрузка…</div></div>;

  const done = missions.filter((m) => m.completed).length;

  return (
    <div className="page missions">
      <div className="missions-hero glass">
        <Target size={28} style={{ color: 'var(--accent)' }} />
        <h2>Миссии дня</h2>
        <p>Выполни мини-задания и получи бонусы. Новые миссии каждый день!</p>
        <div className="missions-progress">{done}/{missions.length} выполнено</div>
      </div>

      <div className="missions-list">
        {missions.map((m) => (
          <div key={m.id} className={`mission-card ${m.completed ? 'done' : ''}`}>
            <div className={`mission-icon ${m.completed ? 'done' : ''}`}>
              {m.completed ? <Check size={20} strokeWidth={3} /> : <Target size={20} />}
            </div>
            <div className="mission-body">
              <strong>{m.title}</strong>
              <span className="muted small">{m.description}</span>
              <div className="mission-progress-bar">
                <div className="mission-progress-fill" style={{ width: `${(m.progress / m.target) * 100}%` }} />
              </div>
              <span className="muted small">{m.progress}/{m.target}</span>
            </div>
            <div className="mission-reward">🪙 +{m.reward}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
