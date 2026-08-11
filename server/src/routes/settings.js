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
      `SELECT theme, timezone FROM users WHERE id = $1`,
      [userId],
    );
    res.json({
      theme: rows[0]?.theme || 'auto',
      timezone: rows[0]?.timezone || 'UTC',
    });
  } catch (err) {
    console.error('GET /settings:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * PUT /api/settings — обновить настройки
 * body: { theme?, timezone? }
 */
router.put('/', async (req, res) => {
  const userId = req.userId;
  const { theme, timezone } = req.body;

  const sets = {};
  if (theme !== undefined) {
    if (!['auto', 'light', 'dark'].includes(theme)) {
      return res.status(400).json({ error: 'Недопустимое значение темы' });
    }
    sets.theme = theme;
  }
  if (timezone !== undefined) {
    // Простая проверка формата IANA (America/New_York, Europe/Moscow, ...)
    if (typeof timezone !== 'string' || timezone.length > 50) {
      return res.status(400).json({ error: 'Недопустимый часовой пояс' });
    }
    sets.timezone = timezone;
  }

  if (Object.keys(sets).length === 0) {
    return res.status(400).json({ error: 'Нечего обновлять' });
  }

  try {
    const fields = Object.keys(sets).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = [userId, ...Object.values(sets)];
    await pool.query(`UPDATE users SET ${fields} WHERE id = $1`, values);
    res.json({ ok: true, ...sets });
  } catch (err) {
    console.error('PUT /settings:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
