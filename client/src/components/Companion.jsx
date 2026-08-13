import { useEffect, useState } from 'react';
import { api } from '../api/client';

const TYPE_COLORS = {
  spark: { main: '#7C3AED', glow: '#A855F7', emoji: '✨' },
  leaf: { main: '#10B981', glow: '#34D399', emoji: '🌿' },
  drop: { main: '#06B6D4', glow: '#22D3EE', emoji: '💧' },
  flame: { main: '#F59E0B', glow: '#FBBF24', emoji: '🔥' },
};

/**
 * Living Companion — живой персонаж на главном экране (Tamagotchi-эффект, как Finch).
 * Растёт от отметок привычек, настроение зависит от прогресса.
 * Idle-анимации (моргание, покачивание) создают ощущение «живого».
 */
export default function Companion() {
  const [data, setData] = useState(null);
  const [blink, setBlink] = useState(false);
  const [pet, setPet] = useState(false);

  const load = () => api.getCompanion().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  // Idle-моргание каждые 3-5 сек
  useEffect(() => {
    if (!data) return;
    const tick = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    };
    const interval = setInterval(tick, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [data]);

  if (!data) return null;

  const colors = TYPE_COLORS[data.type] || TYPE_COLORS.spark;
  const moodEmoji = data.mood >= 70 ? '😊' : data.mood >= 40 ? '😐' : '😴';
  const moodLabel = data.mood >= 70 ? 'Счастлив!' : data.mood >= 40 ? 'Норм' : 'Скучает';
  const xpProgress = Math.round(((data.xp - data.xpForThis) / (data.xpToNext - data.xpForThis)) * 100);

  const handlePet = () => {
    setPet(true);
    setTimeout(() => setPet(false), 300);
  };

  // Размер по стадии эволюции
  const size = data.stage === 'egg' ? 50 : data.stage === 'baby' ? 60 : data.stage === 'teen' ? 70 : 80;

  return (
    <div className="companion-card glass" onClick={handlePet}>
      <div className="companion-creature" style={{ '--c-main': colors.main, '--c-glow': colors.glow, transform: pet ? 'scale(1.15)' : 'scale(1)' }}>
        <Creature type={data.type} stage={data.stage} blink={blink} mood={data.mood} size={size} />
      </div>
      <div className="companion-info">
        <div className="companion-name-row">
          <strong>{data.name}</strong>
          <span className="companion-mood">{moodEmoji} {moodLabel}</span>
        </div>
        <div className="companion-level">Lv {data.level} · {data.stage === 'egg' ? '🥚 Яйцо' : data.stage === 'baby' ? '👶 Малыш' : data.stage === 'teen' ? '🧒 Подросток' : '🌟 Взрослый'}</div>
        <div className="companion-xp-bar">
          <div className="companion-xp-fill" style={{ width: `${xpProgress}%` }} />
        </div>
        <span className="muted small">{data.xp} / {data.xpToNext} XP</span>
      </div>
    </div>
  );
}

/** SVG-существо с глазами, ртом, анимациями */
function Creature({ type, stage, blink, mood, size }) {
  // Тело — круг с градиентом
  const eyeOpen = !blink;
  const mouthHappy = mood >= 70;
  const mouthSad = mood < 40;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`grad-${type}`} cx="35%" cy="30%">
          <stop offset="0%" stopColor="var(--c-glow)" />
          <stop offset="100%" stopColor="var(--c-main)" />
        </radialGradient>
        <filter id={`glow-${type}`}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Свечение */}
      <circle cx="50" cy="50" r="42" fill={`url(#grad-${type})`} opacity="0.2" filter={`url(#glow-${type})`} className="companion-pulse" />

      {/* Тело */}
      {stage === 'egg' ? (
        <ellipse cx="50" cy="55" rx="30" ry="38" fill={`url(#grad-${type})`} className="companion-bob" />
      ) : (
        <circle cx="50" cy="50" r="36" fill={`url(#grad-${type})`} className="companion-bob" />
      )}

      {/* Глаза */}
      {stage !== 'egg' && (
        <>
          {eyeOpen ? (
            <>
              <circle cx="38" cy="45" r="6" fill="#fff" />
              <circle cx="62" cy="45" r="6" fill="#fff" />
              <circle cx="39" cy="46" r="3" fill="#1a1a2e" />
              <circle cx="63" cy="46" r="3" fill="#1a1a2e" />
              <circle cx="40" cy="45" r="1" fill="#fff" />
              <circle cx="64" cy="45" r="1" fill="#fff" />
            </>
          ) : (
            <>
              <path d="M32 45 Q38 49 44 45" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M56 45 Q62 49 68 45" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </>
          )}
        </>
      )}

      {/* Рот */}
      {stage !== 'egg' && mouthHappy && (
        <path d="M40 60 Q50 70 60 60" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
      {stage !== 'egg' && !mouthHappy && !mouthSad && (
        <line x1="42" y1="62" x2="58" y2="62" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" />
      )}
      {stage !== 'egg' && mouthSad && (
        <path d="M40 66 Q50 58 60 66" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}

      {/* Румянец при счастье */}
      {mood >= 70 && stage !== 'egg' && (
        <>
          <circle cx="30" cy="56" r="4" fill="#ff6b9d" opacity="0.4" />
          <circle cx="70" cy="56" r="4" fill="#ff6b9d" opacity="0.4" />
        </>
      )}

      {/* Тип-маркер (свечка/листик/капля/искра сверху) */}
      {type === 'leaf' && stage !== 'egg' && (
        <path d="M50 14 Q56 4 50 0 Q44 4 50 14" fill="#10B981" />
      )}
      {type === 'flame' && stage !== 'egg' && (
        <path d="M50 14 Q58 4 50 -2 Q42 4 50 14" fill="#F59E0B" className="companion-flame" />
      )}
      {type === 'drop' && stage !== 'egg' && (
        <ellipse cx="50" cy="6" rx="4" ry="6" fill="#06B6D4" />
      )}
    </svg>
  );
}
