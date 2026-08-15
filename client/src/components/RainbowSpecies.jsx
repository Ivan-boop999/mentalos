/**
 * RainbowSpecies — 🌈 Радужный питомец (премиум)
 * Существо из света с переливающимися цветами и призматическими эффектами.
 */

export function RainbowBaby({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <RainbowAura cx={100} cy={110} r={78} />
      <PrismBody cx={100} cy={110} size={62} uid={uid} />
      <RainbowEyes x={78} y={98} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1.25} />
      <RainbowMouth y={130} happy={happy} sad={sad} />
      <RainbowPaws x={58} y={172} x2={142} />
      <RainbowTrail x={160} y={140} count={3} />
      {happy && <RainbowBlush x1={60} x2={140} y={118} />}
      <PrismSparkles cx={100} cy={110} r={76} count={6} />
    </g>
  );
}

export function RainbowTeen({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <RainbowAura cx={100} cy={110} r={90} />
      <PrismBody cx={100} cy={110} size={72} uid={uid} />
      <PrismFacets cx={100} cy={110} r={55} />
      <RainbowEyes x={78} y={88} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={1} />
      <RainbowMouth y={118} happy={happy} sad={sad} />
      <RainbowPaws x={44} y={182} x2={156} bigger />
      <RainbowTrail x={170} y={142} count={5} />
      <path d="M64 72 Q76 66 88 70" stroke="#EC4899" strokeWidth="2.5" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M112 70 Q124 66 136 72" stroke="#06B6D4" strokeWidth="2.5" fill="none" opacity="0.4" strokeLinecap="round" />
      {happy && <RainbowBlush x1={52} x2={148} y={105} />}
      <PrismSparkles cx={100} cy={110} r={86} count={8} />
    </g>
  );
}

export function RainbowAdult({ c, uid, eyes, happy, sad, excited, eo, onZoneTap }) {
  return (
    <g>
      <RainbowAura cx={100} cy={105} r={102} intense />
      <PrismBody cx={100} cy={105} size={80} uid={uid} />
      <PrismFacets cx={100} cy={105} r={62} detailed />
      <RainbowRing cx={100} cy={105} r={85} />
      <RainbowEyes x={78} y={82} eyes={eyes} happy={happy} sad={sad} excited={excited} eo={eo} size={0.9} />
      <RainbowMouth y={110} happy={happy} sad={sad} />
      <RainbowPaws x={38} y={188} x2={162} biggest />
      <RainbowTrail x={178} y={145} count={7} spread />
      <path d="M62 66 Q76 58 92 64" stroke="#EC4899" strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
      <path d="M108 64 Q124 58 138 66" stroke="#06B6D4" strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
      {happy && <RainbowBlush x1={48} x2={152} y={98} />}
      <PrismSparkles cx={100} cy={105} r={96} count={10} />
    </g>
  );
}

const RAINBOW = ['#EF4444', '#F97316', '#FACC15', '#84CC16', '#22D3EE', '#818CF7', '#E879F9'];

function PrismBody({ cx, cy, size, uid }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={size} opacity="0.3" filter="url(#star-blur)">
        <animate attributeName="fill" values={RAINBOW.join(';') + ';' + RAINBOW[0]} dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={size * 0.85} fill={`url(#bg-${uid})`} opacity="0.7" />
      <circle cx={cx} cy={cy} r={size * 0.85} fill="none" stroke="url(#rainbow-stroke)" strokeWidth="3" opacity="0.6" />
      <circle cx={cx - size * 0.25} cy={cy - size * 0.25} r={size * 0.3} fill="#FFF" opacity="0.3" filter="url(#star-blur-sm)" />
    </>
  );
}

function PrismFacets({ cx, cy, r, detailed = false }) {
  const facets = [];
  const n = detailed ? 7 : 5;
  for (let i = 0; i < n; i++) {
    const a1 = (i / n) * Math.PI * 2;
    const a2 = ((i + 1) / n) * Math.PI * 2;
    const color = RAINBOW[i % RAINBOW.length];
    facets.push(
      <path key={i} d={`M${cx} ${cy} L${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} L${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)} Z`} fill={color} opacity="0.12" />
    );
  }
  return <g className="prism-facets">{facets}</g>;
}

function RainbowRing({ cx, cy, r }) {
  const segments = [];
  for (let i = 0; i < 7; i++) {
    const a1 = (i / 7) * Math.PI * 2;
    const a2 = ((i + 1) / 7) * Math.PI * 2;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    segments.push(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={RAINBOW[i]} strokeWidth="3" opacity="0.3" strokeLinecap="round" className="rainbow-ring-seg" style={{ animationDelay: `${i * 0.2}s` }} />
    );
  }
  return <g>{segments}</g>;
}

function RainbowAura({ cx, cy, r, intense = false }) {
  return (
    <g opacity={intense ? 0.35 : 0.2}>
      {RAINBOW.map((color, i) => (
        <circle key={i} cx={cx} cy={cy} r={r - i * 8} fill="none" stroke={color} strokeWidth="2" opacity="0.15" filter="url(#star-blur)" />
      ))}
    </g>
  );
}

function RainbowEyes({ x, y, eyes, happy, sad, excited, eo, size }) {
  const ex = eo.x, ey = eo.y;
  const lx = x + 2 + ex, rx = x + 42 + ex;
  const ly = y + 2 + ey;

  if (eyes) {
    const d = happy ? `M${x - 10} ${y + 2} Q${x} ${y - 7} ${x + 10} ${y + 2}` : `M${x - 10} ${y} Q${x} ${y + 8} ${x + 10} ${y}`;
    return (<>
      <path d={d} stroke="#7C3AED" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d={`M${x + 30} ${y + 2} Q${x + 40} ${y - 7} ${x + 50} ${y + 2}`} stroke="#06B6D4" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </>);
  }
  if (excited) return (<>
    <ellipse cx={x} cy={y} rx="12" ry="14" fill="url(#rainbow-stroke)" />
    <ellipse cx={x + 40} cy={y} rx="12" ry="14" fill="url(#rainbow-stroke)" />
    <circle cx={x} cy={y} r="6" fill="#FFF" />
    <circle cx={x + 40} cy={y} r="6" fill="#FFF" />
    <path d={`M${x - 3} ${y - 4} L${x} ${y} L${x + 3} ${y - 4} L${x} ${y - 7} Z`} fill="#FFD700" />
    <path d={`M${x + 37} ${y - 4} L${x + 40} ${y} L${x + 43} ${y - 4} L${x + 40} ${y - 7} Z`} fill="#FFD700" />
  </>);
  if (sad) return (<>
    <ellipse cx={x} cy={y} rx="12" ry="14" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="12" ry="14" fill="#FFF" />
    <circle cx={lx} cy={ly + 3} r="5" fill="#4C1D95" />
    <circle cx={rx} cy={ly + 3} r="5" fill="#4C1D95" />
    <circle cx={lx} cy={ly + 2} r="1.5" fill="#FFF" opacity="0.8" />
    <circle cx={rx} cy={ly + 2} r="1.5" fill="#FFF" opacity="0.8" />
    <circle cx={x - 4} cy={y + 18} r="3" fill="#818CF7" opacity="0.7" />
    <circle cx={x + 44} cy={y + 18} r="3" fill="#818CF7" opacity="0.7" />
  </>);
  return (<>
    <ellipse cx={x} cy={y} rx="10" ry="12" fill="#FFF" />
    <ellipse cx={x + 40} cy={y} rx="10" ry="12" fill="#FFF" />
    <circle cx={lx} cy={ly} r="7" fill="url(#iris-rainbow)" />
    <circle cx={rx} cy={ly} r="7" fill="url(#iris-rainbow)" />
    <circle cx={lx} cy={ly} r="7" fill="none" stroke="#7C3AED" strokeWidth="1.5" opacity="0.4" />
    <circle cx={rx} cy={ly} r="7" fill="none" stroke="#06B6D4" strokeWidth="1.5" opacity="0.4" />
    <circle cx={lx} cy={ly} r="4.5" fill="#1A1A2E" />
    <circle cx={rx} cy={ly} r="4.5" fill="#1A1A2E" />
    <circle cx={lx - 2} cy={ly - 3} r="2.5" fill="#FFF" />
    <circle cx={rx - 2} cy={ly - 3} r="2.5" fill="#FFF" />
    <circle cx={lx + 2} cy={ly + 2} r="1.2" fill="#FFD700" opacity="0.6" />
    <circle cx={rx + 2} cy={ly + 2} r="1.2" fill="#FFD700" opacity="0.6" />
  </>);
}

function RainbowMouth({ y, happy, sad }) {
  if (happy) return (<>
    <path d={`M86 ${y} Q100 ${y + 16} 114 ${y}`} stroke="#EC4899" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d={`M94 ${y + 7} Q100 ${y + 13} 106 ${y + 7}`} stroke="#F472B6" strokeWidth="2" fill="none" strokeLinecap="round" />
  </>);
  if (sad) return <path d={`M86 ${y + 8} Q100 ${y - 4} 114 ${y + 8}`} stroke="#818CF7" strokeWidth="3" fill="none" strokeLinecap="round" />;
  return <line x1="91" y1={y + 2} x2="109" y2={y + 2} stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" />;
}

function RainbowPaws({ x, x2, y, bigger, biggest }) {
  const s = biggest ? 1.3 : bigger ? 1.1 : 0.9;
  return (<>
    {[x, x2].map((px, i) => (
      <g key={i}>
        <ellipse cx={px} cy={y + 3} rx={11 * s} ry={4 * s} fill="#000" opacity="0.1" />
        <circle cx={px} cy={y} r={9 * s} fill={RAINBOW[i * 3 % RAINBOW.length]} opacity="0.7" stroke="#FFF" strokeWidth="1.5" />
        <circle cx={px - 2 * s} cy={y - 2 * s} r={2.5 * s} fill="#FFF" opacity="0.5" />
      </g>
    ))}
  </>);
}

function RainbowTrail({ x, y, count, spread = false }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const px = x + (spread ? t * 28 : t * 14);
    const py = y - t * 35 - Math.sin(t * Math.PI) * 8;
    const s = 5 - t * 3.5;
    const color = RAINBOW[i % RAINBOW.length];
    items.push(
      <g key={i} className="comet-trail" style={{ animationDelay: `${i * 0.15}s` }}>
        <circle cx={px} cy={py} r={s + 2} fill={color} opacity="0.2" filter="url(#star-blur-sm)" />
        <circle cx={px} cy={py} r={s} fill={color} opacity={0.6 - t * 0.35} />
        <circle cx={px} cy={py} r={s * 0.4} fill="#FFF" opacity="0.4" />
      </g>
    );
  }
  return <g>{items}</g>;
}

function RainbowBlush({ x1, x2, y }) {
  return (<>
    {RAINBOW.slice(0, 3).map((color, i) => (
      <circle key={`l${i}`} cx={x1 + i * 5} cy={y + i * 2} r={3 - i} fill={color} opacity="0.3" />
    ))}
    {RAINBOW.slice(0, 3).map((color, i) => (
      <circle key={`r${i}`} cx={x2 - i * 5} cy={y + i * 2} r={3 - i} fill={color} opacity="0.3" />
    ))}
  </>);
}

function PrismSparkles({ cx, cy, r, count }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.PI / 8;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    const s = 2.5 + (i % 3);
    const color = RAINBOW[i % RAINBOW.length];
    items.push(
      <g key={i} className="orbit-sparkle" style={{ animationDelay: `${i * 0.2}s` }}>
        <path d={`M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3} Z`} fill={color} opacity="0.5" />
        <circle cx={x} cy={y} r={s * 0.3} fill="#FFF" opacity="0.4" />
      </g>
    );
  }
  return <g>{items}</g>;
}

export function RainbowDefs() {
  return (
    <defs>
      <linearGradient id="rainbow-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
        {RAINBOW.map((c, i) => (
          <stop key={i} offset={`${(i / (RAINBOW.length - 1)) * 100}%`} stopColor={c} />
        ))}
      </linearGradient>
      <linearGradient id="iris-rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EC4899" />
        <stop offset="50%" stopColor="#818CF7" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
  );
}
