import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router({ mergeParams: true });

/** GET /api/habits/:id/subtasks */
router.get('/', async (req, res) => {
  const habitId = Number(req.params.id);
  try {
    const { rows } = await pool.query(
      `SELECT id, title, done, sort_order FROM habit_subtasks
       WHERE habit_id = $1 AND user_id = $2 ORDER BY sort_order, id`,
      [habitId, req.userId],
    );
    res.json(rows);
  } catch (err) {
    console.error('GET subtasks:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/habits/:id/subtasks — { title } */
router.post('/', async (req, res) => {
  const habitId = Number(req.params.id);
  const title = req.body?.title?.trim();
  if (!title) return res.status(400).json({ error: 'title обязателен' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO habit_subtasks (habit_id, user_id, title)
       VALUES ($1, $2, $3) RETURNING id, title, done, sort_order`,
      [habitId, req.userId, title],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST subtask:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** PUT /api/habits/:id/subtasks/:subId — { title?, done? } */
router.put('/:subId', async (req, res) => {
  const habitId = Number(req.params.id);
  const subId = Number(req.params.subId);
  const { title, done } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE habit_subtasks SET
         title = COALESCE($3, title),
         done = COALESCE($4, done)
       WHERE id = $1 AND habit_id = $2 AND user_id = $5
       RETURNING id, title, done, sort_order`,
      [subId, habitId, title, done, req.userId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT subtask:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** DELETE /api/habits/:id/subtasks/:subId */
router.delete('/:subId', async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM habit_subtasks WHERE id = $1 AND habit_id = $2 AND user_id = $3`,
      [Number(req.params.subId), Number(req.params.id), req.userId],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
