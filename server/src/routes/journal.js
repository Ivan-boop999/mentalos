import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/** GET /api/journal — все записи дневника */
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, content, entry_date::text AS date, created_at::text AS at
       FROM journal_entries WHERE user_id = $1 ORDER BY entry_date DESC, created_at DESC LIMIT 200`,
      [req.userId],
    );
    res.json(rows);
  } catch (err) {
    console.error('GET journal:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/journal */
router.post('/', async (req, res) => {
  const { title = null, content, date } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Содержимое обязательно' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO journal_entries (user_id, title, content, entry_date)
       VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE))
       RETURNING id, title, content, entry_date::text AS date, created_at::text AS at`,
      [req.userId, title?.trim() || null, content.trim(), date || null],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST journal:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** PUT /api/journal/:id */
router.put('/:id', async (req, res) => {
  const { title, content } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE journal_entries SET title = COALESCE($3, title), content = COALESCE($4, content)
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, content, entry_date::text AS date`,
      [Number(req.params.id), req.userId, title, content],
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT journal:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** DELETE /api/journal/:id */
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM journal_entries WHERE id = $1 AND user_id = $2`, [Number(req.params.id), req.userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
