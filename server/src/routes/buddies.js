import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/buddies — список бадди + их прогресс сегодня.
 * Механика микро-accountability (Dominican Univ: 35%→70%).
 */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.status, b.created_at::text AS since,
              u.id AS buddy_id, u.username, u.first_name, u.level, u.xp, u.total_checkins,
              (SELECT COUNT(*) FROM habit_logs WHERE user_id = u.id AND log_date = CURRENT_DATE AND status = 'done') AS done_today,
              (SELECT COUNT(*) FROM habits WHERE user_id = u.id AND archived = FALSE) AS total_habits
       FROM buddies b
       JOIN users u ON u.id = b.buddy_id
       WHERE b.user_id = $1 AND b.status = 'accepted'
       ORDER BY u.xp DESC`,
      [userId],
    );
    res.json(rows);
  } catch (err) {
    console.error('GET buddies:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/buddies/invite — пригласить по @username или referral_code */
router.post('/invite', async (req, res) => {
  const userId = req.userId;
  const { code } = req.body; // @username (без @) или MOS123 код
  if (!code?.trim()) return res.status(400).json({ error: 'Укажи @username или код друга' });

  try {
    let buddyId = null;
    const clean = code.trim().replace(/^@/, '');
    // По referral_code
    const { rows: byCode } = await pool.query(`SELECT id FROM users WHERE referral_code = $1`, [clean]);
    if (byCode.length) buddyId = byCode[0].id;
    // По username
    if (!buddyId) {
      const { rows: byName } = await pool.query(`SELECT id FROM users WHERE LOWER(username) = LOWER($1)`, [clean]);
      if (byName.length) buddyId = byName[0].id;
    }
    if (!buddyId) return res.status(404).json({ error: 'Пользователь не найден. Пусть друг сначала откроет MentalOS.' });
    if (buddyId === userId) return res.status(400).json({ error: 'Нельзя пригласить себя' });

    // Проверка существующей связи
    const { rows: existing } = await pool.query(
      `SELECT id, status FROM buddies WHERE (user_id = $1 AND buddy_id = $2) OR (user_id = $2 AND buddy_id = $1)`,
      [userId, buddyId],
    );
    if (existing.length) {
      return res.status(409).json({ error: existing[0].status === 'accepted' ? 'Уже ваши бадди' : 'Заявка уже отправлена' });
    }

    // Создаём двустороннюю accepted-связь (упрощённо: мгновенно принимается)
    await pool.query(
      `INSERT INTO buddies (user_id, buddy_id, status) VALUES ($1, $2, 'accepted'), ($2, $1, 'accepted') ON CONFLICT DO NOTHING`,
      [userId, buddyId],
    );
    res.json({ ok: true, buddyId });
  } catch (err) {
    console.error('invite buddy:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** DELETE /api/buddies/:id — удалить бадди (проверяем что участник) */
router.delete('/:id', async (req, res) => {
  const buddyRowId = Number(req.params.id);
  try {
    const { rows } = await pool.query(
      `SELECT user_id, buddy_id FROM buddies WHERE id = $1 AND (user_id = $2 OR buddy_id = $2)`,
      [buddyRowId, req.userId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    const { user_id, buddy_id } = rows[0];
    await pool.query(`DELETE FROM buddies WHERE (user_id = $1 AND buddy_id = $2) OR (user_id = $2 AND buddy_id = $1)`, [user_id, buddy_id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('delete buddy:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
