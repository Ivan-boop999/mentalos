/**
 * LeafSpecies — 🌿 Листик (премиум)
 * Природное существо с листовидным телом, цветами и порхающими лепестками.
 */

export function LeafBaby({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <NatureAura cx={100} cy={110} r={78} c={c} />
      <LeafBody cx={100} cy={110} size={62} c={c} uid={uid} />
      <SproutTop cx={100} cy={52} c={c} size={0.8} />
      <LeafPaws x={58} y={172} x2={142} c={c} />
      <NatureEyes x={78} y={98} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1.25} c={c} />
      <NatureMouth y={130} happy={happy} sad={sad} />
      {happy && <LeafBlush x1={60} x2={140} y={118} c={c} />}
      <FloatingPetals cx={100} cy={110} r={76} c={c} count={5} />
    </g>
  );
}

export function LeafTeen({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <NatureAura cx={100} cy={110} r={90} c={c} />
      <SproutTop cx={100} cy={46} c={c} size={1.1} branched />
      <LeafBody cx={100} cy={110} size={72} c={c} uid={uid} />
      <LeafVeins cx={100} cy={110} r={55} c={c} />
      <LeafPaws x={44} y={182} x2={156} c={c} bigger />
      <VineTail x={168} y={140} c={c} count={4} />
      <NatureEyes x={78} y={88} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1} c={c} />
      <NatureMouth y={118} happy={happy} sad={sad} />
      <path d="M64 72 Q76 66 88 70" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.35" strokeLinecap="round" />
      <path d="M112 70 Q124 66 136 72" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.35" strokeLinecap="round" />
      {happy && <LeafBlush x1={52} x2={148} y={105} c={c} />}
      <FloatingPetals cx={100} cy={110} r={86} c={c} count={7} />
    </g>
  );
}

export function LeafAdult({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <NatureAura cx={100} cy={105} r={100} c={c} intense />
      <SproutTop cx={100} cy={40} c={c} size={1.4} branched flowering />
      <LeafBody cx={100} cy={105} size={80} c={c} uid={uid} />
      <LeafVeins cx={100} cy={105} r={60} c={c} detailed />
      <FlowerCrown cx={100} cy={105} r={70} c={c} />
      <LeafPaws x={38} y={188} x2={162} c={c} biggest />
      <VineTail x={175} y={145} c={c} count={6} spread />
      <NatureEyes x={78} y={82} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={0.9} c={c} />
      <NatureMouth y={110} happy={happy} sad={sad} />
      <path d="M62 66 Q76 58 92 64" stroke={c.main} strokeWidth="3" fill="none" opacity="0.3" strokeLinecap="round" />
      <path d="M108 64 Q124 58 138 66" stroke={c.main} strokeWidth="3" fill="none" opacity="0.3" strokeLinecap="round" />
      {happy && <LeafBlush x1={48} x2={152} y={98} c={c} />}
      <FloatingPetals cx={100} cy={105} r={94} c={c} count={9} />
    </g>
  );
}

function LeafBody({ cx, cy, size, c, uid }) {
  return (
    <>
      {/* Тень */}
      <ellipse cx={cx + 2} cy={cy + 3} rx={size} ry={size * 1.1} fill={c.main} opacity="0.25" />
      {/* Листовидное тело ( pointed ellipse ) */}
      <path d={`M${cx} ${cy - size * 1.2} C ${cx + size * 0.9} ${cy - size * 0.6} ${cx + size} ${cy + size * 0.5} ${cx} ${cy + size * 1.15} C ${cx - size} ${cy + size * 0.5} ${cx - size * 0.9} ${cy - size * 0.6} ${cx} ${cy - size * 1.2} Z`} fill={`url(#bg-${uid})`} />
      {/* Центральная жилка */}
      <line x1={cx} y1={cy - size * 0.9} x2={cx} y2={cy + size * 0.9} stroke={c.light} strokeWidth="2" opacity="0.3" />
      {/* Боковые жилки */}
      {[0.3, 0.55, 0.75].map((t, i) => (
        <g key={i}>
          <line x1={cx} y1={cy - size * (1 - t * 0.8)} x2={cx + size * 0.5 * (1 - t * 0.5)} y2={cy - size * (0.5 - t * 0.4)} stroke={c.light} strokeWidth="1.5" opacity="0.2" />
          <line x1={cx} y1={cy - size * (1 - t * 0.8)} x2={cx - size * 0.5 * (1 - t * 0.5)} y2={cy - size * (0.5 - t * 0.4)} stroke={c.light} strokeWidth="1.5" opacity="0.2" />
        </g>
      ))}
      {/* Блик */}
      <ellipse cx={cx - size * 0.25} cy={cy - size * 0.4} rx={size * 0.25} ry={size * 0.35} fill="#FFF" opacity="0.25" filter="url(#star-blur-sm)" transform={`rotate(20 ${cx - size * 0.25} ${cy - size * 0.4})`} />
      {/* Обводка */}
      <path d={`M${cx} ${cy - size * 1.2} C ${cx + size * 0.9} ${cy - size * 0.6} ${cx + size} ${cy + size * 0.5} ${cx} ${cy + size * 1.15} C ${cx - size} ${cy + size * 0.5} ${cx - size * 0.9} ${cy - size * 0.6} ${cx} ${cy - size * 1.2} Z`} fill="none" stroke={c.accent} strokeWidth="1.5" opacity="0.3" />
    </>
  );
}

function SproutTop({ cx, cy, c, size = 1, branched = false, flowering = false }) {
  return (
    <g>
      {/* Стебель */}
      <path d={`M${cx} ${cy + 15 * size} Q${cx - 3 * size} ${cy} ${cx} ${cy - 10 * size}`} stroke={c.main} strokeWidth={3 * size} fill="none" strokeLinecap="round" />
      {/* Листики на макушке */}
      <path d={`M${cx} ${cy - 8 * size} Q${cx + 12 * size} ${cy - 15 * size} ${cx + 20 * size} ${cy - 10 * size} Q${cx + 12 * size} ${cy - 5 * size} ${cx} ${cy - 8 * size} Z`} fill={c.light} />
      <path d={`M${cx} ${cy - 8 * size} Q${cx - 12 * size} ${cy - 15 * size} ${cx - 20 * size} ${cy - 10 * size} Q${cx - 12 * size} ${cy - 5 * size} ${cx} ${cy - 8 * size} Z`} fill={c.light} />
      {flowering && <>
        <circle cx={cx + 20 * size} cy={cy - 10 * size} r={4 * size} fill={c.accent} opacity="0.6" />
        <circle cx={cx - 20 * size} cy={cy - 10 * size} r={4 * size} fill={c.accent} opacity="0.6" />
        <circle cx={cx} cy={cy - 12 * size} r={3 * size} fill="#FFD700" opacity="0.5" />
      </>}
      {branched && !flowering && <>
        <path d={`M${cx} ${cy - 5 * size} Q${cx + 8 * size} ${cy - 12 * size} ${cx + 15 * size} ${cy - 15 * size}`} stroke={c.main} strokeWidth={2 * size} fill="none" strokeLinecap="round" />
        <path d={`M${cx} ${cy - 5 * size} Q${cx - 8 * size} ${cy - 12 * size} ${cx - 15 * size} ${cy - 15 * size}`} stroke={c.main} strokeWidth={2 * size} fill="none" strokeLinecap="round" />
        <circle cx={cx + 15 * size} cy={cy - 15 * size} r={2.5 * size} fill={c.glow} />
        <circle cx={cx - 15 * size} cy={cy - 15 * size} r={2.5 * size} fill={c.glow} />
      </>}
    </g>
  );
}

function LeafVeins({ cx, cy, r, c, detailed = false }) {
  const veins = [];
  const n = detailed ? 8 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    veins.push(
      <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a) * 0.7} y2={cy + r * Math.sin(a) * 0.7} stroke={c.glow} strokeWidth="1.5" opacity="0.15" />
    );
  }
  return <g>{veins}</g>;
}

function FlowerCrown({ cx, cy, r, c }) {
  const petals = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const x = cx + r * 0.7 * Math.cos(a);
    const y = cy + r * 0.7 * Math.sin(a);
    petals.push(
      <g key={i} opacity="0.2">
        <circle cx={x} cy={y} r="6" fill={c.accent} opacity="0.5" />
        <circle cx={x} cy={y} r="2" fill="#FFD700" opacity="0.4" />
      </g>
    );
  }
  return <g>{petals}</g>;
}

function LeafPaws({ x, x2, y, c, bigger, biggest }) {
  const s = biggest ? 1.3 : bigger ? 1.1 : 0.9;
  return (<>
    {[x, x2].map((px, i) => (
      <g key={i}>
        <ellipse cx={px} cy={y + 3} rx={11 * s} ry={4 * s} fill="#000" opacity="0.1" />
        <path d={`M${px} ${y - 8 * s} C ${px + 5 * s} ${y - 5 * s} ${px + 7 * s} ${y + 2 * s} ${px} ${y + 6 * s} C ${px - 7 * s} ${y + 2 * s} ${px - 5 * s} ${y - 5 * s} ${px} ${y - 8 * s} Z`} fill={c.main} stroke={c.light} strokeWidth="1" />
        <line x1={px} y1={y - 5 * s} x2={px} y2={y + 4 * s} stroke={c.light} strokeWidth="0.8" opacity="0.3" />
      </g>
    ))}
  </>);
}

function VineTail({ x, y, c, count, spread = false }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const px = x + (spread ? t * 22 : t * 12);
    const py = y - t * 32 + Math.sin(t * Math.PI * 2) * 8;
    const s = 5 - t * 3;
    items.push(
      <g key={i} className="comet-trail" style={{ animationDelay: `${i * 0.2}s` }}>
        <circle cx={px} cy={py} r={s + 1} fill={c.glow} opacity="0.15" filter="url(#star-blur-sm)" />
        <ellipse cx={px} cy={py} rx={s} ry={s * 0.7} fill={c.light} opacity={0.5 - t * 0.3} transform={`rotate(${30 + i * 40} ${px} ${py})`} />
        {i % 2 === 0 && <circle cx={px + s * 0.5} cy={py - s * 0.5} r={s * 0.3} fill={c.accent} opacity="0.3" />}
      </g>
    );
  }
  return <g>{items}</g>;
}

function NatureAura({ cx, cy, r, c, intense = false }) {
  return (
    <g opacity={intense ? 0.3 : 0.18}>
      <circle cx={cx} cy={cy} r={r} fill={c.glow} opacity="0.08" filter="url(#star-blur)" />
      <circle cx={cx - r * 0.2} cy={cy - r * 0.3} r={r * 0.4} fill="#84CC16" opacity="0.04" filter="url(#star-blur)" />
    </g>
  );
}

function NatureEyes({ x, y, eyes, happy, sad, excited, eo, size, c }) {
  const ex = eo.x, ey = eo.y;
  const lx = x + 2 + ex, rx = x + 42 + ex;
  const ly = y + 2 + ey;
  if (eyes) {
    const d = happy ? `M${x - 10} ${y + 2} Q${x} ${y - 7} ${x + 10} ${y + 2}` : `M${x - 10} ${y} Q${x} ${y + 8} ${x + 10} ${y}`;
    return (<>
      <path d={d} stroke="#2D5016" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d={`M${x + 30} ${y + 2} Q${x + 40} ${y - 7} ${x + 50} ${y + 2}`} stroke="#2D5016" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </>);
  }
  if (excited) return (<>
    <ellipse cx={x} cy={y} rx="12" ry="14" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="12" ry="14" fill="#FFF" />
    <path d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2} Z`} fill="#FFD700" />
    <path d={`M${x + 40} ${y - 7} L${x + 42} ${y - 2} L${x + 47} ${y} L${x + 42} ${y + 2} L${x + 40} ${y + 7} L${x + 38} ${y + 2} L${x + 33} ${y} L${x + 38} ${y - 2} Z`} fill="#FFD700" />
  </>);
  if (sad) return (<>
    <ellipse cx={x} cy={y} rx="12" ry="14" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="12" ry="14" fill="#FFF" />
    <circle cx={lx} cy={ly + 3} r="5" fill="#2D5016" />
    <circle cx={rx} cy={ly + 3} r="5" fill="#2D5016" />
    <circle cx={lx} cy={ly + 2} r="1.5" fill="#FFF" opacity="0.8" />
    <circle cx={rx} cy={ly + 2} r="1.5" fill="#FFF" opacity="0.8" />
    <ellipse cx={x - 4} cy={y + 18} rx="3" ry="5" fill="#6ECBFF" opacity="0.6" />
    <ellipse cx={x + 44} cy={y + 18} rx="3" ry="5" fill="#6ECBFF" opacity="0.6" />
  </>);
  return (<>
    <ellipse cx={x} cy={y - 2} rx="10" ry="12" fill="#000" opacity="0.04" />
    <ellipse cx={x + 40} cy={y - 2} rx="10" ry="12" fill="#000" opacity="0.04" />
    <ellipse cx={x} cy={y} rx="10" ry="12" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="10" ry="12" fill="#FFF" />
    <circle cx={lx} cy={ly} r="7" fill={c.light} opacity="0.8" />
    <circle cx={rx} cy={ly} r="7" fill={c.light} opacity="0.8" />
    <circle cx={lx} cy={ly} r="7" fill="none" stroke={c.main} strokeWidth="1.5" opacity="0.3" />
    <circle cx={rx} cy={ly} r="7" fill="none" stroke={c.main} strokeWidth="1.5" opacity="0.3" />
    <circle cx={lx} cy={ly} r="4.5" fill="#2D5016" />
    <circle cx={rx} cy={ly} r="4.5" fill="#2D5016" />
    <circle cx={lx - 2} cy={ly - 3} r="2.5" fill="#FFF" />
    <circle cx={rx - 2} cy={ly - 3} r="2.5" fill="#FFF" />
    <circle cx={lx + 2} cy={ly + 2} r="1.2" fill="#FFF" opacity="0.5" />
    <circle cx={rx + 2} cy={ly + 2} r="1.2" fill="#FFF" opacity="0.5" />
  </>);
}

function NatureMouth({ y, happy, sad }) {
  if (happy) return (<>
    <path d={`M86 ${y} Q100 ${y + 16} 114 ${y}`} stroke="#2D5016" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d={`M94 ${y + 7} Q100 ${y + 13} 106 ${y + 7}`} stroke="#84CC16" strokeWidth="2" fill="none" strokeLinecap="round" />
  </>);
  if (sad) return <path d={`M86 ${y + 8} Q100 ${y - 4} 114 ${y + 8}`} stroke="#2D5016" strokeWidth="3" fill="none" strokeLinecap="round" />;
  return <line x1="91" y1={y + 2} x2="109" y2={y + 2} stroke="#2D5016" strokeWidth="3" strokeLinecap="round" />;
}

function LeafBlush({ x1, x2, y, c }) {
  return (<>
    <ellipse cx={x1} cy={y} rx="9" ry="5" fill={c.accent} opacity="0.25" />
    <ellipse cx={x2} cy={y} rx="9" ry="5" fill={c.accent} opacity="0.25" />
    <path d={`M${x1 - 2} ${y - 2} Q${x1} ${y} ${x1 + 2} ${y - 2}`} stroke={c.accent} strokeWidth="1" fill="none" opacity="0.3" />
    <path d={`M${x2 + 2} ${y - 2} Q${x2} ${y} ${x2 - 2} ${y - 2}`} stroke={c.accent} strokeWidth="1" fill="none" opacity="0.3" />
  </>);
}

function FloatingPetals({ cx, cy, r, c, count }) {
  const petals = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.PI / 6;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    const s = 3 + (i % 3);
    const rot = 30 + (i * 60);
    petals.push(
      <g key={i} className="petal-drift" style={{ animationDelay: `${i * 0.4}s` }}>
        <ellipse cx={x} cy={y} rx={s} ry={s * 0.6} fill={c.glow} opacity="0.4" transform={`rotate(${rot} ${x} ${y})`} />
        <ellipse cx={x} cy={y} rx={s * 0.4} ry={s * 0.25} fill={c.accent} opacity="0.2" transform={`rotate(${rot} ${x} ${y})`} />
      </g>
    );
  }
  return <g>{petals}</g>;
}
