import { Router } from 'express';
import pool from '../db/pool.js';
import { TIERS } from './habits.js';

const router = Router();

/**
 * GET /api/achievements — список всех уровней достижений + прогресс пользователя.
 * Берёт полный список из TIERS (из habits.js), чтобы быть синхронным с начислениями.
 */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: unlocked } = await pool.query(
      `SELECT code, habit_id, unlocked_at::text AS unlocked_at
       FROM achievements WHERE user_id = $1 ORDER BY unlocked_at DESC`,
      [userId],
    );

    const { rows: habits } = await pool.query(
      `SELECT id, frequency FROM habits WHERE user_id = $1 AND archived = FALSE`,
      [userId],
    );

    const { rows: logs } = await pool.query(
      `SELECT habit_id, log_date::text AS date FROM habit_logs
       WHERE user_id = $1 AND status = 'done' AND log_date >= CURRENT_DATE - INTERVAL '365 days'
       ORDER BY log_date`,
      [userId],
    );

    const logsByHabit = {};
    for (const l of logs) (logsByHabit[l.habit_id] ||= []).push(l.date);

    const freqMap = {};
    for (const h of habits) {
      freqMap[h.id] = typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency;
    }

    let bestStreak = 0;
    for (const h of habits) {
      const s = calcStreak(logsByHabit[h.id] || [], freqMap[h.id]);
      if (s > bestStreak) bestStreak = s;
    }

    const tiers = TIERS.map((t) => {
      const got = unlocked.some((u) => u.code === t.code);
      return {
        ...t,
        unlocked: got,
        progress: Math.min(100, Math.round((bestStreak / t.threshold) * 100)),
      };
    });

    res.json({
      tiers,
      unlocked: unlocked.map((u) => ({
        ...u,
        tier: TIERS.find((t) => t.code === u.code),
      })),
      bestStreak,
      totalUnlocked: unlocked.length,
    });
  } catch (err) {
    console.error('GET /achievements:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

function calcStreak(logDates, frequency) {
  if (!logDates.length) return 0;
  const set = new Set(logDates);
  const days = frequency?.type === 'weekly' ? frequency.days : null;
  let streak = 0;
  let cursor = new Date();
  cursor = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z'); // UTC-якорь
  for (let i = 0; i < 365; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    const expected = !days || days.includes(cursor.getUTCDay());
    if (set.has(iso)) streak++;
    else if (expected && i > 0) break;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export default router;
