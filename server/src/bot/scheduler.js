import cron from 'node-cron';
import pool from '../db/pool.js';

/**
 * Планировщик напоминаний.
 * Каждую минуту проверяет, кому из пользователей пора отправить напоминание,
 * и шлёт сообщение с кнопкой открытия мини-аппа.
 *
 * Часовой пояс: UTC (на Render сервера в UTC). Время напоминаний хранится как TIME,
 * сравнивается с текущим UTC-временем. Пользователь при настройке видит подсказку.
 */
export function startScheduler(bot) {
  if (!process.env.WEBAPP_URL) {
    console.warn('⚠️  WEBAPP_URL не задан — напоминания будут без кнопки открытия.');
  }

  // Каждую минуту: 0-59
  cron.schedule('* * * * *', async () => {
    try {
      // Текущее UTC-время HH:MM
      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2, '0');
      const mm = String(now.getUTCMinutes()).padStart(2, '0');
      const currentTime = `${hh}:${mm}:00`;
      const dayOfWeek = now.getUTCDay(); // 0=вс ... 6=сб

      // Все привычки с напоминанием на это время, где день подходит по частоте
      const { rows } = await pool.query(
        `SELECT h.id, h.user_id, h.title, h.emoji, h.frequency, u.username
         FROM habits h
         JOIN users u ON u.id = h.user_id
         WHERE h.archived = FALSE
           AND h.reminder_time = $1`,
        [currentTime],
      );

      for (const h of rows) {
        const freq = typeof h.frequency === 'string' ? JSON.parse(h.frequency) : h.frequency;
        if (freq?.type === 'weekly' && Array.isArray(freq.days) && !freq.days.includes(dayOfWeek)) {
          continue; // не сегодня по графику
        }

        // Не дублируем, если пользователь уже отметил сегодня
        const todayIso = now.toISOString().slice(0, 10);
        const { rows: done } = await pool.query(
          `SELECT 1 FROM habit_logs WHERE habit_id = $1 AND log_date = $2 LIMIT 1`,
          [h.id, todayIso],
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
          // Пользователь мог заблокировать бота — логируем и идём дальше
          console.warn(`Не удалось отправить напоминание user ${h.user_id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('Ошибка планировщика:', err.message);
    }
  });

  console.log('⏰ Планировщик напоминаний запущен.');
}
