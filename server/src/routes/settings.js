import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/** GET /api/settings */
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT theme, timezone, onboarded, xp, level, active_theme, bonus_balance, owned_themes,
              total_checkins, public_profile
       FROM users WHERE id = $1`,
      [req.userId],
    );
    const r = rows[0] || { theme: 'auto', timezone: 'UTC', onboarded: false, xp: 0, level: 1, active_theme: 'default' };
    // нормализуем owned_themes в массив
    let owned = r.owned_themes;
    if (typeof owned === 'string') {
      try { owned = JSON.parse(owned); } catch { owned = []; }
    }
    if (!Array.isArray(owned)) owned = ['default'];
    if (!owned.includes('default')) owned = ['default', ...owned];
    res.json({ ...r, ownedThemes: owned, totalCheckins: r.total_checkins || 0, publicProfile: !!r.public_profile });
  } catch (err) {
    console.error('GET settings:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** PUT /api/settings */
router.put('/', async (req, res) => {
  const sets = {};
  const { theme, timezone, onboarded } = req.body;

  if (theme !== undefined) {
    if (!['auto', 'light', 'dark'].includes(theme)) return res.status(400).json({ error: 'Недопустимая тема' });
    sets.theme = theme;
  }
  if (timezone !== undefined) {
    if (typeof timezone !== 'string' || timezone.length > 50) return res.status(400).json({ error: 'Недопустимый tz' });
    sets.timezone = timezone;
  }
  if (onboarded !== undefined) sets.onboarded = !!onboarded;

  if (!Object.keys(sets).length) return res.status(400).json({ error: 'Нечего обновлять' });

  try {
    const fields = Object.keys(sets).map((k, i) => `${k} = $${i + 2}`).join(', ');
    await pool.query(`UPDATE users SET ${fields} WHERE id = $1`, [req.userId, ...Object.values(sets)]);
    res.json({ ok: true, ...sets });
  } catch (err) {
    console.error('PUT settings:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
