/**
 * BaseSpecies — уникальные дизайны для базовых видов (Spark, Drop, Flame)
 */

// ===== SPARK (✨) — существо из электрических искр =====
export function SparkBaby({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <SparkAura cx={100} cy={110} r={78} c={c} />
      <ZapBody cx={100} cy={110} size={62} c={c} uid={uid} bolts={4} />
      <SparkAntennae cx={100} cy={52} c={c} size={0.8} />
      <SparkEyes x={78} y={98} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1.25} c={c} />
      <ZapMouth y={130} happy={happy} sad={sad} />
      {happy && <ZapBlush x1={60} x2={140} y={118} c={c} />}
      <Sparks cx={100} cy={110} r={76} c={c} count={6} />
    </g>
  );
}

export function SparkTeen({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <SparkAura cx={100} cy={110} r={90} c={c} />
      <SparkAntennae cx={100} cy={46} c={c} size={1.1} forked />
      <ZapBody cx={100} cy={110} size={72} c={c} uid={uid} bolts={6} />
      <CircuitPattern cx={100} cy={110} r={55} c={c} />
      <SparkEyes x={78} y={88} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1} c={c} />
      <ZapMouth y={118} happy={happy} sad={sad} />
      <LightningPaws x={44} y={182} x2={156} c={c} />
      <ElectricTrail x={170} y={140} c={c} count={4} />
      <path d="M64 72 Q76 66 88 70" stroke={c.accent} strokeWidth="2.5" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M112 70 Q124 66 136 72" stroke={c.accent} strokeWidth="2.5" fill="none" opacity="0.4" strokeLinecap="round" />
      {happy && <ZapBlush x1={52} x2={148} y={105} c={c} />}
      <Sparks cx={100} cy={110} r={86} c={c} count={8} />
    </g>
  );
}

export function SparkAdult({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <SparkAura cx={100} cy={105} r={100} c={c} intense />
      <SparkAntennae cx={100} cy={40} c={c} size={1.4} forked royal />
      <ZapBody cx={100} cy={105} size={80} c={c} uid={uid} bolts={8} />
      <CircuitPattern cx={100} cy={105} r={60} c={c} detailed />
      <CoreOrb cx={100} cy={105} r={25} c={c} />
      <SparkEyes x={78} y={82} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={0.9} c={c} />
      <ZapMouth y={110} happy={happy} sad={sad} />
      <LightningPaws x={38} y={188} x2={162} c={c} bigger />
      <ElectricTrail x={178} y={145} c={c} count={6} spread />
      <path d="M62 66 Q76 58 92 64" stroke={c.accent} strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
      <path d="M108 64 Q124 58 138 66" stroke={c.accent} strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
      {happy && <ZapBlush x1={48} x2={152} y={98} c={c} />}
      <Sparks cx={100} cy={105} r={96} c={c} count={10} />
    </g>
  );
}

// ===== DROP (💧) — водяное существо =====
export function DropBaby({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <DropAura cx={100} cy={110} r={78} c={c} />
      <DropBody cx={100} cy={110} size={62} c={c} uid={uid} />
      <Bubbles cx={100} cy={110} r={70} c={c} count={5} />
      <DropEyes x={78} y={98} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1.25} c={c} />
      <DropMouth y={130} happy={happy} sad={sad} />
      <DropPaws x={58} y={172} x2={142} c={c} />
      {happy && <DropBlush x1={60} x2={140} y={118} c={c} />}
    </g>
  );
}

export function DropTeen({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <DropAura cx={100} cy={110} r={90} c={c} />
      <WaveCrown cx={100} cy={50} c={c} />
      <DropBody cx={100} cy={110} size={72} c={c} uid={uid} />
      <WavePattern cx={100} cy={110} r={55} c={c} />
      <Bubbles cx={100} cy={110} r={82} c={c} count={7} />
      <DropEyes x={78} y={88} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1} c={c} />
      <DropMouth y={118} happy={happy} sad={sad} />
      <DropPaws x={44} y={182} x2={156} c={c} bigger />
      <WaterTrail x={168} y={140} c={c} count={4} />
      <path d="M64 72 Q76 66 88 70" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.35" strokeLinecap="round" />
      <path d="M112 70 Q124 66 136 72" stroke={c.main} strokeWidth="2.5" fill="none" opacity="0.35" strokeLinecap="round" />
      {happy && <DropBlush x1={52} x2={148} y={105} c={c} />}
    </g>
  );
}

export function DropAdult({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <DropAura cx={100} cy={105} r={100} c={c} intense />
      <WaveCrown cx={100} cy={42} c={c} royal />
      <DropBody cx={100} cy={105} size={80} c={c} uid={uid} />
      <WavePattern cx={100} cy={105} r={60} c={c} detailed />
      <PearlCore cx={100} cy={105} r={20} />
      <Bubbles cx={100} cy={105} r={92} c={c} count={9} />
      <DropEyes x={78} y={82} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={0.9} c={c} />
      <DropMouth y={110} happy={happy} sad={sad} />
      <DropPaws x={38} y={188} x2={162} c={c} biggest />
      <WaterTrail x={175} y={145} c={c} count={6} spread />
      <path d="M62 66 Q76 58 92 64" stroke={c.main} strokeWidth="3" fill="none" opacity="0.3" strokeLinecap="round" />
      <path d="M108 64 Q124 58 138 66" stroke={c.main} strokeWidth="3" fill="none" opacity="0.3" strokeLinecap="round" />
      {happy && <DropBlush x1={48} x2={152} y={98} c={c} />}
    </g>
  );
}

// ===== FLAME (🔥) — огненное существо =====
export function FlameBaby({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <FlameAura cx={100} cy={110} r={78} c={c} />
      <FlameBody cx={100} cy={110} size={62} c={c} uid={uid} flames={3} />
      <FlameEyes x={78} y={98} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1.25} c={c} />
      <FlameMouth y={130} happy={happy} sad={sad} />
      <EmberPaws x={58} y={172} x2={142} c={c} />
      {happy && <EmberBlush x1={60} x2={140} y={118} c={c} />}
      <Embers cx={100} cy={110} r={76} c={c} count={5} />
    </g>
  );
}

export function FlameTeen({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <FlameAura cx={100} cy={110} r={90} c={c} />
      <FlameHorns cx={100} cy={48} c={c} size={1} />
      <FlameBody cx={100} cy={110} size={72} c={c} uid={uid} flames={5} />
      <FlamePattern cx={100} cy={110} r={55} c={c} />
      <FlameEyes x={78} y={88} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1} c={c} />
      <FlameMouth y={118} happy={happy} sad={sad} />
      <EmberPaws x={44} y={182} x2={156} c={c} bigger />
      <FlameTrail x={168} y={140} c={c} count={4} />
      <path d="M64 72 Q76 66 88 70" stroke={c.accent} strokeWidth="2.5" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M112 70 Q124 66 136 72" stroke={c.accent} strokeWidth="2.5" fill="none" opacity="0.4" strokeLinecap="round" />
      {happy && <EmberBlush x1={52} x2={148} y={105} c={c} />}
      <Embers cx={100} cy={110} r={86} c={c} count={7} />
    </g>
  );
}

export function FlameAdult({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <FlameAura cx={100} cy={105} r={100} c={c} intense />
      <FlameHorns cx={100} cy={42} c={c} size={1.4} royal />
      <FlameBody cx={100} cy={105} size={80} c={c} uid={uid} flames={7} />
      <FlamePattern cx={100} cy={105} r={60} c={c} detailed />
      <InfernoCore cx={100} cy={105} r={22} c={c} />
      <FlameEyes x={78} y={82} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={0.9} c={c} />
      <FlameMouth y={110} happy={happy} sad={sad} />
      <EmberPaws x={38} y={188} x2={162} c={c} biggest />
      <FlameTrail x={175} y={145} c={c} count={6} spread />
      <path d="M62 66 Q76 58 92 64" stroke={c.accent} strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
      <path d="M108 64 Q124 58 138 66" stroke={c.accent} strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
      {happy && <EmberBlush x1={48} x2={152} y={98} c={c} />}
      <Embers cx={100} cy={105} r={96} c={c} count={10} />
    </g>
  );
}

// ===== SPARK компоненты =====
function ZapBody({ cx, cy, size, c, uid, bolts }) {
  const boltPaths = [];
  for (let i = 0; i < bolts; i++) {
    const a = (i / bolts) * Math.PI * 2 - Math.PI / 2;
    const tipX = cx + size * Math.cos(a);
    const tipY = cy + size * Math.sin(a);
    const midX1 = cx + size * 0.5 * Math.cos(a - 0.3);
    const midY1 = cy + size * 0.5 * Math.sin(a - 0.3);
    const midX2 = cx + size * 0.7 * Math.cos(a + 0.2);
    const midY2 = cy + size * 0.7 * Math.sin(a + 0.2);
    boltPaths.push(
      <path key={i} d={`M${cx} ${cy} L${midX1} ${midY1} L${tipX} ${tipY} L${midX2} ${midY2} Z`} fill={c.light} opacity="0.6" stroke={c.main} strokeWidth="1" />
    );
  }
  return (
    <>
      {boltPaths}
      <circle cx={cx} cy={cy} r={size * 0.6} fill={`url(#bg-${uid})`} />
      <circle cx={cx - size * 0.15} cy={cy - size * 0.2} r={size * 0.2} fill="#FFF" opacity="0.3" filter="url(#star-blur-sm)" />
    </>
  );
}

function SparkAntennae({ cx, cy, c, size, forked, royal }) {
  return (
    <g>
      <path d={`M${cx - 12 * size} ${cy + 10 * size} L${cx - 18 * size} ${cy - 8 * size}`} stroke={c.light} strokeWidth={2.5 * size} strokeLinecap="round" />
      <path d={`M${cx + 12 * size} ${cy + 10 * size} L${cx + 18 * size} ${cy - 8 * size}`} stroke={c.light} strokeWidth={2.5 * size} strokeLinecap="round" />
      <path d={`M${cx - 18 * size} ${cy - 8 * size} L${cx - 22 * size} ${cy - 14 * size} L${cx - 16 * size} ${cy - 15 * size} Z`} fill={c.accent} />
      <path d={`M${cx + 18 * size} ${cy - 8 * size} L${cx + 22 * size} ${cy - 14 * size} L${cx + 16 * size} ${cy - 15 * size} Z`} fill={c.accent} />
      {forked && <>
        <path d={`M${cx - 20 * size} ${cy - 12 * size} L${cx - 28 * size} ${cy - 20 * size}`} stroke={c.light} strokeWidth={2 * size} strokeLinecap="round" />
        <path d={`M${cx + 20 * size} ${cy - 12 * size} L${cx + 28 * size} ${cy - 20 * size}`} stroke={c.light} strokeWidth={2 * size} strokeLinecap="round" />
      </>}
      {royal && <>
        <path d={`M${cx - 26 * size} ${cy - 18 * size} L${cx - 36 * size} ${cy - 28 * size}`} stroke={c.light} strokeWidth={1.5 * size} strokeLinecap="round" opacity="0.6" />
        <path d={`M${cx + 26 * size} ${cy - 18 * size} L${cx + 36 * size} ${cy - 28 * size}`} stroke={c.light} strokeWidth={1.5 * size} strokeLinecap="round" opacity="0.6" />
      </>}
    </g>
  );
}

function CircuitPattern({ cx, cy, r, c, detailed = false }) {
  const paths = [];
  const n = detailed ? 6 : 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x1 = cx + r * 0.3 * Math.cos(a);
    const y1 = cy + r * 0.3 * Math.sin(a);
    const x2 = cx + r * 0.7 * Math.cos(a + 0.3);
    const y2 = cy + r * 0.7 * Math.sin(a + 0.3);
    const x3 = cx + r * 0.9 * Math.cos(a + 0.5);
    const y3 = cy + r * 0.9 * Math.sin(a + 0.5);
    paths.push(
      <path key={i} d={`M${x1} ${y1} L${x2} ${y2} L${x3} ${y3}`} stroke={c.glow} strokeWidth="1.5" fill="none" opacity="0.25" />
    );
    paths.push(<circle key={`d${i}`} cx={x2} cy={y2} r="2" fill={c.accent} opacity="0.4" />);
  }
  return <g>{paths}</g>;
}

function CoreOrb({ cx, cy, r, c }) {
  return (
    <g className="core-pulse">
      <circle cx={cx} cy={cy} r={r} fill={c.glow} opacity="0.2" filter="url(#star-blur)" />
      <circle cx={cx} cy={cy} r={r * 0.6} fill={c.accent} opacity="0.3" />
      <circle cx={cx} cy={cy} r={r * 0.3} fill="#FFF" opacity="0.5" />
    </g>
  );
}

function LightningPaws({ x, x2, y, c, bigger }) {
  const s = bigger ? 1.2 : 0.9;
  return (<>
    {[x, x2].map((px, i) => (
      <g key={i}>
        <ellipse cx={px} cy={y + 3} rx={10 * s} ry={4 * s} fill="#000" opacity="0.1" />
        <path d={`M${px - 4 * s} ${y - 8 * s} L${px} ${y} L${px + 4 * s} ${y - 8 * s} L${px} ${y + 6 * s} L${px - 4 * s} ${y - 2 * s} Z`} fill={c.main} stroke={c.accent} strokeWidth="1" />
      </g>
    ))}
  </>);
}

function ElectricTrail({ x, y, c, count, spread = false }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const px = x + (spread ? t * 25 : t * 12);
    const py = y - t * 35 + Math.sin(t * Math.PI * 3) * 6;
    const s = 4 - t * 2.5;
    items.push(
      <g key={i} className="comet-trail">
        <path d={`M${px} ${py - s} L${px + s * 0.3} ${py} L${px} ${py + s} L${px - s * 0.3} ${py} Z`} fill={c.accent} opacity={0.6 - t * 0.4} />
      </g>
    );
  }
  return <g>{items}</g>;
}

function SparkAura({ cx, cy, r, c, intense = false }) {
  return (
    <g opacity={intense ? 0.35 : 0.2}>
      <circle cx={cx} cy={cy} r={r} fill={c.glow} opacity="0.06" filter="url(#star-blur)" />
      {[0, 1, 2, 3].map(i => {
        const a = (i / 4) * Math.PI * 2 + 0.5;
        return <path key={i} d={`M${cx} ${cy} L${cx + r * 0.5 * Math.cos(a)} ${cy + r * 0.5 * Math.sin(a)} L${cx + r * 0.8 * Math.cos(a + 0.3)} ${cy + r * 0.8 * Math.sin(a + 0.3)} Z`} fill={c.glow} opacity="0.08" />;
      })}
    </g>
  );
}

function SparkEyes({ x, y, eyes, happy, sad, excited, eo, size, c }) {
  const ex = eo.x, ey = eo.y;
  const lx = x + 2 + ex, rx = x + 42 + ex;
  const ly = y + 2 + ey;
  if (eyes) {
    const d = happy ? `M${x - 10} ${y + 2} Q${x} ${y - 7} ${x + 10} ${y + 2}` : `M${x - 10} ${y} Q${x} ${y + 8} ${x + 10} ${y}`;
    return (<>
      <path d={d} stroke="#2D1B69" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d={`M${x + 30} ${y + 2} Q${x + 40} ${y - 7} ${x + 50} ${y + 2}`} stroke="#2D1B69" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </>);
  }
  if (excited) return (<>
    <ellipse cx={x} cy={y} rx="12" ry="14" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="12" ry="14" fill="#FFF" />
    <path d={`M${x} ${y - 8} L${x + 3} ${y - 3} L${x + 8} ${y} L${x + 3} ${y + 3} L${x} ${y + 8} L${x - 3} ${y + 3} L${x - 8} ${y} L${x - 3} ${y - 3} Z`} fill={c.accent} />
    <path d={`M${x + 40} ${y - 8} L${x + 43} ${y - 3} L${x + 48} ${y} L${x + 43} ${y + 3} L${x + 40} ${y + 8} L${x + 37} ${y + 3} L${x + 32} ${y} L${x + 37} ${y - 3} Z`} fill={c.accent} />
  </>);
  if (sad) return (<>
    <ellipse cx={x} cy={y} rx="12" ry="14" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="12" ry="14" fill="#FFF" />
    <circle cx={lx} cy={ly + 3} r="5" fill="#2D1B69" />
    <circle cx={rx} cy={ly + 3} r="5" fill="#2D1B69" />
    <circle cx={lx} cy={ly + 2} r="1.5" fill={c.accent} opacity="0.8" />
    <circle cx={rx} cy={ly + 2} r="1.5" fill={c.accent} opacity="0.8" />
  </>);
  return (<>
    <ellipse cx={x} cy={y} rx="10" ry="12" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="10" ry="12" fill="#FFF" />
    <circle cx={lx} cy={ly} r="7" fill={c.light} opacity="0.8" />
    <circle cx={rx} cy={ly} r="7" fill={c.light} opacity="0.8" />
    <circle cx={lx} cy={ly} r="4.5" fill="#2D1B69" />
    <circle cx={rx} cy={ly} r="4.5" fill="#2D1B69" />
    <circle cx={lx - 2} cy={ly - 3} r="2.5" fill="#FFF" />
    <circle cx={rx - 2} cy={ly - 3} r="2.5" fill="#FFF" />
    <circle cx={lx + 2} cy={ly + 2} r="1.2" fill={c.accent} opacity="0.6" />
    <circle cx={rx + 2} cy={ly + 2} r="1.2" fill={c.accent} opacity="0.6" />
  </>);
}

function ZapMouth({ y, happy, sad }) {
  if (happy) return <path d={`M86 ${y} Q100 ${y + 16} 114 ${y}`} stroke="#2D1B69" strokeWidth="3.5" fill="none" strokeLinecap="round" />;
  if (sad) return <path d={`M86 ${y + 8} Q100 ${y - 4} 114 ${y + 8}`} stroke="#2D1B69" strokeWidth="3" fill="none" strokeLinecap="round" />;
  return <line x1="91" y1={y + 2} x2="109" y2={y + 2} stroke="#2D1B69" strokeWidth="3" strokeLinecap="round" />;
}

function ZapBlush({ x1, x2, y, c }) {
  return (<>
    <circle cx={x1} cy={y} r="8" fill={c.accent} opacity="0.2" />
    <circle cx={x2} cy={y} r="8" fill={c.accent} opacity="0.2" />
    <path d={`M${x1} ${y - 3} L${x1 + 3} ${y} L${x1} ${y + 3} L${x1 - 3} ${y} Z`} fill="#FFF" opacity="0.3" />
    <path d={`M${x2} ${y - 3} L${x2 + 3} ${y} L${x2} ${y + 3} L${x2 - 3} ${y} Z`} fill="#FFF" opacity="0.3" />
  </>);
}

function Sparks({ cx, cy, r, c, count }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.PI / 7;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    const s = 2 + (i % 3);
    items.push(
      <g key={i} className="orbit-sparkle" style={{ animationDelay: `${i * 0.25}s` }}>
        <path d={`M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3} Z`} fill={c.accent} opacity="0.5" />
      </g>
    );
  }
  return <g>{items}</g>;
}

// ===== DROP компоненты =====
function DropBody({ cx, cy, size, c, uid }) {
  return (
    <>
      <path d={`M${cx} ${cy - size * 1.3} C ${cx + size * 0.7} ${cy - size * 0.6} ${cx + size * 0.8} ${cy + size * 0.3} ${cx + size * 0.5} ${cy + size * 0.8} C ${cx + size * 0.2} ${cy + size * 1.1} ${cx - size * 0.2} ${cy + size * 1.1} ${cx - size * 0.5} ${cy + size * 0.8} C ${cx - size * 0.8} ${cy + size * 0.3} ${cx - size * 0.7} ${cy - size * 0.6} ${cx} ${cy - size * 1.3} Z`} fill={`url(#bg-${uid})`} stroke={c.light} strokeWidth="1.5" />
      <ellipse cx={cx - size * 0.25} cy={cy - size * 0.3} rx={size * 0.2} ry={size * 0.35} fill="#FFF" opacity="0.3" filter="url(#star-blur-sm)" />
      <ellipse cx={cx} cy={cy + size * 0.5} rx={size * 0.5} ry={size * 0.25} fill={c.main} opacity="0.15" filter="url(#star-blur)" />
    </>
  );
}

function WaveCrown({ cx, cy, c, royal = false }) {
  return (
    <g>
      <path d={`M${cx - 20} ${cy + 10} Q${cx - 25} ${cy} ${cx - 18} ${cy - 8} Q${cx - 12} ${cy - 3} ${cx - 8} ${cy - 12} Q${cx} ${cy - 20} ${cx + 8} ${cy - 12} Q${cx + 12} ${cy - 3} ${cx + 18} ${cy - 8} Q${cx + 25} ${cy} ${cx + 20} ${cy + 10}`} fill="none" stroke={c.light} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      {royal && <path d={`M${cx - 15} ${cy + 5} Q${cx - 20} ${cy - 5} ${cx - 12} ${cy - 15} Q${cx - 5} ${cy - 8} ${cx} ${cy - 18} Q${cx + 5} ${cy - 8} ${cx + 12} ${cy - 15} Q${cx + 20} ${cy - 5} ${cx + 15} ${cy + 5}`} fill="none" stroke={c.glow} strokeWidth="2" strokeLinecap="round" opacity="0.4" />}
    </g>
  );
}

function WavePattern({ cx, cy, r, c, detailed = false }) {
  const waves = [];
  const n = detailed ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const y = cy - r * 0.5 + (i / n) * r;
    waves.push(
      <path key={i} d={`M${cx - r * 0.6} ${y} Q${cx} ${y - 8} ${cx + r * 0.6} ${y}`} stroke={c.light} strokeWidth="1.5" fill="none" opacity="0.15" />
    );
  }
  return <g>{waves}</g>;
}

function PearlCore({ cx, cy, r }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#FFF" opacity="0.15" />
      <circle cx={cx} cy={cy} r={r * 0.5} fill="#FFF" opacity="0.3" />
      <circle cx={cx - 2} cy={cy - 2} r={r * 0.2} fill="#FFF" opacity="0.6" />
    </g>
  );
}

function DropPaws({ x, x2, y, c, bigger, biggest }) {
  const s = biggest ? 1.3 : bigger ? 1.1 : 0.9;
  return (<>
    {[x, x2].map((px, i) => (
      <g key={i}>
        <ellipse cx={px} cy={y + 3} rx={11 * s} ry={4 * s} fill="#000" opacity="0.1" />
        <path d={`M${px} ${y - 10 * s} C ${px + 6 * s} ${y - 5 * s} ${px + 7 * s} ${y + 3 * s} ${px} ${y + 7 * s} C ${px - 7 * s} ${y + 3 * s} ${px - 6 * s} ${y - 5 * s} ${px} ${y - 10 * s} Z`} fill={c.main} stroke={c.light} strokeWidth="1" opacity="0.8" />
        <circle cx={px - 2 * s} cy={y - 3 * s} r={2 * s} fill="#FFF" opacity="0.4" />
      </g>
    ))}
  </>);
}

function WaterTrail({ x, y, c, count, spread = false }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const px = x + (spread ? t * 22 : t * 12);
    const py = y - t * 32 + Math.sin(t * Math.PI * 2) * 5;
    const s = 5 - t * 3;
    items.push(
      <g key={i} className="comet-trail">
        <circle cx={px} cy={py} r={s} fill={c.glow} opacity={0.4 - t * 0.25} />
        <circle cx={px} cy={py} r={s * 0.4} fill="#FFF" opacity="0.3" />
      </g>
    );
  }
  return <g>{items}</g>;
}

function DropAura({ cx, cy, r, c, intense = false }) {
  return (
    <g opacity={intense ? 0.3 : 0.18}>
      <circle cx={cx} cy={cy} r={r} fill={c.glow} opacity="0.06" filter="url(#star-blur)" />
      <path d={`M${cx - r * 0.5} ${cy} Q${cx} ${cy - 15} ${cx + r * 0.5} ${cy}`} stroke={c.light} strokeWidth="2" fill="none" opacity="0.08" filter="url(#star-blur)" />
    </g>
  );
}

function Bubbles({ cx, cy, r, c, count }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.PI / 5;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    const s = 2.5 + (i % 3);
    items.push(
      <g key={i} className="orbit-sparkle" style={{ animationDelay: `${i * 0.3}s` }}>
        <circle cx={x} cy={y} r={s} fill="none" stroke={c.light} strokeWidth="1" opacity="0.3" />
        <circle cx={x - s * 0.3} cy={y - s * 0.3} r={s * 0.25} fill="#FFF" opacity="0.3" />
      </g>
    );
  }
  return <g>{items}</g>;
}

function DropEyes({ x, y, eyes, happy, sad, excited, eo, size, c }) {
  const ex = eo.x, ey = eo.y;
  const lx = x + 2 + ex, rx = x + 42 + ex;
  const ly = y + 2 + ey;
  if (eyes) {
    const d = happy ? `M${x - 10} ${y + 2} Q${x} ${y - 7} ${x + 10} ${y + 2}` : `M${x - 10} ${y} Q${x} ${y + 8} ${x + 10} ${y}`;
    return (<>
      <path d={d} stroke="#0C4A6E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d={`M${x + 30} ${y + 2} Q${x + 40} ${y - 7} ${x + 50} ${y + 2}`} stroke="#0C4A6E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </>);
  }
  if (excited) return (<>
    <ellipse cx={x} cy={y} rx="12" ry="14" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="12" ry="14" fill="#FFF" />
    <circle cx={x} cy={y} r="6" fill={c.accent} />
    <circle cx={x + 40} cy={y} r="6" fill={c.accent} />
    <circle cx={x} cy={y} r="2" fill="#FFF" />
    <circle cx={x + 40} cy={y} r="2" fill="#FFF" />
  </>);
  if (sad) return (<>
    <ellipse cx={x} cy={y} rx="12" ry="14" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="12" ry="14" fill="#FFF" />
    <circle cx={lx} cy={ly + 3} r="5" fill="#0C4A6E" />
    <circle cx={rx} cy={ly + 3} r="5" fill="#0C4A6E" />
    <circle cx={x - 4} cy={y + 18} r="3" fill={c.light} opacity="0.8" />
    <circle cx={x + 44} cy={y + 18} r="3" fill={c.light} opacity="0.8" />
  </>);
  return (<>
    <ellipse cx={x} cy={y} rx="10" ry="12" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="10" ry="12" fill="#FFF" />
    <circle cx={lx} cy={ly} r="7" fill={c.light} opacity="0.8" />
    <circle cx={rx} cy={ly} r="7" fill={c.light} opacity="0.8" />
    <circle cx={lx} cy={ly} r="4.5" fill="#0C4A6E" />
    <circle cx={rx} cy={ly} r="4.5" fill="#0C4A6E" />
    <circle cx={lx - 2} cy={ly - 3} r="2.5" fill="#FFF" />
    <circle cx={rx - 2} cy={ly - 3} r="2.5" fill="#FFF" />
    <circle cx={lx + 2} cy={ly + 2} r="1.2" fill="#FFF" opacity="0.5" />
    <circle cx={rx + 2} cy={ly + 2} r="1.2" fill="#FFF" opacity="0.5" />
  </>);
}

function DropMouth({ y, happy, sad }) {
  if (happy) return <path d={`M86 ${y} Q100 ${y + 16} 114 ${y}`} stroke="#0C4A6E" strokeWidth="3.5" fill="none" strokeLinecap="round" />;
  if (sad) return <path d={`M86 ${y + 8} Q100 ${y - 4} 114 ${y + 8}`} stroke="#0C4A6E" strokeWidth="3" fill="none" strokeLinecap="round" />;
  return <line x1="91" y1={y + 2} x2="109" y2={y + 2} stroke="#0C4A6E" strokeWidth="3" strokeLinecap="round" />;
}

function DropBlush({ x1, x2, y, c }) {
  return (<>
    <ellipse cx={x1} cy={y} rx="9" ry="5" fill={c.accent} opacity="0.2" />
    <ellipse cx={x2} cy={y} rx="9" ry="5" fill={c.accent} opacity="0.2" />
  </>);
}

// ===== FLAME компоненты =====
function FlameBody({ cx, cy, size, c, uid, flames = 3 }) {
  const flamePaths = [];
  for (let i = 0; i < flames; i++) {
    const offset = (i - flames / 2) * (size * 0.4);
    const height = size * (1.2 - Math.abs(i - flames / 2) * 0.3);
    flamePaths.push(
      <path key={i} d={`M${cx + offset} ${cy + size * 0.8} Q${cx + offset + size * 0.3} ${cy} ${cx + offset} ${cy - height} Q${cx + offset - size * 0.3} ${cy} ${cx + offset} ${cy + size * 0.8} Z`} fill={i === Math.floor(flames / 2) ? `url(#bg-${uid})` : c.main} opacity={i === Math.floor(flames / 2) ? 1 : 0.6} />
    );
  }
  return (
    <>
      {flamePaths}
      <ellipse cx={cx} cy={cy + size * 0.3} rx={size * 0.5} ry={size * 0.3} fill={c.glow} opacity="0.3" filter="url(#star-blur)" />
      <ellipse cx={cx - size * 0.15} cy={cy - size * 0.2} rx={size * 0.15} ry={size * 0.25} fill="#FFF" opacity="0.3" filter="url(#star-blur-sm)" />
    </>
  );
}

function FlameHorns({ cx, cy, c, size = 1, royal = false }) {
  return (
    <g>
      <path d={`M${cx - 15 * size} ${cy + 10 * size} Q${cx - 20 * size} ${cy - 5 * size} ${cx - 25 * size} ${cy - 15 * size} L${cx - 20 * size} ${cy - 10 * size} Q${cx - 18 * size} ${cy + 2 * size} ${cx - 15 * size} ${cy + 10 * size} Z`} fill={c.accent} />
      <path d={`M${cx + 15 * size} ${cy + 10 * size} Q${cx + 20 * size} ${cy - 5 * size} ${cx + 25 * size} ${cy - 15 * size} L${cx + 20 * size} ${cy - 10 * size} Q${cx + 18 * size} ${cy + 2 * size} ${cx + 15 * size} ${cy + 10 * size} Z`} fill={c.accent} />
      {royal && <>
        <path d={`M${cx - 25 * size} ${cy} Q${cx - 35 * size} ${cy - 10 * size} ${cx - 40 * size} ${cy - 20 * size} L${cx - 35 * size} ${cy - 15 * size}`} stroke={c.accent} strokeWidth={3 * size} fill="none" strokeLinecap="round" opacity="0.6" />
        <path d={`M${cx + 25 * size} ${cy} Q${cx + 35 * size} ${cy - 10 * size} ${cx + 40 * size} ${cy - 20 * size} L${cx + 35 * size} ${cy - 15 * size}`} stroke={c.accent} strokeWidth={3 * size} fill="none" strokeLinecap="round" opacity="0.6" />
      </>}
    </g>
  );
}

function FlamePattern({ cx, cy, r, c, detailed = false }) {
  const flames = [];
  const n = detailed ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const y = cy + r * 0.5 - (i / n) * r;
    flames.push(
      <path key={i} d={`M${cx - r * 0.4} ${y} Q${cx} ${y - 10} ${cx + r * 0.4} ${y}`} stroke={c.glow} strokeWidth="1.5" fill="none" opacity="0.15" />
    );
  }
  return <g>{flames}</g>;
}

function InfernoCore({ cx, cy, r, c }) {
  return (
    <g className="core-pulse">
      <circle cx={cx} cy={cy} r={r} fill={c.glow} opacity="0.2" filter="url(#star-blur)" />
      <circle cx={cx} cy={cy} r={r * 0.5} fill="#FFF" opacity="0.3" />
      <circle cx={cx} cy={cy} r={r * 0.25} fill="#FFF" opacity="0.5" />
    </g>
  );
}

function EmberPaws({ x, x2, y, c, bigger, biggest }) {
  const s = biggest ? 1.3 : bigger ? 1.1 : 0.9;
  return (<>
    {[x, x2].map((px, i) => (
      <g key={i}>
        <ellipse cx={px} cy={y + 3} rx={10 * s} ry={4 * s} fill="#000" opacity="0.1" />
        <path d={`M${px} ${y - 8 * s} Q${px + 6 * s} ${y - 3 * s} ${px + 4 * s} ${y + 5 * s} Q${px} ${y + 8 * s} ${px - 4 * s} ${y + 5 * s} Q${px - 6 * s} ${y - 3 * s} ${px} ${y - 8 * s} Z`} fill={c.main} stroke={c.accent} strokeWidth="1" />
        <circle cx={px} cy={y} r={2 * s} fill={c.accent} opacity="0.4" />
      </g>
    ))}
  </>);
}

function FlameTrail({ x, y, c, count, spread = false }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const px = x + (spread ? t * 22 : t * 12);
    const py = y - t * 32 + Math.sin(t * Math.PI) * 6;
    const s = 4 - t * 2.5;
    items.push(
      <g key={i} className="comet-trail">
        <path d={`M${px} ${py + s} Q${px + s * 0.5} ${py} ${px} ${py - s} Q${px - s * 0.5} ${py} ${px} ${py + s} Z`} fill={i % 2 === 0 ? c.accent : c.main} opacity={0.5 - t * 0.3} />
      </g>
    );
  }
  return <g>{items}</g>;
}

function FlameAura({ cx, cy, r, c, intense = false }) {
  return (
    <g opacity={intense ? 0.3 : 0.18}>
      <circle cx={cx} cy={cy} r={r} fill={c.accent} opacity="0.05" filter="url(#star-blur)" />
      <ellipse cx={cx} cy={cy - r * 0.3} rx={r * 0.5} ry={r * 0.3} fill={c.glow} opacity="0.04" filter="url(#star-blur)" />
    </g>
  );
}

function FlameEyes({ x, y, eyes, happy, sad, excited, eo, size, c }) {
  const ex = eo.x, ey = eo.y;
  const lx = x + 2 + ex, rx = x + 42 + ex;
  const ly = y + 2 + ey;
  if (eyes) {
    const d = happy ? `M${x - 10} ${y + 2} Q${x} ${y - 7} ${x + 10} ${y + 2}` : `M${x - 10} ${y} Q${x} ${y + 8} ${x + 10} ${y}`;
    return (<>
      <path d={d} stroke="#7C2D12" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d={`M${x + 30} ${y + 2} Q${x + 40} ${y - 7} ${x + 50} ${y + 2}`} stroke="#7C2D12" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </>);
  }
  if (excited) return (<>
    <ellipse cx={x} cy={y} rx="12" ry="14" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="12" ry="14" fill="#FFF" />
    <path d={`M${x} ${y - 8} L${x + 3} ${y - 2} L${x + 8} ${y} L${x + 3} ${y + 2} L${x} ${y + 8} L${x - 3} ${y + 2} L${x - 8} ${y} L${x - 3} ${y - 2} Z`} fill={c.accent} />
    <path d={`M${x + 40} ${y - 8} L${x + 43} ${y - 2} L${x + 48} ${y} L${x + 43} ${y + 2} L${x + 40} ${y + 8} L${x + 37} ${y + 2} L${x + 32} ${y} L${x + 37} ${y - 2} Z`} fill={c.accent} />
  </>);
  if (sad) return (<>
    <ellipse cx={x} cy={y} rx="12" ry="14" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="12" ry="14" fill="#FFF" />
    <circle cx={lx} cy={ly + 3} r="5" fill="#7C2D12" />
    <circle cx={rx} cy={ly + 3} r="5" fill="#7C2D12" />
  </>);
  return (<>
    <ellipse cx={x} cy={y} rx="10" ry="12" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="10" ry="12" fill="#FFF" />
    <circle cx={lx} cy={ly} r="7" fill={c.accent} opacity="0.7" />
    <circle cx={rx} cy={ly} r="7" fill={c.accent} opacity="0.7" />
    <circle cx={lx} cy={ly} r="4.5" fill="#7C2D12" />
    <circle cx={rx} cy={ly} r="4.5" fill="#7C2D12" />
    <circle cx={lx - 2} cy={ly - 3} r="2.5" fill="#FFF" />
    <circle cx={rx - 2} cy={ly - 3} r="2.5" fill="#FFF" />
    <circle cx={lx + 2} cy={ly + 2} r="1.2" fill={c.accent} opacity="0.6" />
    <circle cx={rx + 2} cy={ly + 2} r="1.2" fill={c.accent} opacity="0.6" />
  </>);
}

function FlameMouth({ y, happy, sad }) {
  if (happy) return (<>
    <path d={`M86 ${y} Q100 ${y + 16} 114 ${y}`} stroke="#7C2D12" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d={`M94 ${y + 7} Q100 ${y + 13} 106 ${y + 7}`} stroke="#F97316" strokeWidth="2" fill="none" strokeLinecap="round" />
  </>);
  if (sad) return <path d={`M86 ${y + 8} Q100 ${y - 4} 114 ${y + 8}`} stroke="#7C2D12" strokeWidth="3" fill="none" strokeLinecap="round" />;
  return <line x1="91" y1={y + 2} x2="109" y2={y + 2} stroke="#7C2D12" strokeWidth="3" strokeLinecap="round" />;
}

function EmberBlush({ x1, x2, y, c }) {
  return (<>
    <circle cx={x1} cy={y} r="8" fill={c.accent} opacity="0.25" />
    <circle cx={x2} cy={y} r="8" fill={c.accent} opacity="0.25" />
  </>);
}

function Embers({ cx, cy, r, c, count }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.PI / 6;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    const s = 2 + (i % 3);
    items.push(
      <g key={i} className="orbit-sparkle" style={{ animationDelay: `${i * 0.2}s` }}>
        <circle cx={x} cy={y} r={s} fill={c.accent} opacity="0.4" />
      </g>
    );
  }
  return <g>{items}</g>;
}
