import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Swords, Trophy } from 'lucide-react';

export default function DuelsPage({ buddies = [] }) {
  const [duels, setDuels] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.getDuels().then(setDuels).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const challenge = async (buddyId, name) => {
    if (!confirm(`Бросить вызов «${name}»? Ставка 50 бонусов. Победит тот, у кого длиннее серия.`)) return;
    try {
      await api.createDuel(buddyId, 50);
      alert('⚔️ Вызов отправлен! Выиграет тот, у кого серия длиннее — заверши дуэль, когда будешь уверен.');
      load();
    } catch (e) { alert('❌ ' + e.message); }
  };

  const finish = async (id) => {
    try {
      const res = await api.finishDuel(id);
      alert(res.winnerId ? `🎉 Победитель определён! +50 бонусов` : `🤝 Ничья!`);
      load();
    } catch (e) { alert('❌ ' + e.message); }
  };

  if (loading) return <div className="page"><div className="empty-state">Загрузка…</div></div>;

  return (
    <div className="page duels">
      <div className="duels-hero glass">
        <Swords size={28} style={{ color: '#EF4444' }} />
        <h2>Битвы привычек</h2>
        <p>Брось вызов бадди! Кто дольше продержит стрик — забирает ставку.</p>
      </div>

      {buddies.length > 0 && (
        <>
          <h3 className="card-title">Бросить вызов</h3>
          <div className="duel-buddies">
            {buddies.map((b) => (
              <button key={b.id} className="duel-buddy-btn" onClick={() => challenge(b.buddy_id, b.first_name || b.username)}>
                <div className="lb-avatar">{(b.first_name || b.username || '?')[0].toUpperCase()}</div>
                <span>{b.first_name || '@' + b.username}</span>
                <Swords size={16} />
              </button>
            ))}
          </div>
        </>
      )}

      <h3 className="card-title">История битв</h3>
      {duels.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">⚔️</div>
          <h3>Пока нет битв</h3>
          <p>Брось вызов бадди во вкладке «Бадди»</p>
        </div>
      ) : (
        <div className="duels-list">
          {duels.map((d) => {
            const myName = d.challenger_name || d.challenger_username;
            const oppName = d.opponent_name || d.opponent_username;
            return (
              <div key={d.id} className={`duel-row ${d.status}`}>
                <div className="duel-side">
                  <strong>{myName}</strong>
                  <span className="duel-streak">🔥 {d.challenger_streak}</span>
                </div>
                <div className="duel-vs">vs</div>
                <div className="duel-side">
                  <strong>{oppName}</strong>
                  <span className="duel-streak">🔥 {d.opponent_streak}</span>
                </div>
                {d.status === 'active' && <button className="primary-btn ghost-btn" onClick={() => finish(d.id)}>Завершить</button>}
                {d.status === 'finished' && d.winner_id && <Trophy size={18} style={{ color: '#F59E0B' }} />}
                {d.status === 'finished' && !d.winner_id && <span className="muted small">Ничья</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
