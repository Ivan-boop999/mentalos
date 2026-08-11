import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/** GET /api/habits — все привычки + логи за 30 дней + streak + best_streak */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: habits } = await pool.query(
      `SELECT h.id, h.title, h.emoji, h.color, h.frequency, h.reminder_time, h.best_streak,
              h.category_id, c.name AS category_name, c.emoji AS category_emoji
       FROM habits h
       LEFT JOIN categories c ON c.id = h.category_id
       WHERE h.user_id = $1 AND h.archived = FALSE
       ORDER BY h.created_at ASC`,
      [userId],
    );

    const { rows: logs } = await pool.query(
      `SELECT habit_id, log_date::text AS date
       FROM habit_logs
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY log_date ASC`,
      [userId],
    );

    const logsByHabit = {};
    for (const l of logs) (logsByHabit[l.habit_id] ||= []).push(l.date);

    const result = habits.map((h) => {
      const freq = typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency;
      const logs = logsByHabit[h.id] || [];
      const streak = calcStreak(logs, freq);
      return {
        ...h,
        frequency: freq,
        category: h.category_id ? { id: h.category_id, name: h.category_name, emoji: h.category_emoji } : null,
        logs,
        streak,
        best_streak: Math.max(h.best_streak || 0, streak),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('GET /habits:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/habits — создать */
router.post('/', async (req, res) => {
  const userId = req.userId;
  const { title, emoji = '✨', color = '#7C3AED', frequency = { type: 'daily' }, reminderTime = null, categoryId = null } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Название обязательно' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO habits (user_id, title, emoji, color, frequency, reminder_time, category_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, emoji, color, frequency, reminder_time, best_streak, category_id`,
      [userId, title.trim(), emoji, color, frequency, reminderTime, categoryId],
    );
    const habit = rows[0];
    habit.frequency = typeof habit.frequency === 'string' ? JSON.parse(habit.frequency) : habit.frequency;
    habit.logs = [];
    habit.streak = 0;
    res.status(201).json(habit);
  } catch (err) {
    console.error('POST /habits:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** PUT /api/habits/:id — обновить */
router.put('/:id', async (req, res) => {
  const userId = req.userId;
  const habitId = Number(req.params.id);
  const { title, emoji, color, frequency, reminderTime, categoryId } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE habits SET
         title = COALESCE($3, title),
         emoji = COALESCE($4, emoji),
         color = COALESCE($5, color),
         frequency = COALESCE($6, frequency),
         reminder_time = COALESCE($7, reminder_time),
         category_id = COALESCE($8, category_id)
       WHERE id = $1 AND user_id = $2 AND archived = FALSE
       RETURNING id, title, emoji, color, frequency, reminder_time, best_streak, category_id`,
      [habitId, userId, title, emoji, color, frequency ? JSON.stringify(frequency) : null, reminderTime ?? null, categoryId ?? null],
    );
    if (!rows.length) return res.status(404).json({ error: 'Привычка не найдена' });
    const h = rows[0];
    h.frequency = typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency;
    res.json(h);
  } catch (err) {
    console.error('PUT /habits:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** DELETE /api/habits/:id — в архив */
router.delete('/:id', async (req, res) => {
  const userId = req.userId;
  try {
    const { rowCount } = await pool.query(
      `UPDATE habits SET archived = TRUE WHERE id = $1 AND user_id = $2`,
      [Number(req.params.id), userId],
    );
    if (!rowCount) return res.status(404).json({ error: 'Не найдена' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE habit:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/habits/:id/toggle — отметить/снять + достижения + бонусы + best_streak */
router.post('/:id/toggle', async (req, res) => {
  const userId = req.userId;
  const habitId = Number(req.params.id);
  const date = req.body?.date || new Date().toISOString().slice(0, 10);

  try {
    const { rows: existing } = await pool.query(
      `SELECT id FROM habit_logs WHERE habit_id = $1 AND user_id = $2 AND log_date = $3`,
      [habitId, userId, date],
    );

    if (existing.length) {
      await pool.query(`DELETE FROM habit_logs WHERE habit_id = $1 AND user_id = $2 AND log_date = $3`, [habitId, userId, date]);
      return res.json({ done: false, date, newAchievements: [] });
    }

    await pool.query(`INSERT INTO habit_logs (habit_id, user_id, log_date) VALUES ($1, $2, $3)`, [habitId, userId, date]);

    const { rows: hRows } = await pool.query(`SELECT frequency, best_streak FROM habits WHERE id = $1`, [habitId]);
    const freq = hRows[0] ? (typeof hRows[0].frequency === 'string' ? JSON.parse(hRows[0].frequency) : hRows[0].frequency) : null;

    const { rows: logRows } = await pool.query(`SELECT log_date::text AS date FROM habit_logs WHERE habit_id = $1 ORDER BY log_date`, [habitId]);
    const streak = calcStreak(logRows.map((r) => r.date), freq);

    // Обновляем best_streak, если превзойдён
    if (streak > (hRows[0]?.best_streak || 0)) {
      await pool.query(`UPDATE habits SET best_streak = $1 WHERE id = $2`, [streak, habitId]);
    }

    // Начисляем бонусы за отметку (1 бонус за каждое выполнение)
    await pool.query(`UPDATE users SET bonus_balance = bonus_balance + 1 WHERE id = $1`, [userId]);
    await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, 1, 'habit_checkin')`, [userId]);

    const newAchievements = await checkAchievements(userId, habitId, streak);

    res.json({ done: true, date, streak, best_streak: Math.max(streak, hRows[0]?.best_streak || 0), newAchievements, bonusEarned: 1 });
  } catch (err) {
    console.error('toggle:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===== Достижения =====
const TIERS = [
  { code: 'streak_7', threshold: 7, title: 'Неделя', emoji: '🔥', desc: '7 дней подряд', bonus: 50 },
  { code: 'streak_30', threshold: 30, title: 'Месяц', emoji: '💎', desc: '30 дней подряд', bonus: 200 },
  { code: 'streak_100', threshold: 100, title: 'Век', emoji: '🏆', desc: '100 дней подряд', bonus: 1000 },
];

async function checkAchievements(userId, habitId, streak) {
  const unlocked = [];
  for (const t of TIERS) {
    if (streak >= t.threshold) {
      const before = Date.now();
      await pool.query(
        `INSERT INTO achievements (user_id, habit_id, code) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [userId, habitId, t.code],
      );
      const { rows } = await pool.query(
        `SELECT unlocked_at FROM achievements WHERE user_id = $1 AND habit_id = $2 AND code = $3`,
        [userId, habitId, t.code],
      );
      if (rows[0] && Date.now() - new Date(rows[0].unlocked_at).getTime() < 5000) {
        // Новое достижение → бонус
        await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2`, [t.bonus, userId]);
        await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, $3)`, [t.bonus, `achievement:${t.code}`, userId]);
        unlocked.push({ ...t, habitId });
      }
    }
  }
  return unlocked;
}

/** GET /api/habits/:id/calendar?months=3 — сетка месяца как у GitHub */
router.get('/:id/calendar', async (req, res) => {
  const userId = req.userId;
  const habitId = Number(req.params.id);
  const months = Math.min(Math.max(Number(req.query.months) || 3, 1), 12);

  try {
    const { rows } = await pool.query(
      `SELECT log_date::text AS date FROM habit_logs
       WHERE habit_id = $1 AND user_id = $2 AND log_date >= CURRENT_DATE - ($3 || ' months')::interval
       ORDER BY log_date`,
      [habitId, userId, months],
    );
    res.json({ dates: rows.map((r) => r.date) });
  } catch (err) {
    console.error('calendar:', err);
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
    if (set.has(iso)) streak++;
    else if (expected && i > 0) break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default router;
export { TIERS };
