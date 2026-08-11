import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

const SHOP_ITEMS = [
  { code: 'theme_default', title: 'Стандартная тема', emoji: '✨', desc: 'Базовый градиент MentalOS', price: 0, type: 'theme', value: 'default' },
  { code: 'theme_aurora', title: 'Тема «Aurora»', emoji: '🌌', desc: 'Северное сияние', price: 200, type: 'theme', value: 'aurora' },
  { code: 'theme_sunset', title: 'Тема «Закат»', emoji: '🌅', desc: 'Тёплые закатные градиенты', price: 200, type: 'theme', value: 'sunset' },
  { code: 'theme_forest', title: 'Тема «Лес»', emoji: '🌲', desc: 'Зелёная природа', price: 200, type: 'theme', value: 'forest' },
  { code: 'theme_ocean', title: 'Тема «Океан»', emoji: '🌊', desc: 'Морские глубины', price: 250, type: 'theme', value: 'ocean' },
  { code: 'theme_mono', title: 'Тема «Mono»', emoji: '⚫', desc: 'Минимализм ч/б', price: 300, type: 'theme', value: 'mono' },
  { code: 'theme_neon', title: 'Тема «Neon»', emoji: '💜', desc: 'Киберпанк неон', price: 400, type: 'theme', value: 'neon' },
  { code: 'badge_streaker', title: 'Бейдж «Серийный»', emoji: '⚡', desc: 'Иконка в профиле', price: 500, type: 'badge' },
  { code: 'badge_mentor', title: 'Бейдж «Наставник»', emoji: '🎓', desc: 'За активные рефералы', price: 800, type: 'badge' },
  { code: 'premium_status', title: 'Premium статус 🌟', emoji: '🌟', desc: 'Золотая рамка профиля', price: 2000, type: 'status' },
];

/** GET /api/referral */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: uRows } = await pool.query(
      `SELECT referral_code, bonus_balance, xp, level, active_theme, owned_themes FROM users WHERE id = $1`,
      [userId],
    );
    const { rows: refs } = await pool.query(
      `SELECT referred_id AS id, referred_username AS username, created_at::text AS joined_at
       FROM referrals WHERE referrer_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );
    const ownedThemes = uRows[0]?.owned_themes || [];
    let themesArr;
    try {
      themesArr = typeof ownedThemes === 'string' ? JSON.parse(ownedThemes) : ownedThemes;
    } catch {
      themesArr = [];
    }
    if (!Array.isArray(themesArr)) themesArr = [];

    res.json({
      referralCode: uRows[0]?.referral_code || `MOS${userId}`,
      shareUrl: `https://t.me/${process.env.BOT_USERNAME || 'mentalos_bot'}?start=MOS${userId}`,
      balance: uRows[0]?.bonus_balance || 0,
      xp: uRows[0]?.xp || 0,
      level: uRows[0]?.level || 1,
      activeTheme: uRows[0]?.active_theme || 'default',
      ownedThemes: themesArr,
      invited: refs,
      rules: { perReferral: 100, welcomeBonus: 50, perCheckin: 1, xpPerCheckin: 10 },
    });
  } catch (err) {
    console.error('GET referral:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** GET /api/referral/shop */
router.get('/shop', (_req, res) => res.json(SHOP_ITEMS));

/** POST /api/referral/buy */
router.post('/buy', async (req, res) => {
  const userId = req.userId;
  const code = req.body?.code;
  const item = SHOP_ITEMS.find((i) => i.code === code);
  if (!item) return res.status(400).json({ error: 'Товар не найден' });

  try {
    const { rows: u } = await pool.query(
      `SELECT bonus_balance, owned_themes FROM users WHERE id = $1`, [userId],
    );
    const balance = u[0]?.bonus_balance || 0;
    const owned = u[0]?.owned_themes || [];
    let ownedArr;
    try {
      ownedArr = typeof owned === 'string' ? JSON.parse(owned) : owned;
    } catch {
      ownedArr = [];
    }
    if (!Array.isArray(ownedArr)) ownedArr = [];

    // Бесплатные темы — просто активируем
    if (item.price === 0) {
      if (item.type === 'theme') {
        await pool.query(`UPDATE users SET active_theme = $1 WHERE id = $2`, [item.value, userId]);
      }
      return res.json({ ok: true, item, balance });
    }

    // Проверка — не куплено ли уже
    if (ownedArr.includes(item.value || item.code)) {
      // Если уже есть — просто активируем (для тем)
      if (item.type === 'theme') {
        await pool.query(`UPDATE users SET active_theme = $1 WHERE id = $2`, [item.value, userId]);
      }
      return res.json({ ok: true, item, balance, alreadyOwned: true });
    }

    if (balance < item.price) {
      return res.status(402).json({ error: 'Недостаточно бонусов', balance, need: item.price - balance });
    }

    // Списываем + добавляем в owned
    const newOwned = item.type === 'theme' ? [...ownedArr, item.value] : ownedArr;
    await pool.query(
      `UPDATE users SET bonus_balance = bonus_balance - $1, owned_themes = $2 WHERE id = $3`,
      [item.price, JSON.stringify(newOwned), userId],
    );
    if (item.type === 'theme') {
      await pool.query(`UPDATE users SET active_theme = $1 WHERE id = $2`, [item.value, userId]);
    }
    await pool.query(
      `INSERT INTO bonus_transactions (user_id, amount, reason, meta) VALUES ($1, $2, $3, $4)`,
      [userId, -item.price, 'purchase', JSON.stringify({ code: item.code, title: item.title })],
    );

    res.json({ ok: true, item, balance: balance - item.price });
  } catch (err) {
    console.error('buy:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/referral/activate-theme — активировать уже купленную тему */
router.post('/activate-theme', async (req, res) => {
  const theme = req.body?.theme;
  if (!theme) return res.status(400).json({ error: 'theme обязателен' });
  try {
    await pool.query(`UPDATE users SET active_theme = $1 WHERE id = $2`, [theme, req.userId]);
    res.json({ ok: true, theme });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
