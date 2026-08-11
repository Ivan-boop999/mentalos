import crypto from 'node:crypto';
import pool from '../db/pool.js';

/** Проверка подписи Telegram WebApp initData (HMAC-SHA256) */
function validateInitData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    if (!hash) return null;

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (computed !== hash) return null;

    const authDate = Number(params.get('auth_date'));
    if (!authDate) return null;
    if (Date.now() / 1000 - authDate > 60 * 60 * 24) return null;

    const userRaw = params.get('user');
    if (!userRaw) return null;
    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

/** Upsert пользователя: создаёт, если нет; генерит referral_code */
async function ensureUser(tgUser, startParam) {
  const { id, username = null, first_name = null } = tgUser;

  // Создаём если нет
  await pool.query(
    `INSERT INTO users (id, username, first_name, referral_code)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       username   = EXCLUDED.username,
       first_name = EXCLUDED.first_name`,
    [id, username, first_name, `MOS${id}`],
  );

  // Обработка реферального кода (если пришёл и пользователь новый)
  if (startParam) {
    const code = String(startParam).replace(/^MOS/, '');
    const referredId = Number(code);
    if (referredId && Number.isFinite(referredId) && referredId !== id) {
      // Проверяем, что реферер существует и этого пользователя ещё никто не пригласил
      try {
        await pool.query(
          `UPDATE users SET referred_by = $2
           WHERE id = $1 AND referred_by IS NULL`,
          [id, referredId],
        );
        // Начисляем бонус пригласившему
        const { rowCount } = await pool.query(
          `INSERT INTO referrals (referrer_id, referred_id, referred_username, bonus_awarded)
           VALUES ($1, $2, $3, TRUE)
           ON CONFLICT (referred_id) DO NOTHING`,
          [referredId, id, username || first_name || 'друг'],
        );
        if (rowCount > 0) {
          await pool.query(`UPDATE users SET bonus_balance = bonus_balance + 100 WHERE id = $1`, [referredId]);
          await pool.query(
            `INSERT INTO bonus_transactions (user_id, amount, reason, meta)
             VALUES ($1, 100, 'referral', $2)`,
            [referredId, JSON.stringify({ referred: id })],
          );
          // И бонус приглашённому (двусторонняя мотивация)
          await pool.query(`UPDATE users SET bonus_balance = bonus_balance + 50 WHERE id = $1`, [id]);
          await pool.query(
            `INSERT INTO bonus_transactions (user_id, amount, reason, meta)
             VALUES ($1, 50, 'referral_welcome', $2)`,
            [id, JSON.stringify({ referrer: referredId })],
          );
        }
      } catch (e) {
        console.warn('referral error:', e.message);
      }
    }
  }
  return id;
}

export function authMiddleware(req, res, next) {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: 'BOT_TOKEN не задан' });

  const initData =
    req.headers['x-telegram-init-data'] ||
    req.headers['telegram-init-data'] ||
    req.body?.initData ||
    req.query.initData;

  if (!initData) return res.status(401).json({ error: 'Нет initData' });

  const tgUser = validateInitData(initData, botToken);
  if (!tgUser?.id) return res.status(401).json({ error: 'Неверная подпись initData' });

  // start_param из initData (referral code)
  let startParam = null;
  try {
    const params = new URLSearchParams(initData);
    startParam = params.get('start_param') || null;
  } catch {}

  ensureUser(tgUser, startParam).catch((err) => console.error('ensureUser:', err.message));

  req.userId = tgUser.id;
  req.telegramUser = tgUser;
  next();
}
