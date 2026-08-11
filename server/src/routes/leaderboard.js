import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/leaderboard — топ пользователей по XP/уровню.
 * Включает: текущего пользователя (всегда) + его «друзей» (реферальную цепочку:
 * кто его пригласил и кого он пригласил) + топ-N публичных профилей.
 *
 * Подход без полной социальной графа: показываем реферальную цепочку + общий топ.
 */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    // Реферальная цепочка: пригласивший (referred_by) + все приглашённые
    const { rows: me } = await pool.query(
      `SELECT id, username, first_name, xp, level, total_checkins FROM users WHERE id = $1`,
      [userId],
    );

    const { rows: referrer } = await pool.query(
      `SELECT u.id, u.username, u.first_name, u.xp, u.level, u.total_checkins
       FROM users me JOIN users u ON u.id = me.referred_by
       WHERE me.id = $1`,
      [userId],
    );

    const { rows: invited } = await pool.query(
      `SELECT u.id, u.username, u.first_name, u.xp, u.level, u.total_checkins
       FROM referrals r JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id = $1
       ORDER BY u.xp DESC`,
      [userId],
    );

    // Топ-50 публичных профилей по XP (для амбиции)
    const { rows: top } = await pool.query(
      `SELECT id, username, first_name, xp, level, total_checkins
       FROM users
       WHERE public_profile = TRUE OR id IN (
         SELECT referrer_id FROM referrals WHERE referred_id = $1
         UNION SELECT referred_id FROM referrals WHERE referrer_id = $1
       )
       ORDER BY xp DESC
       LIMIT 50`,
      [userId],
    );

    // Собираем уникальных людей + текущего пользователя
    const seen = new Set();
    const all = [];
    const push = (u, rel) => {
      if (!u || seen.has(u.id)) return;
      seen.add(u.id);
      all.push({ ...u, relation: rel });
    };
    push(me.rows?.[0], 'me');
    referrer.forEach((u) => push(u, 'referrer'));
    invited.forEach((u) => push(u, 'invited'));
    top.forEach((u) => push(u, 'public'));

    // Сортируем по XP
    all.sort((a, b) => (b.xp || 0) - (a.xp || 0));

    // Присваиваем ранги
    const ranked = all.map((u, i) => ({ ...u, rank: i + 1 }));

    res.json({ users: ranked, myXp: me.rows?.[0]?.xp || 0 });
  } catch (err) {
    console.error('GET leaderboard:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** PUT /api/leaderboard/visibility — { public: bool } */
router.put('/visibility', async (req, res) => {
  try {
    await pool.query(`UPDATE users SET public_profile = $1 WHERE id = $2`, [!!req.body?.public, req.userId]);
    res.json({ ok: true, public: !!req.body?.public });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
