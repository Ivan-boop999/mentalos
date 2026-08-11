import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CheckCircle2, Play } from 'lucide-react';

export default function ChallengesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.getChallenges().then(setItems).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const join = async (id, title) => {
    if (!confirm(`Начать челлендж «${title}»? Будут созданы привычки.`)) return;
    try {
      const res = await api.joinChallenge(id);
      alert(`✅ Челлендж начат! Добавлено привычек: ${res.created}`);
      load();
    } catch (e) { alert('❌ ' + e.message); }
  };

  if (loading) return <div className="page"><div className="empty-state">Загрузка…</div></div>;

  const active = items.filter((c) => c.userStatus === 'active');
  const available = items.filter((c) => c.userStatus !== 'active');

  return (
    <div className="page challenges">
      {active.length > 0 && (
        <>
          <h3 className="card-title">🔥 Активные челленджи</h3>
          {active.map((c) => (
            <div key={c.id} className="ch-card active" style={{ '--ch-color': c.color }}>
              <div className="ch-emoji">{c.emoji}</div>
              <div className="ch-body">
                <strong>{c.title}</strong>
                <span className="muted small">{c.description}</span>
                <span className="chip reminder-chip">⏳ {c.duration_days} дней · идёт</span>
              </div>
              <CheckCircle2 size={28} style={{ color: '#10B981' }} />
            </div>
          ))}
        </>
      )}

      <h3 className="card-title">📋 Доступные челленджи</h3>
      <div className="ch-list">
        {available.map((c) => (
          <div key={c.id} className="ch-card" style={{ '--ch-color': c.color }}>
            <div className="ch-emoji">{c.emoji}</div>
            <div className="ch-body">
              <strong>{c.title}</strong>
              <span className="muted small">{c.description}</span>
              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                <span className="chip cat-chip">⏳ {c.duration_days} дней</span>
                <span className="chip cat-chip">{c.habit_templates?.length || 1} привыч.</span>
              </div>
            </div>
            <button className="ch-join-btn" onClick={() => join(c.id, c.title)}>
              <Play size={16} /> Начать
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
