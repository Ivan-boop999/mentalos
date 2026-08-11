import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/** GET /api/categories */
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, emoji, color, sort_order FROM categories WHERE user_id = $1 ORDER BY sort_order, id`,
      [req.userId],
    );
    res.json(rows);
  } catch (err) {
    console.error('GET categories:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/categories */
router.post('/', async (req, res) => {
  const { name, emoji = '📂', color = '#7C3AED' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Название обязательно' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO categories (user_id, name, emoji, color)
       VALUES ($1, $2, $3, $4) RETURNING id, name, emoji, color, sort_order`,
      [req.userId, name.trim(), emoji, color],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST category:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** DELETE /api/categories/:id */
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM categories WHERE id = $1 AND user_id = $2`, [Number(req.params.id), req.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE category:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
