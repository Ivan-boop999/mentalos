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
                  ? { reply_markup: { inline_keyboard: [[{ text: '🧠 Открыть MentalOS', web_app: { url: process.env.WEBAPP_URL } }]] } }
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

  // ===== ГОЛОС ПИТОМЦА — timezone-aware (каждые 5 минут проверяем ЛОКАЛЬНОЕ время юзера) =====
  const PET_SCHEDULES = {
    morning:  { localHour: 9,  localMinute: 0 },   // 9:00 локального времени
    evening:  { localHour: 20, localMinute: 0 },   // 20:00 локального
    comeback: { localHour: 14, localMinute: 0 },   // 14:00 локального
  };

  cron.schedule('*/5 * * * *', async () => {
    try {
      // Все пользователи с их таймзонами
      const { rows: users } = await pool.query(
        `SELECT id, first_name, username, companion_name, companion_type, companion_birthday, timezone,
                total_checkins,
                (SELECT COUNT(*) FROM habits h WHERE h.user_id = users.id AND h.archived = FALSE
                  AND NOT EXISTS (SELECT 1 FROM habit_logs l WHERE l.habit_id = h.id AND l.user_id = users.id
                    AND l.status = 'done' AND l.log_date = (CURRENT_DATE AT TIME zone COALESCE(timezone, 'UTC'))::date)
                ) AS remaining_today
         FROM users WHERE total_checkins > 0`,
      );

      for (const u of users) {
        const tz = u.timezone || 'UTC';
        const uid = Number(u.id);

        // Локальное время пользователя
        const localParts = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
        }).formatToParts(new Date());
        const get = (t) => localParts.find((p) => p.type === t)?.value || '';
        const lh = parseInt(get('hour'), 10);
        const lm = parseInt(get('minute'), 10);

        // Локальная дата для ДР-проверки
        const localDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date());

        // --- День рождения (приоритет, в ЛОКАЛЬНЫЙ день) ---
        if (u.companion_birthday && new Date(u.companion_birthday).toISOString().slice(0, 10) === localDate) {
          await sendPetNotification(bot, uid, 'birthday', u, `${petTypeEmoji(u.companion_type)} 🎂 *${u.companion_name}* празднует день рождения!\n\nОн(а) подготовил(а) тебе подарок: 🪙 +50 бонусов!`);
          await pool.query(`UPDATE users SET bonus_balance = bonus_balance + 50 WHERE id = $1`, [uid]);
          await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, 50, 'pet_birthday')`, [uid]);
        }

        // --- Утро ---
        if (lh === PET_SCHEDULES.morning.localHour && lm < 5) {
          await sendPetNotification(bot, uid, 'morning', u, `${petTypeEmoji(u.companion_type)} *${u.companion_name}* просыпается и потягивается!\n\n${randomOf([
            '«Доброе утро! Я видел сон про гору выполненных привычек ✨»',
            '«Утро — самое вкусное время для новых отметок!»',
            '«Я уже расчесал перышки. Пора за дело? 🌱»',
          ])}`);
        }

        // --- Вечер (только если есть невыполненные) ---
        if (lh === PET_SCHEDULES.evening.localHour && lm < 5 && Number(u.remaining_today) > 0) {
          const rem = Number(u.remaining_today);
          await sendPetNotification(bot, uid, 'evening', u, `${petTypeEmoji(u.companion_type)} *${u.companion_name}* зевает и смотрит на тебя\n\n${randomOf([
            `«Ещё ${rem} ${plural(rem, ['привычка', 'привычки', 'привычек'])} ждёт нас сегодня. Закроем день красиво?»`,
            '«Я постелил нам плащик для вечерних подвигов ✨»',
            '«Пара отметок до идеального дня. Но если что — завтра тоже хороший день 💜»',
          ])}`);
        }

        // --- Возвращение (>48ч неактивности) ---
        if (lh === PET_SCHEDULES.comeback.localHour && lm < 5) {
          const { rows: inactive } = await pool.query(
            `SELECT 1 FROM habit_logs WHERE user_id = $1 AND log_date >= (CURRENT_DATE - 2 AT TIME zone $2)::date LIMIT 1`,
            [uid, tz],
          ).catch(() => ({ rows: [] }));
          if (!inactive.length) {
            await sendPetNotification(bot, uid, 'comeback', u, `${petTypeEmoji(u.companion_type)} *${u.companion_name}* машет лапкой\n\n${randomOf([
              '«Я тебя не виню — просто скучаю. Зайди расскажешь, как дела? 💜»',
              '«Я все эти дни смотрел в окошко и ждал тебя 🌤️»',
              '«Перерывы — это нормально. Я никуда не денусь!»',
            ])}`);
          }
        }
      }
    } catch (err) {
      console.error('Pet voice scheduler error:', err.message);
    }
  });

  /** Отправка с дедупликацией по (user, date, kind) */
  async function sendPetNotification(bot, userId, kind, user, text) {
    try {
      const { rows: dup } = await pool.query(
        `SELECT 1 FROM pet_notified WHERE user_id = $1 AND date = CURRENT_DATE AND kind = $2`, [userId, kind],
      );
      if (dup.length) return;
      await bot.sendMessage(userId, text, {
        parse_mode: 'Markdown',
        reply_markup: process.env.WEBAPP_URL
          ? { reply_markup: { inline_keyboard: [[{ text: '🧠 Открыть MentalOS', web_app: { url: process.env.WEBAPP_URL } }]] } }
          : {},
      });
      await pool.query(`INSERT INTO pet_notified (user_id, date, kind) VALUES ($1, CURRENT_DATE, $2) ON CONFLICT DO NOTHING`, [userId, kind]);
    } catch (e) { /* юзер заблокировал бота */ }
  }

  // ===== Возврат питомцев из приключений (каждые 5 минут) =====
  cron.schedule('*/5 * * * *', async () => {
    try {
      const { rows: arrived } = await pool.query(
        `SELECT a.id, a.user_id, u.companion_name, u.companion_type
         FROM adventures a JOIN users u ON u.id = a.user_id
         WHERE a.status = 'active' AND a.returns_at <= NOW()`,
      );
      for (const a of arrived) {
        await pool.query(`UPDATE adventures SET status = 'completed' WHERE id = $1`, [a.id]);
        const emoji = { spark: '✨', leaf: '🌿', drop: '💧', flame: '🔥' }[a.companion_type] || '✨';
        try {
          await bot.sendMessage(a.user_id,
            `${emoji} *${a.companion_name}* вернулся из приключения и что-то принёс!\n\nЗагляни забрать находку 🎁`,
            {
              parse_mode: 'Markdown',
              reply_markup: process.env.WEBAPP_URL
                ? { reply_markup: { inline_keyboard: [[{ text: '🎁 Забрать находку', web_app: { url: process.env.WEBAPP_URL } }]] } }
                : {},
            },
          );
        } catch (e) { /* юзер заблокировал бота */ }
      }
    } catch (err) {
      console.error('adventure return cron:', err.message);
    }
  });

  // ===== Визиты питомцев бадди (12:10 UTC, шанс 25%, не чаще раза в 3 дня на пару) =====
  cron.schedule('10 12 * * *', async () => {
    try {
      const { rows: pairs } = await pool.query(
        `SELECT b.user_id AS a, b.buddy_id AS b,
                ua.companion_name AS name_a, ub.companion_name AS name_b
         FROM buddies b
         JOIN users ua ON ua.id = b.user_id
         JOIN users ub ON ub.id = b.buddy_id
         WHERE b.status = 'accepted' AND b.user_id < b.buddy_id`,
      );
      for (const p of pairs) {
        if (Math.random() > 0.25) continue;
        const kind = `visit:${p.a}:${p.b}`;
        const { rows: dup } = await pool.query(
          `SELECT 1 FROM pet_notified WHERE user_id = $1 AND kind = $2 AND date > CURRENT_DATE - 3`, [Number(p.a), kind],
        );
        if (dup.length) continue;
        // Обоим +5 бонусов
        for (const uid of [Number(p.a), Number(p.b)]) {
          await pool.query(`UPDATE users SET bonus_balance = bonus_balance + 5 WHERE id = $1`, [uid]);
          await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, 5, 'pet_visit')`, [uid]);
          await pool.query(`INSERT INTO pet_notified (user_id, date, kind) VALUES ($1, CURRENT_DATE, $2) ON CONFLICT DO NOTHING`, [uid, kind]);
        }
        try {
          await bot.sendMessage(Number(p.b), `🐾 *${p.name_a}* (питомец твоего бадди) заглянул(а) в гости к *${p.name_b}*!\nОбоим — 🪙 +5 бонусов за тёплую встречу!`, { parse_mode: 'Markdown' });
          await bot.sendMessage(Number(p.a), `🐾 *${p.name_b}* принимал(а) гостей: к нему/к ней зашёл(ла) *${p.name_a}*!\nОбоим — 🪙 +5 бонусов 🎉`, { parse_mode: 'Markdown' });
        } catch (e) {}
      }
    } catch (err) {
      console.error('pet visits cron:', err.message);
    }
  });

  // ===== Автозавершение зависших дуэлей (ежедневно в 21:00) =====
  cron.schedule('0 21 * * *', async () => {
    await autoCompleteDuels();
  });
}

/** Рассылка «голоса питомца» с дедупликацией по (user, date, kind) */
// petBroadcast удалена — заменена на timezone-aware sendPetNotification внутри scheduler.js

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
