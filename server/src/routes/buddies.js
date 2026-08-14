import { Router } from 'express';
import pool from '../db/pool.js';
import { getBot } from '../bot/index.js';

const router = Router();

/**
 * GET /api/buddies — принятые бадди + входящие/исходящие заявки.
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

    // Входящие pending-заявки (где я — buddy_id)
    const { rows: incoming } = await pool.query(
      `SELECT b.id, u.first_name, u.username FROM buddies b JOIN users u ON u.id = b.user_id
       WHERE b.buddy_id = $1 AND b.status = 'pending' ORDER BY b.created_at DESC`,
      [userId],
    );

    // Исходящие pending (где я — user_id)
    const { rows: outgoing } = await pool.query(
      `SELECT b.id, u.first_name, u.username FROM buddies b JOIN users u ON u.id = b.buddy_id
       WHERE b.user_id = $1 AND b.status = 'pending' ORDER BY b.created_at DESC`,
      [userId],
    );

    res.json({ accepted: rows, incoming, outgoing });
  } catch (err) {
    console.error('GET buddies:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/buddies/invite — пригласить по @username или коду (с согласием второй стороны) */
router.post('/invite', async (req, res) => {
  const userId = req.userId;
  const { code } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: 'Укажи @username или код друга' });

  try {
    let buddyId = null;
    const clean = code.trim().replace(/^@/, '').replace(/^MOS/i, '');
    // ФИКС: pg возвращает BIGINT строкой — нормализуем в Number для сравнения с req.userId
    const { rows: byCode } = await pool.query(`SELECT id FROM users WHERE referral_code = $1`, ['MOS' + clean.replace(/^MOS/, '')]);
    if (byCode.length) buddyId = Number(byCode[0].id);
    if (!buddyId) {
      const { rows: byId } = await pool.query(`SELECT id FROM users WHERE id::text = $1`, [clean]);
      if (byId.length) buddyId = Number(byId[0].id);
    }
    if (!buddyId) {
      const { rows: byName } = await pool.query(`SELECT id FROM users WHERE LOWER(username) = LOWER($1)`, [clean]);
      if (byName.length) buddyId = Number(byName[0].id);
    }
    if (!buddyId) return res.status(404).json({ error: 'Пользователь не найден. Пусть друг сначала откроет MentalOS.' });
    if (buddyId === userId) return res.status(400).json({ error: 'Нельзя пригласить себя' });

    // Уже связаны?
    const { rows: existing } = await pool.query(
      `SELECT id, status FROM buddies WHERE (user_id = $1 AND buddy_id = $2) OR (user_id = $2 AND buddy_id = $1)`,
      [userId, buddyId],
    );
    if (existing.length) {
      return res.status(409).json({ error: existing[0].status === 'accepted' ? 'Уже ваши бадди' : 'Заявка уже отправлена' });
    }

    // ФИКС: заявка в pending — согласие второй стороны обязательно
    const { rows: inv } = await pool.query(
      `INSERT INTO buddies (user_id, buddy_id, status) VALUES ($1, $2, 'pending') RETURNING id`,
      [userId, buddyId],
    );

    // Уведомляем приглашённого через бота с кнопками
    const bot = getBot();
    const { rows: me } = await pool.query(`SELECT first_name, username FROM users WHERE id = $1`, [userId]);
    const myName = me[0]?.first_name || me[0]?.username || 'пользователь';
    if (bot) {
      bot.sendMessage(
        buddyId,
        `🤝 *${myName}* хочет стать твоим бадди!\n\nБадди видят прогресс друг друга и поддерживают в дуэлях.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Принять', callback_data: `buddy_accept_${inv[0].id}` },
                { text: 'Отклонить', callback_data: `buddy_decline_${inv[0].id}` },
              ],
            ],
          },
        },
      ).catch(() => {});
    }

    res.json({ ok: true, pending: true });
  } catch (err) {
    console.error('invite buddy:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/buddies/:id/accept — принять входящую заявку (из мини-аппа) */
router.post('/:id/accept', async (req, res) => {
  const rowId = Number(req.params.id);
  try {
    const { rows } = await pool.query(
      `SELECT user_id FROM buddies WHERE id = $1 AND buddy_id = $2 AND status = 'pending'`,
      [rowId, req.userId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Заявка не найдена' });
    const inviterId = rows[0].user_id;

    await pool.query(`UPDATE buddies SET status = 'accepted' WHERE id = $1`, [rowId]);
    await pool.query(
      `INSERT INTO buddies (user_id, buddy_id, status) VALUES ($1, $2, 'accepted')
       ON CONFLICT (user_id, buddy_id) DO UPDATE SET status = 'accepted'`,
      [req.userId, inviterId],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('accept buddy:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/buddies/:id/decline — отклонить заявку (из мини-аппа) */
router.post('/:id/decline', async (req, res) => {
  try {
    await pool.query(`DELETE FROM buddies WHERE id = $1 AND buddy_id = $2 AND status = 'pending'`, [Number(req.params.id), req.userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** DELETE /api/buddies/:id — удалить бадди (только участник связи) */
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
