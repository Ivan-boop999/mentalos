import cron from 'node-cron';
import pool from '../db/pool.js';
import { autoCompleteDuels } from '../routes/duels.js';

/**
 * Планировщик напоминаний MentalOS.
 *
 * Каждую минуту:
 *   1. Получаем список активных привычек с reminder_time.
 *   2. Для каждой считаем локальное время пользователя (через JS Date с timeZone).
 *   3. Если локальное HH:MM совпадает с reminder_time — отправляем.
 *
 * Всё на JS (без PG time zone функций) → максимальная совместимость.
 */
export function startScheduler(bot) {
  if (!process.env.WEBAPP_URL) {
    console.warn('⚠️  WEBAPP_URL не задан — напоминания будут без кнопки.');
  }

  // Запускаем на 5-й секунде каждой минуты — чтобы успеть загрузить данные
  cron.schedule('5 * * * * *', async () => {
    try {
      const { rows } = await pool.query(
        `SELECT h.id, h.user_id, h.title, h.emoji, h.frequency, h.reminder_time, u.timezone
         FROM habits h
         JOIN users u ON u.id = h.user_id
         WHERE h.archived = FALSE AND h.reminder_time IS NOT NULL`,
      );

      const now = new Date();

      for (const h of rows) {
        const tz = h.timezone || 'UTC';
        const freq = typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency;

        // Локальное время пользователя
        const localParts = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          weekday: 'short',
          day: 'numeric',
        }).formatToParts(now);

        const get = (type) => localParts.find((p) => p.type === type)?.value || '';
        const localHH = get('hour');
        const localMM = get('minute');

        // reminder_time приходит как строка "HH:MM:SS"
        const reminderStr = String(h.reminder_time).slice(0, 5);
        const localStr = `${localHH}:${localMM}`;

        if (reminderStr !== localStr) continue;

        // Проверка дня недели
        if (freq?.type === 'weekly' && Array.isArray(freq.days)) {
          const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
          const localDow = weekdayMap[get('weekday')];
          if (localDow === undefined || !freq.days.includes(localDow)) continue;
        }

        // Локальная дата (для проверки «уже отмечено сегодня»)
        const localDay = get('day');
        const localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

        const { rows: done } = await pool.query(
          `SELECT 1 FROM habit_logs WHERE habit_id = $1 AND user_id = $2 AND log_date = $3 LIMIT 1`,
          [h.id, h.user_id, localDateStr],
        );
        if (done.length) continue;

        const text = `${h.emoji} *${h.title}*\nНе забудь отметить выполнение в MentalOS! 🔥`;
        const replyMarkup = process.env.WEBAPP_URL
          ? { reply_markup: { inline_keyboard: [[{ text: '🧠 Открыть MentalOS', web_app: { url: process.env.WEBAPP_URL } }]] } }
          : {};

        try {
          await bot.sendMessage(h.user_id, text, { parse_mode: 'Markdown', ...replyMarkup });
          console.log(`✉️  Отправлено напоминание user ${h.user_id} (${h.title}) в ${localStr} ${tz}`);
        } catch (err) {
          console.warn(`⚠️  Не удалось отправить user ${h.user_id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('Ошибка scheduler:', err.message);
    }
  });

  console.log('⏰ Scheduler запущен (Intl + TZ-aware).');

  // ===== Buddy-уведомления: раз в день проверяем кто выполнил всё, шлём бадди =====
  cron.schedule('30 * * * *', async () => {
    try {
      // Пользователи, которые ВЫПОЛНИЛИ все привычки сегодня (за последний час)
      // ФИКС: log_date сравнивается с ЛОКАЛЬНОЙ датой пользователя
      const { rows: finishers } = await pool.query(
        `SELECT u.id, u.first_name, u.username
         FROM users u
         WHERE EXISTS (
           SELECT 1 FROM habits h
           WHERE h.user_id = u.id AND h.archived = FALSE
           AND NOT EXISTS (
             SELECT 1 FROM habit_logs l
             WHERE l.habit_id = h.id AND l.user_id = u.id
               AND l.status = 'done'
               AND l.log_date = (CURRENT_DATE AT TIME zone COALESCE(u.timezone, 'UTC'))::date
           )
         ) = FALSE
         AND EXISTS (SELECT 1 FROM habits WHERE user_id = u.id AND archived = FALSE)
         AND NOT EXISTS (
           SELECT 1 FROM buddy_notified bn
           WHERE bn.user_id = u.id AND bn.date = (CURRENT_DATE AT TIME zone COALESCE(u.timezone, 'UTC'))::date
         )`,
      );

      for (const f of finishers) {
        // Находим их бадди, которые ЕЩЁ не выполнили всё
        const { rows: buddies } = await pool.query(
          `SELECT b.buddy_id, bt.timezone AS buddy_tz FROM buddies b
           JOIN users bt ON bt.id = b.buddy_id
           WHERE b.user_id = $1 AND b.status = 'accepted'
           AND EXISTS (
             SELECT 1 FROM habits h
             WHERE h.user_id = b.buddy_id AND h.archived = FALSE
             AND NOT EXISTS (
               SELECT 1 FROM habit_logs l WHERE l.habit_id = h.id AND l.user_id = b.buddy_id
                 AND l.status = 'done'
                 AND l.log_date = (CURRENT_DATE AT TIME zone COALESCE(bt.timezone, 'UTC'))::date
             )
           )`,
          [f.id],
        );

        for (const b of buddies) {
          const friendName = f.first_name || f.username || 'твой друг';
          try {
            await bot.sendMessage(
              b.buddy_id,
              `🔥 *${friendName}* выполнил все привычки сегодня!\n\nТвоя очередь — не отставай 💪`,
              {
                parse_mode: 'Markdown',
                reply_markup: process.env.WEBAPP_URL
                  ? { inline_keyboard: [[{ text: '🧠 Открыть MentalOS', web_app: { url: process.env.WEBAPP_URL } }]] }
                  : {},
              },
            );
          } catch (e) { /* юзер мог заблокировать бота */ }
        }

        // Отмечаем что уведомили (по ЛОКАЛЬНОЙ дате юзера)
        await pool.query(
          `INSERT INTO buddy_notified (user_id, date)
           SELECT $1, (CURRENT_DATE AT TIME zone COALESCE(u.timezone, 'UTC'))::date
           FROM users u WHERE u.id = $1
           ON CONFLICT DO NOTHING`,
          [f.id],
        );
      }
    } catch (err) {
      console.error('Buddy scheduler error:', err.message);
    }
  });

  // ===== Автозавершение зависших дуэлей (ежедневно в 21:00) =====
  cron.schedule('0 21 * * *', async () => {
    await autoCompleteDuels();
  });
}
