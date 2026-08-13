import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Crown, Trophy, Medal, Eye, EyeOff } from 'lucide-react';

const MEDALS = ['#F59E0B', '#94A3B8', '#CD7F32']; // золото, серебро, бронза

export default function LeaderboardPage({ settings, onChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => api.getLeaderboard().then(setData).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const togglePublic = async () => {
    try { await api.setPublicProfile(!settings?.publicProfile); onChange?.(); } catch {}
  };

  if (loading || !data) return <div className="page"><div className="empty-state">Загрузка…</div></div>;

  const top3 = (data.users||[]).slice(0, 3);
  const rest = (data.users||[]).slice(3);
  const me = data.users.find((u) => u.relation === 'me');

  return (
    <div className="page leaderboard">
      <div className="lb-hero glass">
        <Crown size={28} style={{ color: '#F59E0B' }} />
        <h2>Топ игроков</h2>
        <p>Сравни прогресс с друзьями и другими пользователями MentalOS</p>
      </div>

      {/* Подиум топ-3 */}
      {top3.length >= 3 && (
        <div className="podium">
          {[1, 0, 2].map((idx) => {
            const u = top3[idx];
            if (!u) return <div key={idx} className="podium-slot" />;
            const place = idx + 1;
            return (
              <div key={u.id} className={`podium-slot place-${place}`}>
                <div className="podium-avatar" style={{ borderColor: MEDALS[idx] }}>
                  {(u.first_name || u.username || '?')[0].toUpperCase()}
                </div>
                <div className="podium-name">{u.first_name || u.username || 'Игрок'}</div>
                <div className="podium-xp">{u.xp} XP</div>
                <div className="podium-base" style={{ background: MEDALS[idx] }}>
                  {place === 1 && <Crown size={20} />}
                  <span>{place}</span>
                </div>
                {u.relation === 'me' && <span className="podium-me">Ты</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Список остальных */}
      <div className="lb-list">
        {rest.map((u) => (
          <div key={u.id} className={`lb-row ${u.relation === 'me' ? 'me' : ''}`}>
            <span className="lb-rank">#{u.rank}</span>
            <div className="lb-avatar">{(u.first_name || u.username || '?')[0].toUpperCase()}</div>
            <div className="lb-info">
              <strong>{u.first_name || u.username || 'Игрок'} {u.relation === 'me' && <span className="lb-tag">ты</span>}</strong>
              <span className="muted small">
                {u.relation === 'referrer' && 'пригласил тебя · '}
                {u.relation === 'invited' && 'ты пригласил · '}
                Lv {u.level} · {u.total_checkins || 0} отметок
              </span>
            </div>
            <div className="lb-xp">{u.xp}</div>
          </div>
        ))}
      </div>

      {/* Переключатель видимости */}
      <button className="primary-btn ghost-btn" onClick={togglePublic}>
        {settings?.publicProfile ? <><Eye size={16} /> Профиль публичный</> : <><EyeOff size={16} /> Профиль скрыт</>}
      </button>
      <p className="settings-hint">
        {settings?.publicProfile
          ? 'Тебя видят другие пользователи в общем топе.'
          : 'Включи публичный профиль, чтобы попасть в общий топ и соревноваться со всеми.'}
      </p>
    </div>
  );
}
