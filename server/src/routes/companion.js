import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

const TYPES = ['spark', 'leaf', 'drop', 'flame'];
const TRAITS = ['curious', 'gentle', 'sassy'];
const CATEGORIES = ['hat', 'glasses', 'accessory', 'home'];

function stageOf(level) {
  // Finch-паттерн: БЫСТРОЕ первое вылупление (4 отметки), потом долгий рост
  if (level <= 1) return 'egg';   // 0–49 XP (до 4-х отметок)
  if (level < 5) return 'baby';   // 50–799 XP
  if (level < 10) return 'teen';  // 800–4049 XP
  return 'adult';                 // 4050+ XP
}

/** GET /api/companion — состояние питомца (+ приключение, черта, ДР, бесплатка) */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: u } = await pool.query(
      `SELECT companion_name, companion_type, companion_xp, companion_mood, companion_equipped,
              companion_trait, companion_birthday, last_shop_bonus
       FROM users WHERE id = $1`,
      [userId],
    );
    const xp = u[0] ? Number(u[0].companion_xp) || 0 : 0;
    const level = Math.floor(Math.sqrt(xp / 50)) + 1;
    let equipped = u[0]?.companion_equipped || {};
    if (typeof equipped === 'string') { try { equipped = JSON.parse(equipped); } catch { equipped = {}; } }
    if (!equipped || typeof equipped !== 'object') equipped = {};

    // Активное/завершённое приключение
    const { rows: adv } = await pool.query(
      `SELECT id, status, returns_at::text AS returns_at, started_at::text AS started_at
       FROM adventures WHERE user_id = $1 AND status IN ('active','completed')
       ORDER BY started_at DESC LIMIT 1`, [userId],
    );
    let adventure = null;
    if (adv[0]) {
      adventure = {
        id: adv[0].id,
        status: adv[0].status === 'completed' ? 'ready' : 'active',
        returnsAt: adv[0].returns_at,
        canClaim: adv[0].status === 'completed',
      };
    }

    res.json({
      name: u[0]?.companion_name || 'Спарк',
      type: u[0]?.companion_type || 'spark',
      xp,
      mood: u.length ? Number(u[0].companion_mood) : 50,
      level,
      stage: stageOf(level),
      equipped,
      trait: u[0]?.companion_trait || 'curious',
      isBirthday: !!(u[0]?.companion_birthday && new Date(u[0].companion_birthday).toDateString() === new Date().toDateString()),
      adventure,
      shopBonusAvailable: !(u[0]?.last_shop_bonus && new Date(u[0].last_shop_bonus).toDateString() === new Date().toDateString()),
      xpToNext: Math.pow(level, 2) * 50,
      xpForThis: Math.pow(level - 1, 2) * 50,
    });
  } catch (err) {
    console.error('GET companion:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** PUT /api/companion — переименовать / сменить тип / черту характера */
router.put('/', async (req, res) => {
  const { name, type, trait } = req.body;
  const sets = {};
  if (name !== undefined) {
    const n = typeof name === 'string' ? name.trim() : '';
    if (n.length === 0 || n.length > 20) return res.status(400).json({ error: 'Имя: 1–20 символов' });
    sets.companion_name = n;
  }
  if (type !== undefined) {
    if (!TYPES.includes(type)) return res.status(400).json({ error: 'Недопустимый тип' });
    sets.companion_type = type;
  }
  if (trait !== undefined) {
    if (!TRAITS.includes(trait)) return res.status(400).json({ error: 'Недопустимая черта' });
    sets.companion_trait = trait;
  }
  if (!Object.keys(sets).length) return res.status(400).json({ error: 'Нечего обновлять' });

  try {
    const fields = Object.keys(sets).map((k, i) => `${k} = $${i + 2}`).join(', ');
    await pool.query(`UPDATE users SET ${fields} WHERE id = $1`, [req.userId, ...Object.values(sets)]);
    res.json({ ok: true, ...sets });
  } catch (err) {
    console.error('PUT companion:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** GET /api/companion/shop — каталог (emoji отдаём — фронт строит карту без хардкода) */
router.get('/shop', async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT code, title, category, emoji, price FROM companion_items ORDER BY sort_order`);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** GET /api/companion/inventory — купленное + надетое */
router.get('/inventory', async (req, res) => {
  try {
    const { rows: u } = await pool.query(`SELECT companion_equipped FROM users WHERE id = $1`, [req.userId]);
    let equipped = u[0]?.companion_equipped || {};
    if (typeof equipped === 'string') { try { equipped = JSON.parse(equipped); } catch { equipped = {}; } }
    if (!equipped || typeof equipped !== 'object') equipped = {};

    const { rows: owned } = await pool.query(
      `SELECT ui.item_code, ui.equipped, ci.title, ci.category, ci.emoji
       FROM user_items ui JOIN companion_items ci ON ci.code = ui.item_code
       WHERE ui.user_id = $1 ORDER BY ci.sort_order`, [req.userId],
    );
    res.json({ equipped, owned });
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/companion/buy — атомарная покупка (ФИКС-A3: без гонки и минуса) */
router.post('/buy', async (req, res) => {
  const code = req.body?.code;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Блокируем строку пользователя от параллельных покупок
    const { rows: u } = await client.query(
      `SELECT bonus_balance FROM users WHERE id = $1 FOR UPDATE`, [req.userId],
    );
    const { rows: item } = await client.query(
      `SELECT code, title, price, category FROM companion_items WHERE code = $1`, [code],
    );
    if (!item.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Предмет не найден' }); }

    const { rows: existing } = await client.query(
      `SELECT 1 FROM user_items WHERE user_id = $1 AND item_code = $2`, [req.userId, code],
    );
    const balance = Number(u[0]?.bonus_balance) || 0;
    if (existing.length) {
      await client.query('ROLLBACK');
      return res.json({ ok: true, alreadyOwned: true, balance });
    }
    if (balance < item[0].price) {
      await client.query('ROLLBACK');
      return res.status(402).json({ error: 'Недостаточно бонусов', need: item[0].price - balance });
    }

    await client.query(`UPDATE users SET bonus_balance = bonus_balance - $1 WHERE id = $2`, [item[0].price, req.userId]);
    await client.query(`INSERT INTO user_items (user_id, item_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [req.userId, code]);
    await client.query(
      `INSERT INTO bonus_transactions (user_id, amount, reason, meta) VALUES ($1, $2, 'purchase', $3)`,
      [req.userId, -item[0].price, JSON.stringify({ code })],
    );
    await client.query('COMMIT');
    res.json({ ok: true, balance: balance - item[0].price });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('buy item:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

/** POST /api/companion/equip — надеть/снять (ФИКС-A4: категория сверяется с предметом) */
router.post('/equip', async (req, res) => {
  const { code } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Владение + НАСТОЯЩАЯ категория из БД
    const { rows: own } = await client.query(
      `SELECT ci.category FROM user_items ui JOIN companion_items ci ON ci.code = ui.item_code
       WHERE ui.user_id = $1 AND ui.item_code = $2`, [req.userId, code],
    );
    if (!own.length) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Сначала купи предмет' }); }
    const category = own[0].category;
    if (!CATEGORIES.includes(category)) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Неизвестная категория' }); }

    const { rows: u } = await client.query(`SELECT companion_equipped FROM users WHERE id = $1 FOR UPDATE`, [req.userId]);
    let equipped = u[0]?.companion_equipped || {};
    if (typeof equipped === 'string') { try { equipped = JSON.parse(equipped); } catch { equipped = {}; } }
    if (!equipped || typeof equipped !== 'object') equipped = {};

    if (equipped[category] === code) delete equipped[category];
    else equipped[category] = code;

    await client.query(`UPDATE users SET companion_equipped = $1 WHERE id = $2`, [JSON.stringify(equipped), req.userId]);
    // ФИКС-A5: один запрос вместо N+1
    await client.query(`UPDATE user_items SET equipped = FALSE WHERE user_id = $1`, [req.userId]);
    const codes = Object.values(equipped);
    if (codes.length) {
      await client.query(`UPDATE user_items SET equipped = TRUE WHERE user_id = $1 AND item_code = ANY($2)`, [req.userId, codes]);
    }
    await client.query('COMMIT');
    res.json({ ok: true, equipped });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('equip:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

/**
 * Награждает питомца. Вызывается из habits.js ТОЛЬКО на валидный переход статуса (см. anti-farm там).
 */
export async function rewardCompanion(userId, isDone) {
  if (!isDone) {
    await pool.query(`UPDATE users SET companion_mood = GREATEST(0, companion_mood - 3) WHERE id = $1`, [userId]);
    return;
  }
  await pool.query(`UPDATE users SET companion_xp = companion_xp + 15, companion_mood = LEAST(100, companion_mood + 8) WHERE id = $1`, [userId]);
}

/** Откат награды питомца при снятии done-отметки (ФИКС-A6: парность с rewardCompanion) */
export async function rollbackCompanion(userId) {
  await pool.query(
    `UPDATE users SET companion_xp = GREATEST(0, companion_xp - 15), companion_mood = GREATEST(0, companion_mood - 8) WHERE id = $1`,
    [userId],
  );
}

/** Настроение дрейфует к реальному прогрессу (guilt-free: минимум 30) */
export async function decayCompanionMood(userId) {
  // ФИКС-A7: считаем только ДНИ С ВЫПОЛНЕНИЕМ (skip-дни не занижают target)
  const { rows } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE status = 'done') AS done,
            COUNT(DISTINCT log_date) FILTER (WHERE status = 'done') AS done_days
     FROM habit_logs
     WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '7 days'`,
    [userId],
  );
  const done = Number(rows[0]?.done) || 0;        // ФИКС-A9: COUNT → Number явно
  const doneDays = Number(rows[0]?.done_days) || 0;
  let target = 50; // нет активности вообще — нейтральный сон
  if (doneDays > 0) target = Math.round((done / doneDays) / 3 * 100);
  target = Math.max(30, Math.min(100, target));   // guilt-free floor
  await pool.query(
    `UPDATE users SET companion_mood = LEAST(100, GREATEST(0, companion_mood + ($2 - companion_mood) * 0.2)) WHERE id = $1`,
    [userId, target],
  );
}

// ============================================================
//  ПРИКЛЮЧЕНИЯ (appointment-цикл Finch)
// ============================================================

const ADVENTURE_HOURS = Number(process.env.ADVENTURE_HOURS) || 6;

/** POST /api/companion/adventure/start — отправить питомца в приключение */
router.post('/adventure/start', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: u } = await pool.query(
      `SELECT companion_xp, companion_name, companion_stage FROM users WHERE id = $1`, [userId],
    );
    const xp = Number(u[0]?.companion_xp) || 0;
    if (stageOf(Math.floor(Math.sqrt(xp / 50)) + 1) === 'egg') {
      return res.status(400).json({ error: 'Питомец ещё не вылупился — отметь пару привычек!' });
    }
    // Уже в пути?
    const { rows: active } = await pool.query(
      `SELECT id, status, returns_at::text AS returns_at FROM adventures
       WHERE user_id = $1 AND status IN ('active','completed') ORDER BY started_at DESC LIMIT 1`, [userId],
    );
    if (active.length) {
      return res.status(409).json({ error: 'Питомец уже в приключении', adventure: active[0] });
    }

    // Рандомим награду заранее (предмет — только из невладеемых)
    const rewards = [
      { type: 'bonus', weight: 35, amount: [10, 15, 20, 25] },
      { type: 'xp', weight: 25, amount: [20, 30, 40] },
      { type: 'mood', weight: 20, amount: [10, 15] },
      { type: 'item', weight: 20 },
    ];
    const total = rewards.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * total;
    let reward = rewards[0];
    for (const r of rewards) { roll -= r.weight; if (roll <= 0) { reward = r; break; } }

    let rewardItem = null;
    if (reward.type === 'item') {
      const { rows: candidates } = await pool.query(
        `SELECT ci.code FROM companion_items ci
         WHERE NOT EXISTS (SELECT 1 FROM user_items ui WHERE ui.user_id = $1 AND ui.item_code = ci.code)
         ORDER BY random() LIMIT 1`, [userId],
      );
      if (candidates.length) rewardItem = candidates[0].code;
      else reward = { type: 'bonus', amount: [20] }; // всё куплено — бонусом
    }
    const amount = Array.isArray(reward.amount) ? reward.amount[Math.floor(Math.random() * reward.amount.length)] : null;

    const returnsAt = new Date(Date.now() + ADVENTURE_HOURS * 3600 * 1000);
    await pool.query(
      `INSERT INTO adventures (user_id, returns_at, reward_type, reward_amount, reward_item)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, returnsAt.toISOString(), reward.type, amount, rewardItem],
    );
    res.json({ ok: true, returnsAt: returnsAt.toISOString(), hours: ADVENTURE_HOURS });
  } catch (err) {
    console.error('adventure start:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/companion/adventure/claim — забрать находку */
router.post('/adventure/claim', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: adv } = await pool.query(
      `SELECT * FROM adventures WHERE user_id = $1 AND status IN ('active','completed')
       ORDER BY started_at DESC LIMIT 1`, [userId],
    );
    if (!adv.length) return res.status(404).json({ error: 'Нет приключения' });
    const a = adv[0];
    if (new Date(a.returns_at) > new Date()) {
      return res.status(400).json({ error: 'Питомец ещё в пути', returnsAt: a.returns_at });
    }
    if (a.status === 'claimed') return res.status(409).json({ error: 'Уже забрано' });

    // Выдаём награду
    let rewardLabel = '';
    if (a.reward_type === 'bonus') {
      await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2`, [a.reward_amount, userId]);
      await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'adventure')`, [userId, a.reward_amount]);
      rewardLabel = `🪙 +${a.reward_amount} бонусов`;
    } else if (a.reward_type === 'xp') {
      await pool.query(`UPDATE users SET xp = xp + $1 WHERE id = $2`, [a.reward_amount, userId]);
      rewardLabel = `⚡ +${a.reward_amount} XP`;
    } else if (a.reward_type === 'mood') {
      await pool.query(`UPDATE users SET companion_mood = LEAST(100, companion_mood + $1) WHERE id = $2`, [a.reward_amount, userId]);
      rewardLabel = `😊 +${a.reward_amount} настроения`;
    } else if (a.reward_type === 'item') {
      await pool.query(`INSERT INTO user_items (user_id, item_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, a.reward_item]);
      const { rows: it } = await pool.query(`SELECT title, emoji FROM companion_items WHERE code = $1`, [a.reward_item]);
      rewardLabel = `${it[0]?.emoji || '🎁'} ${it[0]?.title || 'Подарок'} (бесплатно!)`;
    }
    await pool.query(`UPDATE adventures SET status = 'claimed', claimed_at = NOW() WHERE id = $1`, [a.id]);
    res.json({ ok: true, rewardLabel });
  } catch (err) {
    console.error('adventure claim:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/companion/shop/daily-bonus — ежедневная бесплатка (Finch: stones за визит) */
router.post('/shop/daily-bonus', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: u } = await pool.query(`SELECT last_shop_bonus FROM users WHERE id = $1`, [userId]);
    const last = u[0]?.last_shop_bonus;
    if (last && new Date(last).toDateString() === new Date().toDateString()) {
      return res.status(409).json({ error: 'Бонус уже получен сегодня', available: false });
    }
    await pool.query(`UPDATE users SET bonus_balance = bonus_balance + 10, last_shop_bonus = CURRENT_DATE WHERE id = $1`, [userId]);
    await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, 10, 'shop_daily')`, [userId]);
    res.json({ ok: true, amount: 10 });
  } catch (err) {
    console.error('daily bonus:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * МИЛСТОУНЫ питомца: вылупление (birthday) и эволюция (подарок).
 * Вызывается из /log после начисления. Возвращает { stage, giftLabel } | null.
 */
export async function checkCompanionMilestones(userId) {
  try {
    const { rows: u } = await pool.query(
      `SELECT companion_xp, companion_stage, companion_birthday, active_species FROM users WHERE id = $1`, [userId],
    );
    if (!u.length) return null;
    const xp = Number(u[0].companion_xp) || 0;
    const level = Math.floor(Math.sqrt(xp / 50)) + 1;
    const newStage = stageOf(level);
    const oldStage = u[0].companion_stage || 'egg';
    const order = ['egg', 'baby', 'teen', 'adult'];
    if (order.indexOf(newStage) <= order.indexOf(oldStage)) return null;

    let giftLabel = '';
    if (newStage === 'baby' && !u[0].companion_birthday) {
      await pool.query(`UPDATE users SET companion_birthday = CURRENT_DATE WHERE id = $1`, [userId]);
    }
    const { rows: candidates } = await pool.query(
      `SELECT ci.code, ci.title, ci.emoji FROM companion_items ci
       WHERE NOT EXISTS (SELECT 1 FROM user_items ui WHERE ui.user_id = $1 AND ui.item_code = ci.code)
       ORDER BY random() LIMIT 1`, [userId],
    );
    if (candidates.length) {
      await pool.query(`INSERT INTO user_items (user_id, item_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, candidates[0].code]);
      giftLabel = `${candidates[0].emoji} ${candidates[0].title} — подарок эволюции!`;
    } else {
      await pool.query(`UPDATE users SET bonus_balance = bonus_balance + 25 WHERE id = $1`, [userId]);
      await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, 25, 'evolution_gift')`, [userId]);
      giftLabel = '🪙 +25 бонусов — подарок эволюции!';
    }
    await pool.query(`UPDATE users SET companion_stage = $1 WHERE id = $2`, [newStage, userId]);

    // Событие в дневник питомца
    const { logPetEvent } = await import('./pet.js');
    await logPetEvent(userId, u[0].active_species, newStage === 'baby' ? 'hatch' : 'evolve', {
      stage: newStage, gift: giftLabel,
    });

    return { stage: newStage, giftLabel };
  } catch (err) {
    console.error('milestones:', err);
    return null;
  }
}

export default router;
