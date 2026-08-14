import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/duels — активные дуэли пользователя + история
 */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.status, d.wager, d.challenger_streak, d.opponent_streak, d.winner_id,
              d.started_at::text AS started_at,
              cu.first_name AS challenger_name, cu.username AS challenger_username,
              ou.first_name AS opponent_name, ou.username AS opponent_username,
              (SELECT MAX(best_streak) FROM habits WHERE user_id = cu.id AND archived = FALSE) AS challenger_best,
              (SELECT MAX(best_streak) FROM habits WHERE user_id = ou.id AND archived = FALSE) AS opponent_best
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

/** POST /api/duels — бросить вызов бадди по ID */
router.post('/', async (req, res) => {
  const userId = req.userId;
  const { opponentId } = req.body;
  if (!opponentId) return res.status(400).json({ error: 'Укажи opponentId' });
  // N-ФИКС: валидация ставки (10-500, дефолт 50)
  const wager = Math.min(Math.max(Number(req.body?.wager) || 50, 10), 500);

  try {
    // Проверяем что это бадди
    const { rows: buddy } = await pool.query(
      `SELECT 1 FROM buddies WHERE user_id = $1 AND buddy_id = $2 AND status = 'accepted'`,
      [userId, opponentId],
    );
    if (!buddy.length) return res.status(403).json({ error: 'Можно вызвать только бадди' });

    // Проверяем баланс ставки у ОБОИХ участников
    const { rows: u } = await pool.query(`SELECT bonus_balance FROM users WHERE id = $1`, [userId]);
    const { rows: uOpp } = await pool.query(`SELECT bonus_balance FROM users WHERE id = $1`, [opponentId]);
    if ((u[0]?.bonus_balance || 0) < wager) return res.status(402).json({ error: 'Недостаточно бонусов для ставки' });
    if ((uOpp[0]?.bonus_balance || 0) < wager) return res.status(402).json({ error: 'У противника недостаточно бонусов' });

    // РАУНД-2 ФИКС: нет параллельных активных дуэлей между парой
    const { rows: activeDuel } = await pool.query(
      `SELECT 1 FROM duels WHERE ((challenger_id = $1 AND opponent_id = $2) OR (challenger_id = $2 AND opponent_id = $1)) AND status IN ('pending', 'active')`,
      [userId, opponentId],
    );
    if (activeDuel.length) return res.status(409).json({ error: 'Между вами уже есть активная дуэль' });

    // Текущие лучшие стрики
    const { rows: my } = await pool.query(`SELECT COALESCE(MAX(best_streak), 0) AS s FROM habits WHERE user_id = $1 AND archived = FALSE`, [userId]);
    const { rows: opp } = await pool.query(`SELECT COALESCE(MAX(best_streak), 0) AS s FROM habits WHERE user_id = $1 AND archived = FALSE`, [opponentId]);

    const { rows: duel } = await pool.query(
      `INSERT INTO duels (challenger_id, opponent_id, status, challenger_streak, opponent_streak, wager)
       VALUES ($1, $2, 'active', $3, $4, $5) RETURNING id`,
      [userId, opponentId, my[0].s, opp[0].s, wager],
    );

    // РАУНД-2 ФИКС: эскроу — списываем ставку с ОБОИХ (победитель получит ×2)
    await pool.query(`UPDATE users SET bonus_balance = bonus_balance - $1 WHERE id = $2`, [wager, userId]);
    await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'duel_wager')`, [userId, -wager]);
    // Упрощённая модель: у оппонента ставка списывается при finish (иначе непринятая дуэль заморозит бонусы).
    // Победитель получает wager×1 сверху своей возвращённой ставки = суммарно ×2 от исхода.

    res.json({ ok: true, duelId: duel[0].id, myStreak: my[0].s, oppStreak: opp[0].s });
  } catch (err) {
    console.error('POST duel:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/duels/:id/finish — завершить (кто длиннее стрик — победил) */
router.post('/:id/finish', async (req, res) => {
  const userId = req.userId;
  const duelId = Number(req.params.id);
  try {
    const { rows: d } = await pool.query(`SELECT * FROM duels WHERE id = $1 AND status = 'active'`, [duelId]);
    if (!d.length) return res.status(404).json({ error: 'Дуэль не найдена' });
    const duel = d[0];
    if (duel.challenger_id !== userId && duel.opponent_id !== userId) return res.status(403).json({ error: 'Не участник' });

    const { rows: my } = await pool.query(`SELECT COALESCE(MAX(best_streak), 0) AS s FROM habits WHERE user_id = $1 AND archived = FALSE`, [duel.challenger_id]);
    const { rows: opp } = await pool.query(`SELECT COALESCE(MAX(best_streak), 0) AS s FROM habits WHERE user_id = $1 AND archived = FALSE`, [duel.opponent_id]);

    const myS = my[0].s;
    const oppS = opp[0].s;
    const winnerId = myS > oppS ? duel.challenger_id : oppS > myS ? duel.opponent_id : null; // ничья = null

    await pool.query(`UPDATE duels SET status = 'finished', challenger_streak = $1, opponent_streak = $2, winner_id = $3, finished_at = NOW() WHERE id = $4`,
      [myS, oppS, winnerId, duelId]);

    if (winnerId) {
      // ФИКС-A: эскроу платил ТОЛЬКО challenger при создании.
      // Здесь платит ТОЛЬКО opponent (тот, кто не платил) — zero-sum в обоих исходах:
      //   challenger выиграл: challenger −w+2w = +w, opponent −w
      //   opponent выиграл:   opponent −w+2w = +w, challenger уже −w
      await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2`, [duel.wager * 2, winnerId]);
      await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'duel_win')`, [winnerId, duel.wager * 2]);
      await pool.query(`UPDATE users SET bonus_balance = GREATEST(0, bonus_balance - $1) WHERE id = $2`, [duel.wager, duel.opponent_id]);
      await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'duel_stake')`, [duel.opponent_id, -duel.wager]);
    } else {
      // Ничья — возврат эскроу создателю независимо от того, кто вызвал finish
      await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2`, [duel.wager, duel.challenger_id]);
      await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'duel_refund')`, [duel.challenger_id, duel.wager]);
    }

    res.json({ ok: true, winnerId, myStreak: myS, oppStreak: oppS });
  } catch (err) {
    console.error('finish duel:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
