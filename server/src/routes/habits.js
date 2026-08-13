import { Router } from 'express';
import pool from '../db/pool.js';
import { rewardCompanion } from './companion.js';

const router = Router();

/** GET /api/habits — все привычки + логи + streak + best_streak */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: habits } = await pool.query(
      `SELECT h.id, h.title, h.emoji, h.color, h.frequency, h.reminder_time, h.best_streak,
              h.goal_type, h.goal_target, h.goal_unit, h.category_id,
              h.cue, h.identity, h.time_of_day, h.stack_after, h.comeback_shield,
              c.name AS category_name, c.emoji AS category_emoji,
              s.title AS stack_after_title, s.emoji AS stack_after_emoji
       FROM habits h
       LEFT JOIN categories c ON c.id = h.category_id
       LEFT JOIN habits s ON s.id = h.stack_after
       WHERE h.user_id = $1 AND h.archived = FALSE
       ORDER BY h.created_at ASC`,
      [userId],
    );

    const { rows: logs } = await pool.query(
      `SELECT habit_id, log_date::text AS date, status, value
       FROM habit_logs
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '35 days'
       ORDER BY log_date ASC`,
      [userId],
    );

    const { rows: notes } = await pool.query(
      `SELECT habit_id, log_date::text AS date, note FROM habit_notes WHERE user_id = $1`,
      [userId],
    );

    const logsByHabit = {};
    for (const l of logs) (logsByHabit[l.habit_id] ||= []).push(l);
    const notesByHabit = {};
    for (const n of notes) (notesByHabit[n.habit_id] ||= {})[n.date] = n.note;

    const todayIso = new Date().toISOString().slice(0, 10);
    const result = habits.map((h) => {
      const freq = typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency;
      const hLogs = logsByHabit[h.id] || [];
      const streak = calcStreak(hLogs, freq, h.comeback_shield);
      const todayLog = hLogs.find((l) => l.date === todayIso);
      return {
        ...h,
        frequency: freq,
        category: h.category_id ? { id: h.category_id, name: h.category_name, emoji: h.category_emoji } : null,
        stackAfter: h.stack_after ? { id: h.stack_after, title: h.stack_after_title, emoji: h.stack_after_emoji } : null,
        logs: hLogs,
        notes: notesByHabit[h.id] || {},
        streak,
        best_streak: Math.max(h.best_streak || 0, streak),
        todayValue: todayLog?.value || 0,
        todayStatus: todayLog?.status || null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('GET /habits:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/habits — создать (с поддержкой goal_type + психология) */
router.post('/', async (req, res) => {
  const userId = req.userId;
  const {
    title, emoji = '✨', color = '#7C3AED',
    frequency = { type: 'daily' }, reminderTime = null, categoryId = null,
    goalType = 'boolean', goalTarget = 1, goalUnit = 'раз',
    cue = null, identity = null, timeOfDay = 'any', stackAfter = null,
  } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Название обязательно' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO habits (user_id, title, emoji, color, frequency, reminder_time, category_id,
                           goal_type, goal_target, goal_unit, cue, identity, time_of_day, stack_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, title, emoji, color, frequency, reminder_time, best_streak,
                 goal_type, goal_target, goal_unit, cue, identity, time_of_day, stack_after`,
      [userId, title.trim(), emoji, color, frequency, reminderTime, categoryId,
       goalType, goalTarget, goalUnit, cue, identity, timeOfDay, stackAfter],
    );
    const habit = rows[0];
    habit.frequency = typeof habit.frequency === 'string' ? JSON.parse(habit.frequency) : habit.frequency;
    habit.logs = []; habit.notes = {}; habit.streak = 0; habit.todayValue = 0;
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
  const { title, emoji, color, frequency, reminderTime, categoryId,
    goalType, goalTarget, goalUnit, cue, identity, timeOfDay, stackAfter } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE habits SET
         title = COALESCE($3, title), emoji = COALESCE($4, emoji), color = COALESCE($5, color),
         frequency = COALESCE($6, frequency), reminder_time = COALESCE($7, reminder_time),
         category_id = COALESCE($8, category_id),
         goal_type = COALESCE($9, goal_type), goal_target = COALESCE($10, goal_target),
         goal_unit = COALESCE($11, goal_unit),
         cue = COALESCE($12, cue), identity = COALESCE($13, identity),
         time_of_day = COALESCE($14, time_of_day), stack_after = COALESCE($15, stack_after)
       WHERE id = $1 AND user_id = $2 AND archived = FALSE
       RETURNING id, title, emoji, color, frequency, reminder_time, best_streak,
                 goal_type, goal_target, goal_unit, cue, identity, time_of_day, stack_after`,
      [habitId, userId, title, emoji, color,
        frequency ? JSON.stringify(frequency) : null, reminderTime ?? null, categoryId ?? null,
        goalType ?? null, goalTarget ?? null, goalUnit ?? null,
        cue ?? null, identity ?? null, timeOfDay ?? null, stackAfter ?? null],
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
  try {
    const { rowCount } = await pool.query(
      `UPDATE habits SET archived = TRUE WHERE id = $1 AND user_id = $2`,
      [Number(req.params.id), req.userId],
    );
    if (!rowCount) return res.status(404).json({ error: 'Не найдена' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE habit:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** GET /api/habits/archived — список архивных привычек */
router.get('/archived', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, emoji, color, best_streak, created_at::text AS created_at
       FROM habits WHERE user_id = $1 AND archived = TRUE ORDER BY created_at DESC`,
      [req.userId],
    );
    res.json(rows);
  } catch (err) {
    console.error('GET archived:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/habits/:id/restore — восстановить из архива */
router.post('/:id/restore', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE habits SET archived = FALSE WHERE id = $1 AND user_id = $2`,
      [Number(req.params.id), req.userId],
    );
    if (!rowCount) return res.status(404).json({ error: 'Не найдена' });
    res.json({ ok: true });
  } catch (err) {
    console.error('restore habit:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** GET /api/habits/:id/strength — habit strength score (как Loop: взвешенная сила) */
router.get('/:id/strength', async (req, res) => {
  const habitId = Number(req.params.id);
  try {
    const { rows: hRows } = await pool.query(`SELECT frequency FROM habits WHERE id = $1 AND user_id = $2`, [habitId, req.userId]);
    if (!hRows.length) return res.status(404).json({ error: 'Не найдена' });
    const freq = typeof hRows[0].frequency === 'string' ? JSON.parse(hRows[0].frequency) : hRows[0].frequency;

    // Все отметки за последние 365 дней
    const { rows: logs } = await pool.query(
      `SELECT log_date::text AS date, status FROM habit_logs
       WHERE habit_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '365 days' ORDER BY log_date`,
      [habitId],
    );

    // Expected даты за период
    const days = freq?.type === 'weekly' ? freq.days : null;
    const expectedDates = new Set();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (!days || days.includes(d.getDay())) expectedDates.add(d.toISOString().slice(0, 10));
    }

    // Strength score (0-100): взвешенная сумма выполнений с экспоненциальным затуханием
    // Новые отметки весят больше (как в Loop). decay = 0.99 в день.
    const doneSet = new Set(logs.filter((l) => l.status === 'done').map((l) => l.date));
    let strength = 0;
    let totalWeight = 0;
    let dayIdx = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      if (!expectedDates.has(iso)) continue;
      const weight = Math.pow(0.99, dayIdx);
      totalWeight += weight;
      if (doneSet.has(iso)) strength += weight;
      dayIdx++;
    }

    const score = totalWeight > 0 ? Math.round((strength / totalWeight) * 100) : 0;
    res.json({ score, totalDays: expectedDates.size, doneDays: doneSet.size });
  } catch (err) {
    console.error('strength:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/habits/buy-streak-insurance — купить страховку стрика (100 бонусов)
 */
router.post('/buy-streak-insurance', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: u } = await pool.query(`SELECT bonus_balance, streak_insurance FROM users WHERE id = $1`, [userId]);
    if (u[0]?.streak_insurance) return res.status(400).json({ error: 'Страховка уже активна' });
    if ((u[0]?.bonus_balance || 0) < 100) return res.status(402).json({ error: 'Недостаточно бонусов' });

    await pool.query(`UPDATE users SET bonus_balance = bonus_balance - 100, streak_insurance = TRUE WHERE id = $1`, [userId]);
    await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, -100, 'streak_insurance')`, [userId]);
    res.json({ ok: true, balance: (u[0].bonus_balance - 100) });
  } catch (err) {
    console.error('buy insurance:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/habits/:id/log
 * body: { date?, status: 'done'|'skip', value?, note? }
 * Универсальная отметка с поддержкой skip и measurable.
 */
router.post('/:id/log', async (req, res) => {
  const userId = req.userId;
  const habitId = Number(req.params.id);
  const date = req.body?.date || new Date().toISOString().slice(0, 10);
  const status = req.body?.status || 'done';
  const value = Number(req.body?.value) || null;
  const note = req.body?.note;

  try {
    // Корректировка: для measurable берём статус 'done' только если value >= goal_target,
    // иначе сохраняем статус 'partial' (не портит streak, но и не засчитывает его)
    let finalStatus = status;
    if (status === 'done' && value !== null) {
      const { rows: h0 } = await pool.query(`SELECT goal_type, goal_target FROM habits WHERE id = $1`, [habitId]);
      if (h0[0]?.goal_type === 'measurable' && value < (h0[0].goal_target || 1)) {
        finalStatus = 'partial';
      }
    }

    // upsert отметки
    await pool.query(
      `INSERT INTO habit_logs (habit_id, user_id, log_date, status, value)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (habit_id, log_date) DO UPDATE SET status = EXCLUDED.status, value = EXCLUDED.value`,
      [habitId, userId, date, finalStatus, value],
    );

    // upsert заметки
    if (note !== undefined) {
      if (note === null || note === '') {
        await pool.query(`DELETE FROM habit_notes WHERE habit_id = $1 AND log_date = $2`, [habitId, date]);
      } else {
        await pool.query(
          `INSERT INTO habit_notes (habit_id, user_id, log_date, note)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (habit_id, log_date) DO UPDATE SET note = EXCLUDED.note`,
          [habitId, userId, date, note],
        );
      }
    }

    // Считаем актуальный streak
    const { rows: hRows } = await pool.query(`SELECT frequency, best_streak, goal_type, goal_target FROM habits WHERE id = $1`, [habitId]);
    const freq = hRows[0] ? (typeof hRows[0].frequency === 'string' ? JSON.parse(hRows[0].frequency) : hRows[0].frequency) : null;
    const { rows: logRows } = await pool.query(
      `SELECT log_date::text AS date, status, value FROM habit_logs WHERE habit_id = $1 ORDER BY log_date`,
      [habitId],
    );

    const streak = calcStreak(logRows, freq);
    if (streak > (hRows[0]?.best_streak || 0)) {
      await pool.query(`UPDATE habits SET best_streak = $1 WHERE id = $2`, [streak, habitId]);
    }

    // XP и бонусы только за done (не partial, не skip)
    let bonusEarned = 0;
    let xpEarned = 0;
    let leveledUp = null;
    if (finalStatus === 'skip' || finalStatus === 'partial') {
      // Пропуск/частично — компаньон грустит
      await rewardCompanion(userId, false);
    }
    if (finalStatus === 'done') {
      bonusEarned = 1;
      xpEarned = 10;
      const { rows: before } = await pool.query(`SELECT level FROM users WHERE id = $1`, [userId]);
      const levelBefore = before[0]?.level || 1;
      await pool.query(`UPDATE users SET bonus_balance = bonus_balance + 1, xp = xp + 10, total_checkins = total_checkins + 1 WHERE id = $1`, [userId]);
      await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, 1, 'habit_checkin')`, [userId]);
      // Награждаем компаньона (Tamagotchi-эффект)
      await rewardCompanion(userId, true);
      const newLevel = await updateLevel(userId);
      if (newLevel > levelBefore) {
        leveledUp = { from: levelBefore, to: newLevel };
        // Бонус за рост уровня
        const lvlBonus = 50 * newLevel;
        await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2`, [lvlBonus, userId]);
        await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'level_up')`, [lvlBonus, userId]);
      }
    }

    const newAchievements = finalStatus === 'done' ? await checkAchievements(userId, habitId, streak) : [];

    // ===== Variable reward (dopamine loop): ~12% шанс на «сюрприз» =====
    let surprise = null;
    if (finalStatus === 'done' && Math.random() < 0.12) {
      const surprises = [
        { type: 'bonus', amount: 5, label: '🎉 Сюрприз! +5 бонусов' },
        { type: 'bonus', amount: 10, label: '🎁 Удача! +10 бонусов' },
        { type: 'xp', amount: 20, label: '⚡ Бонусный опыт +20 XP' },
        { type: 'streak_shield', amount: 1, label: '🛡️ Щит восстановления получен!' },
      ];
      surprise = surprises[Math.floor(Math.random() * surprises.length)];
      if (surprise.type === 'bonus') {
        await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2`, [surprise.amount, userId]);
        await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'surprise')`, [surprise.amount, userId]);
      } else if (surprise.type === 'xp') {
        await pool.query(`UPDATE users SET xp = xp + $1 WHERE id = $2`, [surprise.amount, userId]);
        await updateLevel(userId);
      } else if (surprise.type === 'streak_shield') {
        await pool.query(`UPDATE habits SET comeback_shield = TRUE WHERE id = $1`, [habitId]);
      }
    }

    res.json({
      ok: true, date, status: finalStatus, value, streak,
      best_streak: Math.max(streak, hRows[0]?.best_streak || 0),
      newAchievements, bonusEarned, xpEarned, leveledUp, surprise,
    });
  } catch (err) {
    console.error('log:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/habits/:id/unlog — удалить отметку (снять) */
router.post('/:id/unlog', async (req, res) => {
  const userId = req.userId;
  const habitId = Number(req.params.id);
  const date = req.body?.date || new Date().toISOString().slice(0, 10);
  try {
    await pool.query(`DELETE FROM habit_logs WHERE habit_id = $1 AND user_id = $2 AND log_date = $3`, [habitId, userId, date]);
    res.json({ ok: true, date });
  } catch (err) {
    console.error('unlog:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** GET /api/habits/calendar?id=...&months=3 — сетка для календаря */
router.get('/calendar', async (req, res) => {
  const userId = req.userId;
  const habitId = Number(req.query.id);
  const months = Math.min(Math.max(Number(req.query.months) || 3, 1), 12);
  if (!habitId) return res.status(400).json({ error: 'id обязателен' });
  try {
    const { rows } = await pool.query(
      `SELECT log_date::text AS date, status, value FROM habit_logs
       WHERE habit_id = $1 AND user_id = $2 AND log_date >= CURRENT_DATE - ($3 || ' months')::interval
       ORDER BY log_date`,
      [habitId, userId, months],
    );
    res.json({ logs: rows });
  } catch (err) {
    console.error('calendar:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** GET /api/habits/year-heatmap — годовая сетка по всем привычкам (как GitHub) */
router.get('/year-heatmap', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows } = await pool.query(
      `SELECT log_date::text AS date, COUNT(*) AS cnt, MAX(status) AS any_status
       FROM habit_logs
       WHERE user_id = $1 AND status = 'done' AND log_date >= CURRENT_DATE - INTERVAL '365 days'
       GROUP BY log_date ORDER BY log_date`,
      [userId],
    );
    res.json({ days: rows });
  } catch (err) {
    console.error('year-heatmap:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===== Достижения (расширенный набор) =====
export const TIERS = [
  { code: 'first_checkin', threshold: 1, title: 'Первый шаг', emoji: '🌱', desc: 'Первая отметка', bonus: 10, xp: 20 },
  { code: 'streak_3', threshold: 3, title: 'Новичок', emoji: '⭐', desc: '3 дня подряд', bonus: 20, xp: 30 },
  { code: 'streak_7', threshold: 7, title: 'Неделя', emoji: '🔥', desc: '7 дней подряд', bonus: 50, xp: 100 },
  { code: 'streak_30', threshold: 30, title: 'Месяц', emoji: '💎', desc: '30 дней подряд', bonus: 200, xp: 500 },
  { code: 'streak_100', threshold: 100, title: 'Век', emoji: '🏆', desc: '100 дней подряд', bonus: 1000, xp: 2000 },
  { code: 'streak_365', threshold: 365, title: 'Год', emoji: '👑', desc: '365 дней подряд', bonus: 10000, xp: 20000 },
];

async function checkAchievements(userId, habitId, streak) {
  const unlocked = [];
  for (const t of TIERS) {
    if (streak >= t.threshold) {
      await pool.query(
        `INSERT INTO achievements (user_id, habit_id, code) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [userId, habitId, t.code],
      );
      const { rows } = await pool.query(
        `SELECT unlocked_at FROM achievements WHERE user_id = $1 AND habit_id = $2 AND code = $3`,
        [userId, habitId, t.code],
      );
      if (rows[0] && Date.now() - new Date(rows[0].unlocked_at).getTime() < 5000) {
        await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1, xp = xp + $2 WHERE id = $3`, [t.bonus, t.xp, userId]);
        await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, $3)`, [t.bonus, `achievement:${t.code}`, userId]);
        await updateLevel(userId);
        unlocked.push({ ...t, habitId });
      }
    }
  }
  return unlocked;
}

async function updateLevel(userId) {
  const { rows } = await pool.query(`SELECT xp, level FROM users WHERE id = $1`, [userId]);
  if (!rows[0]) return 1;
  const xp = rows[0].xp;
  const newLevel = Math.floor(Math.sqrt(xp / 100)) + 1;
  if (newLevel > rows[0].level) {
    await pool.query(`UPDATE users SET level = $1 WHERE id = $2`, [newLevel, userId]);
  }
  return newLevel;
}

function calcStreak(logs, frequency, comebackShield = false) {
  // logs: [{date, status, value}]
  if (!logs.length) return 0;
  const doneSet = new Set(logs.filter((l) => l.status === 'done').map((l) => l.date));
  const skipSet = new Set(logs.filter((l) => l.status === 'skip').map((l) => l.date));
  const days = frequency?.type === 'weekly' ? frequency.days : null;

  let streak = 0;
  let shieldsUsed = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    const expected = !days || days.includes(cursor.getDay());
    if (!expected) { cursor.setDate(cursor.getDate() - 1); continue; }
    if (doneSet.has(iso)) streak++;
    else if (skipSet.has(iso)) { /* skip не прерывает и не увеличивает */ }
    else if (i > 0) {
      // Comeback shield: 1 пропуск в неделю не рвёт стрик
      if (comebackShield && shieldsUsed < 1) {
        shieldsUsed++;
        // продолжаем, не инкрементируем
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default router;
