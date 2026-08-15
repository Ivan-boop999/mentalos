import { useEffect, useRef, useState, useCallback } from 'react';
import { StarBaby, StarTeen, StarAdult } from './StarSpecies.jsx';
import { FrostBaby, FrostTeen, FrostAdult } from './FrostSpecies.jsx';
import { ShadowBaby, ShadowTeen, ShadowAdult } from './ShadowSpecies.jsx';
import { RainbowBaby, RainbowTeen, RainbowAdult, RainbowDefs } from './RainbowSpecies.jsx';
import { LeafBaby, LeafTeen, LeafAdult } from './LeafSpecies.jsx';

/**
 * PetCreature v3 — «Finch-level» дизайн:
 * - Idle State Machine: breath → blink → headTurn → stretch → yawn → preen (случайно)
 * - Эмоциональные глаза: прищур/слёзы/звёзды/сон
 * - Анимация эволюции: glow → flash → transform → burst
 * - Окружение: день/ночь, земля, звёздочки
 * - Скорость анимаций зависит от настроения
 * - Eye tracking + squash & stretch + партиклы
 */

const IDLE_ACTIONS = ['headTurn', 'stretch', 'yawn', 'preen', 'lookAround'];

export default function PetCreature({ stage = 'egg', species = 'spark', colors = {}, mood = 50, size = 200, equipped = {}, emojiMap = {}, onZoneTap, haptic, playSound, isEvolving }) {
  const [blink, setBlink] = useState(false);
  const [idleAction, setIdleAction] = useState(null); // headTurn|stretch|yawn|preen|lookAround
  const [react, setReact] = useState(null);
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState(0);
  const [squash, setSquash] = useState(false);
  const [hearts, setHearts] = useState([]);
  const [evolving, setEvolving] = useState(false);
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
  const excited = mood >= 85;
  const sleeping = mood < 20;

  // Скорость анимаций по настроению (грустный = медленный)
  const animSpeed = sad ? 1.5 : happy ? 0.8 : 1.0;
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6;
  const isSunset = hour >= 17 && hour < 20;

  // === IDLE STATE MACHINE ===
  useEffect(() => {
    if (stage === 'egg' || sleeping) return;
    let cancelled = false;
    let timers = [];

    const scheduleNext = () => {
      if (cancelled) return;
      const wait = 3000 + Math.random() * 5000; // 3-8 сек между действиями
      const t1 = setTimeout(() => {
        if (cancelled) return;
        const action = IDLE_ACTIONS[Math.floor(Math.random() * IDLE_ACTIONS.length)];
        setIdleAction(action);
        // Длительность действия
        const durations = { headTurn: 1500, stretch: 2000, yawn: 2500, preen: 2000, lookAround: 2000 };
        const t2 = setTimeout(() => {
          if (cancelled) return;
          setIdleAction(null);
          scheduleNext();
        }, (durations[action] || 1500) * animSpeed);
        timers.push(t2);
      }, wait * animSpeed);
      timers.push(t1);
    };
    scheduleNext();

    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [stage, sleeping, animSpeed]);

  // === МОРГАНИЕ ===
  useEffect(() => {
    if (stage === 'egg' || sleeping) return;
    let t = null, iv = null;
    const schedule = () => {
      iv = setTimeout(() => {
        setBlink(true);
        t = setTimeout(() => setBlink(false), 130);
        schedule();
      }, (2000 + Math.random() * 4000) * animSpeed);
    };
    schedule();
    return () => { clearTimeout(iv); clearTimeout(t); };
  }, [stage, sleeping, animSpeed]);

  // === EYE TRACKING ===
  const handlePointerMove = useCallback((e) => {
    if (!containerRef.current || stage === 'egg' || sleeping) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.4;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setEyePos({ x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
    setTilt(dx * 8);
  }, [stage, sleeping]);

  // === SQUASH & HEARTS ===
  const doSquash = useCallback((n = 3) => {
    setSquash(true);
    if (squashTimer.current) clearTimeout(squashTimer.current);
    squashTimer.current = setTimeout(() => setSquash(false), 280);
    const items = Array.from({ length: n }, () => ({
      id: ++heartId.current,
      x: Math.random() * 80 - 40,
      delay: Math.random() * 0.3,
      scale: 0.7 + Math.random() * 0.5,
    }));
    setHearts((h) => [...h, ...items]);
    setTimeout(() => setHearts((h) => h.filter((x) => !items.find((i) => i.id === x.id))), 1500);
  }, []);

  // === ЭВОЛЮЦИЯ ===
  useEffect(() => {
    if (isEvolving) {
      setEvolving(true);
      playSound?.('success');
      haptic?.('heavy');
      // Партиклы-звёзды
      const stars = Array.from({ length: 12 }, () => ({
        id: ++heartId.current,
        x: Math.random() * 120 - 60,
        delay: Math.random() * 0.5,
        scale: 1 + Math.random(),
      }));
      setHearts((h) => [...h, ...stars.map(s => ({...s, isStar: true}))]);
      setTimeout(() => {
        setEvolving(false);
        setHearts([]);
      }, 2500);
    }
  }, [isEvolving]);

  useEffect(() => () => {
    if (reactTimer.current) clearTimeout(reactTimer.current);
    if (squashTimer.current) clearTimeout(squashTimer.current);
  }, []);

  const zoneTap = (zone) => {
    const reactions = {
      head: { name: 'laugh', text: '😊 Хи-хи!', sound: 'pop', hearts: 5 },
      body: { name: 'tickle', text: '🤣 Щекотно!', sound: 'toggle', hearts: 4 },
      feet: { name: 'wave', text: '👋 Привет!', sound: 'whoosh', hearts: 3 },
    };
    const r = reactions[zone];
    if (!r) return;
    setReact(r.name);
    doSquash(r.hearts);
    haptic?.('light');
    playSound?.(r.sound);
    onZoneTap?.(r.text);
    if (reactTimer.current) clearTimeout(reactTimer.current);
    reactTimer.current = setTimeout(() => setReact(null), 1200);
  };

  const uid = `${species}-${stage}`;
  const eyes = sleeping || blink;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => { setEyePos({ x: 0, y: 0 }); setTilt(0); }}
      style={{
        position: 'relative', width: size, height: size * 1.15,
        perspective: '600px', cursor: 'pointer', touchAction: 'none',
      }}
    >
      {/* ФОН: день/ночь/закат */}
      <div
        className="pet-env-bg"
        style={{
          '--env-color': isNight ? 'rgba(20,20,50,0.3)' : isSunset ? 'rgba(255,150,50,0.15)' : 'rgba(255,255,255,0.1)',
        }}
      />

      {/* Звёзды ночью */}
      {isNight && stage !== 'egg' && (
        <div className="pet-env-stars">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="env-star" style={{ left: `${10 + i * 15}%`, top: `${5 + (i % 3) * 12}%`, animationDelay: `${i * 0.4}s` }}>✦</span>
          ))}
        </div>
      )}

      <svg
        width={size} height={size * 1.1} viewBox="0 0 200 220"
        style={{
          overflow: 'visible', position: 'relative', zIndex: 2,
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
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`aura-${uid}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor={c.glow} stopOpacity={evolving ? "0.6" : "0.2"} />
            <stop offset="100%" stopColor={c.glow} stopOpacity="0" />
          </radialGradient>
          {/* Фильтры для Star-вида (blur для glow) */}
          <filter id="star-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="star-blur-sm" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <path id="tiny-star" d="M0-4 L1-1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1-1 Z" />
          <path id="mini-star" d="M0-7 L1.8-1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8-1.8 Z" />
        </defs>

        {/* Аура (ярче при эволюции) */}
        <circle cx="100" cy="105" r={evolving ? 100 : 90} fill={`url(#aura-${uid})`} className="companion-pulse" />

        {/* Земля/подставка */}
        <ellipse cx="100" cy="208" rx={squash ? 65 : 58} ry={squash ? 8 : 10} fill="#000" opacity="0.1" style={{ transition: 'all 0.2s' }} />
        <ellipse cx="100" cy="206" rx={squash ? 55 : 48} ry="7" fill={isNight ? '#1a1a2e' : '#e0e0e0'} opacity="0.3" />

        <g
          className={evolving ? 'pet-evolving' : 'pet-breath'}
          style={{
            transformOrigin: '100px 200px',
            transform: squash ? 'scale(1.08, 0.92)' : react === 'tickle' ? 'rotate(4deg)' : react === 'laugh' ? 'translateY(-5px)' : undefined,
            transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            ['--anim-speed']: animSpeed,
          }}
        >
          {/* Idle-действия: анимационные обёртки */}
          <g className={idleAction === 'headTurn' ? 'idle-head-turn' : idleAction === 'lookAround' ? 'idle-look-around' : undefined}>
            {/* Домик */}
            {stage !== 'egg' && emojiMap[equipped?.home] && (
              <text x="100" y="110" fontSize="140" textAnchor="middle" opacity="0.1" pointerEvents="none">{emojiMap[equipped.home]}</text>
            )}

            {/* Stretch: тело вытягивается вверх */}
            <g style={idleAction === 'stretch' ? { transform: 'scale(0.95, 1.1)', transformOrigin: '100px 200px', transition: 'transform 0.6s ease-in-out' } : undefined}>
              {stage === 'egg' && <EggShape c={c} uid={uid} near={happy} evolving={evolving} />}
              {/* УНИКАЛЬНЫЕ ВИДЫ — рендер по species */}
              {stage !== 'egg' && species === 'star' && (<>
                {stage === 'baby' && <StarBaby c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
                {stage === 'teen' && <StarTeen c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
                {stage === 'adult' && <StarAdult c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
              </>)}
              {stage !== 'egg' && species === 'frost' && (<>
                {stage === 'baby' && <FrostBaby c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
                {stage === 'teen' && <FrostTeen c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
                {stage === 'adult' && <FrostAdult c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
              </>)}
              {stage !== 'egg' && species === 'shadow' && (<>
                {stage === 'baby' && <ShadowBaby c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
                {stage === 'teen' && <ShadowTeen c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
                {stage === 'adult' && <ShadowAdult c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
              </>)}
              {stage !== 'egg' && species === 'rainbow' && (<>
                <RainbowDefs />
                {stage === 'baby' && <RainbowBaby c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
                {stage === 'teen' && <RainbowTeen c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
                {stage === 'adult' && <RainbowAdult c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
              </>)}
              {stage !== 'egg' && species === 'leaf' && (<>
                {stage === 'baby' && <LeafBaby c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
                {stage === 'teen' && <LeafTeen c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
                {stage === 'adult' && <LeafAdult c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eyeOffset(eyePos)} onZoneTap={zoneTap} />}
              </>)}
              {/* Базовые виды (spark/drop/flame — без уникального дизайна) */}
              {stage !== 'egg' && !['star', 'frost', 'shadow', 'rainbow', 'leaf'].includes(species) && (<>
                {stage === 'baby' && <BabyShape c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} sleeping={sleeping} eyePos={eyePos} eyeOffset={eyeOffset(eyePos)} onZoneTap={zoneTap} yawning={idleAction === 'yawn'} preening={idleAction === 'preen'} />}
                {stage === 'teen' && <TeenShape c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} sleeping={sleeping} eyePos={eyePos} eyeOffset={eyeOffset(eyePos)} onZoneTap={zoneTap} yawning={idleAction === 'yawn'} preening={idleAction === 'preen'} />}
                {stage === 'adult' && <AdultShape c={c} uid={uid} eyes={eyes} happy={happy} sad={sad} excited={excited} sleeping={sleeping} eyePos={eyePos} eyeOffset={eyeOffset(eyePos)} onZoneTap={zoneTap} yawning={idleAction === 'yawn'} preening={idleAction === 'preen'} />}
              </>)}
            </g>

            {/* Экипировка */}
            {stage !== 'egg' && equipped && (
              <g pointerEvents="none">
                {emojiMap[equipped.hat] && (
                  <text x="100" y={stage === 'baby' ? 25 : stage === 'teen' ? 12 : 5} fontSize="36" textAnchor="middle" transform={`rotate(-8 100 ${stage === 'baby' ? 25 : 12})`}>{emojiMap[equipped.hat]}</text>
                )}
                {emojiMap[equipped.glasses] && <text x="100" y={stage === 'baby' ? 90 : 85} fontSize="30" textAnchor="middle">{emojiMap[equipped.glasses]}</text>}
                {emojiMap[equipped.accessory] && <text x={stage === 'adult' ? 165 : 155} y={stage === 'baby' ? 140 : 130} fontSize="28" textAnchor="middle">{emojiMap[equipped.accessory]}</text>}
              </g>
            )}
          </g>

          {sleeping && <text x="155" y="60" fontSize="22" className="pet-zzz">💤</text>}
          {react === 'wave' && <text x="150" y="100" fontSize="22" style={{ animation: 'float 0.8s ease' }}>👋</text>}
          {idleAction === 'yawn' && !sleeping && <text x="145" y="75" fontSize="16" opacity="0.7" style={{ animation: 'float 1s ease' }}>😮</text>}
        </g>
      </svg>

      {/* Партиклы */}
      {hearts.map((h) => (
        <span key={h.id} className={`pet-heart ${h.isStar ? 'star' : ''}`} style={{ '--hx': `${h.x}px`, '--hd': `${h.delay}s`, '--hs': h.scale, left: '50%', top: '35%' }}>
          {h.isStar ? '✨' : '💜'}
        </span>
      ))}

      {/* Вспышка эволюции */}
      {evolving && <div className="pet-evolve-flash" />}

      {/* Тап-зоны */}
      {stage !== 'egg' && (
        <>
          <div style={{ position: 'absolute', top: 0, left: '25%', width: '50%', height: '35%', zIndex: 10 }} onClick={() => zoneTap('head')} />
          <div style={{ position: 'absolute', top: '35%', left: '20%', width: '60%', height: '45%', zIndex: 10 }} onClick={() => zoneTap('body')} />
          <div style={{ position: 'absolute', bottom: 0, left: '30%', width: '40%', height: '20%', zIndex: 10 }} onClick={() => zoneTap('feet')} />
        </>
      )}
    </div>
  );
}

function eyeOffset(pos) { return { x: pos.x * 4, y: pos.y * 3 }; }

// ===== EGG =====
function EggShape({ c, uid, near, evolving }) {
  return (
    <g>
      <ellipse cx="100" cy="110" rx="62" ry="78" fill={`url(#bg-${uid})`} className={near ? 'egg-wobble' : undefined} />
      <ellipse cx="80" cy="80" rx="24" ry="32" fill={`url(#shine-${uid})`} />
      <path d="M90 50 L85 65 L95 72 L88 85" stroke={c.main} strokeWidth="2" fill="none" opacity="0.35" />
      <path d="M110 60 L115 75 L108 82" stroke={c.main} strokeWidth="1.5" fill="none" opacity="0.25" />
      <ellipse cx="85" cy="130" rx="12" ry="18" fill={c.light} opacity="0.25" />
      {evolving && <circle cx="100" cy="110" r="50" fill={c.glow} opacity="0.5" className="companion-pulse" />}
    </g>
  );
}

// ===== BABY =====
function BabyShape({ c, uid, eyes, happy, sad, excited, sleeping, eyeOffset, onZoneTap, yawning, preening }) {
  return (
    <g>
      <circle cx="100" cy="110" r="70" fill={`url(#bg-${uid})`} />
      <ellipse cx="75" cy="75" rx="28" ry="22" fill={`url(#shine-${uid})`} />
      <ellipse cx="60" cy="170" rx="14" ry="10" fill={c.main} opacity="0.7" />
      <ellipse cx="140" cy="170" rx="14" ry="10" fill={c.main} opacity="0.7" />
      <circle cx="100" cy="140" r="5" fill={c.light} opacity="0.5" />
      <EmotionalEyes x={80} y={95} eyes={eyes} happy={happy} sad={sad} excited={excited} offset={eyeOffset} size={1.3} />
      <Mouth y={yawning ? 122 : 125} happy={happy} sad={sad} width={1.2} open={yawning} />
      {happy && <Blush x1={62} x2={138} y={112} c={c} />}
      {preening && <text x="130" y="130" fontSize="14" opacity="0.5">🧼</text>}
      <path d="M100 38 Q108 20 100 8 Q92 20 100 38" fill={c.accent} opacity="0.5" />
    </g>
  );
}

// ===== TEEN =====
function TeenShape({ c, uid, eyes, happy, sad, excited, sleeping, eyeOffset, onZoneTap, yawning, preening }) {
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
      <EmotionalEyes x={80} y={90} eyes={eyes} happy={happy} sad={sad} excited={excited} offset={eyeOffset} size={1} />
      <Mouth y={yawning ? 115 : 118} happy={happy} sad={sad} width={1} open={yawning} />
      <path d="M70 75 Q80 70 90 73" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.4" />
      <path d="M110 73 Q120 70 130 75" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.4" />
      {happy && <Blush x1={58} x2={142} y={105} c={c} />}
      {preening && <text x="140" y="145" fontSize="14" opacity="0.5">✨</text>}
      <path d="M85 155 Q100 148 115 155" stroke={c.glow} strokeWidth="3" fill="none" opacity="0.25" />
    </g>
  );
}

// ===== ADULT =====
function AdultShape({ c, uid, eyes, happy, sad, excited, sleeping, eyeOffset, onZoneTap, yawning, preening }) {
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
      <EmotionalEyes x={80} y={85} eyes={eyes} happy={happy} sad={sad} excited={excited} offset={eyeOffset} size={0.9} />
      <Mouth y={yawning ? 109 : 112} happy={happy} sad={sad} width={0.9} open={yawning} />
      <path d="M68 70 Q80 64 92 68" stroke={c.main} strokeWidth="3" fill="none" opacity="0.35" />
      <path d="M108 68 Q120 64 132 70" stroke={c.main} strokeWidth="3" fill="none" opacity="0.35" />
      {happy && <Blush x1={55} x2={145} y={100} c={c} />}
      {preening && <text x="155" y="140" fontSize="14" opacity="0.5">🪞</text>}
      <path d="M85 150 Q100 142 115 150 Q100 160 85 150 Z" fill={c.glow} opacity="0.2" />
    </g>
  );
}

// ===== ЭМОЦИОНАЛЬНЫЕ ГЛАЗА =====
function EmotionalEyes({ x, y, eyes, happy, sad, excited, offset, size = 1 }) {
  const ex = offset.x * size, ey = offset.y * size;
  const rx = 10 * size, ry = 12 * size, pr = 5.5 * size;

  // ЗАКРЫТЫЕ (моргание/сон)
  if (eyes) {
    if (happy) {
      // Счастливый прищур (дуги вверх)
      return (
        <>
          <path d={`M${x - 10} ${y + 2} Q${x} ${y - 6} ${x + 10} ${y + 2}`} stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={`M${x + 30} ${y + 2} Q${x + 40} ${y - 6} ${x + 50} ${y + 2}`} stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    }
    // Обычные закрытые
    return (
      <>
        <path d={`M${x - 10} ${y} Q${x} ${y + 7} ${x + 10} ${y}`} stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d={`M${x + 30} ${y} Q${x + 40} ${y + 7} ${x + 50} ${y}`} stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    );
  }

  // ВОСТОРЖЕННЫЕ (звёзды в глазах)
  if (excited) {
    return (
      <>
        <ellipse cx={x} cy={y} rx={rx + 2} ry={ry + 2} fill="#FFF" />
        <ellipse cx={x + 40} cy={y} rx={rx + 2} ry={ry + 2} fill="#FFF" />
        <text x={x + 2} y={y + 5} fontSize={14 * size} textAnchor="middle">⭐</text>
        <text x={x + 42} y={y + 5} fontSize={14 * size} textAnchor="middle">⭐</text>
      </>
    );
  }

  // ГРУСТНЫЕ (большие + слёзы)
  if (sad) {
    return (
      <>
        <ellipse cx={x} cy={y - 2} rx={rx + 1} ry={ry + 2} fill="#FFF" />
        <ellipse cx={x + 40} cy={y - 2} rx={rx + 1} ry={ry + 2} fill="#FFF" />
        <circle cx={x + 1 + ex * 0.5} cy={y + 4} r={pr} fill="#1A1A2E" />
        <circle cx={x + 41 + ex * 0.5} cy={y + 4} r={pr} fill="#1A1A2E" />
        {/* Слёзы */}
        <ellipse cx={x - 4} cy={y + 16} rx="3" ry="5" fill="#6ECBFF" opacity="0.7" />
        <ellipse cx={x + 44} cy={y + 16} rx="3" ry="5" fill="#6ECBFF" opacity="0.7" />
      </>
    );
  }

  // ОБЫЧНЫЕ (с eye tracking)
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

function Mouth({ y, happy, sad, width = 1, open = false }) {
  const w = 20 * width;
  if (open) return <ellipse cx="100" cy={y + 4} rx={12 * width} ry={10 * width} fill="#1A1A2E" opacity="0.8" />;
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
