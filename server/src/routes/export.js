import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

async function gather(userId) {
  const { rows: habits } = await pool.query(
    `SELECT id, title, emoji, color, frequency, reminder_time, goal_type, goal_target, goal_unit, created_at::text AS created_at
     FROM habits WHERE user_id = $1`, [userId],
  );
  const { rows: logs } = await pool.query(
    `SELECT habit_id, log_date::text AS date, status, value FROM habit_logs WHERE user_id = $1`, [userId],
  );
  const { rows: notes } = await pool.query(
    `SELECT habit_id, log_date::text AS date, note FROM habit_notes WHERE user_id = $1`, [userId],
  );
  const { rows: moods } = await pool.query(
    `SELECT mood, note, log_date::text AS date FROM moods WHERE user_id = $1`, [userId],
  );
  const { rows: journal } = await pool.query(
    `SELECT title, content, entry_date::text AS date FROM journal_entries WHERE user_id = $1`, [userId],
  );
  return { habits, logs, notes, moods, journal };
}

/** GET /api/export — JSON */
router.get('/', async (req, res) => {
  try {
    const data = await gather(req.userId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="mentalos-export-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json({ exportedAt: new Date().toISOString(), app: 'MentalOS', version: '3.1', ...data });
  } catch (err) {
    console.error('export:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** GET /api/export.csv — CSV (как в Loop Habit Tracker) */
router.get('/csv', async (req, res) => {
  try {
    const { habits, logs } = await gather(req.userId);
    const titleMap = {};
    for (const h of habits) titleMap[h.id] = h.title;

    const header = ['date', 'habit_id', 'habit_title', 'status', 'value'];
    const lines = [header.join(',')];
    for (const l of logs) {
      lines.push([l.date, l.habit_id, csvEscape(titleMap[l.habit_id] || ''), l.status, l.value ?? ''].join(','));
    }
    const csv = '\uFEFF' + lines.join('\n'); // BOM для Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mentalos-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('export csv:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
