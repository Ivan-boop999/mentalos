import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Lock } from 'lucide-react';

export default function AchievementsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAchievements()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="empty-state">Загрузка достижений…</div></div>;
  if (!data) return <div className="page"><div className="empty-state">Не удалось загрузить</div></div>;

  return (
    <div className="page achievements">
      <div className="ach-hero">
        <div className="ach-hero-emoji">🏆</div>
        <div className="ach-hero-value">{data.totalUnlocked}/{data.tiers.length}</div>
        <div className="ach-hero-label">достижений получено</div>
        <div className="ach-best">🔥 Лучший стрик: {data.bestStreak}</div>
      </div>

      <div className="ach-list">
        {data.tiers.map((t) => (
          <div key={t.code} className={`ach-card ${t.unlocked ? 'unlocked' : 'locked'}`}>
            <div className="ach-card-icon" style={{ borderColor: t.unlocked ? 'var(--accent)' : 'var(--border)' }}>
              {t.unlocked ? (
                <span className="big-emoji">{t.emoji}</span>
              ) : (
                <Lock size={26} className="muted" />
              )}
            </div>
            <div className="ach-card-body">
              <div className="ach-card-top">
                <strong>{t.title}</strong>
                <span className={`ach-status ${t.unlocked ? 'done' : ''}`}>
                  {t.unlocked ? 'Получено' : `${t.threshold} дн.`}
                </span>
              </div>
              <div className="ach-card-desc">{t.desc}</div>
              {!t.unlocked && (
                <div className="ach-progress">
                  <div className="ach-progress-fill" style={{ width: `${t.progress}%` }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="settings-hint">
        💡 Отмечай привычки каждый день, чтобы открывать новые достижения и не обрывать серии.
      </p>
    </div>
  );
}
