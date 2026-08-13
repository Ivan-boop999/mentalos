import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/companion — состояние персонажа-компаньона.
 * Companion растёт от отметок привычек (xp), настроение зависит от % выполнения за последние 7 дней.
 */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: u } = await pool.query(
      `SELECT companion_name, companion_type, companion_xp, companion_mood FROM users WHERE id = $1`,
      [userId],
    );
    if (!u.length) return res.json({ name: 'Спарк', type: 'spark', xp: 0, mood: 50, level: 1, stage: 'egg' });

    const xp = u[0].companion_xp || 0;
    const level = Math.floor(Math.sqrt(xp / 50)) + 1;
    // Стадии эволюции: яйцо → малыш → подросток → взрослый
    const stages = ['egg', 'baby', 'teen', 'adult'];
    const stage = stages[Math.min(3, Math.floor(level / 5))];

    res.json({
      name: u[0].companion_name,
      type: u[0].companion_type,
      xp,
      mood: u[0].companion_mood,
      level,
      stage,
      xpToNext: Math.pow(level, 2) * 50,
      xpForThis: Math.pow(level - 1, 2) * 50,
    });
  } catch (err) {
    console.error('GET companion:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** PUT /api/companion — переименовать / сменить тип */
router.put('/', async (req, res) => {
  const { name, type } = req.body;
  const sets = {};
  if (name !== undefined && typeof name === 'string' && name.trim().length <= 20) sets.companion_name = name.trim();
  if (type !== undefined && ['spark', 'leaf', 'drop', 'flame'].includes(type)) sets.companion_type = type;
  if (!Object.keys(sets).length) return res.status(400).json({ error: 'Нечего обновлять' });

  try {
    const fields = Object.keys(sets).map((k, i) => `${k} = $${i + 2}`).join(', ');
    await pool.query(`UPDATE users SET ${fields} WHERE id = $1`, [req.userId, ...Object.values(sets)]);
    res.json({ ok: true, ...sets });
  } catch (err) {
    console.error('PUT companion:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Внутренняя функция: обновить companion при отметке привычки.
 * Вызывается из habits.js /log.
 */
export async function rewardCompanion(userId, isDone) {
  if (!isDone) {
    // Пропуск — настроение чуть падает
    await pool.query(`UPDATE users SET companion_mood = GREATEST(0, companion_mood - 3) WHERE id = $1`, [userId]);
    return;
  }
  // Выполнение → +xp и +mood
  await pool.query(
    `UPDATE users SET companion_xp = companion_xp + 15, companion_mood = LEAST(100, companion_mood + 8) WHERE id = $1`,
    [userId],
  );
}

/** Регенерация настроения: раз в сутки mood дрейфует к среднему выполнению за неделю */
export async function decayCompanionMood(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE status = 'done') AS done,
            COUNT(DISTINCT log_date) AS days
     FROM habit_logs
     WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '7 days'`,
    [userId],
  );
  const target = rows[0]?.days > 0 ? Math.round(((rows[0].done / rows[0].days) / 3) * 100) : 50;
  await pool.query(
    `UPDATE users SET companion_mood = LEAST(100, GREATEST(0, companion_mood + ($2 - companion_mood) * 0.2)) WHERE id = $1`,
    [userId, target],
  );
}

export default router;
