/**
 * FrostSpecies — ❄️ Ледяной питомец (премиум)
 * Кристаллическое существо изо льда с гранями, шипами и северным сиянием.
 */

export function FrostBaby({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <ellipse cx="100" cy="110" rx="80" ry="80" fill={c.glow} opacity="0.15" filter="url(#star-blur)" />
      <CrystalBody cx={100} cy={110} size={62} c={c} uid={uid} spikes={6} />
      <IceHorns cx={100} cy={55} c={c} size={0.8} />
      <SnowPaws x={58} y={172} x2={142} c={c} />
      <FrostEyes x={78} y={98} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1.25} c={c} />
      <FrostMouth y={130} happy={happy} sad={sad} />
      {happy && <FrostBlush x1={60} x2={140} y={118} c={c} />}
      <FrostBreath cx={100} cy={110} r={78} c={c} count={6} />
    </g>
  );
}

export function FrostTeen({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <ellipse cx="100" cy="110" rx="92" ry="92" fill={c.glow} opacity="0.12" filter="url(#star-blur)" />
      <IceHorns cx={100} cy={48} c={c} size={1.1} curved />
      <CrystalBody cx={100} cy={110} size={72} c={c} uid={uid} spikes={7} />
      <IcePattern cx={100} cy={110} r={55} c={c} />
      <SnowPaws x={44} y={182} x2={156} c={c} bigger />
      <IceTail x={168} y={140} c={c} count={4} />
      <FrostEyes x={78} y={88} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1} c={c} />
      <FrostMouth y={118} happy={happy} sad={sad} />
      <path d="M64 72 Q76 66 88 70" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.35" strokeLinecap="round" />
      <path d="M112 70 Q124 66 136 72" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.35" strokeLinecap="round" />
      {happy && <FrostBlush x1={52} x2={148} y={105} c={c} />}
      <FrostBreath cx={100} cy={110} r={88} c={c} count={8} />
    </g>
  );
}

export function FrostAdult({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <ellipse cx="100" cy="105" rx="102" ry="102" fill={c.glow} opacity="0.1" filter="url(#star-blur)" />
      <AuroraGlow cx={100} cy={105} c={c} />
      <IceHorns cx={100} cy={42} c={c} size={1.4} curved royal />
      <CrystalBody cx={100} cy={105} size={80} c={c} uid={uid} spikes={8} />
      <IcePattern cx={100} cy={105} r={62} c={c} detailed />
      <SnowPaws x={38} y={188} x2={162} c={c} biggest />
      <IceTail x={175} y={145} c={c} count={6} spread />
      <FrostEyes x={78} y={82} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={0.9} c={c} />
      <FrostMouth y={110} happy={happy} sad={sad} />
      <path d="M62 66 Q76 58 92 64" stroke={c.main} strokeWidth="3" fill="none" opacity="0.3" strokeLinecap="round" />
      <path d="M108 64 Q124 58 138 66" stroke={c.main} strokeWidth="3" fill="none" opacity="0.3" strokeLinecap="round" />
      {happy && <FrostBlush x1={48} x2={152} y={98} c={c} />}
      <FrostBreath cx={100} cy={105} r={96} c={c} count={10} />
    </g>
  );
}

// ===== Компоненты =====

function CrystalBody({ cx, cy, size, c, uid, spikes = 6 }) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? size : size * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    const sharp = i % 2 === 0 ? 1 : 0.8;
    pts.push({ x: cx + r * Math.cos(a) * sharp, y: cy + r * Math.sin(a) * sharp });
  }
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ') + 'Z';
  return (
    <>
      <path d={path} fill={c.main} opacity="0.3" transform="translate(2 3)" />
      <path d={path} fill={`url(#bg-${uid})`} stroke={c.light} strokeWidth="1.5" strokeLinejoin="round" />
      <clipPath id={`fclip-${uid}`}><path d={path} /></clipPath>
      <ellipse cx={cx} cy={cy + size * 0.4} rx={size * 0.8} ry={size * 0.3} fill={c.main} opacity="0.25" clipPath={`url(#fclip-${uid})`} filter="url(#star-blur)" />
      <ellipse cx={cx - size * 0.25} cy={cy - size * 0.3} rx={size * 0.3} ry={size * 0.15} fill="#FFF" opacity="0.35" filter="url(#star-blur-sm)" transform={`rotate(-20 ${cx - size * 0.25} ${cy - size * 0.3})`} />
    </>
  );
}

function IceHorns({ cx, cy, c, size = 1, curved = false, royal = false }) {
  const left = royal
    ? `M${cx - 20} ${cy + 10} Q${cx - 30} ${cy - 15} ${cx - 38} ${cy - 20} L${cx - 35} ${cy - 12} Q${cx - 28} ${cy + 2} ${cx - 22} ${cy + 8} Z`
    : curved
      ? `M${cx - 18} ${cy + 8} Q${cx - 28} ${cy - 10} ${cx - 35} ${cy - 15} L${cx - 32} ${cy - 8} Q${cx - 25} ${cy + 2} ${cx - 20} ${cy + 6} Z`
      : `M${cx - 15} ${cy + 5} L${cx - 22} ${cy - 12 * size} L${cx - 25} ${cy - 15 * size} L${cx - 18} ${cy + 3} Z`;
  const right = royal
    ? `M${cx + 20} ${cy + 10} Q${cx + 30} ${cy - 15} ${cx + 38} ${cy - 20} L${cx + 35} ${cy - 12} Q${cx + 28} ${cy + 2} ${cx + 22} ${cy + 8} Z`
    : curved
      ? `M${cx + 18} ${cy + 8} Q${cx + 28} ${cy - 10} ${cx + 35} ${cy - 15} L${cx + 32} ${cy - 8} Q${cx + 25} ${cy + 2} ${cx + 20} ${cy + 6} Z`
      : `M${cx + 15} ${cy + 5} L${cx + 22} ${cy - 12 * size} L${cx + 25} ${cy - 15 * size} L${cx + 18} ${cy + 3} Z`;
  return (
    <g>
      <path d={left} fill={c.light} stroke={c.accent} strokeWidth="1" opacity="0.9" />
      <path d={right} fill={c.light} stroke={c.accent} strokeWidth="1" opacity="0.9" />
      <path d={left} fill="#FFF" opacity="0.3" />
      <path d={right} fill="#FFF" opacity="0.3" />
      {royal && <>
        <path d={`M${cx - 32} ${cy + 5} Q${cx - 40} ${cy - 8} ${cx - 48} ${cy - 12} L${cx - 45} ${cy - 5} Q${cx - 38} ${cy + 5} ${cx - 33} ${cy + 8} Z`} fill={c.light} opacity="0.6" />
        <path d={`M${cx + 32} ${cy + 5} Q${cx + 40} ${cy - 8} ${cx + 48} ${cy - 12} L${cx + 45} ${cy - 5} Q${cx + 38} ${cy + 5} ${cx + 33} ${cy + 8} Z`} fill={c.light} opacity="0.6" />
      </>}
    </g>
  );
}

function IcePattern({ cx, cy, r, c, detailed = false }) {
  const lines = [];
  const n = detailed ? 8 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    lines.push(
      <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke={c.glow} strokeWidth="1.5" opacity="0.2" />
    );
    if (detailed && i % 2 === 0) {
      lines.push(
        <circle key={`c${i}`} cx={cx + r * 0.6 * Math.cos(a)} cy={cy + r * 0.6 * Math.sin(a)} r="2" fill="#FFF" opacity="0.3" />
      );
    }
  }
  return <g>{lines}</g>;
}

function SnowPaws({ x, x2, y, c, bigger, biggest }) {
  const s = biggest ? 1.3 : bigger ? 1.1 : 0.9;
  return (
    <>
      {[x, x2].map((px, i) => (
        <g key={i}>
          <ellipse cx={px} cy={y + 3} rx={11 * s} ry={4 * s} fill="#000" opacity="0.1" />
          <ellipse cx={px} cy={y} rx={9 * s} ry={7 * s} fill={c.light} stroke={c.accent} strokeWidth="1" />
          <circle cx={px - 3 * s} cy={y - 2 * s} r={2 * s} fill="#FFF" opacity="0.5" />
          <circle cx={px + 3 * s} cy={y + 1 * s} r={1.5 * s} fill="#FFF" opacity="0.3" />
        </g>
      ))}
    </>
  );
}

function IceTail({ x, y, c, count, spread = false }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const px = x + (spread ? t * 25 : t * 12);
    const py = y - t * 35 - Math.sin(t * Math.PI) * 8;
    const s = 5 - t * 3.5;
    items.push(
      <g key={i} className="comet-trail">
        <circle cx={px} cy={py} r={s + 2} fill={c.glow} opacity={0.2} filter="url(#star-blur-sm)" />
        <path d={`M${px} ${py - s} L${px + s * 0.3} ${py - s * 0.3} L${px + s} ${py} L${px + s * 0.3} ${py + s * 0.3} L${px} ${py + s} L${px - s * 0.3} ${py + s * 0.3} L${px - s} ${py} L${px - s * 0.3} ${py - s * 0.3} Z`} fill={c.glow} opacity={0.6 - t * 0.4} />
        {i === 0 && <circle cx={px} cy={py} r={s * 0.4} fill={c.accent} opacity="0.5" />}
      </g>
    );
  }
  return <g>{items}</g>;
}

function AuroraGlow({ cx, cy, c }) {
  return (
    <g className="aurora" opacity="0.3">
      <ellipse cx={cx - 30} cy={cy - 40} rx="40" ry="15" fill="#3B82F6" opacity="0.3" filter="url(#star-blur)" transform="rotate(-20)" />
      <ellipse cx={cx + 30} cy={cy - 50} rx="45" ry="12" fill="#8B5CF6" opacity="0.25" filter="url(#star-blur)" transform="rotate(15)" />
      <ellipse cx={cx} cy={cy - 65} rx="50" ry="10" fill="#06D6A0" opacity="0.2" filter="url(#star-blur)" />
    </g>
  );
}

function FrostEyes({ x, y, eyes, happy, sad, excited, eo, size, c }) {
  const ex = eo.x, ey = eo.y;
  const lx = x + 2 + ex, rx = x + 42 + ex;
  const ly = y + 2 + ey;

  if (eyes) {
    const d = happy
      ? `M${x - 10} ${y + 2} Q${x} ${y - 7} ${x + 10} ${y + 2}`
      : `M${x - 10} ${y} Q${x} ${y + 8} ${x + 10} ${y}`;
    return (<>
      <path d={d} stroke="#1E3A5F" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d={d.replace(String(x), String(x + 40))} stroke="#1E3A5F" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </>);
  }
  if (excited) return (<>
    <ellipse cx={x} cy={y} rx="12" ry="14" fill="#FFF" opacity="0.95" />
    <ellipse cx={x + 40} cy={y} rx="12" ry="14" fill="#FFF" opacity="0.95" />
    <path d={`M${x} ${y - 6} L${x + 2} ${y - 2} L${x + 6} ${y} L${x + 2} ${y + 2} L${x} ${y + 6} L${x - 2} ${y + 2} L${x - 6} ${y} L${x - 2} ${y - 2} Z`} fill={c.accent} />
    <path d={`M${x + 40} ${y - 6} L${x + 42} ${y - 2} L${x + 46} ${y} L${x + 42} ${y + 2} L${x + 40} ${y + 6} L${x + 38} ${y + 2} L${x + 34} ${y} L${x + 38} ${y - 2} Z`} fill={c.accent} />
  </>);
  if (sad) return (<>
    <ellipse cx={x} cy={y - 2} rx="12" ry="15" fill="#FFF" />
    <ellipse cx={x + 40} cy={y - 2} rx="12" ry="15" fill="#FFF" />
    <circle cx={lx} cy={ly + 3} r="5" fill="#1E3A5F" />
    <circle cx={rx} cy={ly + 3} r="5" fill="#1E3A5F" />
    <circle cx={lx} cy={ly + 2} r="1.5" fill="#FFF" opacity="0.8" />
    <circle cx={rx} cy={ly + 2} r="1.5" fill="#FFF" opacity="0.8" />
    <circle cx={x - 4} cy={y + 18} r="3" fill={c.light} opacity="0.8" />
    <circle cx={x + 44} cy={y + 18} r="3" fill={c.light} opacity="0.8" />
  </>);
  return (<>
    <ellipse cx={x} cy={y - 2} rx="10" ry="12" fill="#000" opacity="0.05" />
    <ellipse cx={x + 40} cy={y - 2} rx="10" ry="12" fill="#000" opacity="0.05" />
    <ellipse cx={x} cy={y} rx="10" ry="12" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="10" ry="12" fill="#FFF" />
    <circle cx={lx} cy={ly} r="7" fill={c.light} opacity="0.8" />
    <circle cx={rx} cy={ly} r="7" fill={c.light} opacity="0.8" />
    <circle cx={lx} cy={ly} r="7" fill="none" stroke={c.main} strokeWidth="1.5" opacity="0.4" />
    <circle cx={rx} cy={ly} r="7" fill="none" stroke={c.main} strokeWidth="1.5" opacity="0.4" />
    <circle cx={lx} cy={ly} r="4.5" fill="#1E3A5F" />
    <circle cx={rx} cy={ly} r="4.5" fill="#1E3A5F" />
    <circle cx={lx - 2} cy={ly - 3} r="2.5" fill="#FFF" />
    <circle cx={rx - 2} cy={ly - 3} r="2.5" fill="#FFF" />
    <circle cx={lx + 2} cy={ly + 2} r="1.2" fill="#FFF" opacity="0.6" />
    <circle cx={rx + 2} cy={ly + 2} r="1.2" fill="#FFF" opacity="0.6" />
    <path d={`M${lx + 3} ${ly - 4} L${lx + 4} ${ly - 2} L${lx + 6} ${ly - 3} L${lx + 4} ${ly - 1} L${lx + 3} ${ly - 3} Z`} fill="#FFF" opacity="0.8" />
    <path d={`M${rx + 3} ${ly - 4} L${rx + 4} ${ly - 2} L${rx + 6} ${ly - 3} L${rx + 4} ${ly - 1} L${rx + 3} ${ly - 3} Z`} fill="#FFF" opacity="0.8" />
  </>);
}

function FrostMouth({ y, happy, sad }) {
  if (happy) return (<>
    <path d={`M86 ${y} Q100 ${y + 16} 114 ${y}`} stroke="#1E3A5F" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d={`M94 ${y + 7} Q100 ${y + 13} 106 ${y + 7}`} stroke={c_light} strokeWidth="2" fill="none" strokeLinecap="round" />
  </>);
  if (sad) return <path d={`M86 ${y + 8} Q100 ${y - 4} 114 ${y + 8}`} stroke="#1E3A5F" strokeWidth="3" fill="none" strokeLinecap="round" />;
  return <line x1="91" y1={y + 2} x2="109" y2={y + 2} stroke="#1E3A5F" strokeWidth="3" strokeLinecap="round" />;
}
const c_light = "#A0D8EF";

function FrostBlush({ x1, x2, y, c }) {
  return (<>
    <ellipse cx={x1} cy={y} rx="9" ry="5" fill={c.accent} opacity="0.2" />
    <ellipse cx={x2} cy={y} rx="9" ry="5" fill={c.accent} opacity="0.2" />
    <path d={`M${x1 - 3} ${y - 2} L${x1 - 1} ${y} L${x1 + 1} ${y - 2} L${x1 - 1} ${y - 4} Z`} fill="#FFF" opacity="0.4" />
    <path d={`M${x2 + 3} ${y - 2} L${x2 + 1} ${y} L${x2 - 1} ${y - 2} L${x2 + 1} ${y - 4} Z`} fill="#FFF" opacity="0.4" />
  </>);
}

function FrostBreath({ cx, cy, r, c, count }) {
  const flakes = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.PI / 7;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    const s = 2 + (i % 3);
    flakes.push(
      <g key={i} className="orbit-sparkle" style={{ animationDelay: `${i * 0.3}s` }}>
        <path d={`M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3} Z`} fill={c.glow} opacity="0.4" />
        <circle cx={x} cy={y} r={s * 0.3} fill="#FFF" opacity="0.3" />
      </g>
    );
  }
  return <g>{flakes}</g>;
}
