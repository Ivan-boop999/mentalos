import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/** Описание уровней достижений (используется и фронтом через GET) */
export const ACHIEVEMENT_TIERS = [
  { code: 'streak_7', threshold: 7, title: 'Неделя', emoji: '🔥', desc: '7 дней подряд' },
  { code: 'streak_30', threshold: 30, title: 'Месяц', emoji: '💎', desc: '30 дней подряд' },
  { code: 'streak_100', threshold: 100, title: 'Век', emoji: '🏆', desc: '100 дней подряд' },
];

/**
 * GET /api/achievements
 * Возвращает все достижения пользователя + статус по каждому уровню:
 *  - unlocked: уже полученные
 *  - progress: прогресс до следующей ступени (по лучшему streak среди привычек)
 */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    // Все разблокированные
    const { rows: unlocked } = await pool.query(
      `SELECT code, habit_id, unlocked_at::text AS unlocked_at
       FROM achievements WHERE user_id = $1 ORDER BY unlocked_at DESC`,
      [userId],
    );

    // Лучший текущий streak пользователя
    const { rows: habits } = await pool.query(
      `SELECT id, frequency FROM habits WHERE user_id = $1 AND archived = FALSE`,
      [userId],
    );

    const { rows: logs } = await pool.query(
      `SELECT habit_id, log_date::text AS date FROM habit_logs
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '365 days'
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

    const tiers = ACHIEVEMENT_TIERS.map((t) => {
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
        tier: ACHIEVEMENT_TIERS.find((t) => t.code === u.code),
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
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    const expected = !days || days.includes(cursor.getDay());
    const marked = set.has(iso);
    if (marked) {
      streak++;
    } else if (expected && i > 0) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default router;
