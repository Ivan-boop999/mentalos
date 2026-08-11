import { useEffect, useState } from 'react';

/**
 * Конфетти при выполнении всех привычек за день.
 * Показывается один раз, затем убирается.
 */
const COLORS = ['#7C3AED', '#06B6D4', '#EC4899', '#F59E0B', '#10B981', '#6366F1'];

export default function Celebration({ trigger }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (trigger) {
      const n = 60;
      const next = Array.from({ length: n }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1.5,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 360,
      }));
      setPieces(next);
      const t = setTimeout(() => setPieces([]), 3500);
      return () => clearTimeout(t);
    }
  }, [trigger]);

  if (!pieces.length) return null;

  return (
    <div className="celebrate-overlay">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="celebrate-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
