import cron from 'node-cron';
import pool from '../db/pool.js';
import { decayCompanionMood } from '../routes/companion.js';
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
      const { rows: finishers } = await pool.query(
        `SELECT u.id, u.first_name, u.username
         FROM users u
         WHERE EXISTS (
           SELECT 1 FROM habits h
           WHERE h.user_id = u.id AND h.archived = FALSE
           AND NOT EXISTS (
             SELECT 1 FROM habit_logs l
             WHERE l.habit_id = h.id AND l.user_id = u.id AND l.log_date = CURRENT_DATE AND l.status = 'done'
           )
         ) = FALSE
         AND EXISTS (SELECT 1 FROM habits WHERE user_id = u.id AND archived = FALSE)
         AND NOT EXISTS (
           SELECT 1 FROM buddy_notified bn WHERE bn.user_id = u.id AND bn.date = CURRENT_DATE
         )`,
      );

      for (const f of finishers) {
        // Находим их бадди, которые ЕЩЁ не выполнили всё
        const { rows: buddies } = await pool.query(
          `SELECT b.buddy_id FROM buddies b
           WHERE b.user_id = $1 AND b.status = 'accepted'
           AND EXISTS (
             SELECT 1 FROM habits h
             WHERE h.user_id = b.buddy_id AND h.archived = FALSE
             AND NOT EXISTS (
               SELECT 1 FROM habit_logs l WHERE l.habit_id = h.id AND l.user_id = b.buddy_id AND l.log_date = CURRENT_DATE AND l.status = 'done'
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
                  ? { reply_markup: { inline_keyboard: [[{ text: '🧠 Открыть MentalOS', web_app: { url: process.env.WEBAPP_URL } }]] } }
                  : {},
              },
            );
          } catch (e) { /* юзер мог заблокировать бота */ }
        }

        // Отмечаем что уведомили
        await pool.query(
          `INSERT INTO buddy_notified (user_id, date) VALUES ($1, CURRENT_DATE) ON CONFLICT DO NOTHING`,
          [f.id],
        );
      }
    } catch (err) {
      console.error('Buddy scheduler error:', err.message);
    }
  });

  // ===== Companion mood decay: раз в час настроение дрейфует к реальному прогрессу =====
  cron.schedule('15 * * * *', async () => {
    try {
      // ФИКС-A8: ORDER BY — самые «проголодавшиеся» первыми (нет голодания при >500 юзеров)
      const { rows: users } = await pool.query(
        `SELECT id FROM users WHERE last_mood_decay IS NULL OR last_mood_decay < NOW() - INTERVAL '20 hours'
         ORDER BY last_mood_decay ASC NULLS FIRST LIMIT 500`,
      );
      for (const u of users) {
        await decayCompanionMood(u.id);
        await pool.query(`UPDATE users SET last_mood_decay = NOW() WHERE id = $1`, [u.id]);
      }
    } catch (err) {
      console.error('Mood decay scheduler error:', err.message);
    }
  });

  // ===== ГОЛОС ПИТОМЦА (Finch-паттерн: тёплые сообщения от имени питомца, zero-guilt) =====

  // Утро (9:05): питомец проснулся у тех, кто был активен за последние 3 дня
  cron.schedule('5 9 * * *', async () => {
    await petBroadcast(bot, 'morning', async () => {
      const { rows } = await pool.query(
        `SELECT u.id, u.first_name, u.companion_name, u.companion_type
         FROM users u
         WHERE EXISTS (SELECT 1 FROM habit_logs l WHERE l.user_id = u.id AND l.log_date >= CURRENT_DATE - 3)`,
      );
      return rows;
    }, (u) => ({
      text: `${petTypeEmoji(u.companion_type)} *${u.companion_name}* просыпается и потягивается!\n\n${randomOf([
        '«Доброе утро! Я видел сон про гору выполненных привычек ✨»',
        '«Утро — самое вкусное время для новых отметок!»',
        '«Я уже расчесал перышки. Пора за дело? 🌱»',
        '«Сегодня пахнет отличным днём. Чувствуешь?»',
      ])}`,
    }));
  });

  // Вечер (20:05): мягкое напоминание тем, у кого есть невыполненные на сегодня
  cron.schedule('5 20 * * *', async () => {
    await petBroadcast(bot, 'evening', async () => {
      const { rows } = await pool.query(
        `SELECT u.id, u.first_name, u.companion_name, u.companion_type,
                (SELECT COUNT(*) FROM habits h WHERE h.user_id = u.id AND h.archived = FALSE
                  AND NOT EXISTS (SELECT 1 FROM habit_logs l WHERE l.habit_id = h.id AND l.user_id = u.id AND l.log_date = CURRENT_DATE AND l.status = 'done')) AS remaining
         FROM users u
         WHERE EXISTS (SELECT 1 FROM habit_logs l WHERE l.user_id = u.id AND l.log_date >= CURRENT_DATE - 3)`,
      );
      return rows.filter((r) => Number(r.remaining) > 0);
    }, (u) => ({
      text: `${petTypeEmoji(u.companion_type)} *${u.companion_name}* зевает и смотрит на тебя\n\n${randomOf([
        `«Ещё ${u.remaining} ${plural(Number(u.remaining), ['привычка', 'привычки', 'привычек'])} ждёт нас сегодня. Закроем день красиво?»`,
        '«Я постелил нам плащик для вечерних подвигов ✨»',
        '«Пара отметок до идеального дня. Но если что — завтра тоже хороший день 💜»',
      ])}`,
    }));
  });

  // Возвращение (14:05): питомец скучает, если юзера не было >48ч (без вины, с радостью)
  cron.schedule('5 14 * * *', async () => {
    await petBroadcast(bot, 'comeback', async () => {
      const { rows } = await pool.query(
        `SELECT u.id, u.first_name, u.companion_name, u.companion_type
         FROM users u
         WHERE u.total_checkins > 0
           AND NOT EXISTS (SELECT 1 FROM habit_logs l WHERE l.user_id = u.id AND l.log_date >= CURRENT_DATE - 2)`,
      );
      return rows;
    }, (u) => ({
      text: `${petTypeEmoji(u.companion_type)} *${u.companion_name}* машет лапкой\n\n${randomOf([
        '«Я тебя не виню — просто скучаю. Зайди расскажешь, как дела? 💜»',
        '«Я все эти дни смотрел в окошко и ждал тебя 🌤️»',
        '«Перерывы — это нормально. Я никуда не денусь!»',
      ])}`,
    }));
  });

  // ===== Автозавершение зависших дуэлей (ежедневно в 21:00) =====
  cron.schedule('0 21 * * *', async () => {
    await autoCompleteDuels();
  });
}

/** Рассылка «голоса питомца» с дедупликацией по (user, date, kind) */
async function petBroadcast(bot, kind, fetchUsers, buildMsg) {
  try {
    const users = await fetchUsers();
    for (const u of users) {
      const uid = Number(u.id);
      const { rows: dup } = await pool.query(
        `SELECT 1 FROM pet_notified WHERE user_id = $1 AND date = CURRENT_DATE AND kind = $2`, [uid, kind],
      );
      if (dup.length) continue;
      try {
        const { text } = buildMsg(u);
        await bot.sendMessage(uid, `${text}${u.first_name ? `\n\n_(для ${u.first_name})_` : ''}`, {
          parse_mode: 'Markdown',
          reply_markup: process.env.WEBAPP_URL
            ? { reply_markup: { inline_keyboard: [[{ text: '🧠 Открыть MentalOS', web_app: { url: process.env.WEBAPP_URL } }]] } }
            : {},
        });
      } catch (e) { /* юзер заблокировал бота — пропускаем */ }
      await pool.query(`INSERT INTO pet_notified (user_id, date, kind) VALUES ($1, CURRENT_DATE, $2) ON CONFLICT DO NOTHING`, [uid, kind]);
    }
  } catch (err) {
    console.error(`petBroadcast(${kind}):`, err.message);
  }
}

function petTypeEmoji(t) {
  return { spark: '✨', leaf: '🌿', drop: '💧', flame: '🔥' }[t] || '✨';
}
function randomOf(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function plural(n, forms) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}
