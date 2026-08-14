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
    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z'); // UTC-якорь
    let totalDone = 0, totalExpected = 0, perfectDays = 0;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dow = d.getUTCDay();

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
      }
    }

    // ФИКС: ТЕКУЩАЯ серия идеальных дней — от сегодня НАЗАД до первого разрыва
    // (старая логика считала «с начала периода» и не сбрасывалась)
    let currentPerfectStreak = 0;
    for (let k = perDay.length - 1; k >= 0; k--) {
      if (perDay[k].total === 0) continue;        // день без ожидаемых привычек не мешает серии
      if (perDay[k].perfect) currentPerfectStreak++;
      else break;
    }

    // bestStreak — лучший текущий
    const perHabit = habits.map((h) => {
      const freq = typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency;
      const dates = logsByHabit[h.id] || [];
      const logSet = new Set(dates);
      let expected = 0, done = 0;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setUTCDate(d.getUTCDate() - i);
        const iso = d.toISOString().slice(0, 10);
        if (!freq?.days || freq.days.includes(d.getUTCDay())) {
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

    // ===== ТРЕНД/ПРОГНОЗ: сравнение первой и второй половины периода =====
    const half = Math.floor(days / 2);
    let firstHalf = 0, firstExpected = 0, secondHalf = 0, secondExpected = 0;
    for (let i = 0; i < perDay.length; i++) {
      const d = perDay[i];
      if (i < half) { firstHalf += d.done; firstExpected += d.total; }
      else { secondHalf += d.done; secondExpected += d.total; }
    }
    const firstRate = firstExpected ? (firstHalf / firstExpected) : 0;
    const secondRate = secondExpected ? (secondHalf / secondExpected) : 0;
    const trendDelta = Math.round((secondRate - firstRate) * 100); // в процентныхных пунктах
    const trend = trendDelta > 2 ? 'up' : trendDelta < -2 ? 'down' : 'stable';

    res.json({
      totalHabits: habits.length,
      doneToday,
      completionRate: totalExpected === 0 ? 0 : Math.round((totalDone / totalExpected) * 100),
      bestStreak: perHabit.reduce((m, h) => Math.max(m, h.streak), 0),
      perfectDays,
      currentPerfectStreak,
      perDay,
      perHabit,
      trend, trendDelta,
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
  const cursor = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z'); // UTC-якорь
  cursor.setHours(0, 0, 0, 0);
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
