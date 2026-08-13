import { useEffect, useState } from 'react';

/**
 * Тост «сюрприза» — переменная награда (dopamine loop из Hooked model).
 * Показывается случайно (~12%) при отметке привычки.
 */
export default function SurpriseToast({ surprise, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (surprise) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onDone, 350);
      }, 3200);
      return () => clearTimeout(t);
    }
  }, [surprise, onDone]);

  if (!surprise) return null;

  const emoji = surprise.type === 'streak_shield' ? '🛡️' : surprise.type === 'xp' ? '⚡' : '🎁';

  return (
    <div className={`ach-toast-overlay surprise-overlay ${visible ? 'show' : ''}`}>
      <div className="ach-toast surprise-toast">
        <div className="ach-confetti">✨🎁💫✨🎁</div>
        <div className="ach-emoji" style={{ fontSize: 56 }}>{emoji}</div>
        <div className="ach-title" style={{ color: '#FBBF24' }}>Сюрприз!</div>
        <div className="ach-name" style={{ fontSize: 18 }}>{surprise.label}</div>
      </div>
    </div>
  );
}
