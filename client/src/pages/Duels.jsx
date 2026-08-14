import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Swords, Trophy, Check, X } from 'lucide-react';

export default function DuelsPage() {
  const [duels, setDuels] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [d, b] = await Promise.all([api.getDuels(), api.getBuddies()]);
      setDuels(d || []);
      setBuddies((b && b.accepted) || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const challenge = async (buddyId, name) => {
    if (!confirm(`Бросить вызов «${name}»? Ставка 50 бонусов списывается сразу. Друг должен принять вызов в боте.`)) return;
    try {
      await api.createDuel(buddyId, 50);
      alert('⚔️ Вызов отправлен! Друг получит уведомление от бота.');
      load();
    } catch (e) { alert('❌ ' + e.message); }
  };

  const accept = async (id) => {
    try { await api.acceptDuel(id); alert('⚔️ Дуэль началась!'); load(); }
    catch (e) { alert('❌ ' + e.message); }
  };
  const decline = async (id) => {
    try { await api.declineDuel(id); load(); }
    catch (e) { alert('❌ ' + e.message); }
  };
  const finish = async (id) => {
    try {
      const res = await api.finishDuel(id);
      alert(res.winnerId ? `🎉 Победитель определён!` : `🤝 Ничья — ставка возвращена`);
      load();
    } catch (e) { alert('❌ ' + e.message); }
  };

  if (loading) return <div className="page"><div className="empty-state">Загрузка…</div></div>;

  const myUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const incoming = duels.filter((d) => d.status === 'pending' && d.opponent_id === myUserId);
  const history = duels;

  return (
    <div className="page duels">
      <div className="duels-hero glass">
        <Swords size={28} style={{ color: 'var(--danger)' }} />
        <h2>Битвы привычек</h2>
        <p>Брось вызов бадди! Кто дольше продержит серию — забирает банк.</p>
      </div>

      {/* Входящие вызовы */}
      {incoming.length > 0 && (
        <>
          <h3 className="card-title">⚔️ Вызовы тебе</h3>
          <div className="duels-list">
            {incoming.map((d) => (
              <div key={d.id} className="duel-row active">
                <div className="duel-side">
                  <strong>{d.challenger_name || d.challenger_username}</strong>
                  <span className="duel-streak">🔥 {d.challenger_streak}</span>
                </div>
                <div className="duel-vs">ставка {d.wager}🪙</div>
                <button className="icon-action" style={{ color: 'var(--success)' }} onClick={() => accept(d.id)}><Check size={18} /></button>
                <button className="icon-action danger" onClick={() => decline(d.id)}><X size={18} /></button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Бадди для вызова */}
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
      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">⚔️</div>
          <h3>Пока нет битв</h3>
          <p>Стань бадди с другом и брось вызов</p>
        </div>
      ) : (
        <div className="duels-list">
          {history.map((d) => {
            const statusLabel = { pending: '⏳ Ждёт ответа', active: '⚔️ Идёт', finished: '🏁 Завершена', declined: '🚫 Отклонена' }[d.status] || d.status;
            return (
              <div key={d.id} className={`duel-row ${d.status}`}>
                <div className="duel-side">
                  <strong>{d.challenger_name || d.challenger_username}</strong>
                  <span className="duel-streak">🔥 {d.challenger_streak}</span>
                </div>
                <div className="duel-vs">{statusLabel} · {d.wager}🪙</div>
                <div className="duel-side">
                  <strong>{d.opponent_name || d.opponent_username}</strong>
                  <span className="duel-streak">🔥 {d.opponent_streak}</span>
                </div>
                {d.status === 'active' && <button className="primary-btn ghost-btn" onClick={() => finish(d.id)}>Завершить</button>}
                {d.status === 'finished' && d.winner_id && <Trophy size={18} style={{ color: 'var(--warning)' }} />}
                {d.status === 'finished' && !d.winner_id && <span className="muted small">Ничья</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
