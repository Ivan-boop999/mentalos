import { useEffect, useState } from 'react';
import { api } from '../api/client';

/**
 * Дерево привычек — визуальная метафора прогресса.
 * Ствол = общее выполнение за 30 дней, листья = привычки (зелёные если стрик активен).
 */
export default function HabitTreePage({ habits = [] }) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const totalDone = habits.filter((h) => (h.logs || []).some((l) => l.date === todayIso && l.status === 'done')).length;
  const total = habits.length;
  const healthPct = total > 0 ? Math.round((totalDone / total) * 100) : 0;

  // Стадии дерева по здоровью
  const stage = healthPct === 0 ? 'seed' : healthPct < 33 ? 'sprout' : healthPct < 66 ? 'young' : healthPct < 100 ? 'bloom' : 'full';
  const stageLabel = { seed: '🌱 Семечко', sprout: '🌿 Росток', young: '🌳 Молодое', bloom: '🌸 Цветущее', full: '🍎 Плодоносящее' }[stage];

  return (
    <div className="page habit-tree">
      <div className="tree-hero glass">
        <h2>🌳 Дерево привычек</h2>
        <p>Твоё дерево растёт от регулярности. Отмечай привычки каждый день!</p>
      </div>

      <div className="tree-visual">
        <TreeSVG stage={stage} healthPct={healthPct} />
        <div className="tree-stage">{stageLabel}</div>
        <div className="tree-health">Здоровье: {healthPct}%</div>
      </div>

      <div className="tree-leaves">
        <h3 className="card-title">Листья ({habits.length})</h3>
        {habits.map((h) => {
          const active = (h.logs || []).some((l) => l.date === todayIso && l.status === 'done');
          return (
            <div key={h.id} className={`tree-leaf ${active ? 'alive' : 'wilted'}`}>
              <span className="tree-leaf-emoji">{h.emoji}</span>
              <span className="tree-leaf-title">{h.title}</span>
              <span className={`tree-leaf-status ${active ? 'alive' : 'wilted'}`}>{active ? '🌿' : '🍂'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TreeSVG({ stage, healthPct }) {
  const opacity = 0.4 + (healthPct / 100) * 0.6;
  return (
    <svg width="200" height="240" viewBox="0 0 200 240" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8B5A2B" />
          <stop offset="50%" stopColor="#A67C52" />
          <stop offset="100%" stopColor="#8B5A2B" />
        </linearGradient>
        <radialGradient id="leaf" cx="40%" cy="30%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </radialGradient>
      </defs>

      {/* Земля */}
      <ellipse cx="100" cy="225" rx="60" ry="8" fill="#3B2F1E" opacity="0.3" />

      {stage === 'seed' && (
        <g opacity={opacity}>
          <ellipse cx="100" cy="215" rx="10" ry="7" fill="#8B5A2B" />
        </g>
      )}

      {stage !== 'seed' && (
        <>
          {/* Ствол */}
          <rect x="95" y="140" width="10" height="80" fill="url(#trunk)" rx="3" opacity={opacity} />
          <path d="M100 170 Q85 155 75 160" stroke="#8B5A2B" strokeWidth="5" fill="none" strokeLinecap="round" opacity={opacity} />
          <path d="M100 160 Q115 145 125 150" stroke="#8B5A2B" strokeWidth="5" fill="none" strokeLinecap="round" opacity={opacity} />
        </>
      )}

      {stage === 'sprout' && (
        <g opacity={opacity}>
          <ellipse cx="100" cy="135" rx="18" ry="12" fill="url(#leaf)" />
        </g>
      )}

      {(stage === 'young' || stage === 'bloom' || stage === 'full') && (
        <g opacity={opacity}>
          <circle cx="100" cy="110" r="42" fill="url(#leaf)" />
          <circle cx="75" cy="125" r="28" fill="url(#leaf)" opacity="0.9" />
          <circle cx="125" cy="125" r="28" fill="url(#leaf)" opacity="0.9" />
          <circle cx="100" cy="85" r="30" fill="url(#leaf)" opacity="0.85" />
        </g>
      )}

      {stage === 'bloom' && (
        <g opacity={opacity}>
          <circle cx="80" cy="100" r="6" fill="#EC4899" />
          <circle cx="120" cy="95" r="5" fill="#F59E0B" />
          <circle cx="105" cy="120" r="5" fill="#EC4899" />
        </g>
      )}

      {stage === 'full' && (
        <g opacity={opacity}>
          <circle cx="78" cy="100" r="7" fill="#EF4444" />
          <circle cx="122" cy="95" r="7" fill="#F59E0B" />
          <circle cx="105" cy="120" r="7" fill="#EF4444" />
          <circle cx="90" cy="130" r="6" fill="#F59E0B" />
        </g>
      )}
    </svg>
  );
}
