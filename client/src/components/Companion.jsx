import { useEffect, useState } from 'react';
import { api } from '../api/client';

const TYPE_COLORS = {
  spark: { main: '#7C3AED', light: '#A78BFA', glow: '#C4B5FD', accent: '#FBBF24' },
  leaf: { main: '#10B981', light: '#34D399', glow: '#6EE7B7', accent: '#84CC16' },
  drop: { main: '#06B6D4', light: '#22D3EE', glow: '#67E8F9', accent: '#3B82F6' },
  flame: { main: '#F59E0B', light: '#FBBF24', glow: '#FCD34D', accent: '#EF4444' },
};

/**
 * Living Companion v2 — премиум SVG-персонаж (Tamagotchi-эффект, как Finch).
 * Мягкое тело с многослойным градиентом, блик света, drop-shadow, плавные черты.
 */
export default function Companion() {
  const [data, setData] = useState(null);
  const [blink, setBlink] = useState(false);
  const [pet, setPet] = useState(false);

  const load = () => api.getCompanion().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!data) return;
    const tick = () => { setBlink(true); setTimeout(() => setBlink(false), 160); };
    const interval = setInterval(tick, 3500 + Math.random() * 2500);
    return () => clearInterval(interval);
  }, [data]);

  if (!data) return null;

  const colors = TYPE_COLORS[data.type] || TYPE_COLORS.spark;
  const moodEmoji = data.mood >= 70 ? '😊' : data.mood >= 40 ? '😐' : '😴';
  const moodLabel = data.mood >= 70 ? 'Счастлив' : data.mood >= 40 ? 'Норм' : 'Скучает';
  const xpProgress = Math.round(((data.xp - data.xpForThis) / (data.xpToNext - data.xpForThis)) * 100);

  const handlePet = () => { setPet(true); setTimeout(() => setPet(false), 350); };
  const size = data.stage === 'egg' ? 60 : data.stage === 'baby' ? 68 : data.stage === 'teen' ? 76 : 84;

  return (
    <div className="companion-card glass" onClick={handlePet}>
      <div className="companion-creature" style={{
        transform: pet ? 'scale(1.12) rotate(-3deg)' : 'scale(1)',
        transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <Creature type={data.type} stage={data.stage} blink={blink} mood={data.mood} size={size} colors={colors} />
      </div>
      <div className="companion-info">
        <div className="companion-name-row">
          <strong>{data.name}</strong>
          <span className="companion-mood">{moodEmoji} {moodLabel}</span>
        </div>
        <div className="companion-level">
          Lv {data.level} · {data.stage === 'egg' ? '🥚 Яйцо' : data.stage === 'baby' ? '👶 Малыш' : data.stage === 'teen' ? '🧒 Подросток' : '🌟 Взрослый'}
        </div>
        <div className="companion-xp-bar">
          <div className="companion-xp-fill" style={{ width: `${xpProgress}%` }} />
        </div>
        <span className="companion-xp-text">{data.xp} / {data.xpToNext} XP</span>
      </div>
    </div>
  );
}

/** Премиум SVG-существо: мягкое тело, блик, тень, плавные черты */
function Creature({ type, stage, blink, mood, size, colors }) {
  const c = colors;
  const happy = mood >= 70;
  const sad = mood < 40;

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
      <defs>
        {/* Основной градиент тела — многослойный */}
        <radialGradient id={`body-${type}`} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={c.glow} />
          <stop offset="50%" stopColor={c.light} />
          <stop offset="100%" stopColor={c.main} />
        </radialGradient>
        {/* Блик света */}
        <radialGradient id={`shine-${type}`} cx="35%" cy="25%" r="30%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        {/* Свечение вокруг */}
        <radialGradient id={`aura-${type}`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={c.glow} stopOpacity="0.3" />
          <stop offset="100%" stopColor={c.glow} stopOpacity="0" />
        </radialGradient>
        {/* Тень под телом */}
        <radialGradient id={`shadow-${type}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <filter id={`soft-${type}`}>
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>

      {/* Аура (мягкое свечение) */}
      <circle cx="60" cy="55" r="50" fill={`url(#aura-${type})`} className="companion-pulse" />

      {/* Тень под телом */}
      <ellipse cx="60" cy="105" rx="28" ry="6" fill={`url(#shadow-${type})`} />

      {/* Тело — плавная форма с покачиванием */}
      <g className="companion-bob">
        {stage === 'egg' ? (
          <>
            <ellipse cx="60" cy="60" rx="34" ry="42" fill={`url(#body-${type})`} filter={`url(#soft-${type})`} />
            <ellipse cx="48" cy="45" rx="14" ry="18" fill={`url(#shine-${type})`} />
          </>
        ) : (
          <>
            {/* Основное тело — слегка сплюснутый круг */}
            <ellipse cx="60" cy="58" rx="38" ry="36" fill={`url(#body-${type})`} filter={`url(#soft-${type})`} />
            {/* Блик света (как на 3D-шаре) */}
            <ellipse cx="47" cy="40" rx="16" ry="13" fill={`url(#shine-${type})`} />
            {/* Маленькие ножки/основание */}
            <ellipse cx="48" cy="92" rx="8" ry="5" fill={c.main} opacity="0.6" />
            <ellipse cx="72" cy="92" rx="8" ry="5" fill={c.main} opacity="0.6" />
          </>
        )}

        {/* Глаза */}
        {stage !== 'egg' && (
          <>
            {blink ? (
              <>
                <path d="M42 52 Q49 56 56 52" stroke="#1A1A2E" strokeWidth="2.8" fill="none" strokeLinecap="round" />
                <path d="M64 52 Q71 56 78 52" stroke="#1A1A2E" strokeWidth="2.8" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                {/* Белок */}
                <ellipse cx="49" cy="52" rx="7" ry="8" fill="#FFFFFF" />
                <ellipse cx="71" cy="52" rx="7" ry="8" fill="#FFFFFF" />
                {/* Зрачок с градиентом */}
                <circle cx="50" cy="53" r="4" fill="#1A1A2E" />
                <circle cx="72" cy="53" r="4" fill="#1A1A2E" />
                {/* Блики в глазах */}
                <circle cx="51.5" cy="51" r="1.8" fill="#FFFFFF" />
                <circle cx="73.5" cy="51" r="1.8" fill="#FFFFFF" />
                <circle cx="48.5" cy="54.5" r="0.8" fill="#FFFFFF" opacity="0.7" />
                <circle cx="70.5" cy="54.5" r="0.8" fill="#FFFFFF" opacity="0.7" />
              </>
            )}
          </>
        )}

        {/* Рот */}
        {stage !== 'egg' && happy && (
          <path d="M50 68 Q60 78 70 68" stroke="#1A1A2E" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        )}
        {stage !== 'egg' && !happy && !sad && (
          <line x1="53" y1="70" x2="67" y2="70" stroke="#1A1A2E" strokeWidth="2.8" strokeLinecap="round" />
        )}
        {stage !== 'egg' && sad && (
          <path d="M50 74 Q60 66 70 74" stroke="#1A1A2E" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        )}

        {/* Румянец при счастье */}
        {happy && stage !== 'egg' && (
          <>
            <ellipse cx="38" cy="63" rx="5" ry="3.5" fill={c.accent} opacity="0.35" />
            <ellipse cx="82" cy="63" rx="5" ry="3.5" fill={c.accent} opacity="0.35" />
          </>
        )}

        {/* Тип-маркер (макушка) */}
        {type === 'leaf' && stage !== 'egg' && (
          <g>
            <path d="M60 22 Q68 8 60 2 Q52 8 60 22" fill={c.main} />
            <path d="M60 18 Q64 10 60 6" stroke={c.light} strokeWidth="1" fill="none" />
          </g>
        )}
        {type === 'flame' && stage !== 'egg' && (
          <path d="M60 22 Q70 6 60 -2 Q50 6 60 22" fill={c.accent} className="companion-flame" />
        )}
        {type === 'drop' && stage !== 'egg' && (
          <ellipse cx="60" cy="8" rx="5" ry="8" fill={c.light} opacity="0.8" />
        )}
        {type === 'spark' && stage !== 'egg' && (
          <g opacity="0.8">
            <circle cx="60" cy="8" r="2" fill={c.accent} />
            <circle cx="54" cy="12" r="1.5" fill={c.accent} />
            <circle cx="66" cy="12" r="1.5" fill={c.accent} />
          </g>
        )}
      </g>

      {/* Экипировка (шапки, очки) — рисуется поверх */}
      <EquipLayer type={type} />
    </svg>
  );
}

/** Слой экипировки (пока статичный, расширить из equipped данных) */
function EquipLayer({ type }) {
  // Заглушка — в будущем будет читать equipped из props
  return null;
}
