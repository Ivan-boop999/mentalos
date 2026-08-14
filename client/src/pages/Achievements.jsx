import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Lock, Share2 } from 'lucide-react';

/**
 * Achievements = Case Showcase (как витрина значков в Discord).
 * + Share to Stories (Telegram WebApp API).
 */
export default function AchievementsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAchievements().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const shareToStory = () => {
    try {
      const wa = window.Telegram?.WebApp;
      if (!data?.totalUnlocked) return alert('Пока нет достижений для шеринга');

      const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || window.location.origin;
      const mediaUrl = `${base}/api/share/story.png?streak=${data.bestStreak || 0}&ach=${encodeURIComponent(`Открыто достижений: ${data.totalUnlocked}`)}`;
      const text = `Мой стрик в MentalOS: ${data.bestStreak} 🔥 Присоединяйся!`;
      const botUser = import.meta.env.VITE_BOT_USERNAME || 'mentalos_bot';

      // Настоящий Telegram shareToStory API (Bot API 7.8+)
      if (typeof wa?.shareToStory === 'function') {
        wa.shareToStory(mediaUrl, {
          text,
          widget_link: { url: `https://t.me/${botUser}`, name: 'MentalOS' },
        });
        return;
      }
      // Фолбэк: share-ссылка
      const link = `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${botUser}`)}&text=${encodeURIComponent(text)}`;
      if (wa?.openTelegramLink) wa.openTelegramLink(link);
      else window.open(link, '_blank');
    } catch (e) {
      console.error('share error:', e);
    }
  };

  if (loading) return <div className="page"><div className="empty-state">Загрузка…</div></div>;
  if (!data) return <div className="page"><div className="empty-state">Не удалось загрузить</div></div>;

  const showcaseCategories = [
    { name: 'Старт', codes: ['first_checkin', 'streak_3'], color: '#10B981' },
    { name: 'Серии', codes: ['streak_7', 'streak_30'], color: '#F59E0B' },
    { name: 'Легенды', codes: ['streak_100', 'streak_365'], color: '#7C3AED' },
  ];

  const tiers = data?.tiers || [];

  return (
    <div className="page achievements">
      <div className="ach-hero">
        <div className="ach-hero-emoji">🏆</div>
        <div className="ach-hero-value">{data.totalUnlocked}/{data.tiers.length}</div>
        <div className="ach-hero-label">достижений получено</div>
        <div className="ach-best">🔥 Лучший стрик: {data.bestStreak}</div>
      </div>

      {data.totalUnlocked > 0 && (
        <button className="primary-btn ghost-btn" style={{ marginBottom: 16 }} onClick={shareToStory}>
          <Share2 size={16} /> Поделиться в Историях
        </button>
      )}

      {/* Case Showcase — по категориям как витрина */}
        {showcaseCategories.map((cat) => {
        const catTiers = tiers.filter((t) => cat.codes.includes(t.code));
        if (!catTiers.length) return null;
        return (
          <div key={cat.name} className="showcase-section">
            <h3 className="card-title" style={{ color: cat.color }}>{cat.name}</h3>
            <div className="showcase-grid">
              {catTiers.map((t) => (
                <div key={t.code} className={`ach-card ${t.unlocked ? 'unlocked' : 'locked'}`}>
                  <div className="ach-card-icon" style={{ borderColor: t.unlocked ? cat.color : 'var(--border)', background: t.unlocked ? `linear-gradient(135deg, ${cat.color}, ${cat.color}99)` : 'var(--bg)' }}>
                    {t.unlocked ? <span className="big-emoji">{t.emoji}</span> : <Lock size={26} className="muted" />}
                  </div>
                  <div className="ach-card-body">
                    <div className="ach-card-top">
                      <strong>{t.title}</strong>
                      <span className={`ach-status ${t.unlocked ? 'done' : ''}`}>{t.unlocked ? 'Получено' : `${t.threshold} дн.`}</span>
                    </div>
                    <div className="ach-card-desc">{t.desc}</div>
                    {!t.unlocked && <div className="ach-progress"><div className="ach-progress-fill" style={{ width: `${t.progress}%`, background: cat.color }} /></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p className="settings-hint">💡 Отмечай привычки каждый день, чтобы открывать новые достижения.</p>
    </div>
  );
}
