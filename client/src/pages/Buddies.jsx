import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { UserPlus, Trash2, Zap } from 'lucide-react';

/**
 * Buddies — микро-accountability пары (Dominican Univ: 35%→70%).
 * Пригласи друга, видите прогресс друг друга, поддерживайте.
 */
export default function BuddiesPage() {
  const [buddies, setBuddies] = useState([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => api.getBuddies().then(setBuddies).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const invite = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      await api.inviteBuddy(code.trim());
      setCode('');
      load();
      alert('✅ Бадди добавлен!');
    } catch (err) {
      alert('❌ ' + err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Удалить бадди?')) return;
    try { await api.removeBuddy(id); load(); } catch (e) { alert('❌ ' + e.message); }
  };

  return (
    <div className="page buddies">
      <div className="buddies-hero glass">
        <Zap size={28} style={{ color: 'var(--accent)' }} />
        <h2>Бадди</h2>
        <p>Вдвоём легче. Исследования показывают: accountability-партнёр повышает достижение целей с 35% до 70%.</p>
      </div>

      <form className="buddy-invite-form glass" onSubmit={invite}>
        <input className="input" placeholder="@username или код друга (MOS...)" value={code} onChange={(e) => setCode(e.target.value)} />
        <button type="submit" className="primary-btn" disabled={!code.trim()}>
          <UserPlus size={16} /> Пригласить
        </button>
      </form>

      {loading ? (
        <div className="empty-state">Загрузка…</div>
      ) : buddies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">🤝</div>
          <h3>Пока нет бадди</h3>
          <p>Пригласи друга по @username — и вы будете видеть прогресс друг друга</p>
        </div>
      ) : (
        <div className="buddies-list">
          {buddies.map((b) => {
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
    </div>
  );
}
