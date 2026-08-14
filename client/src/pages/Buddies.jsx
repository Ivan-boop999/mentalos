import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { UserPlus, Trash2, Zap, Check, X, Clock } from 'lucide-react';

/**
 * Buddies — микро-accountability пары с согласием обеих сторон.
 */
export default function BuddiesPage({ onChange }) {
  const [data, setData] = useState({ accepted: [], incoming: [], outgoing: [] });
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => api.getBuddies().then((d) => setData({ accepted: d.accepted || [], incoming: d.incoming || [], outgoing: d.outgoing || [] })).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const invite = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      await api.inviteBuddy(code.trim());
      setCode('');
      load();
      alert('📨 Заявка отправлена! Друг получит уведомление от бота и должен принять её.');
    } catch (err) {
      alert('❌ ' + err.message);
    }
  };

  const accept = async (id) => {
    try { await api.acceptBuddy(id); load(); } catch (e) { alert('❌ ' + e.message); }
  };
  const decline = async (id) => {
    try { await api.declineBuddy(id); load(); } catch (e) { alert('❌ ' + e.message); }
  };
  const remove = async (id) => {
    if (!confirm('Удалить бадди?')) return;
    try { await api.removeBuddy(id); load(); } catch (e) { alert('❌ ' + e.message); }
  };

  const { accepted, incoming, outgoing } = data;

  return (
    <div className="page buddies">
      <div className="buddies-hero glass">
        <Zap size={28} style={{ color: 'var(--accent)' }} />
        <h2>Бадди</h2>
        <p>Вдвоём легче. Accountability-партнёр повышает достижение целей с 35% до 70%.</p>
      </div>

      <form className="buddy-invite-form glass" onSubmit={invite}>
        <input className="input" placeholder="@username или код друга (MOS...)" value={code} onChange={(e) => setCode(e.target.value)} />
        <button type="submit" className="primary-btn" disabled={!code.trim()}>
          <UserPlus size={16} /> Пригласить
        </button>
      </form>

      {loading ? (
        <div className="empty-state">Загрузка…</div>
      ) : (
        <>
          {/* Входящие заявки */}
          {incoming.length > 0 && (
            <>
              <h3 className="card-title">📨 Заявки в бадди</h3>
              <div className="buddies-list">
                {incoming.map((r) => (
                  <div key={r.id} className="buddy-row glass">
                    <div className="buddy-avatar">{(r.first_name || r.username || '?')[0].toUpperCase()}</div>
                    <div className="buddy-info">
                      <strong>{r.first_name || '@' + r.username}</strong>
                      <span className="muted small">хочет стать твоим бадди</span>
                    </div>
                    <button className="icon-action" style={{ color: 'var(--success)' }} onClick={() => accept(r.id)} aria-label="accept"><Check size={18} /></button>
                    <button className="icon-action danger" onClick={() => decline(r.id)} aria-label="decline"><X size={18} /></button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Исходящие (ждём ответа) */}
          {outgoing.length > 0 && (
            <>
              <h3 className="card-title">⏳ Ожидают ответа</h3>
              <div className="buddies-list">
                {outgoing.map((r) => (
                  <div key={r.id} className="buddy-row glass" style={{ opacity: 0.7 }}>
                    <div className="buddy-avatar"><Clock size={16} /></div>
                    <div className="buddy-info">
                      <strong>{r.first_name || '@' + r.username}</strong>
                      <span className="muted small">заявка отправлена</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Принятые бадди */}
          <h3 className="card-title">🤝 Мои бадди ({accepted.length})</h3>
          {accepted.length === 0 ? (
            <div className="empty-state">
              <div className="empty-emoji">🤝</div>
              <h3>Пока нет бадди</h3>
              <p>Пригласи друга по @username — после его согласия вы увидите прогресс друг друга</p>
            </div>
          ) : (
            <div className="buddies-list">
              {accepted.map((b) => {
                const pct = b.total_habits > 0 ? Math.round((b.done_today / b.total_habits) * 100) : 0;
                return (
                  <div key={b.id} className="buddy-row glass">
                    <div className="buddy-avatar" style={{ background: 'var(--gradient-main)' }}>
                      {(b.first_name || b.username || '?')[0].toUpperCase()}
                    </div>
                    <div className="buddy-info">
                      <strong>{b.first_name || '@' + b.username}</strong>
                      <span className="muted small">Lv {b.level} · {b.total_checkins || 0} отметок</span>
                      <div className="buddy-progress">
                        <div className="buddy-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="buddy-stats">
                      <div className="buddy-today">{b.done_today}/{b.total_habits}</div>
                      <div className="muted small">сегодня</div>
                    </div>
                    <button className="icon-action danger" onClick={() => remove(b.id)}><Trash2 size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
