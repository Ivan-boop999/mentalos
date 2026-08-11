import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/export — выгрузка всех данных пользователя в JSON (как в Loop).
 */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: habits } = await pool.query(
      `SELECT id, title, emoji, color, frequency, reminder_time, goal_type, goal_target, goal_unit, created_at
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

    const dump = {
      exportedAt: new Date().toISOString(),
      app: 'MentalOS',
      version: '3.0',
      habits: habits.map((h) => ({
        ...h,
        frequency: typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency,
      })),
      logs,
      notes,
      moods,
      journal,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="mentalos-export-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(dump);
  } catch (err) {
    console.error('export:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
