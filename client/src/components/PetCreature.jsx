import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * PetCreature v2 — «Finch-стек» (research-подтверждённый подход):
 * - Дыхание: CSS scale от center bottom (тело «дышит» от лап)
 * - Моргание: случайные интервалы (не метроном)
 * - Eye tracking: глаза следят за пальцем (atan2)
 * - Squash & stretch: на тап с сохранением объёма
 * - Псевдо-3D: лёгкий rotateY при наклоне/пальце
 * - Партиклы: сердечки на тап
 * - Idle-циклы: покачивание головы, preening
 */

export default function PetCreature({ stage = 'egg', species = 'spark', colors = {}, mood = 50, size = 200, equipped = {}, emojiMap = {}, onZoneTap, haptic }) {
  const [blink, setBlink] = useState(false);
  const [react, setReact] = useState(null);
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 }); // от -1 до 1
  const [tilt, setTilt] = useState(0); // rotateY для псевдо-3D
  const [squash, setSquash] = useState(false);
  const [hearts, setHearts] = useState([]);
  const reactTimer = useRef(null);
  const squashTimer = useRef(null);
  const heartId = useRef(0);
  const containerRef = useRef(null);

  const c = {
    main: colors.main || '#7C3AED',
    light: colors.light || '#A78BFA',
    glow: colors.glow || '#C4B5FD',
    accent: colors.accent || '#FBBF24',
  };

  const happy = mood >= 70;
  const sad = mood < 40;
  const sleeping = mood < 20;

  // === МОРГАНИЕ (случайные интервалы, не метроном) ===
  useEffect(() => {
    if (stage === 'egg' || sleeping) return;
    let t = null;
    let iv = null;
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 4000; // 2-6 сек
      iv = setTimeout(() => {
        setBlink(true);
        t = setTimeout(() => setBlink(false), 140);
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
    return () => { clearTimeout(iv); clearTimeout(t); };
  }, [stage, sleeping]);

  // === EYE TRACKING (глаза следят за пальцем) ===
  const handlePointerMove = useCallback((e) => {
    if (!containerRef.current || stage === 'egg' || sleeping) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.45; // уровень глаз
    const dx = (e.clientX - cx) / (rect.width / 2); // -1..1
    const dy = (e.clientY - cy) / (rect.height / 2);
    // Ограничиваем радиус
    setEyePos({ x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
    // Псевдо-3D наклон
    setTilt(dx * 8); // max 8deg rotateY
  }, [stage, sleeping]);

  // === SQUASH & STRETCH на тап ===
  const doSquash = useCallback(() => {
    setSquash(true);
    if (squashTimer.current) clearTimeout(squashTimer.current);
    squashTimer.current = setTimeout(() => setSquash(false), 300);
  }, []);

  // === ПАРТИКЛЫ ===
  const spawnHearts = useCallback((n = 3) => {
    const items = Array.from({ length: n }, (_, i) => ({
      id: ++heartId.current,
      x: Math.random() * 80 - 40,
      delay: Math.random() * 0.3,
      scale: 0.7 + Math.random() * 0.5,
    }));
    setHearts((h) => [...h, ...items]);
    setTimeout(() => {
      setHearts((h) => h.filter((x) => !items.find((i) => i.id === x.id)));
    }, 1500);
  }, []);

  useEffect(() => () => {
    if (reactTimer.current) clearTimeout(reactTimer.current);
    if (squashTimer.current) clearTimeout(squashTimer.current);
  }, []);

  const zoneTap = (zone) => {
    const reactions = {
      head: { name: 'laugh', text: '😊 Хи-хи!' },
      body: { name: 'tickle', text: '🤣 Щекотно!' },
      feet: { name: 'wave', text: '👋 Привет!' },
    };
    const r = reactions[zone];
    if (!r) return;
    setReact(r.name);
    setSquash(true);
    setTimeout(() => setSquash(false), 250);
    spawnHearts(zone === 'head' ? 5 : 3);
    haptic?.('light');
    onZoneTap?.(r.text);
    if (reactTimer.current) clearTimeout(reactTimer.current);
    reactTimer.current = setTimeout(() => setReact(null), 1200);
  };

  const uid = `${species}-${stage}`;
  const eyes = sleeping || blink;
  const eyeOffset = { x: eyePos.x * 4, y: eyePos.y * 3 }; // px внутри SVG

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => { setEyePos({ x: 0, y: 0 }); setTilt(0); }}
      style={{
        position: 'relative', width: size, height: size * 1.1,
        perspective: '600px', // для псевдо-3D
        cursor: 'pointer',
        touchAction: 'none',
      }}
    >
      <svg
        width={size} height={size * 1.1} viewBox="0 0 200 220"
        style={{
          overflow: 'visible',
          transform: `rotateY(${tilt}deg)`,
          transition: 'transform 0.15s ease-out',
          transformStyle: 'preserve-3d',
        }}
      >
        <defs>
          <radialGradient id={`bg-${uid}`} cx="38%" cy="30%" r="75%">
            <stop offset="0%" stopColor={c.glow} />
            <stop offset="50%" stopColor={c.light} />
            <stop offset="100%" stopColor={c.main} />
          </radialGradient>
          <radialGradient id={`shine-${uid}`} cx="35%" cy="25%" r="30%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`aura-${uid}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor={c.glow} stopOpacity="0.2" />
            <stop offset="100%" stopColor={c.glow} stopOpacity="0" />
          </radialGradient>
          <filter id={`soft-${uid}`}><feGaussianBlur stdDeviation="0.4" /></filter>
        </defs>

        {/* Аура */}
        <circle cx="100" cy="105" r="90" fill={`url(#aura-${uid})`} className="companion-pulse" />

        {/* Тень (масштабируется в противофазе прыжку/squash) */}
        <ellipse
          cx="100" cy="208"
          rx={squash ? 62 : 55} ry={squash ? 8 : 10}
          fill="#000" opacity="0.12"
          style={{ transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
        />

        <g
          className="pet-breath"
          style={{
            transformOrigin: '100px 200px',
            transform: squash
              ? 'scale(1.08, 0.92)'
              : react === 'tickle'
                ? 'rotate(4deg)'
                : react === 'laugh'
                  ? 'translateY(-5px)'
                  : undefined,
            transition: squash ? 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1)' : 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* Домик — ДО тел (за спиной) */}
          {stage !== 'egg' && emojiMap[equipped?.home] && (
            <text x="100" y="110" fontSize="140" textAnchor="middle" opacity="0.12" pointerEvents="none">
              {emojiMap[equipped.home]}
            </text>
          )}

          {stage === 'egg' && <EggShape c={c} uid={uid} onZoneTap={zoneTap} near={happy} />}
          {stage === 'baby' && <BabyShape c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} sleeping={sleeping} eyeOffset={eyeOffset} onZoneTap={zoneTap} />}
          {stage === 'teen' && <TeenShape c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} sleeping={sleeping} eyeOffset={eyeOffset} onZoneTap={zoneTap} />}
          {stage === 'adult' && <AdultShape c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} sleeping={sleeping} eyeOffset={eyeOffset} onZoneTap={zoneTap} />}

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

          {sleeping && <text x="155" y="60" fontSize="22" className="pet-zzz">💤</text>}
          {react === 'wave' && <text x="150" y="100" fontSize="22" style={{ animation: 'float 0.8s ease' }}>👋</text>}
        </g>
      </svg>

      {/* Партиклы-сердечки */}
      {hearts.map((h) => (
        <span
          key={h.id}
          className="pet-heart"
          style={{
            '--hx': `${h.x}px`,
            '--hd': `${h.delay}s`,
            '--hs': h.scale,
            left: '50%',
            top: '35%',
          }}
        >
          💜
        </span>
      ))}

      {/* Тап-зоны (прозрачные) */}
      {stage !== 'egg' && (
        <>
          <div style={{ position: 'absolute', top: 0, left: '25%', width: '50%', height: '35%' }} onClick={() => zoneTap('head')} />
          <div style={{ position: 'absolute', top: '35%', left: '20%', width: '60%', height: '45%' }} onClick={() => zoneTap('body')} />
          <div style={{ position: 'absolute', bottom: 0, left: '30%', width: '40%', height: '20%' }} onClick={() => zoneTap('feet')} />
        </>
      )}
    </div>
  );
}

// ===== EGG =====
function EggShape({ c, uid, onZoneTap, near }) {
  return (
    <g>
      <ellipse cx="100" cy="110" rx="62" ry="78" fill={`url(#bg-${uid})`} onClick={() => onZoneTap('body')} style={{ cursor: 'pointer' }} className={near ? 'egg-wobble' : undefined} />
      <ellipse cx="80" cy="80" rx="24" ry="32" fill={`url(#shine-${uid})`} />
      <path d="M90 50 L85 65 L95 72 L88 85" stroke={c.main} strokeWidth="2" fill="none" opacity="0.35" />
      <path d="M110 60 L115 75 L108 82" stroke={c.main} strokeWidth="1.5" fill="none" opacity="0.25" />
      <ellipse cx="85" cy="130" rx="12" ry="18" fill={c.light} opacity="0.25" />
      <ellipse cx="115" cy="100" rx="8" ry="12" fill={c.light} opacity="0.15" />
    </g>
  );
}

// ===== BABY (глаза следят за пальцем) =====
function BabyShape({ c, uid, eyes, happy, sad, sleeping, eyeOffset, onZoneTap }) {
  return (
    <g>
      <circle cx="100" cy="110" r="70" fill={`url(#bg-${uid})`} />
      <ellipse cx="75" cy="75" rx="28" ry="22" fill={`url(#shine-${uid})`} />
      <ellipse cx="60" cy="170" rx="14" ry="10" fill={c.main} opacity="0.7" />
      <ellipse cx="140" cy="170" rx="14" ry="10" fill={c.main} opacity="0.7" />
      <circle cx="100" cy="140" r="5" fill={c.light} opacity="0.5" />
      <Eyes x={80} y={95} eyes={eyes} eyeOffset={eyeOffset} size={1.3} />
      <Mouth y={125} happy={happy} sad={sad} width={1.2} />
      {happy && <Blush x1={62} x2={138} y={112} c={c} />}
      <path d="M100 38 Q108 20 100 8 Q92 20 100 38" fill={c.accent} opacity="0.5" />
    </g>
  );
}

// ===== TEEN =====
function TeenShape({ c, uid, eyes, happy, sad, sleeping, eyeOffset, onZoneTap }) {
  return (
    <g>
      <path d="M55 55 Q40 20 55 5 Q65 20 60 50" fill={c.light} stroke={c.main} strokeWidth="2" />
      <path d="M145 55 Q160 20 145 5 Q135 20 140 50" fill={c.light} stroke={c.main} strokeWidth="2" />
      <path d="M57 45 Q50 25 56 15 Q61 25 59 42" fill={c.accent} opacity="0.25" />
      <path d="M143 45 Q150 25 144 15 Q139 25 141 42" fill={c.accent} opacity="0.25" />
      <ellipse cx="100" cy="115" rx="65" ry="80" fill={`url(#bg-${uid})`} />
      <ellipse cx="75" cy="70" rx="25" ry="30" fill={`url(#shine-${uid})`} />
      <ellipse cx="50" cy="180" rx="16" ry="12" fill={c.main} />
      <ellipse cx="150" cy="180" rx="16" ry="12" fill={c.main} />
      <path d="M165 130 Q185 120 180 100" stroke={c.main} strokeWidth="8" fill="none" strokeLinecap="round" />
      <Eyes x={80} y={90} eyes={eyes} eyeOffset={eyeOffset} size={1} />
      <Mouth y={118} happy={happy} sad={sad} width={1} />
      <path d="M70 75 Q80 70 90 73" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.4" />
      <path d="M110 73 Q120 70 130 75" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.4" />
      {happy && <Blush x1={58} x2={142} y={105} c={c} />}
      <path d="M85 155 Q100 148 115 155" stroke={c.glow} strokeWidth="3" fill="none" opacity="0.25" />
    </g>
  );
}

// ===== ADULT =====
function AdultShape({ c, uid, eyes, happy, sad, sleeping, eyeOffset, onZoneTap }) {
  return (
    <g>
      <path d="M50 50 Q30 10 50 -10 Q65 10 58 45" fill={c.light} stroke={c.main} strokeWidth="2.5" />
      <path d="M150 50 Q170 10 150 -10 Q135 10 142 45" fill={c.light} stroke={c.main} strokeWidth="2.5" />
      <path d="M53 40 Q45 18 51 8 Q57 18 55 35" fill={c.accent} opacity="0.2" />
      <path d="M147 40 Q155 18 149 8 Q143 18 145 35" fill={c.accent} opacity="0.2" />
      <path d="M100 30 C 55 30 40 70 40 110 C 40 160 65 195 100 195 C 135 195 160 160 160 110 C 160 70 145 30 100 30 Z" fill={`url(#bg-${uid})`} />
      <ellipse cx="72" cy="60" rx="28" ry="35" fill={`url(#shine-${uid})`} />
      <ellipse cx="42" cy="188" rx="18" ry="14" fill={c.main} />
      <ellipse cx="158" cy="188" rx="18" ry="14" fill={c.main} />
      <path d="M35 185 L35 192 M42 183 L42 193 M49 185 L49 192" stroke={c.light} strokeWidth="1.5" opacity="0.25" />
      <path d="M151 185 L151 192 M158 183 L158 193 M165 185 L165 192" stroke={c.light} strokeWidth="1.5" opacity="0.25" />
      <path d="M160 140 Q195 125 185 95 Q180 80 170 85" stroke={c.main} strokeWidth="12" fill="none" strokeLinecap="round" />
      <circle cx="170" cy="85" r="8" fill={c.accent} opacity="0.35" />
      <Eyes x={80} y={85} eyes={eyes} eyeOffset={eyeOffset} size={0.9} />
      <Mouth y={112} happy={happy} sad={sad} width={0.9} />
      <path d="M68 70 Q80 64 92 68" stroke={c.main} strokeWidth="3" fill="none" opacity="0.35" />
      <path d="M108 68 Q120 64 132 70" stroke={c.main} strokeWidth="3" fill="none" opacity="0.35" />
      {happy && <Blush x1={55} x2={145} y={100} c={c} />}
      <path d="M85 150 Q100 142 115 150 Q100 160 85 150 Z" fill={c.glow} opacity="0.2" />
    </g>
  );
}

// ===== Переиспользуемые части =====
function Eyes({ x, y, eyes, eyeOffset, size = 1 }) {
  const ex = eyeOffset.x * size;
  const ey = eyeOffset.y * size;
  const rx = 10 * size, ry = 12 * size, pr = 5.5 * size;

  if (eyes) {
    return (
      <>
        <path d={`M${x - 10} ${y} Q${x} ${y + 7} ${x + 10} ${y}`} stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d={`M${x + 30} ${y} Q${x + 40} ${y + 7} ${x + 50} ${y}`} stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#FFF" />
      <ellipse cx={x + 40} cy={y} rx={rx} ry={ry} fill="#FFF" />
      <circle cx={x + 2 + ex} cy={y + 2 + ey} r={pr} fill="#1A1A2E" />
      <circle cx={x + 42 + ex} cy={y + 2 + ey} r={pr} fill="#1A1A2E" />
      <circle cx={x + 3.5 + ex} cy={y - 0.5 + ey} r={2.2 * size} fill="#FFF" />
      <circle cx={x + 43.5 + ex} cy={y - 0.5 + ey} r={2.2 * size} fill="#FFF" />
    </>
  );
}

function Mouth({ y, happy, sad, width = 1 }) {
  const w = 20 * width;
  if (happy) return <path d={`M${100 - w} ${y} Q100 ${y + 14 * width} ${100 + w} ${y}`} stroke="#1A1A2E" strokeWidth={3 * width} fill="none" strokeLinecap="round" />;
  if (sad) return <path d={`M${100 - w} ${y + 8} Q100 ${y - 4} ${100 + w} ${y + 8}`} stroke="#1A1A2E" strokeWidth={3 * width} fill="none" strokeLinecap="round" />;
  return <line x1={100 - w * 0.7} y1={y + 2} x2={100 + w * 0.7} y2={y + 2} stroke="#1A1A2E" strokeWidth={3 * width} strokeLinecap="round" />;
}

function Blush({ x1, x2, y, c }) {
  return (
    <>
      <ellipse cx={x1} cy={y} rx="7" ry="4.5" fill={c.accent} opacity="0.2" />
      <ellipse cx={x2} cy={y} rx="7" ry="4.5" fill={c.accent} opacity="0.2" />
    </>
  );
}
