import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/settings — текущие настройки пользователя
 */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows } = await pool.query(
      `SELECT theme FROM users WHERE id = $1`,
      [userId],
    );
    res.json({ theme: rows[0]?.theme || 'auto' });
  } catch (err) {
    console.error('GET /settings:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * PUT /api/settings — обновить тему
 * body: { theme: 'auto' | 'light' | 'dark' }
 */
router.put('/', async (req, res) => {
  const userId = req.userId;
  const theme = req.body?.theme;
  if (!['auto', 'light', 'dark'].includes(theme)) {
    return res.status(400).json({ error: 'Недопустимое значение темы' });
  }
  try {
    await pool.query(`UPDATE users SET theme = $1 WHERE id = $2`, [theme, userId]);
    res.json({ ok: true, theme });
  } catch (err) {
    console.error('PUT /settings:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
