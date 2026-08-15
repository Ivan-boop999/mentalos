/**
 * StarSpecies v2 — ПРЕМИУМ дизайн для вида «Звёздный» 🌟
 *
 * Уровень детализации: Finch/Pixar-tier
 *
 * Ключевые отличия от базовых видов:
 * - Мягкая объёмная звезда (bezier-кривые, не угловатый полигон)
 * - Кристаллические грани внутри тела (фасеты)
 * - 4-слойная система градиентов (объём+глубина)
 * - Глаза с радужкой, зрачком, двойным бликом и искрой
 * - Rim lighting (контурный свет по краю)
 * - Кометный хвост с градиентными частицами
 * - Орбитальные искры 4-конечные (не текст)
 * - Контактная тень + ambient occlusion
 */

// ===== STAR BABY — крохотная мягкая звёздочка =====
export function StarBaby({ c, uid, eyes, happy, sad, excited, eyeOffset, onZoneTap }) {
  const ex = eyeOffset.x, ey = eyeOffset.y;
  return (
    <g>
      {/* === СЛОЙ 1: Внешнее свечение === */}
      <ellipse cx="100" cy="110" rx="82" ry="82" fill={c.glow} opacity="0.15" filter="url(#star-blur)" />

      {/* === СЛОЙ 2: Тело — мягкая объёмная звезда === */}
      <SoftStar cx={100} cy={110} outerR={68} innerR={32} uid={uid} c={c} />

      {/* === СЛОЙ 3: Кристаллические грани === */}
      <CrystalFacets cx={100} cy={110} r={55} c={c} opacity="0.15" />

      {/* === СЛОЙ 4: Верхний блик === */}
      <ellipse cx="82" cy="78" rx="22" ry="14" fill="#FFFFFF" opacity="0.35" transform="rotate(-25 82 78)" filter="url(#star-blur-sm)" />

      {/* === Антенки-звёздочки (изящные, с изгибом) === */}
      <Antenna x={90} y={58} tipX={78} tipY={28} c={c} />
      <Antenna x={110} y={58} tipX={122} tipY={28} c={c} />

      {/* === Крохотные звёздочные лапки === */}
      <StarPaw x={58} y={172} c={c} size={0.8} />
      <StarPaw x={142} y={172} c={c} size={0.8} />

      {/* === ЛИЦО === */}
      <PremiumEyes x={78} y={98} eyes={eyes} happy={happy} sad={sad} excited={excited} ex={ex} ey={ey} size={1.25} c={c} />
      <PremiumMouth y={132} happy={happy} sad={sad} open={false} />

      {/* Румянец-созвездие */}
      {happy && <StarBlush x1={60} x2={140} y={120} c={c} />}

      {/* Орбитальные искры */}
      <OrbitSparkles cx={100} cy={110} r={80} count={6} c={c} />
    </g>
  );
}

// ===== STAR TEEN — звезда с характером и хвостом-кометой =====
export function StarTeen({ c, uid, eyes, happy, sad, excited, eyeOffset, onZoneTap }) {
  const ex = eyeOffset.x, ey = eyeOffset.y;
  return (
    <g>
      {/* Внешнее свечение */}
      <ellipse cx="100" cy="110" rx="95" ry="95" fill={c.glow} opacity="0.12" filter="url(#star-blur)" />

      {/* Антенны (длиннее, изящнее) */}
      <Antenna x={82} y={55} tipX={60} tipY={12} c={c} curve="Q68 30 60 12" />
      <Antenna x={118} y={55} tipX={140} tipY={12} c={c} curve="Q132 30 140 12" />

      {/* Тело — острая звезда */}
      <SoftStar cx={100} cy={110} outerR={75} innerR={30} uid={uid} c={c} sharpness={0.7} />

      {/* Кристаллические грани */}
      <CrystalFacets cx={100} cy={110} r={60} c={c} opacity="0.18" />

      {/* Верхний блик */}
      <ellipse cx="75" cy="72" rx="25" ry="16" fill="#FFFFFF" opacity="0.3" transform="rotate(-30 75 72)" filter="url(#star-blur-sm)" />

      {/* Звёздочные лапы */}
      <StarPaw x={42} y={182} c={c} size={1} />
      <StarPaw x={158} y={182} c={c} size={1} />

      {/* Кометный хвост (градиентные частицы по дуге) */}
      <CometTrail x={170} y={145} c={c} count={5} />

      {/* Лицо */}
      <PremiumEyes x={78} y={88} eyes={eyes} happy={happy} sad={sad} excited={excited} ex={ex} ey={ey} size={1} c={c} />
      <PremiumMouth y={118} happy={happy} sad={sad} open={false} />

      {/* Брови */}
      <path d="M64 72 Q76 66 88 70" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.35" strokeLinecap="round" />
      <path d="M112 70 Q124 66 136 72" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.35" strokeLinecap="round" />

      {happy && <StarBlush x1={52} x2={148} y={105} c={c} />}

      {/* Звёздный узор на груди */}
      <MiniStarShape x={100} y={158} r={8} fill={c.glow} opacity="0.35" />

      <OrbitSparkles cx={100} cy={110} r={92} count={8} c={c} />
    </g>
  );
}

// ===== STAR ADULT — величественная звезда ===
export function StarAdult({ c, uid, eyes, happy, sad, excited, eyeOffset, onZoneTap }) {
  const ex = eyeOffset.x, ey = eyeOffset.y;
  return (
    <g>
      {/* Внешнее свечение (большое) */}
      <ellipse cx="100" cy="105" rx="105" ry="105" fill={c.glow} opacity="0.1" filter="url(#star-blur)" />

      {/* Королевские антенны (4 штуки, большие звёзды) */}
      <Antenna x={75} y={48} tipX={42} tipY={-8} c={c} curve="Q55 20 42 -8" size={1.3} />
      <Antenna x={125} y={48} tipX={158} tipY={-8} c={c} curve="Q145 20 158 -8" size={1.3} />
      <Antenna x={70} y={38} tipX={38} tipY={-2} c={c} curve="Q50 18 38 -2" size={0.8} opacity="0.7" />
      <Antenna x={130} y={38} tipX={162} tipY={-2} c={c} curve="Q150 18 162 -2" size={0.8} opacity="0.7" />

      {/* Величественное тело */}
      <SoftStar cx={100} cy={105} outerR={82} innerR={34} uid={uid} c={c} sharpness={0.6} />

      {/* Кристаллические грани (больше) */}
      <CrystalFacets cx={100} cy={105} r={65} c={c} opacity="0.2" />

      {/* Внутренняя звезда-узор */}
      <MiniStarShape x={100} y={105} r={35} fill="none" stroke={c.glow} strokeWidth="2" opacity="0.3" />

      {/* Верхний блик */}
      <ellipse cx="72" cy="65" rx="28" ry="18" fill="#FFFFFF" opacity="0.28" transform="rotate(-30 72 65)" filter="url(#star-blur-sm)" />

      {/* Rim light (контурный свет по правому краю) */}
      <path
        d={starRimPath(100, 105, 82, 34)}
        fill="none" stroke={c.accent} strokeWidth="2" opacity="0.4"
        strokeDasharray="30 50"
      />

      {/* Мощные звёздочные лапы */}
      <StarPaw x={36} y={190} c={c} size={1.3} />
      <StarPaw x={164} y={190} c={c} size={1.3} />

      {/* Длинный кометный хвост */}
      <CometTrail x={178} y={148} c={c} count={7} spread="wide" />

      {/* Лицо */}
      <PremiumEyes x={78} y={82} eyes={eyes} happy={happy} sad={sad} excited={excited} ex={ex} ey={ey} size={0.9} c={c} />
      <PremiumMouth y={110} happy={happy} sad={sad} open={false} />

      {/* Брови (уверенные) */}
      <path d="M62 66 Q76 58 92 64" stroke={c.main} strokeWidth="3" fill="none" opacity="0.3" strokeLinecap="round" />
      <path d="M108 64 Q124 58 138 66" stroke={c.main} strokeWidth="3" fill="none" opacity="0.3" strokeLinecap="round" />

      {happy && <StarBlush x1={48} x2={152} y={98} c={c} />}

      {/* Грудной знак */}
      <MiniStarShape x={100} y={148} r={12} fill={c.accent} opacity="0.25" />
      <MiniStarShape x={92} y={158} r={5} fill={c.glow} opacity="0.3" />
      <MiniStarShape x={108} y={160} r={4} fill={c.glow} opacity="0.25" />

      <OrbitSparkles cx={100} cy={105} r={100} count={10} c={c} />
    </g>
  );
}

// ============================================================
//  ПРЕМИУМ-КОМПОНЕНТЫ
// ============================================================

/**
 * Мягкая объёмная звезда (bezier-кривые вместо углов).
 * sharpness: 0 = очень мягкая, 1 = острая
 */
function SoftStar({ cx, cy, outerR, innerR, uid, c, sharpness = 0.5 }) {
  const points = 5;
  const step = Math.PI / points;
  const startAngle = -Math.PI / 2;
  const round = (1 - sharpness) * innerR * 0.4; // радиус скругления

  let path = '';
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = startAngle + i * step;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }

  // Строим path с квадратичными кривыми для мягкости
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const next = pts[(i + 1) % pts.length];
    const midPrev = { x: (p.x + prev.x) / 2, y: (p.y + prev.y) / 2 };
    const midNext = { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 };

    if (i === 0) path += `M${midPrev.x} ${midPrev.y}`;
    path += ` Q${p.x} ${p.y} ${midNext.x} ${midNext.y}`;
  }
  path += 'Z';

  return (
    <>
      {/* Тень тела (создаёт объём) */}
      <path d={path} fill={c.main} opacity="0.3" transform="translate(2 3)" />
      {/* Основное тело с градиентом */}
      <path d={path} fill={`url(#bg-${uid})`} />
      {/* Внутренняя тень (низ) */}
      <clipPath id={`clip-${uid}`}><path d={path} /></clipPath>
      <ellipse cx={cx} cy={cy + outerR * 0.5} rx={outerR * 0.9} ry={outerR * 0.35} fill={c.main} opacity="0.25" clipPath={`url(#clip-${uid})`} filter="url(#star-blur)" />
    </>
  );
}

/** Кристаллические грани (фасеты как у драгоценного камня) */
function CrystalFacets({ cx, cy, r, c, opacity = 0.15 }) {
  const facets = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a1 = (i / n) * Math.PI * 2;
    const a2 = ((i + 1) / n) * Math.PI * 2;
    const x1 = cx + r * 0.3 * Math.cos(a1);
    const y1 = cy + r * 0.3 * Math.cos(a1);
    const x2 = cx + r * Math.cos(a1);
    const y2 = cy + r * Math.sin(a1);
    const x3 = cx + r * Math.cos(a2);
    const y3 = cy + r * Math.sin(a2);
    facets.push(
      <path key={i} d={`M${cx} ${cy} L${x2} ${y2} L${x3} ${y3} Z`} fill={i % 2 === 0 ? '#FFFFFF' : c.glow} opacity={opacity * (i % 2 === 0 ? 1 : 0.7)} />
    );
  }
  return <g>{facets}</g>;
}

/** Изящная антенна со звёздочкой на конце */
function Antenna({ x, y, tipX, tipY, c, curve, size = 1, opacity = 1 }) {
  const path = curve || `Q${(x + tipX) / 2} ${(y + tipY) / 2} ${tipX} ${tipY}`;
  return (
    <g opacity={opacity}>
      {/* Стебель с градиентом */}
      <path d={`M${x} ${y} ${path}`} stroke={c.light} strokeWidth={2.5 * size} fill="none" strokeLinecap="round" />
      {/* Тонкая подсветка на стебле */}
      <path d={`M${x} ${y} ${path}`} stroke="#FFFFFF" strokeWidth={1 * size} fill="none" strokeLinecap="round" opacity="0.3" />
      {/* Звёздочка на конце с glow */}
      <circle cx={tipX} cy={tipY} r={8 * size} fill={c.accent} opacity="0.2" filter="url(#star-blur)" />
      <FourPointStar x={tipX} y={tipY} r={6 * size} fill={c.accent} />
      {/* Мини-блик на звёздочке */}
      <circle cx={tipX - 1} cy={tipY - 1} r={1.5 * size} fill="#FFFFFF" opacity="0.7" />
    </g>
  );
}

/** Звёздочная лапка */
function StarPaw({ x, y, c, size = 1 }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 3} rx={10 * size} ry={4 * size} fill="#000" opacity="0.1" />
      <path
        d={`M${x} ${y - 8 * size} L${x + 2 * size} ${y - 2 * size} L${x + 8 * size} ${y} L${x + 2 * size} ${y + 2 * size} L${x} ${y + 8 * size} L${x - 2 * size} ${y + 2 * size} L${x - 8 * size} ${y} L${x - 2 * size} ${y - 2 * size} Z`}
        fill={c.main} stroke={c.light} strokeWidth="1"
      />
      <circle cx={x} cy={y} r={2 * size} fill={c.accent} opacity="0.5" />
    </g>
  );
}

/** Кометный хвост — градиентные частицы по дуге */
function CometTrail({ x, y, c, count = 5, spread = 'normal' }) {
  const spreadX = spread === 'wide' ? 30 : 15;
  const particles = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const px = x + t * spreadX;
    const py = y - t * 40 - Math.sin(t * Math.PI) * 10;
    const size = 4 - t * 3;
    const opacity = 0.7 - t * 0.55;
    particles.push(
      <g key={i}>
        <circle cx={px} cy={py} r={size + 2} fill={c.glow} opacity={opacity * 0.3} filter="url(#star-blur)" />
        <FourPointStar x={px} y={py} r={size} fill={c.glow} opacity={opacity} />
        {i === 0 && <FourPointStar x={px} y={py} r={size + 2} fill={c.accent} opacity={0.6} />}
      </g>
    );
  }
  return <g className="comet-trail">{particles}</g>;
}

/** 4-конечная звезда (SVG shape, не текст) */
function FourPointStar({ x, y, r, fill, opacity = 1 }) {
  const innerR = r * 0.3;
  return (
    <path
      d={`M${x} ${y - r} Q${x + innerR * 0.3} ${y - innerR} ${x + r} ${y} Q${x + innerR * 0.3} ${y + innerR} ${x} ${y + r} Q${x - innerR * 0.3} ${y + innerR} ${x - r} ${y} Q${x - innerR * 0.3} ${y - innerR} ${x} ${y - r} Z`}
      fill={fill} opacity={opacity}
    />
  );
}

/** Мини-звезда для узоров */
function MiniStarShape({ x, y, r, fill, opacity = 1, stroke, strokeWidth }) {
  const innerR = r * 0.4;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : innerR;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${x + rad * Math.cos(a)} ${y + rad * Math.sin(a)}`);
  }
  return <polygon points={pts.join(',')} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={strokeWidth} />;
}

/**
 * ПРЕМИУМ-ГЛАЗА: радужка + зрачок + двойной блик + искра
 */
function PremiumEyes({ x, y, eyes, happy, sad, excited, ex, ey, size, c }) {
  const rx = 11 * size, ry = 13 * size;
  const irisR = 7.5 * size;
  const pupilR = 5 * size;
  const lx = x + 2 + ex, rx2 = x + 42 + ex;
  const ly = y + 2 + ey;

  // ЗАКРЫТЫЕ
  if (eyes) {
    if (happy) {
      return (
        <>
          <path d={`M${x - 10} ${y + 2} Q${x} ${y - 7} ${x + 10} ${y + 2}`} stroke="#2D2D44" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d={`M${x + 30} ${y + 2} Q${x + 40} ${y - 7} ${x + 50} ${y + 2}`} stroke="#2D2D44" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </>
      );
    }
    return (
      <>
        <path d={`M${x - 10} ${y} Q${x} ${y + 8} ${x + 10} ${y}`} stroke="#2D2D44" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d={`M${x + 30} ${y} Q${x + 40} ${y + 8} ${x + 50} ${y}`} stroke="#2D2D44" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </>
    );
  }

  // ВОСТОРГ (звёзды вместо глаз)
  if (excited) {
    return (
      <>
        <ellipse cx={x} cy={y} rx={rx + 2} ry={ry + 2} fill="#FFF" opacity="0.9" />
        <ellipse cx={x + 40} cy={y} rx={rx + 2} ry={ry + 2} fill="#FFF" opacity="0.9" />
        <FourPointStar x={x} y={y} r={8 * size} fill="#FFD700" />
        <FourPointStar x={x + 40} y={y} r={8 * size} fill="#FFD700" />
        <circle cx={x} cy={y} r={2 * size} fill="#FFF" />
        <circle cx={x + 40} cy={y} r={2 * size} fill="#FFF" />
      </>
    );
  }

  // ГРУСТНЫЕ (большие + звёздочки-слёзы)
  if (sad) {
    return (
      <>
        <ellipse cx={x} cy={y - 2} rx={rx + 2} ry={ry + 3} fill="#FFF" />
        <ellipse cx={x + 40} cy={y - 2} rx={rx + 2} ry={ry + 3} fill="#FFF" />
        <circle cx={lx} cy={ly + 3} r={pupilR} fill="#2D2D44" />
        <circle cx={rx2} cy={ly + 3} r={pupilR} fill="#2D2D44" />
        <circle cx={lx + 1} cy={ly + 2} r={1.5 * size} fill="#FFF" opacity="0.8" />
        <circle cx={rx2 + 1} cy={ly + 2} r={1.5 * size} fill="#FFF" opacity="0.8" />
        {/* Звёздочки-слёзы */}
        <FourPointStar x={x - 5} y={y + 18} r={3.5} fill="#6ECBFF" opacity="0.8" />
        <FourPointStar x={x + 45} y={y + 18} r={3.5} fill="#6ECBFF" opacity="0.8" />
      </>
    );
  }

  // ОБЫЧНЫЕ (полный набор слоёв)
  return (
    <>
      {/* Веки-основание (лёгкая тень сверху) */}
      <ellipse cx={x} cy={y - 3} rx={rx + 1} ry={ry + 1} fill="#000" opacity="0.05" />
      <ellipse cx={x + 40} cy={y - 3} rx={rx + 1} ry={ry + 1} fill="#000" opacity="0.0" />

      {/* Белок */}
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#FFF" />
      <ellipse cx={x + 40} cy={y} rx={rx} ry={ry} fill="#FFF" />

      {/* Радужка (цветная) */}
      <circle cx={lx} cy={ly} r={irisR} fill={c.light} opacity="0.8" />
      <circle cx={rx2} cy={ly} r={irisR} fill={c.light} opacity="0.8" />

      {/* Внешняя радужка (градиентный ободок) */}
      <circle cx={lx} cy={ly} r={irisR} fill="none" stroke={c.main} strokeWidth="1.5" opacity="0.4" />
      <circle cx={rx2} cy={ly} r={irisR} fill="none" stroke={c.main} strokeWidth="1.5" opacity="0.4" />

      {/* Зрачок (с глубиной) */}
      <circle cx={lx} cy={ly} r={pupilR} fill="#1A1A2E" />
      <circle cx={rx2} cy={ly} r={pupilR} fill="#1A1A2E" />
      {/* Светлый край зрачка */}
      <circle cx={lx} cy={ly} r={pupilR - 1} fill="#2D2D44" opacity="0.5" />
      <circle cx={rx2} cy={ly} r={pupilR - 1} fill="#2D2D44" opacity="0.5" />

      {/* Главный блик (крупный, смещён вверх-влево) */}
      <circle cx={lx - 2} cy={ly - 3} r={2.8 * size} fill="#FFF" />
      <circle cx={rx2 - 2} cy={ly - 3} r={2.8 * size} fill="#FFF" />

      {/* Второй блик (мелкий, смещён вниз-вправо) */}
      <circle cx={lx + 2} cy={ly + 2} r={1.3 * size} fill="#FFF" opacity="0.6" />
      <circle cx={rx2 + 2} cy={ly + 2} r={1.3 * size} fill="#FFF" opacity="0.6" />

      {/* Искра (мини-звёздочка) */}
      <FourPointStar x={lx + 3} cy={ly - 4} r={1.8 * size} fill="#FFF" opacity="0.8" />
      <FourPointStar x={rx2 + 3} cy={ly - 4} r={1.8 * size} fill="#FFF" opacity="0.8" />
    </>
  );
}

/** Премиум-рот */
function PremiumMouth({ y, happy, sad, open }) {
  if (open) {
    return (
      <>
        <ellipse cx="100" cy={y + 4} rx="13" ry="10" fill="#2D2D44" />
        <ellipse cx="100" cy={y + 7} rx="8" ry="5" fill="#FF6B8A" opacity="0.6" />
        <path d={`M88 ${y - 3} Q100 ${y - 1} 112 ${y - 3}`} stroke="#2D2D44" strokeWidth="2" fill="none" />
      </>
    );
  }
  if (happy) {
    return (
      <g>
        <path d={`M86 ${y} Q100 ${y + 16} 114 ${y}`} stroke="#2D2D44" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        {/* Язычок */}
        <path d={`M94 ${y + 7} Q100 ${y + 13} 106 ${y + 7}`} stroke="#FF8FA3" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (sad) {
    return <path d={`M86 ${y + 8} Q100 ${y - 4} 114 ${y + 8}`} stroke="#2D2D44" strokeWidth="3" fill="none" strokeLinecap="round" />;
  }
  return <line x1="91" y1={y + 2} x2="109" y2={y + 2} stroke="#2D2D44" strokeWidth="3" strokeLinecap="round" />;
}

/** Румянец-созвездие */
function StarBlush({ x1, x2, y, c }) {
  return (
    <>
      {/* Основа */}
      <ellipse cx={x1} cy={y} rx="9" ry="5" fill={c.accent} opacity="0.2" />
      <ellipse cx={x2} cy={y} rx="9" ry="5" fill={c.accent} opacity="0.2" />
      {/* Точки-звёзды поверх */}
      <FourPointStar x={x1} y={y - 2} r={2} fill={c.accent} opacity="0.5" />
      <FourPointStar x={x1 + 4} y={y + 2} r={1.5} fill={c.accent} opacity="0.4" />
      <FourPointStar x={x2} y={y - 2} r={2} fill={c.accent} opacity="0.5" />
      <FourPointStar x={x2 - 4} y={y + 2} r={1.5} fill={c.accent} opacity="0.4" />
    </>
  );
}

/** Орбитальные искры (SVG, не текст) */
function OrbitSparkles({ cx, cy, r, count, c }) {
  const sparkles = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    const size = 3 + (i % 3);
    sparkles.push(
      <g key={i} className="orbit-sparkle" style={{ animationDelay: `${i * 0.25}s` }}>
        <circle cx={x} cy={y} r={size + 3} fill={c.glow} opacity="0.1" />
        <FourPointStar x={x} y={y} r={size} fill={c.glow} opacity="0.5" />
      </g>
    );
  }
  return <g>{sparkles}</g>;
}

/** Путь для rim light (контурный свет) */
function starRimPath(cx, cy, outerR, innerR) {
  let path = '';
  const step = Math.PI / 5;
  for (let i = 0; i < 5; i++) {
    const a1 = -Math.PI / 2 + i * 2 * step;
    const a2 = a1 + step;
    const x1 = cx + outerR * Math.cos(a1);
    const y1 = cy + outerR * Math.sin(a1);
    const x2 = cx + innerR * Math.cos(a2);
    const y2 = cy + innerR * Math.sin(a2);
    if (i === 0) path += `M${x1} ${y1}`;
    else path += ` L${x1} ${y1}`;
    path += ` L${x2} ${y2}`;
  }
  return path;
}

/** SVG defs для Star-вида (фильтры) */
export function StarDefs() {
  return (
    <defs>
      <filter id="star-blur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id="star-blur-sm" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      <filter id="star-blur-xs" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" />
      </filter>
    </defs>
  );
}
