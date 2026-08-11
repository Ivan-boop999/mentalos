import cron from 'node-cron';
import pool from '../db/pool.js';

/**
 * Планировщик напоминаний.
 *
 * Каждую минуту проверяет все привычки с reminder_time и отправляет тем пользователям,
 * у кого сейчас в их МЕСТНОМ времени совпадает час:минута.
 * Часовой пояс берётся из users.timezone (IANA, по умолчанию UTC).
 *
 * Мы не запускаем кучу cron-задач под каждый timezone — вместо этого раз в минуту
 * одним запросом выбираем все «подходящие» привычки с учётом смещения.
 */
export function startScheduler(bot) {
  if (!process.env.WEBAPP_URL) {
    console.warn('⚠️  WEBAPP_URL не задан — напоминания будут без кнопки открытия.');
  }

  cron.schedule('* * * * *', async () => {
    try {
      // Текущее UTC-время
      const now = new Date();
      const utcHH = String(now.getUTCHours()).padStart(2, '0');
      const utcMM = String(now.getUTCMinutes()).padStart(2, '0');

      // Один запрос: для каждой привычки считаем локальное время пользователя
      // через at time zone и сравниваем с reminder_time.
      // Это покрывает произвольные часовые пояса без зависимости от БД-функций.
      const { rows } = await pool.query(
        `SELECT h.id, h.user_id, h.title, h.emoji, h.frequency,
                u.timezone,
                to_char(
                  (NOW() AT TIME ZONE 'UTC' AT TIME ZONE u.timezone)::time,
                  'HH24:MI'
                ) AS local_time,
                to_char(h.reminder_time, 'HH24:MI') AS reminder,
                to_char((NOW() AT TIME ZONE 'UTC' AT TIME ZONE u.timezone)::date, 'ID'::text) AS local_dow_raw
         FROM habits h
         JOIN users u ON u.id = h.user_id
         WHERE h.archived = FALSE
           AND h.reminder_time IS NOT NULL`,
      );

      for (const h of rows) {
        // Сравниваем локальное время пользователя с reminder_time (HH:MM)
        if (h.local_time !== h.reminder) continue;

        // Проверяем день недели по частоте
        const freq = typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency;
        if (freq?.type === 'weekly' && Array.isArray(freq.days)) {
          // локальный день недели (0=вс ... 6=сб)
          const localDow = new Date(
            now.toLocaleString('en-US', { timeZone: h.timezone || 'UTC' }),
          ).getDay();
          if (!freq.days.includes(localDow)) continue;
        }

        // Не дублируем, если пользователь уже отметил сегодня (по его локальной дате)
        const localToday = new Date(
          now.toLocaleString('en-US', { timeZone: h.timezone || 'UTC' }),
        )
          .toISOString()
          .slice(0, 10);

        const { rows: done } = await pool.query(
          `SELECT 1 FROM habit_logs WHERE habit_id = $1 AND user_id = $2 AND log_date = $3 LIMIT 1`,
          [h.id, h.user_id, localToday],
        );
        if (done.length) continue;

        const text = `${h.emoji} *${h.title}*\nНе забудь отметить выполнение в MentalOS! 🔥`;
        const replyMarkup = process.env.WEBAPP_URL
          ? {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🧠 Открыть MentalOS', web_app: { url: process.env.WEBAPP_URL } }],
                ],
              },
            }
          : {};

        try {
          await bot.sendMessage(h.user_id, text, {
            parse_mode: 'Markdown',
            ...replyMarkup,
          });
        } catch (err) {
          console.warn(`Не удалось отправить напоминание user ${h.user_id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('Ошибка планировщика:', err.message);
    }
  });

  console.log('⏰ Планировщик напоминаний запущен (с поддержкой часовых поясов).');
}
