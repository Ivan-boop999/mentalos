import { useEffect, useState } from 'react';

/**
 * Праздничное всплывающее окно при росте уровня.
 */
export default function LevelUpToast({ levelUp, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (levelUp) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onDone, 400);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [levelUp, onDone]);

  if (!levelUp) return null;

  return (
    <div className={`ach-toast-overlay lvl-overlay ${visible ? 'show' : ''}`}>
      <div className="ach-toast lvl-toast">
        <div className="ach-confetti">✨⭐💫✨⭐</div>
        <div className="lvl-icon-wrap">
          <div className="lvl-icon">Lv {levelUp.to}</div>
        </div>
        <div className="ach-title">Уровень повышен!</div>
        <div className="lvl-from-to">Уровень {levelUp.from} → {levelUp.to}</div>
        <div className="ach-desc">Так держать — ты становишься сильнее 🚀</div>
        <div className="ach-bonus">🪙 +{50 * levelUp.to} бонусов</div>
      </div>
    </div>
  );
}
