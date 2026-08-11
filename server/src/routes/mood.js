import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/** GET /api/mood?days=30 — история настроений */
router.get('/', async (req, res) => {
  const userId = req.userId;
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
  try {
    const { rows } = await pool.query(
      `SELECT id, mood, note, log_date::text AS date, created_at::text AS at
       FROM moods WHERE user_id = $1 AND log_date >= CURRENT_DATE - ($2 || ' days')::interval
       ORDER BY log_date DESC`,
      [userId, days],
    );
    res.json(rows);
  } catch (err) {
    console.error('GET mood:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/mood — отметить настроение сегодня */
router.post('/', async (req, res) => {
  const userId = req.userId;
  const mood = Number(req.body?.mood);
  const note = req.body?.note || null;
  if (!mood || mood < 1 || mood > 5) return res.status(400).json({ error: 'mood 1-5' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO moods (user_id, mood, note)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, log_date) DO UPDATE SET mood = EXCLUDED.mood, note = EXCLUDED.note
       RETURNING id, mood, note, log_date::text AS date`,
      [userId, mood, note],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST mood:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** DELETE /api/mood — удалить сегодняшнее */
router.delete('/', async (req, res) => {
  try {
    await pool.query(`DELETE FROM moods WHERE user_id = $1 AND log_date = CURRENT_DATE`, [req.userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
