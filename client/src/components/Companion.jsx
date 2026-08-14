import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const TYPE_COLORS = {
  spark: { main: '#7C3AED', light: '#A78BFA', glow: '#C4B5FD', accent: '#FBBF24' },
  leaf: { main: '#10B981', light: '#34D399', glow: '#6EE7B7', accent: '#84CC16' },
  drop: { main: '#06B6D4', light: '#22D3EE', glow: '#67E8F9', accent: '#3B82F6' },
  flame: { main: '#F59E0B', light: '#FBBF24', glow: '#FCD34D', accent: '#EF4444' },
};

/** Пузыри речи (Finch-паттерн: whimsical, zero-guilt, зависит от настроения/стадии) */
const PHRASES = {
  egg: [
    'Внутри что-то тёплое шевелится…',
    'Скоро вылуплюсь!коплю силу',
    'Тссс. Я Growing.',
    'Каждая твоя отметка греет моё яичко 🌡️',
  ],
  happy: [
    'Сегодня лучший день! А завтра будет ещё лучше!',
    'Я так тобой горжусь ✨',
    'Давай танцевать! Лапки сами танцуют!',
    'У меня отличное настроение, чувствую?',
  ],
  ok: [
    'Спокойный и ровный день. Это тоже хорошо.',
    'Я тут, рядом. Всегда.',
    'Что загадаешь на завтра?',
    'Потихоньку-полегоньку 🌱',
  ],
  sleepy: [
    'Я не грущу — просто дремлю. Зайди расскажешь, как дела 💜',
    'Перерывы — это нормально. Я никуда не денусь.',
    'Смотрю в окошко и жду тебя 🌤️',
    'Сон — тоже привычка, между прочим 😴',
  ],
};

const STAGE_LABEL = { egg: '🥚 Яйцо', baby: '👶 Малыш', teen: '🧒 Подросток', adult: '🌟 Взрослый' };

/**
 * Living Companion v3:
 * + live-refresh (prop tick — инкрементится после каждой отметки)
 * + событие эволюции (onEvolve при смене стадии)
 * + пузырь речи (меняется на каждый reload)
 * + тап: haptic + звук + сердечки
 * + динамическая карта эмодзи предметов из /shop (без хардкода)
 */
export default function Companion({ tick = 0, onEvolve, haptic, playSound }) {
  const [data, setData] = useState(null);
  const [blink, setBlink] = useState(false);
  const [pet, setPet] = useState(false);
  const [hearts, setHearts] = useState([]);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [emojiMap, setEmojiMap] = useState({});
  const petTimer = useRef(null);
  const prevStage = useRef(null);
  const heartId = useRef(0);

  const load = async () => {
    try {
      const d = await api.getCompanion();
      // Эволюция?
      if (prevStage.current && d.stage && d.stage !== prevStage.current &&
          ['egg', 'baby', 'teen', 'adult'].indexOf(d.stage) > ['egg', 'baby', 'teen', 'adult'].indexOf(prevStage.current)) {
        onEvolve?.({ from: prevStage.current, to: d.stage, name: d.name });
      }
      prevStage.current = d.stage;
      setData(d);
      setPhraseIdx((i) => i + 1); // новая реплика на каждый reload
    } catch {}
  };

  // Динамическая карта эмодзи предметов (ФИКС: без хардкода)
  useEffect(() => {
    api.getCompanionShop().then((items) => {
      const m = {};
      for (const it of items || []) m[it.code] = it.emoji;
      setEmojiMap(m);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tick > 0) load(); }, [tick]);

  useEffect(() => {
    if (!data) return;
    let blinkTimer = null;
    const tickFn = () => { setBlink(true); blinkTimer = setTimeout(() => setBlink(false), 160); };
    const interval = setInterval(tickFn, 3500 + Math.random() * 2500);
    return () => { clearInterval(interval); if (blinkTimer) clearTimeout(blinkTimer); };
  }, [data]);

  const handlePet = () => {
    setPet(true);
    haptic?.('light');
    playSound?.('pop');
    if (petTimer.current) clearTimeout(petTimer.current);
    petTimer.current = setTimeout(() => setPet(false), 350);
    // сердечки
    const id = ++heartId.current;
    setHearts((h) => [...h, { id, x: Math.random() * 60 - 30, d: Math.random() * 0.3 }]);
    setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1200);
  };
  useEffect(() => () => { if (petTimer.current) clearTimeout(petTimer.current); }, []);

  if (!data) return null;

  const colors = TYPE_COLORS[data.type] || TYPE_COLORS.spark;
  const moodEmoji = data.mood >= 70 ? '😊' : data.mood >= 40 ? '😐' : '😴';
  const moodLabel = data.mood >= 70 ? 'Счастлив' : data.mood >= 40 ? 'Норм' : 'Дремлет';
  const stageProgressTotal = data.xpToNext - data.xpForThis;
  const xpProgress = stageProgressTotal > 0 ? Math.round(((data.xp - data.xpForThis) / stageProgressTotal) * 100) : 0;

  const phrasePool = data.stage === 'egg' ? PHRASES.egg
    : data.mood >= 70 ? PHRASES.happy
    : data.mood >= 40 ? PHRASES.ok
    : PHRASES.sleepy;
  const phrase = phrasePool[phraseIdx % phrasePool.length];

  const nearHatch = data.stage === 'egg' && xpProgress >= 80;
  // Вылупление на уровне 2 (50 XP): осталось N отметок по 15 XP
  const checksToHatch = data.stage === 'egg' ? Math.max(1, Math.ceil((50 - data.xp) / 15)) : 0;
  const size = data.stage === 'egg' ? 60 : data.stage === 'baby' ? 68 : data.stage === 'teen' ? 76 : 84;

  return (
    <div className="companion-card glass" onClick={handlePet}>
      <div className="companion-stage-wrap">
        {/* Пузырь речи */}
        <div className="companion-bubble" key={phraseIdx}>{phrase}</div>

        <div className="companion-creature" style={{
          transform: pet ? 'scale(1.12) rotate(-3deg)' : 'scale(1)',
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <div className={nearHatch ? 'egg-wobble' : undefined}>
            <Creature type={data.type} stage={data.stage} blink={blink} mood={data.mood} size={size} colors={colors} equipped={data.equipped} emojiMap={emojiMap} />
          </div>
          {/* Сердечки на тап */}
          {hearts.map((h) => (
            <span key={h.id} className="pet-heart" style={{ '--hx': `${h.x}px`, '--hd': `${h.d}s` }}>💜</span>
          ))}
        </div>
      </div>

      <div className="companion-info">
        <div className="companion-name-row">
          <strong>{data.name}</strong>
          <span className="companion-mood">{moodEmoji} {moodLabel}</span>
        </div>
        <div className="companion-level">
          Lv {data.level} · {STAGE_LABEL[data.stage]}
          {data.stage === 'egg' && (
            <span className="hatch-hint">🐣 вылупится через ~{checksToHatch} {checksToHatch === 1 ? 'отметку' : 'отметок'}</span>
          )}
        </div>
        <div className="companion-xp-bar">
          <div className="companion-xp-fill" style={{ width: `${xpProgress}%` }} />
        </div>
        <span className="companion-xp-text">{data.xp} / {data.xpToNext} XP</span>
      </div>
    </div>
  );
}

/** Премиум SVG-существо */
function Creature({ type, stage, blink, mood, size, colors, equipped, emojiMap }) {
  const c = colors;
  const happy = mood >= 70;
  const sad = mood < 40;

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`body-${type}`} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={c.glow} />
          <stop offset="50%" stopColor={c.light} />
          <stop offset="100%" stopColor={c.main} />
        </radialGradient>
        <radialGradient id={`shine-${type}`} cx="35%" cy="25%" r="30%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`aura-${type}`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={c.glow} stopOpacity="0.3" />
          <stop offset="100%" stopColor={c.glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`shadow-${type}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <filter id={`soft-${type}`}>
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>

      <circle cx="60" cy="55" r="50" fill={`url(#aura-${type})`} className="companion-pulse" />
      <ellipse cx="60" cy="105" rx="28" ry="6" fill={`url(#shadow-${type})`} />

      <g className="companion-bob">
        {stage === 'egg' ? (
          <>
            <ellipse cx="60" cy="60" rx="34" ry="42" fill={`url(#body-${type})`} filter={`url(#soft-${type})`} />
            <ellipse cx="48" cy="45" rx="14" ry="18" fill={`url(#shine-${type})`} />
            {/* трещинки ближе к вылуплению */}
            {happy && <path d="M60 25 L57 35 L63 42" stroke={c.main} strokeWidth="1.5" fill="none" opacity="0.5" />}
          </>
        ) : (
          <>
            <ellipse cx="60" cy="58" rx="38" ry="36" fill={`url(#body-${type})`} filter={`url(#soft-${type})`} />
            <ellipse cx="47" cy="40" rx="16" ry="13" fill={`url(#shine-${type})`} />
            <ellipse cx="48" cy="92" rx="8" ry="5" fill={c.main} opacity="0.6" />
            <ellipse cx="72" cy="92" rx="8" ry="5" fill={c.main} opacity="0.6" />
          </>
        )}

        {stage !== 'egg' && (
          <>
            {blink ? (
              <>
                <path d="M42 52 Q49 56 56 52" stroke="#1A1A2E" strokeWidth="2.8" fill="none" strokeLinecap="round" />
                <path d="M64 52 Q71 56 78 52" stroke="#1A1A2E" strokeWidth="2.8" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx="49" cy="52" rx="7" ry="8" fill="#FFFFFF" />
                <ellipse cx="71" cy="52" rx="7" ry="8" fill="#FFFFFF" />
                <circle cx="50" cy="53" r="4" fill="#1A1A2E" />
                <circle cx="72" cy="53" r="4" fill="#1A1A2E" />
                <circle cx="51.5" cy="51" r="1.8" fill="#FFFFFF" />
                <circle cx="73.5" cy="51" r="1.8" fill="#FFFFFF" />
                <circle cx="48.5" cy="54.5" r="0.8" fill="#FFFFFF" opacity="0.7" />
                <circle cx="70.5" cy="54.5" r="0.8" fill="#FFFFFF" opacity="0.7" />
              </>
            )}
          </>
        )}

        {stage !== 'egg' && happy && <path d="M50 68 Q60 78 70 68" stroke="#1A1A2E" strokeWidth="2.8" fill="none" strokeLinecap="round" />}
        {stage !== 'egg' && !happy && !sad && <line x1="53" y1="70" x2="67" y2="70" stroke="#1A1A2E" strokeWidth="2.8" strokeLinecap="round" />}
        {stage !== 'egg' && sad && <path d="M50 74 Q60 66 70 74" stroke="#1A1A2E" strokeWidth="2.8" fill="none" strokeLinecap="round" />}

        {happy && stage !== 'egg' && (
          <>
            <ellipse cx="38" cy="63" rx="5" ry="3.5" fill={c.accent} opacity="0.35" />
            <ellipse cx="82" cy="63" rx="5" ry="3.5" fill={c.accent} opacity="0.35" />
          </>
        )}

        {type === 'leaf' && stage !== 'egg' && (
          <g><path d="M60 22 Q68 8 60 2 Q52 8 60 22" fill={c.main} /><path d="M60 18 Q64 10 60 6" stroke={c.light} strokeWidth="1" fill="none" /></g>
        )}
        {type === 'flame' && stage !== 'egg' && <path d="M60 22 Q70 6 60 -2 Q50 6 60 22" fill={c.accent} className="companion-flame" />}
        {type === 'drop' && stage !== 'egg' && <ellipse cx="60" cy="8" rx="5" ry="8" fill={c.light} opacity="0.8" />}
        {type === 'spark' && stage !== 'egg' && (
          <g opacity="0.8"><circle cx="60" cy="8" r="2" fill={c.accent} /><circle cx="54" cy="12" r="1.5" fill={c.accent} /><circle cx="66" cy="12" r="1.5" fill={c.accent} /></g>
        )}
      </g>

      {/* Экипировка поверх */}
      {equipped && <EquipLayer equipped={equipped} stage={stage} emojiMap={emojiMap} />}
    </svg>
  );
}

/** Слой экипировки: эмодзи берутся из /shop (динамически) */
function EquipLayer({ equipped, stage, emojiMap }) {
  if (stage === 'egg') return null;
  const hat = emojiMap[equipped.hat] || FALLBACK_EMOJI[equipped.hat];
  const glasses = emojiMap[equipped.glasses] || FALLBACK_EMOJI[equipped.glasses];
  const acc = emojiMap[equipped.accessory] || FALLBACK_EMOJI[equipped.accessory];
  if (!hat && !glasses && !acc) return null;

  return (
    <g pointerEvents="none">
      {hat && <text x={60} y={16} fontSize={26} textAnchor="middle" transform="rotate(-12 60 16)">{hat}</text>}
      {glasses && <text x={60} y={58} fontSize={26} textAnchor="middle">{glasses}</text>}
      {acc && <text x={96} y={80} fontSize={22} textAnchor="middle">{acc}</text>}
    </g>
  );
}

/** Fallback, пока /shop не загрузился */
const FALLBACK_EMOJI = {
  hat_crown: '👑', hat_cap: '🧢', hat_top: '🎩', hat_party: '🥳',
  glasses_sun: '🕶️', glasses_round: '🤓', glasses_3d: '🥽',
  acc_bow: '🎀', acc_wings: '🦋', acc_halo: '😇', acc_fire: '💫',
};
