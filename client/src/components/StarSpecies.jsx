/**
 * StarSpecies — уникальный SVG-дизайн для вида «Звёздный» (🌟).
 * НЕ просто перекраска: совершенно другой силуэт, черты и анимации.
 *
 * Визуальный язык:
 * - Тело = 5-конечная звезда (не круг)
 * - Уши = звёздочные антенны с кончиками-звёздочками
 * - Глаза = сияющие (с искрами внутри)
 * - Хвост = кометный след из звёздочек
 * - Румянец = созвездия точек
 * - Idle-анимация: мерцание (twinkle) вместо дыхания
 */

// ===== STAR BABY (крохотная звёздочка) =====
export function StarBaby({ c, uid, eyes, happy, sad, excited, eyeOffset, onZoneTap }) {
  const ex = eyeOffset.x, ey = eyeOffset.y;
  return (
    <g>
      {/* Звёздочное тело (5-конечная звезда) */}
      <path
        d={starPath(100, 110, 65, 30, 5, -Math.PI / 2)}
        fill={`url(#bg-${uid})`}
        stroke={c.light}
        strokeWidth="2"
      />

      {/* Блик */}
      <ellipse cx="82" cy="85" rx="18" ry="12" fill={`url(#shine-${uid})`} transform="rotate(-20 82 85)" />

      {/* Крохотные звёздочные лапки */}
      <use href="#mini-star" x="62" y="168" fill={c.main} opacity="0.8" />
      <use href="#mini-star" x="138" y="168" fill={c.main} opacity="0.8" />

      {/* Антенки-звёздочки */}
      <line x1="90" y1="55" x2="82" y2="30" stroke={c.light} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="110" y1="55" x2="118" y2="30" stroke={c.light} strokeWidth="2.5" strokeLinecap="round" />
      <use href="#tiny-star" x="82" y="30" fill={c.accent} />
      <use href="#tiny-star" x="118" y="30" fill={c.accent} />

      {/* Глаза — большие, с сиянием */}
      <StarEyes x={80} y={100} eyes={eyes} happy={happy} sad={sad} excited={excited} ex={ex} ey={ey} size={1.3} />

      {/* Рот */}
      <StarMouth y={130} happy={happy} sad={sad} />

      {/* Созвездие-румянец */}
      {happy && <ConstellationBlush x1={62} x2={138} y={118} c={c} />}

      {/* Искры вокруг */}
      <SparkleOrbit cx={100} cy={110} r={80} c={c} count={5} />
    </g>
  );
}

// ===== STAR TEEN (звезда с хвостом-кометой) =====
export function StarTeen({ c, uid, eyes, happy, sad, excited, eyeOffset, onZoneTap }) {
  const ex = eyeOffset.x, ey = eyeOffset.y;
  return (
    <g>
      {/* Антенны (длиннее, изогнутые) */}
      <path d="M85 60 Q70 35 65 15" stroke={c.light} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M115 60 Q130 35 135 15" stroke={c.light} strokeWidth="3" fill="none" strokeLinecap="round" />
      <use href="#tiny-star" x="65" y="15" fill={c.accent} />
      <use href="#tiny-star" x="135" y="15" fill={c.accent} />

      {/* Звёздочное тело (острее) */}
      <path
        d={starPath(100, 110, 70, 28, 5, -Math.PI / 2)}
        fill={`url(#bg-${uid})`}
        stroke={c.light}
        strokeWidth="2.5"
      />
      <ellipse cx="78" cy="80" rx="20" ry="14" fill={`url(#shine-${uid})`} transform="rotate(-25 78 80)" />

      {/* Звёздочные лапы */}
      <use href="#mini-star" x="48" y="178" fill={c.main} />
      <use href="#mini-star" x="152" y="178" fill={c.main} />

      {/* Кометный хвост (след из звёздочек) */}
      <use href="#tiny-star" x="165" y="140" fill={c.glow} opacity="0.7" />
      <use href="#tiny-star" x="175" y="125" fill={c.glow} opacity="0.5" />
      <use href="#tiny-star" x="182" y="110" fill={c.glow} opacity="0.3" />

      {/* Глаза с сиянием */}
      <StarEyes x={80} y={90} eyes={eyes} happy={happy} sad={sad} excited={excited} ex={ex} ey={ey} size={1} />

      {/* Рот + брови */}
      <StarMouth y={120} happy={happy} sad={sad} />
      <path d="M68 75 Q78 70 88 73" stroke={c.main} strokeWidth="2" fill="none" opacity="0.4" />
      <path d="M112 73 Q122 70 132 75" stroke={c.main} strokeWidth="2" fill="none" opacity="0.4" />

      {happy && <ConstellationBlush x1={55} x2={145} y={105} c={c} />}

      {/* Звёздный узор на теле */}
      <use href="#tiny-star" x="100" y="155" fill={c.glow} opacity="0.3" />
      <SparkleOrbit cx={100} cy={110} r={90} c={c} count={7} />
    </g>
  );
}

// ===== STAR ADULT (величественная звезда) =====
export function StarAdult({ c, uid, eyes, happy, sad, excited, eyeOffset, onZoneTap }) {
  const ex = eyeOffset.x, ey = eyeOffset.y;
  return (
    <g>
      {/* Королевские антенны с большими звёздами */}
      <path d="M80 55 Q60 25 50 -5" stroke={c.light} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M120 55 Q140 25 150 -5" stroke={c.light} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M75 45 Q55 15 45 -5" stroke={c.light} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M125 45 Q145 15 155 -5" stroke={c.light} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
      <use href="#mini-star" x="50" y="-5" fill={c.accent} />
      <use href="#mini-star" x="150" y="-5" fill={c.accent} />

      {/* Величественное тело (большая звезда с внутренними лучами) */}
      <path
        d={starPath(100, 110, 78, 32, 5, -Math.PI / 2)}
        fill={`url(#bg-${uid})`}
        stroke={c.accent}
        strokeWidth="3"
      />
      {/* Внутренняя звезда (узор) */}
      <path
        d={starPath(100, 110, 40, 16, 5, -Math.PI / 2)}
        fill="none" stroke={c.glow} strokeWidth="2" opacity="0.4"
      />
      <ellipse cx="75" cy="75" rx="22" ry="16" fill={`url(#shine-${uid})`} transform="rotate(-25 75 75)" />

      {/* Мощные звёздочные лапы */}
      <use href="#mini-star" x="42" y="188" fill={c.main} transform="scale(1.3)" transform-origin="42 188" />
      <use href="#mini-star" x="158" y="188" fill={c.main} transform="scale(1.3)" transform-origin="158 188" />

      {/* Длинный кометный хвост */}
      <use href="#tiny-star" x="170" y="145" fill={c.glow} opacity="0.8" />
      <use href="#tiny-star" x="182" y="130" fill={c.glow} opacity="0.6" />
      <use href="#tiny-star" x="190" y="112" fill={c.glow} opacity="0.4" />
      <use href="#tiny-star" x="194" y="95" fill={c.glow} opacity="0.2" />

      {/* Глаза */}
      <StarEyes x={80} y={85} eyes={eyes} happy={happy} sad={sad} excited={excited} ex={ex} ey={ey} size={0.9} />
      <StarMouth y={112} happy={happy} sad={sad} />
      <path d="M66 70 Q78 63 90 67" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.35" />
      <path d="M110 67 Q122 63 134 70" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.35" />

      {happy && <ConstellationBlush x1={50} x2={150} y={100} c={c} />}

      {/* Звёздные узоры на теле */}
      <use href="#tiny-star" x="92" y="150" fill={c.glow} opacity="0.4" />
      <use href="#tiny-star" x="108" y="158" fill={c.glow} opacity="0.3" />
      <SparkleOrbit cx={100} cy={110} r={95} c={c} count={9} />
    </g>
  );
}

// ===== Хелперы =====

/** Генерирует path для N-конечной звезды */
function starPath(cx, cy, outerR, innerR, points, startAngle = -Math.PI / 2) {
  const step = Math.PI / points;
  let path = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = startAngle + i * step;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    path += (i === 0 ? `M${x} ${y}` : `L${x} ${y}`);
  }
  return path + 'Z';
}

/** Звёздочные глаза — с внутренним сиянием */
function StarEyes({ x, y, eyes, happy, sad, excited, ex, ey, size }) {
  const rx = 10 * size, ry = 12 * size, pr = 5.5 * size;

  if (eyes) {
    if (happy) {
      return (
        <>
          <path d={`M${x - 10} ${y + 2} Q${x} ${y - 6} ${x + 10} ${y + 2}`} stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={`M${x + 30} ${y + 2} Q${x + 40} ${y - 6} ${x + 50} ${y + 2}`} stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    }
    return (
      <>
        <path d={`M${x - 10} ${y} Q${x} ${y + 7} ${x + 10} ${y}`} stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d={`M${x + 30} ${y} Q${x + 40} ${y + 7} ${x + 50} ${y}`} stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    );
  }

  if (excited) {
    return (
      <>
        <use href="#tiny-star" x={x - 6} y={y - 7} fill="#FFD700" />
        <use href="#tiny-star" x={x + 34} y={y - 7} fill="#FFD700" />
      </>
    );
  }

  if (sad) {
    return (
      <>
        <ellipse cx={x} cy={y - 2} rx={rx + 1} ry={ry + 2} fill="#FFF" />
        <ellipse cx={x + 40} cy={y - 2} rx={rx + 1} ry={ry + 2} fill="#FFF" />
        <circle cx={x + 1 + ex * 0.5} cy={y + 4} r={pr} fill="#1A1A2E" />
        <circle cx={x + 41 + ex * 0.5} cy={y + 4} r={pr} fill="#1A1A2E" />
        {/* Слёзы-звёздочки */}
        <use href="#tiny-star" x={x - 8} y={y + 14} fill="#6ECBFF" opacity="0.8" />
        <use href="#tiny-star" x={x + 44} y={y + 14} fill="#6ECBFF" opacity="0.8" />
      </>
    );
  }

  return (
    <>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#FFF" />
      <ellipse cx={x + 40} cy={y} rx={rx} ry={ry} fill="#FFF" />
      <circle cx={x + 2 + ex} cy={y + 2 + ey} r={pr} fill="#1A1A2E" />
      <circle cx={x + 42 + ex} cy={y + 2 + ey} r={pr} fill="#1A1A2E" />
      {/* Сияние в глазах (двойной блик) */}
      <circle cx={x + 4 + ex} cy={y - 1 + ey} r={2.5 * size} fill="#FFF" />
      <circle cx={x + 44 + ex} cy={y - 1 + ey} r={2.5 * size} fill="#FFF" />
      <circle cx={x} cy={y + 4 + ey} r={1 * size} fill="#FFF" opacity="0.6" />
      <circle cx={x + 40} cy={y + 4 + ey} r={1 * size} fill="#FFF" opacity="0.6" />
    </>
  );
}

function StarMouth({ y, happy, sad }) {
  if (happy) return <path d={`M88 ${y} Q100 ${y + 14} 112 ${y}`} stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />;
  if (sad) return <path d={`M88 ${y + 8} Q100 ${y - 4} 112 ${y + 8}`} stroke="#1A1A2E" strokeWidth="3" fill="none" strokeLinecap="round" />;
  return <line x1="92" y1={y + 2} x2="108" y2={y + 2} stroke="#1A1A2E" strokeWidth="3" strokeLinecap="round" />;
}

/** Созвездие-румянец (точки как звёзды на карте неба) */
function ConstellationBlush({ x1, x2, y, c }) {
  return (
    <>
      <circle cx={x1} cy={y} r="2" fill={c.accent} opacity="0.5" />
      <circle cx={x1 + 5} cy={y + 3} r="1.5" fill={c.accent} opacity="0.4" />
      <circle cx={x1 + 2} cy={y - 3} r="1.5" fill={c.accent} opacity="0.3" />
      <line x1={x1} y1={y} x2={x1 + 5} y2={y + 3} stroke={c.accent} strokeWidth="0.5" opacity="0.3" />
      <circle cx={x2} cy={y} r="2" fill={c.accent} opacity="0.5" />
      <circle cx={x2 - 5} cy={y + 3} r="1.5" fill={c.accent} opacity="0.4" />
      <circle cx={x2 - 2} cy={y - 3} r="1.5" fill={c.accent} opacity="0.3" />
      <line x1={x2} y1={y} x2={x2 - 5} y2={y + 3} stroke={c.accent} strokeWidth="0.5" opacity="0.3" />
    </>
  );
}

/** Орбита искр вокруг питомца */
function SparkleOrbit({ cx, cy, r, c, count }) {
  return (
    <g className="star-sparkles" opacity="0.6">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        return (
          <text
            key={i}
            x={x} y={y}
            fontSize="10"
            textAnchor="middle"
            fill={c.glow}
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            ✦
          </text>
        );
      })}
    </g>
  );
}
