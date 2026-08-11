import crypto from 'node:crypto';
import pool from '../db/pool.js';

/**
 * Проверка подписи Telegram WebApp initData.
 * Документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Алгоритм:
 *  1. Парсим query-строку initData.
 *  2. Извлекаем hash и удаляем его из проверяемых данных.
 *  3. Строим data_check_string: отсортированные пары key=value, разделённые \n.
 *  4. secret_key = HMAC_SHA256(key="WebAppData", data=BOT_TOKEN)
 *  5. hash = HEX(HMAC_SHA256(key=secret_key, data=data_check_string))
 *  6. Если hash совпадает — подпись валидна.
 *  7. Проверяем срок давности (auth_date) — не старше 24 часов.
 */
function validateInitData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    if (!hash) return null;

    // data_check_string: пары отсортированы по ключу, разделены \n
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // secret_key = HMAC_SHA256("WebAppData", BOT_TOKEN)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Защита от подмены подписи
    if (computedHash !== hash) return null;

    // Проверка срока давности auth_date (24 часа)
    const authDate = Number(params.get('auth_date'));
    if (!authDate) return null;
    const ageSeconds = Date.now() / 1000 - authDate;
    if (ageSeconds > 60 * 60 * 24) return null; // старше суток — отбрасываем

    // Расшифрованный объект пользователя
    const userRaw = params.get('user');
    if (!userRaw) return null;
    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

/** upsert пользователя в БД при первом входе */
async function ensureUser(telegramUser) {
  const { id, username = null, first_name = null } = telegramUser;
  await pool.query(
    `INSERT INTO users (id, username, first_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET
       username   = EXCLUDED.username,
       first_name = EXCLUDED.first_name`,
    [id, username, first_name],
  );
  return id;
}

/** Express-middleware: проверяет initData и кладёт userId в req */
export function authMiddleware(req, res, next) {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({ error: 'BOT_TOKEN не задан на сервере' });
  }

  // initData приходит либо в заголовке, либо в теле/qs
  const initData =
    req.headers['x-telegram-init-data'] ||
    req.headers['telegram-init-data'] ||
    req.body?.initData ||
    req.query.initData;

  if (!initData) {
    return res.status(401).json({ error: 'Нет initData' });
  }

  const telegramUser = validateInitData(initData, botToken);
  if (!telegramUser || !telegramUser.id) {
    return res.status(401).json({ error: 'Неверная подпись initData' });
  }

  // Сохраняем/обновляем пользователя (не дожидаемся, чтобы не тормозить ответ)
  ensureUser(telegramUser).catch((err) =>
    console.error('Ошибка ensureUser:', err.message),
  );

  req.userId = telegramUser.id;
  req.telegramUser = telegramUser;
  next();
}
