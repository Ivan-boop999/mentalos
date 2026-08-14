import { Router } from 'express';
import pool from '../db/pool.js';
import { getBot } from '../bot/index.js';

const router = Router();

/**
 * GET /api/duels — дуэли пользователя (pending/active/finished).
 */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.status, d.wager, d.challenger_streak, d.opponent_streak, d.winner_id,
              d.started_at::text AS started_at,
              cu.first_name AS challenger_name, cu.username AS challenger_username,
              ou.first_name AS opponent_name, ou.username AS opponent_username,
              d.challenger_id, d.opponent_id
       FROM duels d
       JOIN users cu ON cu.id = d.challenger_id
       JOIN users ou ON ou.id = d.opponent_id
       WHERE d.challenger_id = $1 OR d.opponent_id = $1
       ORDER BY d.started_at DESC LIMIT 20`,
      [userId],
    );
    res.json(rows);
  } catch (err) {
    console.error('GET duels:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/duels — бросить вызов бадди (с согласия оппонента через бота) */
router.post('/', async (req, res) => {
  const userId = req.userId;
  const { opponentId } = req.body;
  if (!opponentId) return res.status(400).json({ error: 'Укажи opponentId' });
  const wager = Math.min(Math.max(Number(req.body?.wager) || 50, 10), 500);

  try {
    const { rows: buddy } = await pool.query(
      `SELECT 1 FROM buddies WHERE user_id = $1 AND buddy_id = $2 AND status = 'accepted'`,
      [userId, opponentId],
    );
    if (!buddy.length) return res.status(403).json({ error: 'Можно вызвать только бадди' });

    const { rows: u } = await pool.query(`SELECT bonus_balance FROM users WHERE id = $1`, [userId]);
    if ((u[0]?.bonus_balance || 0) < wager) return res.status(402).json({ error: 'Недостаточно бонусов для ставки' });

    const { rows: activeDuel } = await pool.query(
      `SELECT 1 FROM duels WHERE ((challenger_id = $1 AND opponent_id = $2) OR (challenger_id = $2 AND opponent_id = $1)) AND status IN ('pending', 'active')`,
      [userId, opponentId],
    );
    if (activeDuel.length) return res.status(409).json({ error: 'Между вами уже есть активная дуэль' });

    const { rows: my } = await pool.query(`SELECT COALESCE(MAX(best_streak), 0) AS s FROM habits WHERE user_id = $1 AND archived = FALSE`, [userId]);
    const { rows: opp } = await pool.query(`SELECT COALESCE(MAX(best_streak), 0) AS s FROM habits WHERE user_id = $1 AND archived = FALSE`, [opponentId]);

    // ФИКС: создаём в pending — оппонент должен принять
    const { rows: duel } = await pool.query(
      `INSERT INTO duels (challenger_id, opponent_id, status, challenger_streak, opponent_streak, wager)
       VALUES ($1, $2, 'pending', $3, $4, $5) RETURNING id`,
      [userId, opponentId, my[0].s, opp[0].s, wager],
    );

    // Эскроу: списываем ставку с создателя (вернётся ×2 при победе / возврат при отказе и ничьей)
    await pool.query(`UPDATE users SET bonus_balance = bonus_balance - $1 WHERE id = $2`, [wager, userId]);
    await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'duel_wager')`, [userId, -wager]);

    // Уведомляем оппонента через бота
    const bot = getBot();
    const { rows: me } = await pool.query(`SELECT first_name, username FROM users WHERE id = $1`, [userId]);
    const myName = me[0]?.first_name || me[0]?.username || 'соперник';
    if (bot) {
      bot.sendMessage(
        opponentId,
        `⚔️ *${myName}* бросает тебе вызов!\n\nКто дольше продержит серию — забирает банк *${wager}* 🪙.\nТвоя серия сейчас: *${opp[0].s}* 🔥`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '⚔️ Принять', callback_data: `duel_accept_${duel[0].id}` },
                { text: 'Отклонить', callback_data: `duel_decline_${duel[0].id}` },
              ],
            ],
          },
        },
      ).catch(() => {});
    }

    res.json({ ok: true, duelId: duel[0].id, myStreak: my[0].s, oppStreak: opp[0].s });
  } catch (err) {
    console.error('POST duel:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/duels/:id/accept — принять (только оппонент, только pending) */
router.post('/:id/accept', async (req, res) => {
  const duelId = Number(req.params.id);
  try {
    const { rowCount } = await pool.query(
      `UPDATE duels SET status = 'active' WHERE id = $1 AND opponent_id = $2 AND status = 'pending'`,
      [duelId, req.userId],
    );
    if (!rowCount) return res.status(404).json({ error: 'Дуэль не найдена или уже неактуальна' });
    const bot = getBot();
    if (bot) {
      const { rows: d } = await pool.query(`SELECT challenger_id, wager FROM duels WHERE id = $1`, [duelId]);
      const { rows: me } = await pool.query(`SELECT first_name, username FROM users WHERE id = $1`, [req.userId]);
      const myName = me[0]?.first_name || me[0]?.username || 'соперник';
      bot.sendMessage(d[0].challenger_id, `⚔️ *${myName}* принял твою дуэль! Ставка *${d[0].wager}* 🪙. Кто дольше продержит серию — забирает банк.`, { parse_mode: 'Markdown' }).catch(() => {});
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('accept duel:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/duels/:id/decline — отклонить (возврат эскроу создателю) */
router.post('/:id/decline', async (req, res) => {
  const duelId = Number(req.params.id);
  try {
    const { rows: d } = await pool.query(
      `SELECT challenger_id, wager FROM duels WHERE id = $1 AND opponent_id = $2 AND status = 'pending'`,
      [duelId, req.userId],
    );
    if (!d.length) return res.status(404).json({ error: 'Дуэль не найдена' });
    await pool.query(`UPDATE duels SET status = 'declined', finished_at = NOW() WHERE id = $1`, [duelId]);
    await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2`, [d[0].wager, d[0].challenger_id]);
    await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'duel_refund')`, [d[0].challenger_id, d[0].wager]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/duels/:id/finish — завершить активную дуэль */
router.post('/:id/finish', async (req, res) => {
  const userId = req.userId;
  const duelId = Number(req.params.id);
  try {
    const { rows: d } = await pool.query(`SELECT * FROM duels WHERE id = $1 AND status = 'active'`, [duelId]);
    if (!d.length) return res.status(404).json({ error: 'Дуэль не найдена' });
    const duel = d[0];
    // ФИКС: pg BIGINT приходит строкой — сравниваем через Number()
    if (Number(duel.challenger_id) !== userId && Number(duel.opponent_id) !== userId) return res.status(403).json({ error: 'Не участник' });

    const { rows: my } = await pool.query(`SELECT COALESCE(MAX(best_streak), 0) AS s FROM habits WHERE user_id = $1 AND archived = FALSE`, [duel.challenger_id]);
    const { rows: opp } = await pool.query(`SELECT COALESCE(MAX(best_streak), 0) AS s FROM habits WHERE user_id = $1 AND archived = FALSE`, [duel.opponent_id]);

    const myS = my[0].s;
    const oppS = opp[0].s;
    const winnerId = myS > oppS ? duel.challenger_id : oppS > myS ? duel.opponent_id : null;

    await pool.query(`UPDATE duels SET status = 'finished', challenger_streak = $1, opponent_streak = $2, winner_id = $3, finished_at = NOW() WHERE id = $4`,
      [myS, oppS, winnerId, duelId]);

    if (winnerId) {
      // Эскроу платил challenger; при finish платит opponent → zero-sum:
      // победитель получает ×2 (своя ставка/выигрыш), второй участник −wager
      await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2`, [duel.wager * 2, winnerId]);
      await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'duel_win')`, [winnerId, duel.wager * 2]);
      await pool.query(`UPDATE users SET bonus_balance = GREATEST(0, bonus_balance - $1) WHERE id = $2`, [duel.wager, duel.opponent_id]);
      await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'duel_stake')`, [duel.opponent_id, -duel.wager]);
    } else {
      // Ничья — возврат эскроу создателю
      await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2`, [duel.wager, duel.challenger_id]);
      await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'duel_refund')`, [duel.challenger_id, duel.wager]);
    }

    res.json({ ok: true, winnerId, myStreak: myS, oppStreak: oppS });
  } catch (err) {
    console.error('finish duel:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Автозавершение зависших активных дуэлей (вызывается scheduler'ом).
 * Дуэль старше 7 дней завершается автоматически.
 */
export async function autoCompleteDuels() {
  try {
    const { rows: stale } = await pool.query(
      `SELECT id FROM duels WHERE status = 'active' AND started_at < NOW() - INTERVAL '7 days'`,
    );
    for (const d of stale) {
      // завершаем по лучшим стрикам через ту же логику
      const { rows: duel } = await pool.query(`SELECT * FROM duels WHERE id = $1`, [d.id]);
      if (!duel.length) continue;
      const { rows: a } = await pool.query(`SELECT COALESCE(MAX(best_streak),0) AS s FROM habits WHERE user_id = $1 AND archived = FALSE`, [duel[0].challenger_id]);
      const { rows: b } = await pool.query(`SELECT COALESCE(MAX(best_streak),0) AS s FROM habits WHERE user_id = $1 AND archived = FALSE`, [duel[0].opponent_id]);
      const winnerId = a[0].s > b[0].s ? duel[0].challenger_id : b[0].s > a[0].s ? duel[0].opponent_id : null;
      await pool.query(`UPDATE duels SET status = 'finished', challenger_streak = $1, opponent_streak = $2, winner_id = $3, finished_at = NOW() WHERE id = $4`,
        [a[0].s, b[0].s, winnerId, d.id]);
      if (winnerId) {
        await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2`, [duel[0].wager * 2, winnerId]);
        await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'duel_win')`, [winnerId, duel[0].wager * 2]);
        await pool.query(`UPDATE users SET bonus_balance = GREATEST(0, bonus_balance - $1) WHERE id = $2`, [duel[0].wager, duel[0].opponent_id]);
        await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'duel_stake')`, [duel[0].opponent_id, -duel[0].wager]);
      } else {
        await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2`, [duel[0].wager, duel[0].challenger_id]);
        await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'duel_refund')`, [duel[0].challenger_id, duel[0].wager]);
      }
    }
  } catch (err) {
    console.error('autoCompleteDuels:', err.message);
  }
}

export default router;
