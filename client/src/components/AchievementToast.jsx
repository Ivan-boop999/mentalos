import { useEffect, useState } from 'react';

export default function AchievementToast({ achievement, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onDone, 350);
      }, 3800);
      return () => clearTimeout(t);
    }
  }, [achievement, onDone]);

  if (!achievement) return null;

  return (
    <div className={`ach-toast-overlay ${visible ? 'show' : ''}`}>
      <div className="ach-toast">
        <div className="ach-confetti">🎉🎊✨🎈</div>
        <div className="ach-emoji">{achievement.emoji}</div>
        <div className="ach-title">Достижение разблокировано!</div>
        <div className="ach-name">{achievement.title}</div>
        <div className="ach-desc">{achievement.desc}</div>
        {achievement.bonus ? <div className="ach-bonus">🪙 +{achievement.bonus} бонусов</div> : null}
      </div>
    </div>
  );
}
