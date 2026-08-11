import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/stats?days=7
 * Возвращает сводную статистику пользователя:
 *  - totalHabits: сколько активных привычек
 *  - doneToday: сколько выполнено сегодня
 *  - completionRate: процент выполнения за период
 *  - bestStreak: лучший текущий streak среди привычек
 *  - perDay: [{ date, done, total }] для графика
 *  - perHabit: [{ id, title, emoji, color, completionRate, streak }]
 */
router.get('/', async (req, res) => {
  const userId = req.userId;
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);

  try {
    // Активные привычки
    const { rows: habits } = await pool.query(
      `SELECT id, title, emoji, color, frequency
       FROM habits WHERE user_id = $1 AND archived = FALSE`,
      [userId],
    );

    // Логи за период
    const { rows: logs } = await pool.query(
      `SELECT habit_id, log_date::text AS date
       FROM habit_logs
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - ($2 || ' days')::interval
       ORDER BY log_date ASC`,
      [userId, days - 1],
    );

    const logsByDate = {};
    const logsByHabit = {};
    for (const l of logs) {
      (logsByDate[l.date] ||= new Set()).add(l.habit_id);
      (logsByHabit[l.habit_id] ||= []).push(l.date);
    }

    // Сколько должно было быть выполнено каждый день (по частоте)
    const perDay = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalDone = 0;
    let totalExpected = 0;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dow = d.getDay();

      const expectedHabits = habits.filter((h) => {
        const freq = typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency;
        return !freq?.days || freq.days.includes(dow);
      });

      const doneSet = logsByDate[iso] || new Set();
      const doneCount = expectedHabits.filter((h) => doneSet.has(h.id)).length;

      perDay.push({
        date: iso,
        weekday: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][dow],
        done: doneCount,
        total: expectedHabits.length,
      });

      totalDone += doneCount;
      totalExpected += expectedHabits.length;
    }

    // По каждой привычке
    const perHabit = habits.map((h) => {
      const freq = typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency;
      const dates = logsByHabit[h.id] || [];
      const logSet = new Set(dates);

      let expected = 0;
      let done = 0;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        if (!freq?.days || freq.days.includes(d.getDay())) {
          expected++;
          if (logSet.has(iso)) done++;
        }
      }
      return {
        id: h.id,
        title: h.title,
        emoji: h.emoji,
        color: h.color,
        completionRate: expected === 0 ? 0 : Math.round((done / expected) * 100),
        streak: calcStreak(dates, freq),
      };
    });

    const todayIso = today.toISOString().slice(0, 10);
    const doneToday = (logsByDate[todayIso] || new Set()).size;

    res.json({
      totalHabits: habits.length,
      doneToday,
      completionRate: totalExpected === 0 ? 0 : Math.round((totalDone / totalExpected) * 100),
      bestStreak: perHabit.reduce((m, h) => Math.max(m, h.streak), 0),
      perDay,
      perHabit,
    });
  } catch (err) {
    console.error('GET /stats:', err);
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
