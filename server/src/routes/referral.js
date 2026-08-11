import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/** Магазин: что можно купить за бонусы */
const SHOP_ITEMS = [
  { code: 'theme_aurora', title: 'Тема «Aurora»', emoji: '🌌', desc: 'Северное сияние в фоне', price: 200, type: 'theme', value: 'aurora' },
  { code: 'theme_sunset', title: 'Тема «Закат»', emoji: '🌅', desc: 'Тёплые закатные градиенты', price: 200, type: 'theme', value: 'sunset' },
  { code: 'theme_forest', title: 'Тема «Лес»', emoji: '🌲', desc: 'Зелёная природная палитра', price: 200, type: 'theme', value: 'forest' },
  { code: 'theme_mono', title: 'Тема «Mono»', emoji: '⚫', desc: 'Минимализм чёрно-белый', price: 300, type: 'theme', value: 'mono' },
  { code: 'badge_streaker', title: 'Бейдж «Серийный»', emoji: '⚡', desc: 'Иконка в профиле', price: 500, type: 'badge' },
  { code: 'extra_stat', title: 'Расширенная статистика', emoji: '📈', desc: 'Годовой отчёт + прогнозы', price: 800, type: 'feature' },
  { code: 'bot_name_color', title: 'Цвет имени бота', emoji: '🎨', desc: 'Кастомизация уведомлений', price: 1000, type: 'feature' },
  { code: 'premium_status', title: 'Premium статус 🌟', emoji: '🌟', desc: 'Золотая рамка + эксклюзив', price: 2000, type: 'status' },
];

/** GET /api/referral — реферальная программа + баланс + приглашённые */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: uRows } = await pool.query(
      `SELECT referral_code, bonus_balance FROM users WHERE id = $1`,
      [userId],
    );
    const { rows: refs } = await pool.query(
      `SELECT referred_id AS id, referred_username AS username, created_at::text AS joined_at, bonus_awarded
       FROM referrals WHERE referrer_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );
    const { rows: tx } = await pool.query(
      `SELECT amount, reason, created_at::text AS at FROM bonus_transactions
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId],
    );

    res.json({
      referralCode: uRows[0]?.referral_code || `MOS${userId}`,
      shareUrl: `https://t.me/${process.env.BOT_USERNAME || 'mentalos_bot'}?start=MOS${userId}`,
      balance: uRows[0]?.bonus_balance || 0,
      invited: refs,
      transactions: tx,
      rules: {
        perReferral: 100,
        welcomeBonus: 50,
        perCheckin: 1,
      },
    });
  } catch (err) {
    console.error('GET referral:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** GET /api/referral/shop — товары */
router.get('/shop', (_req, res) => {
  res.json(SHOP_ITEMS);
});

/** POST /api/referral/buy — купить товар */
router.post('/buy', async (req, res) => {
  const userId = req.userId;
  const code = req.body?.code;
  const item = SHOP_ITEMS.find((i) => i.code === code);
  if (!item) return res.status(400).json({ error: 'Товар не найден' });

  try {
    const { rows: u } = await pool.query(`SELECT bonus_balance FROM users WHERE id = $1`, [userId]);
    const balance = u[0]?.bonus_balance || 0;
    if (balance < item.price) {
      return res.status(402).json({ error: 'Недостаточно бонусов', balance, need: item.price - balance });
    }

    // Списываем и фиксируем покупку
    await pool.query(`UPDATE users SET bonus_balance = bonus_balance - $1 WHERE id = $2`, [item.price, userId]);
    await pool.query(
      `INSERT INTO bonus_transactions (user_id, amount, reason, meta) VALUES ($1, $2, $3, $4)`,
      [userId, -item.price, 'purchase', JSON.stringify({ code: item.code, title: item.title })],
    );

    // Эффект покупки (для тем — пока просто транзакция, расширяем позже)
    res.json({ ok: true, item, balance: balance - item.price });
  } catch (err) {
    console.error('buy:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
