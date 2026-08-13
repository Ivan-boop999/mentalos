import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/** GET /api/companion — состояние + инвентарь + экипировка */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: u } = await pool.query(
      `SELECT companion_name, companion_type, companion_xp, companion_mood, companion_equipped FROM users WHERE id = $1`,
      [userId],
    );
    if (!u.length) return res.json({ name: 'Спарк', type: 'spark', xp: 0, mood: 50, level: 1, stage: 'egg', equipped: {} });

    const xp = u[0].companion_xp || 0;
    const level = Math.floor(Math.sqrt(xp / 50)) + 1;
    const stages = ['egg', 'baby', 'teen', 'adult'];
    const stage = stages[Math.min(3, Math.floor(level / 5))];

    let equipped = u[0].companion_equipped || {};
    if (typeof equipped === 'string') { try { equipped = JSON.parse(equipped); } catch { equipped = {}; } }

    res.json({
      name: u[0].companion_name,
      type: u[0].companion_type,
      xp, level, stage, equipped,
      xpToNext: Math.pow(level, 2) * 50,
      xpForThis: Math.pow(level - 1, 2) * 50,
    });
  } catch (err) {
    console.error('GET companion:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** PUT /api/companion — переименовать / сменить тип */
router.put('/', async (req, res) => {
  const { name, type } = req.body;
  const sets = {};
  if (name !== undefined && typeof name === 'string' && name.trim().length <= 20) sets.companion_name = name.trim();
  if (type !== undefined && ['spark', 'leaf', 'drop', 'flame'].includes(type)) sets.companion_type = type;
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

/** GET /api/companion/shop — все предметы */
router.get('/shop', async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT code, title, category, emoji, price FROM companion_items ORDER BY sort_order`);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

/** GET /api/companion/inventory — купленные + надетые */
router.get('/inventory', async (req, res) => {
  try {
    const { rows: u } = await pool.query(`SELECT companion_equipped FROM users WHERE id = $1`, [req.userId]);
    let equipped = u[0]?.companion_equipped || {};
    if (typeof equipped === 'string') { try { equipped = JSON.parse(equipped); } catch { equipped = {}; } }

    const { rows: owned } = await pool.query(
      `SELECT ui.item_code, ui.equipped, ci.title, ci.category, ci.emoji
       FROM user_items ui JOIN companion_items ci ON ci.code = ui.item_code
       WHERE ui.user_id = $1 ORDER BY ci.sort_order`, [req.userId],
    );
    res.json({ equipped, owned });
  } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

/** POST /api/companion/buy — купить предмет */
router.post('/buy', async (req, res) => {
  const code = req.body?.code;
  try {
    const { rows: item } = await pool.query(`SELECT code, title, price, category FROM companion_items WHERE code = $1`, [code]);
    if (!item.length) return res.status(404).json({ error: 'Предмет не найден' });

    const { rows: u } = await pool.query(`SELECT bonus_balance FROM users WHERE id = $1`, [req.userId]);
    const balance = u[0]?.bonus_balance || 0;
    if (balance < item[0].price) return res.status(402).json({ error: 'Недостаточно бонусов', need: item[0].price - balance });

    // Проверка — не куплено ли уже
    const { rows: existing } = await pool.query(`SELECT 1 FROM user_items WHERE user_id = $1 AND item_code = $2`, [req.userId, code]);
    if (existing.length) return res.json({ ok: true, alreadyOwned: true, balance });

    await pool.query(`UPDATE users SET bonus_balance = bonus_balance - $1 WHERE id = $2`, [item[0].price, req.userId]);
    await pool.query(`INSERT INTO user_items (user_id, item_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [req.userId, code]);
    await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason, meta) VALUES ($1, $2, 'purchase', $3)`,
      [req.userId, -item[0].price, JSON.stringify({ code: item[0].code })]);

    res.json({ ok: true, balance: balance - item[0].price });
  } catch (err) { console.error('buy item:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

/** POST /api/companion/equip — надеть/снять предмет */
router.post('/equip', async (req, res) => {
  const { code, category } = req.body;
  try {
    // Проверяем владение
    const { rows: own } = await pool.query(`SELECT 1 FROM user_items WHERE user_id = $1 AND item_code = $2`, [req.userId, code]);
    if (!own.length) return res.status(403).json({ error: 'Сначала купи предмет' });

    const { rows: u } = await pool.query(`SELECT companion_equipped FROM users WHERE id = $1`, [req.userId]);
    let equipped = u[0]?.companion_equipped || {};
    if (typeof equipped === 'string') { try { equipped = JSON.parse(equipped); } catch { equipped = {}; } }

    // Если уже надет в этой категории — снимаем. Иначе надеваем.
    if (equipped[category] === code) {
      delete equipped[category];
    } else {
      equipped[category] = code;
    }

    await pool.query(`UPDATE users SET companion_equipped = $1 WHERE id = $2`, [JSON.stringify(equipped), req.userId]);
    // обновляем user_items.equipped
    await pool.query(`UPDATE user_items SET equipped = FALSE WHERE user_id = $1`, [req.userId]);
    for (const [cat, c] of Object.entries(equipped)) {
      await pool.query(`UPDATE user_items SET equipped = TRUE WHERE user_id = $1 AND item_code = $2`, [req.userId, c]);
    }
    res.json({ ok: true, equipped });
  } catch (err) { console.error('equip:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

/** Награждает компаньона при отметке */
export async function rewardCompanion(userId, isDone) {
  if (!isDone) {
    await pool.query(`UPDATE users SET companion_mood = GREATEST(0, companion_mood - 3) WHERE id = $1`, [userId]);
    return;
  }
  await pool.query(`UPDATE users SET companion_xp = companion_xp + 15, companion_mood = LEAST(100, companion_mood + 8) WHERE id = $1`, [userId]);
}

export async function decayCompanionMood(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE status = 'done') AS done, COUNT(DISTINCT log_date) AS days
     FROM habit_logs WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '7 days'`, [userId],
  );
  const target = rows[0]?.days > 0 ? Math.round(((rows[0].done / rows[0].days) / 3) * 100) : 50;
  await pool.query(`UPDATE users SET companion_mood = LEAST(100, GREATEST(0, companion_mood + ($2 - companion_mood) * 0.2)) WHERE id = $1`, [userId, target]);
}

export default router;
