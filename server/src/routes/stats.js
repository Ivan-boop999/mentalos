import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/stats?days=7
 * Включает: completionRate, doneToday, bestStreak, perfectDays (всё выполнено),
 * perDay, perHabit, currentStreakDays (серия идеальных дней подряд).
 */
router.get('/', async (req, res) => {
  const userId = req.userId;
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);

  try {
    const { rows: habits } = await pool.query(
      `SELECT id, title, emoji, color, frequency FROM habits WHERE user_id = $1 AND archived = FALSE`,
      [userId],
    );
    const { rows: logs } = await pool.query(
      `SELECT habit_id, log_date::text AS date, status FROM habit_logs
       WHERE user_id = $1 AND status = 'done' AND log_date >= CURRENT_DATE - ($2 || ' days')::interval
       ORDER BY log_date ASC`,
      [userId, days - 1],
    );

    const logsByDate = {};
    const logsByHabit = {};
    for (const l of logs) {
      (logsByDate[l.date] ||= new Set()).add(l.habit_id);
      (logsByHabit[l.habit_id] ||= []).push(l.date);
    }

    const perDay = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let totalDone = 0, totalExpected = 0, perfectDays = 0, currentPerfectStreak = 0;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dow = d.getDay();

      const expected = habits.filter((h) => {
        const freq = typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency;
        return !freq?.days || freq.days.includes(dow);
      });
      const doneSet = logsByDate[iso] || new Set();
      const doneCount = expected.filter((h) => doneSet.has(h.id)).length;

      perDay.push({
        date: iso,
        weekday: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][dow],
        done: doneCount,
        total: expected.length,
        perfect: expected.length > 0 && doneCount === expected.length,
      });

      totalDone += doneCount;
      totalExpected += expected.length;
      if (expected.length > 0 && doneCount === expected.length) {
        perfectDays++;
        if (i === days - 1 - currentPerfectStreak) currentPerfectStreak++;
      }
    }

    // bestStreak — лучший текущий
    const perHabit = habits.map((h) => {
      const freq = typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency;
      const dates = logsByHabit[h.id] || [];
      const logSet = new Set(dates);
      let expected = 0, done = 0;
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
        id: h.id, title: h.title, emoji: h.emoji, color: h.color,
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
      perfectDays,
      currentPerfectStreak,
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
    if (set.has(iso)) streak++;
    else if (expected && i > 0) break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default router;
