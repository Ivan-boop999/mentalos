/**
 * ShadowSpecies — 🌑 Теневой питомец (премиум)
 * Тёмное мистическое существо из дыма с фиолетовым свечением и щупальцами.
 */

export function ShadowBaby({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <DarkAura cx={100} cy={110} r={75} c={c} />
      <SmokeBody cx={100} cy={110} size={62} c={c} uid={uid} wisps={4} />
      <ShadowEyes x={78} y={98} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1.25} c={c} />
      <ShadowMouth y={130} happy={happy} sad={sad} />
      <ShadowTendrils cx={100} cy={170} c={c} count={3} size={0.7} />
      {happy && <GlowBlush x1={60} x2={140} y={118} c={c} />}
      <DarkParticles cx={100} cy={110} r={78} c={c} count={6} />
    </g>
  );
}

export function ShadowTeen({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <DarkAura cx={100} cy={110} r={88} c={c} />
      <ShadowHorns cx={100} cy={50} c={c} size={1} />
      <SmokeBody cx={100} cy={110} size={72} c={c} uid={uid} wisps={6} />
      <EclipseMark cx={100} cy={110} r={50} c={c} />
      <ShadowEyes x={78} y={88} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1} c={c} />
      <ShadowMouth y={118} happy={happy} sad={sad} />
      <ShadowTendrils cx={100} cy={180} c={c} count={5} size={1} />
      <path d="M64 72 Q76 66 88 70" stroke={c.glow} strokeWidth="2.5" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M112 70 Q124 66 136 72" stroke={c.glow} strokeWidth="2.5" fill="none" opacity="0.4" strokeLinecap="round" />
      {happy && <GlowBlush x1={52} x2={148} y={105} c={c} />}
      <DarkParticles cx={100} cy={110} r={88} c={c} count={8} />
    </g>
  );
}

export function ShadowAdult({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <DarkAura cx={100} cy={105} r={100} c={c} intense />
      <ShadowHorns cx={100} cy={44} c={c} size={1.4} royal />
      <SmokeBody cx={100} cy={105} size={80} c={c} uid={uid} wisps={8} />
      <EclipseMark cx={100} cy={105} r={58} c={c} detailed />
      <ShadowEyes x={78} y={82} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={0.9} c={c} />
      <ShadowMouth y={110} happy={happy} sad={sad} />
      <ShadowTendrils cx={100} cy={188} c={c} count={7} size={1.3} spread />
      <path d="M62 66 Q76 58 92 64" stroke={c.glow} strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
      <path d="M108 64 Q124 58 138 66" stroke={c.glow} strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
      {happy && <GlowBlush x1={48} x2={152} y={98} c={c} />}
      <DarkParticles cx={100} cy={105} r={96} c={c} count={10} />
    </g>
  );
}

function SmokeBody({ cx, cy, size, c, uid, wisps = 4 }) {
  const wispPaths = [];
  for (let i = 0; i < wisps; i++) {
    const a = (i / wisps) * Math.PI * 2;
    const wx = cx + size * 0.8 * Math.cos(a);
    const wy = cy + size * 0.8 * Math.sin(a) - 10;
    const ctrlX = cx + size * 1.1 * Math.cos(a + 0.5);
    const ctrlY = cy + size * 0.5 * Math.sin(a + 0.5) - 20;
    wispPaths.push(
      <path key={i} d={`M${cx} ${cy} Q${ctrlX} ${ctrlY} ${wx} ${wy}`} stroke={c.glow} strokeWidth={size * 0.15} fill="none" opacity="0.15" strokeLinecap="round" filter="url(#star-blur)" className="shadow-wisp" style={{ animationDelay: `${i * 0.4}s` }} />
    );
  }
  return (
    <>
      <circle cx={cx} cy={cy} r={size} fill={c.main} opacity="0.5" filter="url(#star-blur)" />
      <circle cx={cx} cy={cy} r={size * 0.9} fill={`url(#bg-${uid})`} opacity="0.9" />
      <circle cx={cx - size * 0.2} cy={cy - size * 0.25} r={size * 0.35} fill={c.glow} opacity="0.15" filter="url(#star-blur)" />
      <circle cx={cx + size * 0.15} cy={cy + size * 0.2} r={size * 0.25} fill="#000" opacity="0.3" filter="url(#star-blur)" />
      {wispPaths}
    </>
  );
}

function ShadowHorns({ cx, cy, c, size = 1, royal = false }) {
  return (
    <g>
      <path d={`M${cx - 18 * size} ${cy + 8 * size} Q${cx - 30 * size} ${cy - 5 * size} ${cx - 40 * size} ${cy - 18 * size} Q${cx - 35 * size} ${cy - 8 * size} ${cx - 25 * size} ${cy + 2 * size} Q${cx - 22 * size} ${cy + 6 * size} ${cx - 18 * size} ${cy + 8 * size} Z`} fill={c.glow} opacity="0.7" />
      <path d={`M${cx + 18 * size} ${cy + 8 * size} Q${cx + 30 * size} ${cy - 5 * size} ${cx + 40 * size} ${cy - 18 * size} Q${cx + 35 * size} ${cy - 8 * size} ${cx + 25 * size} ${cy + 2 * size} Q${cx + 22 * size} ${cy + 6 * size} ${cx + 18 * size} ${cy + 8 * size} Z`} fill={c.glow} opacity="0.7" />
      {royal && <>
        <path d={`M${cx - 28 * size} ${cy + 5} Q${cx - 42 * size} ${cy - 8} ${cx - 55 * size} ${cy - 22} Q${cx - 48 * size} ${cy - 10} ${cx - 35 * size} ${cy + 2} Z`} fill={c.glow} opacity="0.4" />
        <path d={`M${cx + 28 * size} ${cy + 5} Q${cx + 42 * size} ${cy - 8} ${cx + 55 * size} ${cy - 22} Q${cx + 48 * size} ${cy - 10} ${cx + 35 * size} ${cy + 2} Z`} fill={c.glow} opacity="0.4" />
      </>}
    </g>
  );
}

function EclipseMark({ cx, cy, r, c, detailed = false }) {
  return (
    <g opacity="0.3">
      <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke={c.accent} strokeWidth="2" />
      <circle cx={cx + r * 0.15} cy={cy} r={r * 0.45} fill={c.main} />
      {detailed && <>
        <circle cx={cx} cy={cy} r={r * 0.65} fill="none" stroke={c.glow} strokeWidth="1" opacity="0.5" />
        <circle cx={cx + r * 0.3} cy={cy - r * 0.2} r={2} fill={c.accent} opacity="0.5" />
        <circle cx={cx - r * 0.35} cy={cy + r * 0.15} r={1.5} fill={c.accent} opacity="0.4" />
      </>}
    </g>
  );
}

function ShadowTendrils({ cx, cy, c, count, size, spread = false }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const offset = (i - count / 2) * (spread ? 18 : 14) * size;
    const len = (30 + Math.sin(i * 2) * 10) * size;
    const curve = `M${cx + offset} ${cy} Q${cx + offset + 8 * size} ${cy + len * 0.5} ${cx + offset + Math.sin(i * 3) * 12 * size} ${cy + len}`;
    items.push(
      <path key={i} d={curve} stroke={c.glow} strokeWidth={4 * size} fill="none" opacity="0.3" strokeLinecap="round" filter="url(#star-blur-sm)" className="shadow-tendril" style={{ animationDelay: `${i * 0.2}s` }} />
    );
  }
  return <g>{items}</g>;
}

function DarkAura({ cx, cy, r, c, intense = false }) {
  return (
    <g opacity={intense ? 0.4 : 0.25}>
      <circle cx={cx} cy={cy} r={r} fill={c.glow} opacity="0.08" filter="url(#star-blur)" />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.2} r={r * 0.4} fill={c.accent} opacity="0.06" filter="url(#star-blur)" />
      <circle cx={cx + r * 0.3} cy={cy + r * 0.2} r={r * 0.3} fill={c.glow} opacity="0.04" filter="url(#star-blur)" />
    </g>
  );
}

function ShadowEyes({ x, y, eyes, happy, sad, excited, eo, size, c }) {
  const ex = eo.x, ey = eo.y;
  const lx = x + 2 + ex, rx = x + 42 + ex;
  const ly = y + 2 + ey;

  if (eyes) {
    const d = happy ? `M${x - 10} ${y + 2} Q${x} ${y - 7} ${x + 10} ${y + 2}` : `M${x - 10} ${y} Q${x} ${y + 8} ${x + 10} ${y}`;
    return (<>
      <path d={d} stroke={c.accent} strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#star-glow-sm)" />
      <path d={d.replace(/(\d+)/g, m => String(Number(m) + 40))} stroke={c.accent} strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#star-glow-sm)" />
    </>);
  }
  if (excited) return (<>
    <circle cx={x} cy={y} r="12" fill={c.accent} opacity="0.9" filter="url(#star-glow-sm)" />
    <circle cx={x + 40} cy={y} r="12" fill={c.accent} opacity="0.9" filter="url(#star-glow-sm)" />
    <circle cx={x} cy={y} r="5" fill="#FFF" />
    <circle cx={x + 40} cy={y} r="5" fill="#FFF" />
  </>);
  if (sad) return (<>
    <ellipse cx={x} cy={y} rx="11" ry="13" fill={c.accent} opacity="0.8" filter="url(#star-glow-sm)" />
    <ellipse cx={x + 40} cy={y} rx="11" ry="13" fill={c.accent} opacity="0.8" filter="url(#star-glow-sm)" />
    <circle cx={lx} cy={ly} r="5" fill="#2D1B4E" />
    <circle cx={rx} cy={ly} r="5" fill="#2D1B4E" />
    <circle cx={lx} cy={ly - 1} r="1.5" fill={c.glow} opacity="0.8" />
    <circle cx={rx} cy={ly - 1} r="1.5" fill={c.glow} opacity="0.8" />
  </>);
  return (<>
    <circle cx={x} cy={y} r="11" fill={c.accent} opacity="0.9" filter="url(#star-glow-sm)" />
    <circle cx={x + 40} cy={y} r="11" fill={c.accent} opacity="0.9" filter="url(#star-glow-sm)" />
    <circle cx={lx} cy={ly} r="6" fill={c.main} />
    <circle cx={rx} cy={ly} r="6" fill={c.main} />
    <circle cx={lx} cy={ly} r="3" fill="#FFF" opacity="0.8" />
    <circle cx={rx} cy={ly} r="3" fill="#FFF" opacity="0.8" />
    <circle cx={lx + 1} cy={ly - 1} r="1" fill={c.accent} opacity="0.6" />
    <circle cx={rx + 1} cy={ly - 1} r="1" fill={c.accent} opacity="0.6" />
  </>);
}

function ShadowMouth({ y, happy, sad }) {
  if (happy) return <path d={`M86 ${y} Q100 ${y + 15} 114 ${y}`} stroke={c_accent} strokeWidth="3" fill="none" strokeLinecap="round" />;
  if (sad) return <path d={`M86 ${y + 8} Q100 ${y - 4} 114 ${y + 8}`} stroke={c_accent} strokeWidth="3" fill="none" strokeLinecap="round" />;
  return <path d={`M91 ${y + 2} Q95 ${y + 4} 100 ${y + 2} Q105 ${y + 4} 109 ${y + 2}`} stroke={c_accent} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
}
const c_accent = "#EC4899";

function GlowBlush({ x1, x2, y, c }) {
  return (<>
    <circle cx={x1} cy={y} r="5" fill={c.accent} opacity="0.3" filter="url(#star-blur-sm)" />
    <circle cx={x2} cy={y} r="5" fill={c.accent} opacity="0.3" filter="url(#star-blur-sm)" />
  </>);
}

function DarkParticles({ cx, cy, r, c, count }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.PI / 5;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    const s = 2 + (i % 3);
    items.push(
      <circle key={i} cx={x} cy={y} r={s} fill={c.glow} opacity="0.3" filter="url(#star-blur-sm)" className="orbit-sparkle" style={{ animationDelay: `${i * 0.35}s` }} />
    );
  }
  return <g>{items}</g>;
}
