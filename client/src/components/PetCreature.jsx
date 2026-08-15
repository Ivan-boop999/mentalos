import { useEffect, useRef, useState } from 'react';

/**
 * PetCreature — полноэкранный SVG питомец с разными силуэтами по стадиям.
 * Стадии: egg (яйцо+трещины) → baby (круглый, большие глаза) → teen (вытянутый, ушки) → adult (полная форма, хвост, узор)
 */

export default function PetCreature({ stage = 'egg', species = 'spark', colors = {}, mood = 50, size = 200, equipped = {}, emojiMap = {}, onZoneTap }) {
  const [blink, setBlink] = useState(false);
  const [react, setReact] = useState(null); // 'laugh' | 'tickle' | 'wave' | null
  const reactTimer = useRef(null);

  const c = {
    main: colors.main || '#7C3AED',
    light: colors.light || '#A78BFA',
    glow: colors.glow || '#C4B5FD',
    accent: colors.accent || '#FBBF24',
  };

  const happy = mood >= 70;
  const sad = mood < 40;
  const sleeping = mood < 20;

  useEffect(() => {
    if (stage === 'egg' || sleeping) return;
    let t = null;
    const tick = () => { setBlink(true); t = setTimeout(() => setBlink(false), 160); };
    const iv = setInterval(tick, 3000 + Math.random() * 3000);
    return () => { clearInterval(iv); if (t) clearTimeout(t); };
  }, [stage, sleeping]);

  const zoneTap = (zone) => {
    const reactions = {
      head: { name: 'laugh', text: '😊 Хи-хи!' },
      body: { name: 'tickle', text: '🤣 Щекотно!' },
      feet: { name: 'wave', text: '👋 Привет!' },
    };
    const r = reactions[zone];
    if (!r) return;
    setReact(r.name);
    onZoneTap?.(r.text);
    if (reactTimer.current) clearTimeout(reactTimer.current);
    reactTimer.current = setTimeout(() => setReact(null), 1200);
  };

  const uid = `${species}-${stage}`;
  const eyes = sleeping || blink;

  return (
    <div style={{ position: 'relative', width: size, height: size * 1.1 }}>
      <svg width={size} height={size * 1.1} viewBox="0 0 200 220" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id={`bg-${uid}`} cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor={c.glow} />
            <stop offset="50%" stopColor={c.light} />
            <stop offset="100%" stopColor={c.main} />
          </radialGradient>
          <radialGradient id={`shine-${uid}`} cx="35%" cy="25%" r="30%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`aura-${uid}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor={c.glow} stopOpacity="0.25" />
            <stop offset="100%" stopColor={c.glow} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Аура */}
        <circle cx="100" cy="105" r="90" fill={`url(#aura-${uid})`} className="companion-pulse" />

        {/* Тень */}
        <ellipse cx="100" cy="208" rx="55" ry="10" fill="#000" opacity="0.15" />

        <g className="companion-bob" style={{ transform: react === 'tickle' ? 'rotate(5deg)' : react === 'laugh' ? 'translateY(-4px)' : undefined, transformOrigin: '100px 110px', transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>

          {stage === 'egg' && <EggShape c={c} uid={uid} onZoneTap={zoneTap} />}
          {stage === 'baby' && <BabyShape c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} sleeping={sleeping} onZoneTap={zoneTap} />}
          {stage === 'teen' && <TeenShape c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} sleeping={sleeping} onZoneTap={zoneTap} />}
          {stage === 'adult' && <AdultShape c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} sleeping={sleeping} onZoneTap={zoneTap} />}

          {/* Экипировка поверх */}
          {stage !== 'egg' && equipped && (
            <g pointerEvents="none">
              {emojiMap[equipped.hat] && (
                <text x="100" y={stage === 'baby' ? 25 : stage === 'teen' ? 12 : 5} fontSize="36" textAnchor="middle" transform={`rotate(-8 100 ${stage === 'baby' ? 25 : 12})`}>
                  {emojiMap[equipped.hat]}
                </text>
              )}
              {emojiMap[equipped.glasses] && (
                <text x="100" y={stage === 'baby' ? 90 : 85} fontSize="30" textAnchor="middle">{emojiMap[equipped.glasses]}</text>
              )}
              {emojiMap[equipped.accessory] && (
                <text x={stage === 'adult' ? 165 : 155} y={stage === 'baby' ? 140 : 130} fontSize="28" textAnchor="middle">{emojiMap[equipped.accessory]}</text>
              )}
            </g>
          )}

          {/* Реакция: Zzz при сне */}
          {sleeping && <text x="155" y="60" fontSize="24" className="pet-zzz">💤</text>}
          {react === 'wave' && <text x="150" y="100" fontSize="24" style={{ animation: 'float 1s ease' }}>👋</text>}
        </g>
      </svg>

      {/* Тап-зоны (прозрачные, поверх SVG) */}
      {stage !== 'egg' && (
        <>
          <div style={{ position: 'absolute', top: 0, left: '25%', width: '50%', height: '35%', cursor: 'pointer' }} onClick={() => zoneTap('head')} />
          <div style={{ position: 'absolute', top: '35%', left: '20%', width: '60%', height: '45%', cursor: 'pointer' }} onClick={() => zoneTap('body')} />
          <div style={{ position: 'absolute', bottom: 0, left: '30%', width: '40%', height: '20%', cursor: 'pointer' }} onClick={() => zoneTap('feet')} />
        </>
      )}
    </div>
  );
}

// ===== EGG: яйцо с трещинками =====
function EggShape({ c, uid, onZoneTap }) {
  return (
    <g>
      {/* Тап по яйцу = погреть */}
      <ellipse cx="100" cy="110" rx="62" ry="78" fill={`url(#bg-${uid})`} onClick={() => onZoneTap('body')} style={{ cursor: 'pointer' }} />
      <ellipse cx="80" cy="80" rx="24" ry="32" fill={`url(#shine-${uid})`} />
      {/* Трещинки (появляются при высоком xp) */}
      <path d="M90 50 L85 65 L95 72 L88 85" stroke={c.main} strokeWidth="2" fill="none" opacity="0.4" />
      <path d="M110 60 L115 75 L108 82" stroke={c.main} strokeWidth="1.5" fill="none" opacity="0.3" />
      {/* Пятнышки */}
      <ellipse cx="85" cy="130" rx="12" ry="18" fill={c.light} opacity="0.3" />
      <ellipse cx="115" cy="100" rx="8" ry="12" fill={c.light} opacity="0.2" />
    </g>
  );
}

// ===== BABY: круглый, большие глаза, крохотные лапки =====
function BabyShape({ c, uid, eyes, happy, sad, sleeping, onZoneTap }) {
  return (
    <g>
      {/* Тело — почти идеальный круг */}
      <circle cx="100" cy="110" r="70" fill={`url(#bg-${uid})`} />
      <ellipse cx="75" cy="75" rx="28" ry="22" fill={`url(#shine-${uid})`} />
      {/* Крохотные лапки */}
      <ellipse cx="60" cy="170" rx="14" ry="10" fill={c.main} opacity="0.7" />
      <ellipse cx="140" cy="170" rx="14" ry="10" fill={c.main} opacity="0.7" />
      {/* Пупырышка */}
      <circle cx="100" cy="140" r="5" fill={c.light} opacity="0.5" />

      {/* Большие глаза (baby = непропорционально большие) */}
      {!eyes ? (
        <>
          <ellipse cx="80" cy="95" rx="13" ry="15" fill="#FFF" />
          <ellipse cx="120" cy="95" rx="13" ry="15" fill="#FFF" />
          <circle cx="82" cy="97" r="7" fill="#1A1A2E" />
          <circle cx="122" cy="97" r="7" fill="#1A1A2E" />
          <circle cx="85" cy="94" r="3" fill="#FFF" />
          <circle cx="125" cy="94" r="3" fill="#FFF" />
        </>
      ) : (
        <>
          <path d="M70 95 Q80 102 90 95" stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M110 95 Q120 102 130 95" stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Рот */}
      {happy && <path d="M88 125 Q100 138 112 125" stroke="#1A1A2E" strokeWidth="3.5" fill="none" strokeLinecap="round" />}
      {!happy && !sad && <line x1="92" y1="127" x2="108" y2="127" stroke="#1A1A2E" strokeWidth="3.5" strokeLinecap="round" />}
      {sad && <path d="M88 133 Q100 122 112 133" stroke="#1A1A2E" strokeWidth="3.5" fill="none" strokeLinecap="round" />}

      {/* Румянец */}
      {happy && <>
        <ellipse cx="62" cy="112" rx="8" ry="5" fill={c.accent} opacity="0.3" />
        <ellipse cx="138" cy="112" rx="8" ry="5" fill={c.accent} opacity="0.3" />
      </>}

      {/* Маленький хвостик-росток */}
      <path d="M100 38 Q108 20 100 8 Q92 20 100 38" fill={c.accent} opacity="0.6" />
    </g>
  );
}

// ===== TEEN: вытянутый, ушки, хвостик =====
function TeenShape({ c, uid, eyes, happy, sad, sleeping, onZoneTap }) {
  return (
    <g>
      {/* Ушки */}
      <path d="M55 55 Q40 20 55 5 Q65 20 60 50" fill={c.light} stroke={c.main} strokeWidth="2" />
      <path d="M145 55 Q160 20 145 5 Q135 20 140 50" fill={c.light} stroke={c.main} strokeWidth="2" />
      {/* Внутренние ушки */}
      <path d="M57 45 Q50 25 56 15 Q61 25 59 42" fill={c.accent} opacity="0.3" />
      <path d="M143 45 Q150 25 144 15 Q139 25 141 42" fill={c.accent} opacity="0.3" />

      {/* Тело — вытянутый овал */}
      <ellipse cx="100" cy="115" rx="65" ry="80" fill={`url(#bg-${uid})`} />
      <ellipse cx="75" cy="70" rx="25" ry="30" fill={`url(#shine-${uid})`} />

      {/* Лапки (более выраженные) */}
      <ellipse cx="50" cy="180" rx="16" ry="12" fill={c.main} />
      <ellipse cx="150" cy="180" rx="16" ry="12" fill={c.main} />

      {/* Хвостик */}
      <path d="M165 130 Q185 120 180 100" stroke={c.main} strokeWidth="8" fill="none" strokeLinecap="round" />

      {/* Глаза (меньше чем baby) */}
      {!eyes ? (
        <>
          <ellipse cx="80" cy="90" rx="10" ry="12" fill="#FFF" />
          <ellipse cx="120" cy="90" rx="10" ry="12" fill="#FFF" />
          <circle cx="82" cy="92" r="5.5" fill="#1A1A2E" />
          <circle cx="122" cy="92" r="5.5" fill="#1A1A2E" />
          <circle cx="84" cy="90" r="2.5" fill="#FFF" />
          <circle cx="124" cy="90" r="2.5" fill="#FFF" />
        </>
      ) : (
        <>
          <path d="M70 90 Q80 97 90 90" stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M110 90 Q120 97 130 90" stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Рот + брови (teen = характер) */}
      {happy && <path d="M88 118 Q100 132 112 118" stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {!happy && !sad && <line x1="92" y1="120" x2="108" y2="120" stroke="#1A1A2E" strokeWidth="3" strokeLinecap="round" />}
      {sad && <path d="M88 126 Q100 114 112 126" stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {/* Бровки */}
      <path d="M70 75 Q80 70 90 73" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.5" />
      <path d="M110 73 Q120 70 130 75" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.5" />

      {/* Румянец */}
      {happy && <>
        <ellipse cx="58" cy="105" rx="7" ry="4.5" fill={c.accent} opacity="0.25" />
        <ellipse cx="142" cy="105" rx="7" ry="4.5" fill={c.accent} opacity="0.25" />
      </>}

      {/* Узор на теле (появляется в teen) */}
      <path d="M85 155 Q100 148 115 155" stroke={c.glow} strokeWidth="3" fill="none" opacity="0.3" />
    </g>
  );
}

// ===== ADULT: полная форма, все детали =====
function AdultShape({ c, uid, eyes, happy, sad, sleeping, onZoneTap }) {
  return (
    <g>
      {/* Большие уши */}
      <path d="M50 50 Q30 10 50 -10 Q65 10 58 45" fill={c.light} stroke={c.main} strokeWidth="2.5" />
      <path d="M150 50 Q170 10 150 -10 Q135 10 142 45" fill={c.light} stroke={c.main} strokeWidth="2.5" />
      <path d="M53 40 Q45 18 51 8 Q57 18 55 35" fill={c.accent} opacity="0.25" />
      <path d="M147 40 Q155 18 149 8 Q143 18 145 35" fill={c.accent} opacity="0.25" />

      {/* Тело — грушевидная форма */}
      <path d="M100 30 C 55 30 40 70 40 110 C 40 160 65 195 100 195 C 135 195 160 160 160 110 C 160 70 145 30 100 30 Z" fill={`url(#bg-${uid})`} />
      <ellipse cx="72" cy="60" rx="28" ry="35" fill={`url(#shine-${uid})`} />

      {/* Сильные лапы */}
      <ellipse cx="42" cy="188" rx="18" ry="14" fill={c.main} />
      <ellipse cx="158" cy="188" rx="18" ry="14" fill={c.main} />
      {/* Пальцы-линии */}
      <path d="M35 185 L35 192 M42 183 L42 193 M49 185 L49 192" stroke={c.light} strokeWidth="1.5" opacity="0.3" />
      <path d="M151 185 L151 192 M158 183 L158 193 M165 185 L165 192" stroke={c.light} strokeWidth="1.5" opacity="0.3" />

      {/* Большой хвост с узором */}
      <path d="M160 140 Q195 125 185 95 Q180 80 170 85" stroke={c.main} strokeWidth="12" fill="none" strokeLinecap="round" />
      <circle cx="170" cy="85" r="8" fill={c.accent} opacity="0.4" />

      {/* Глаза (взрослые, уверенные) */}
      {!eyes ? (
        <>
          <ellipse cx="80" cy="85" rx="9" ry="11" fill="#FFF" />
          <ellipse cx="120" cy="85" rx="9" ry="11" fill="#FFF" />
          <circle cx="82" cy="87" r="5" fill="#1A1A2E" />
          <circle cx="122" cy="87" r="5" fill="#1A1A2E" />
          <circle cx="84" cy="85" r="2.2" fill="#FFF" />
          <circle cx="124" cy="85" r="2.2" fill="#FFF" />
          <circle cx="80" cy="89" r="1" fill="#FFF" opacity="0.6" />
          <circle cx="120" cy="89" r="1" fill="#FFF" opacity="0.6" />
        </>
      ) : (
        <>
          <path d="M72 85 Q80 91 88 85" stroke="#1A1A2E" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M112 85 Q120 91 128 85" stroke="#1A1A2E" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Рот + выраженные брови */}
      {happy && <path d="M88 112 Q100 126 112 112" stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {!happy && !sad && <line x1="92" y1="114" x2="108" y2="114" stroke="#1A1A2E" strokeWidth="3" strokeLinecap="round" />}
      {sad && <path d="M88 120 Q100 108 112 120" stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />}
      <path d="M68 70 Q80 64 92 68" stroke={c.main} strokeWidth="3" fill="none" opacity="0.4" />
      <path d="M108 68 Q120 64 132 70" stroke={c.main} strokeWidth="3" fill="none" opacity="0.4" />

      {/* Румянец */}
      {happy && <>
        <ellipse cx="55" cy="100" rx="8" ry="5" fill={c.accent} opacity="0.2" />
        <ellipse cx="145" cy="100" rx="8" ry="5" fill={c.accent} opacity="0.2" />
      </>}

      {/* Грудной узор (только adult) */}
      <path d="M85 150 Q100 142 115 150 Q100 160 85 150 Z" fill={c.glow} opacity="0.25" />
      {/* Боковые узоры */}
      <path d="M45 120 Q55 112 60 120" stroke={c.glow} strokeWidth="2.5" fill="none" opacity="0.2" />
      <path d="M140 120 Q145 112 155 120" stroke={c.glow} strokeWidth="2.5" fill="none" opacity="0.2" />

      {/* Ореол/корона-позиция для экипировки */}
      <circle cx="100" cy="20" r="3" fill={c.accent} opacity="0.4" />
    </g>
  );
}
