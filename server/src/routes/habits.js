import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/habits
 * Возвращает все активные привычки пользователя + прогресс за последние N дней.
 * В каждом привычке: logs — массив дат выполнения за период, streak — текущая серия.
 */
router.get('/', async (req, res) => {
  const userId = req.userId;

  try {
    const { rows: habits } = await pool.query(
      `SELECT id, title, emoji, color, frequency, reminder_time, created_at
       FROM habits
       WHERE user_id = $1 AND archived = FALSE
       ORDER BY created_at ASC`,
      [userId],
    );

    // Подтягиваем отметки за последние 30 дней
    const { rows: logs } = await pool.query(
      `SELECT habit_id, log_date::text AS date
       FROM habit_logs
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY log_date ASC`,
      [userId],
    );

    // Группируем логи по habit_id
    const logsByHabit = {};
    for (const l of logs) {
      (logsByHabit[l.habit_id] ||= []).push(l.date);
    }

    const result = habits.map((h) => ({
      ...h,
      frequency: typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency,
      logs: logsByHabit[h.id] || [],
      streak: calcStreak(logsByHabit[h.id] || [], h.frequency),
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /habits:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/habits — создать привычку
 * body: { title, emoji, color, frequency, reminderTime }
 */
router.post('/', async (req, res) => {
  const userId = req.userId;
  const { title, emoji = '✨', color = '#7C3AED', frequency = { type: 'daily' }, reminderTime = null } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Название обязательно' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO habits (user_id, title, emoji, color, frequency, reminder_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, emoji, color, frequency, reminder_time, created_at`,
      [userId, title.trim(), emoji, color, frequency, reminderTime],
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

/**
 * PUT /api/habits/:id — обновить привычку
 */
router.put('/:id', async (req, res) => {
  const userId = req.userId;
  const habitId = Number(req.params.id);
  const { title, emoji, color, frequency, reminderTime } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE habits
       SET title        = COALESCE($3, title),
           emoji        = COALESCE($4, emoji),
           color        = COALESCE($5, color),
           frequency    = COALESCE($6, frequency),
           reminder_time = COALESCE($7, reminder_time)
       WHERE id = $1 AND user_id = $2 AND archived = FALSE
       RETURNING id, title, emoji, color, frequency, reminder_time, created_at`,
      [habitId, userId, title, emoji, color, frequency ? JSON.stringify(frequency) : null, reminderTime ?? null],
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Привычка не найдена' });
    const habit = rows[0];
    habit.frequency = typeof habit.frequency === 'string' ? JSON.parse(habit.frequency) : habit.frequency;
    res.json(habit);
  } catch (err) {
    console.error('PUT /habits/:id:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * DELETE /api/habits/:id — мягкое удаление (archive = true)
 */
router.delete('/:id', async (req, res) => {
  const userId = req.userId;
  const habitId = Number(req.params.id);

  try {
    const { rowCount } = await pool.query(
      `UPDATE habits SET archived = TRUE WHERE id = $1 AND user_id = $2`,
      [habitId, userId],
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Привычка не найдена' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /habits/:id:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/habits/:id/toggle — отметить/снять выполнение на дату (по умолчанию сегодня)
 * body: { date? } в формате YYYY-MM-DD
 * При выполнении проверяет достижения и возвращает свежеразблокированные.
 */
router.post('/:id/toggle', async (req, res) => {
  const userId = req.userId;
  const habitId = Number(req.params.id);
  const date = req.body?.date || new Date().toISOString().slice(0, 10);

  try {
    // Проверяем, есть ли уже отметка
    const { rows: existing } = await pool.query(
      `SELECT id FROM habit_logs WHERE habit_id = $1 AND user_id = $2 AND log_date = $3`,
      [habitId, userId, date],
    );

    if (existing.length > 0) {
      // Снимаем отметку
      await pool.query(
        `DELETE FROM habit_logs WHERE habit_id = $1 AND user_id = $2 AND log_date = $3`,
        [habitId, userId, date],
      );
      return res.json({ done: false, date, newAchievements: [] });
    }

    // Ставим отметку
    await pool.query(
      `INSERT INTO habit_logs (habit_id, user_id, log_date) VALUES ($1, $2, $3)`,
      [habitId, userId, date],
    );

    // Проверяем достижения по новому streak
    const { rows: habitRows } = await pool.query(
      `SELECT frequency FROM habits WHERE id = $1`,
      [habitId],
    );
    const freq = habitRows[0]
      ? typeof habitRows[0].frequency === 'string'
        ? JSON.parse(habitRows[0].frequency)
        : habitRows[0].frequency
      : null;

    const { rows: logRows } = await pool.query(
      `SELECT log_date::text AS date FROM habit_logs WHERE habit_id = $1 ORDER BY log_date`,
      [habitId],
    );

    const streak = calcStreak(
      logRows.map((r) => r.date),
      freq,
    );

    // Проверяем, какие награды только что разблокированы
    const newAchievements = await checkAndUnlockAchievements(userId, habitId, streak);

    res.json({ done: true, date, streak, newAchievements });
  } catch (err) {
    console.error('POST /habits/:id/toggle:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===== Достижения =====

const ACHIEVEMENT_TIERS = [
  { code: 'streak_7', threshold: 7, title: 'Неделя 🔥', emoji: '🔥', desc: '7 дней подряд' },
  { code: 'streak_30', threshold: 30, title: 'Месяц 💎', emoji: '💎', desc: '30 дней подряд' },
  { code: 'streak_100', threshold: 100, title: 'Стоfighter 🏆', emoji: '🏆', desc: '100 дней подряд' },
];

/**
 * Разблокирует достижения, которых ещё не было, возвращает их.
 */
async function checkAndUnlockAchievements(userId, habitId, streak) {
  const unlocked = [];
  for (const tier of ACHIEVEMENT_TIERS) {
    if (streak >= tier.threshold) {
      try {
        await pool.query(
          `INSERT INTO achievements (user_id, habit_id, code)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, habit_id, code) DO NOTHING`,
          [userId, habitId, tier.code],
        );
        // Проверяем, была ли это новая запись
        const { rows } = await pool.query(
          `SELECT unlocked_at FROM achievements WHERE user_id = $1 AND habit_id = $2 AND code = $3`,
          [userId, habitId, tier.code],
        );
        // если разблокирована только что (в пределах 5 секунд) — это новое
        if (rows[0] && Date.now() - new Date(rows[0].unlocked_at).getTime() < 5000) {
          unlocked.push({ ...tier, habitId });
        }
      } catch (e) {
        // ignore duplicates
      }
    }
  }
  return unlocked;
}

// ===== Утилиты =====

/**
 * Считает текущий streak (серию дней подряд до сегодня/вчера).
 * Учитывает частоту привычки.
 */
function calcStreak(logDates, frequency) {
  if (!logDates.length) return 0;
  const set = new Set(logDates);
  const days = frequency?.type === 'weekly' ? frequency.days : null; // массив [0..6] или null (каждый день)

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // Если сегодня не отмечено — streak может идти со вчера (не обрываем серию за сегодняшний день)
  let todayChecked = false;

  for (let i = 0; i < 365; i++) {
    const iso = cursor.toISOString().slice(0, 10);

    // Проверяем, должен ли этот день быть в графике
    const expected = !days || days.includes(cursor.getDay());
    const marked = set.has(iso);

    if (marked) {
      streak++;
      if (i === 0) todayChecked = true;
    } else if (expected) {
      // Пропуcк сегодня разрешён (если хотя бы один день уже засчитан) — обрываем только со вчера
      if (i === 0) {
        // сегодня не отмечено, продолжаем проверку со вчера
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export default router;
