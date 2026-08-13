import { todayIso } from '../utils/date.js';

/**
 * Habit Tree v2 — премиум SVG с объёмом, тенями, плавными формами.
 * Дерево растёт от регулярности: семечко → росток → молодое → цветущее → плодоносящее.
 */

const STAGES = {
  seed: { label: '🌱 Семечко', desc: 'Только начало пути' },
  sprout: { label: '🌿 Росток', desc: 'Первые ростки прогресса' },
  young: { label: '🌳 Молодое', desc: 'Растёт крепким' },
  bloom: { label: '🌸 Цветущее', desc: 'Расцветает от твоих усилий' },
  full: { label: '🍎 Плодоносящее', desc: 'Полная сила привычек!' },
};

export default function HabitTreePage({ habits = [] }) {
  const done = habits.filter((h) => (h.logs || []).some((l) => l.date === todayIso() && l.status === 'done')).length;
  const total = habits.length;
  const healthPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const stage = healthPct === 0 ? 'seed' : healthPct < 33 ? 'sprout' : healthPct < 66 ? 'young' : healthPct < 100 ? 'bloom' : 'full';
  const info = STAGES[stage];

  return (
    <div className="page habit-tree">
      <div className="tree-hero glass">
        <h2>🌳 Дерево привычек</h2>
        <p>Твоё дерево растёт от регулярности. Отмечай привычки каждый день!</p>
      </div>

      <div className="tree-visual glass">
        <TreeSVG stage={stage} healthPct={healthPct} />
        <div className="tree-stage">{info.label}</div>
        <div className="tree-stage-desc">{info.desc}</div>
        <div className="tree-health-bar">
          <div className="tree-health-fill" style={{ width: `${healthPct}%` }} />
        </div>
        <div className="tree-health-text">Здоровье: {healthPct}%</div>
      </div>

      <div className="tree-leaves">
        <h3 className="card-title">Листья ({habits.length})</h3>
        {habits.map((h) => {
          const active = (h.logs || []).some((l) => l.date === todayIso() && l.status === 'done');
          return (
            <div key={h.id} className={`tree-leaf ${active ? 'alive' : 'wilted'}`}>
              <span className="tree-leaf-emoji">{h.emoji}</span>
              <span className="tree-leaf-title">{h.title}</span>
              {h.streak > 0 && <span className="tree-leaf-streak">🔥 {h.streak}</span>}
              <span className={`tree-leaf-status ${active ? 'alive' : 'wilted'}`}>{active ? '🌿' : '🍂'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Премиум SVG дерева с тенями, градиентами, объёмом */
function TreeSVG({ stage, healthPct }) {
  const vitality = 0.5 + (healthPct / 100) * 0.5; // 0.5-1.0

  return (
    <svg width="220" height="260" viewBox="0 0 220 260" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="trunk-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6B4423" />
          <stop offset="50%" stopColor="#9B6B3F" />
          <stop offset="100%" stopColor="#6B4423" />
        </linearGradient>
        <radialGradient id="leaf-light" cx="40%" cy="30%">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="60%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </radialGradient>
        <radialGradient id="leaf-dark" cx="40%" cy="30%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#047857" />
        </radialGradient>
        <radialGradient id="ground" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#9B6B3F" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#9B6B3F" stopOpacity="0" />
        </radialGradient>
        <filter id="tree-shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Земля */}
      <ellipse cx="110" cy="240" rx="70" ry="10" fill="url(#ground)" />

      {/* Семечко */}
      {stage === 'seed' && (
        <g opacity={vitality} filter="url(#tree-shadow)">
          <ellipse cx="110" cy="228" rx="14" ry="10" fill="#9B6B3F" />
          <path d="M110 222 Q114 216 110 212 Q106 216 110 222" fill="#34D399" opacity="0.8" />
        </g>
      )}

      {/* Росток */}
      {stage === 'sprout' && (
        <g opacity={vitality} filter="url(#tree-shadow)">
          <rect x="107" y="210" width="6" height="20" fill="url(#trunk-grad)" rx="2" />
          <ellipse cx="100" cy="205" rx="10" ry="6" fill="url(#leaf-light)" transform="rotate(-30 100 205)" />
          <ellipse cx="120" cy="205" rx="10" ry="6" fill="url(#leaf-light)" transform="rotate(30 120 205)" />
        </g>
      )}

      {/* Молодое / Цветущее / Плодоносящее */}
      {stage !== 'seed' && stage !== 'sprout' && (
        <g opacity={vitality} filter="url(#tree-shadow)">
          {/* Ствол с текстурой */}
          <path d="M104 230 Q102 180 106 140 L114 140 Q118 180 116 230 Z" fill="url(#trunk-grad)" />
          {/* Ветки */}
          <path d="M110 175 Q90 165 78 170" stroke="#6B4423" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M110 165 Q130 155 142 160" stroke="#6B4423" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M110 150 Q95 140 85 142" stroke="#6B4423" strokeWidth="4" fill="none" strokeLinecap="round" />

          {/* Крона —多层 накладывающихся кругов */}
          <circle cx="110" cy="110" r="48" fill="url(#leaf-dark)" />
          <circle cx="78" cy="128" r="32" fill="url(#leaf-light)" opacity="0.95" />
          <circle cx="142" cy="128" r="32" fill="url(#leaf-light)" opacity="0.95" />
          <circle cx="110" cy="82" r="34" fill="url(#leaf-light)" opacity="0.9" />
          <circle cx="88" cy="100" r="24" fill="url(#leaf-light)" opacity="0.85" />
          <circle cx="132" cy="100" r="24" fill="url(#leaf-light)" opacity="0.85" />

          {/* Блики на кроне */}
          <ellipse cx="95" cy="85" rx="14" ry="10" fill="#FFFFFF" opacity="0.2" />
        </g>
      )}

      {/* Цветы */}
      {stage === 'bloom' && (
        <g opacity={vitality}>
          {[[75, 110], [145, 105], [100, 75], [130, 130], [90, 140]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="6" fill="#EC4899" opacity="0.9" />
              <circle cx={x} cy={y} r="3" fill="#FBBF24" />
            </g>
          ))}
        </g>
      )}

      {/* Плоды */}
      {stage === 'full' && (
        <g opacity={vitality}>
          {[[75, 115], [148, 110], [95, 78], [135, 130], [88, 140], [125, 90]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="7" fill={i % 2 === 0 ? '#EF4444' : '#F59E0B'} />
              <circle cx={x - 2} cy={y - 2} r="2" fill="#FFFFFF" opacity="0.4" />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
