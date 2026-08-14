import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/recap — недельный отчёт (для Weekly Recap экрана и воскресного уведомления).
 */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    // Данные за последние 7 дней
    const { rows: logs } = await pool.query(
      `SELECT log_date::text AS date, COUNT(*) AS done
       FROM habit_logs
       WHERE user_id = $1 AND status = 'done' AND log_date >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY log_date ORDER BY log_date`,
      [userId],
    );

    const { rows: habits } = await pool.query(`SELECT id, best_streak FROM habits WHERE user_id = $1 AND archived = FALSE`, [userId]);
    const totalHabits = habits.length;

    // Уникальные активные дни
    const activeDays = logs.length;
    const totalCheckins = logs.reduce((s, l) => s + Number(l.done), 0);

    // Лучший стрик на конец недели
    const bestStreak = habits.reduce((m, h) => Math.max(m, h.best_streak || 0), 0);

    // Сравнение с прошлой неделей
    const { rows: prevWeek } = await pool.query(
      `SELECT COUNT(*) AS done FROM habit_logs WHERE user_id = $1 AND status = 'done' AND log_date >= CURRENT_DATE - INTERVAL '14 days' AND log_date < CURRENT_DATE - INTERVAL '7 days'`,
      [userId],
    );
    const thisWeekCount = totalCheckins;
    const prevWeekCount = Number(prevWeek[0]?.done || 0);
    const trend = thisWeekCount - prevWeekCount;

    // РАУНД-2 ФИКС: идеальные дни считаем с учётом weekly-расписания
    // (день идеален, если все ОЖИДАЕМЫЕ в этот день привычки выполнены)
    const { rows: freqRows } = await pool.query(
      `SELECT id, frequency FROM habits WHERE user_id = $1 AND archived = FALSE`, [userId],
    );
    const freqMap = {};
    for (const h of freqRows) {
      freqMap[h.id] = typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency;
    }
    const logsByDate = {};
    for (const l of logs) logsByDate[l.date] = Number(l.done);

    let perfectDays = 0;
    for (const [dateStr, doneCount] of Object.entries(logsByDate)) {
      const dow = new Date(dateStr + 'T00:00:00').getDay();
      const expected = freqRows.filter((h) => {
        const f = freqMap[h.id];
        return !f?.days || f.days.includes(dow);
      }).length;
      if (expected > 0 && doneCount >= expected) perfectDays++;
    }

    // Настроение среднее за неделю
    const { rows: moods } = await pool.query(
      `SELECT AVG(mood) AS avg FROM moods WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId],
    );
    const avgMood = moods[0]?.avg ? Math.round(moods[0].avg) : null;

    res.json({
      weekRange: { from: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
      totalCheckins,
      activeDays,
      perfectDays,
      bestStreak,
      avgMood,
      trend, // + или - относительно прошлой недели
      totalHabits,
      perDay: logs.map((l) => ({ date: l.date, done: Number(l.done) })),
    });
  } catch (err) {
    console.error('GET recap:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
