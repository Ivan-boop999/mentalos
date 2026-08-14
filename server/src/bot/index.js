import TelegramBot from 'node-telegram-bot-api';
import { startScheduler } from './scheduler.js';
import pool from '../db/pool.js';

// Хранилище ID сообщений прогресса (для editMessageText)
const progressMessages = new Map();

// Синглтон бота — доступен роутам для уведомлений (бадди/дуэли)
let botInstance = null;
export function getBot() {
  return botInstance;
}

/** Строит текст прогресса дня для /progress */
async function buildProgressText(userId) {
  const { rows: habits } = await pool.query(
    `SELECT id, title, emoji, frequency FROM habits WHERE user_id = $1 AND archived = FALSE`, [userId],
  );
  const todayIso = new Date().toISOString().slice(0, 10);
  const { rows: logs } = await pool.query(
    `SELECT habit_id FROM habit_logs WHERE user_id = $1 AND log_date = $2 AND status = 'done'`, [userId, todayIso],
  );
  const doneSet = new Set(logs.map((l) => l.habit_id));
  const done = habits.filter((h) => doneSet.has(h.id)).length;
  const total = habits.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const filled = Math.round(pct / 10);
  const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);
  let text = `*Прогресс дня*\n\n${bar}  ${pct}%\n\n✅ Выполнено: *${done}/${total}*\n\n`;
  for (const h of habits) {
    text += `${doneSet.has(h.id) ? '✅' : '⬜️'} ${h.emoji} ${h.title}\n`;
  }
  if (total === 0) text = 'Пока нет привычек. Добавь их в MentalOS! 🌱';
  if (total > 0 && done === total) text += `\n🎉 *Идеальный день! Все выполнено!*`;
  return { text, done, total };
}

/** Строит текст недельного отчёта для /recap */
async function buildRecapText(userId) {
  const { rows: logs } = await pool.query(
    `SELECT log_date::text AS date, COUNT(*) AS done
     FROM habit_logs WHERE user_id = $1 AND status = 'done' AND log_date >= CURRENT_DATE - INTERVAL '7 days'
     GROUP BY log_date ORDER BY log_date`, [userId],
  );
  const totalCheckins = logs.reduce((s, l) => s + Number(l.done), 0);
  const activeDays = logs.length;
  const { rows: habits } = await pool.query(`SELECT COALESCE(MAX(best_streak), 0) AS s FROM habits WHERE user_id = $1 AND archived = FALSE`, [userId]);

  let text = `📊 *Отчёт за неделю*\n\n`;
  text += `✅ Отметок: *${totalCheckins}*\n`;
  text += `📅 Активных дней: *${activeDays}/7*\n`;
  text += `🔥 Лучший стрик: *${habits[0]?.s || 0}*\n\n`;
  if (totalCheckins > 0) {
    text += `💪 Отличная неделя! Продолжай в том же духе.`;
  } else {
    text += `🌱 Новая неделя — новый шанс начать!`;
  }
  return text;
}

export function initBot() {
  const token = process.env.BOT_TOKEN;
  const webappUrl = process.env.WEBAPP_URL;

  if (!token) {
    console.warn('⚠️  BOT_TOKEN не задан — бот не запущен.');
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });
  botInstance = bot;

  bot.setMyCommands([
    { command: 'start', description: 'Запустить MentalOS 🚀' },
    { command: 'progress', description: 'Прогресс дня 📊' },
    { command: 'recap', description: 'Отчёт за неделю 📈' },
    { command: 'invite', description: 'Пригласить друга и получить бонусы 🎁' },
    { command: 'help', description: 'Как пользоваться' },
  ]);

  // Reply-keyboard: кнопка быстрого доступа к MentalOS прямо в поле ввода
  if (webappUrl) {
    try {
      bot.setMyCommands(
        [{ command: 'progress', description: 'Прогресс дня 📊' }],
        { scope: { type: 'chat', chat_id: 0 } },
      );
    } catch {}
  }

  // ===== INLINE MODE: @mentalos_bot прогресс — в любом чате =====
  bot.on('inline_query', async (q) => {
    const userId = q.from.id;
    try {
      const text = await buildProgressText(userId);
      const result = [{
        id: '0',
        type: 'article',
        title: `🧠 MentalOS — ${text.done}/${text.total} сегодня`,
        description: 'Твой прогресс дня',
        input_message_content: { message_text: text.text, parse_mode: 'Markdown' },
        reply_markup: webappUrl ? { inline_keyboard: [[{ text: '🧠 Открыть MentalOS', web_app: { url: webappUrl } }]] } : undefined,
      }];
      bot.answerInlineQuery(q.id, result, { cache_time: 30 });
    } catch {
      bot.answerInlineQuery(q.id, []);
    }
  });

  // /start [referralCode]
  bot.onText(/^\/start(?:\s+(\S+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || 'друг';
    const ref = match?.[1];

    // Передаём referral в WebApp через start_param (если в URL есть ?startapp=)
    const webappUrlWithRef = ref && webappUrl ? `${webappUrl}?startapp=${ref}` : webappUrl;

    const inline = webappUrl
      ? { reply_markup: { inline_keyboard: [[{ text: '🧠 Открыть MentalOS', web_app: { url: webappUrlWithRef } }]] } }
      : {};

    let text = `Привет, ${name}! 👋\n\nЯ *MentalOS* — твой трекер привычек.\n\n` +
      `✨ Отмечай выполнение\n🔥 Веди серии и открывай достижения\n📊 Следи за прогрессом\n🎁 Приглашай друзей и получай бонусы\n\n` +
      `Нажми кнопку ниже, чтобы открыть мини-апп.`;

    if (ref) {
      text += `\n\n👋 Тебя пригласил друг — тебя ждёт бонус +50 после первого входа!`;
    }

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...inline });
  });

  bot.onText(/^\/invite/, (msg) => {
    const code = `MOS${msg.from.id}`;
    const shareUrl = `https://t.me/${process.env.BOT_USERNAME || 'mentalos_bot'}?start=${code}`;
    bot.sendMessage(
      msg.chat.id,
      `🎁 *Приглашай друзей и получай бонусы!*\n\n` +
        `За каждого друга: +100 бонусов тебе и +50 другу.\n` +
        `Бонусы можно тратить в магазине на темы, бейджи и premium-статус.\n\n` +
        `Твоя ссылка:\n${shareUrl}`,
      { parse_mode: 'Markdown' },
    );
  });

  bot.onText(/^\/help/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      '📖 *MentalOS — как пользоваться:*\n\n' +
        '1️⃣ «Открыть MentalOS» → мини-апп\n' +
        '2️⃣ Добавь привычки (+ внизу)\n' +
        '3️⃣ Каждый день отмечай выполнение\n' +
        '4️⃣ Смотри серии 🔥 и статистику\n' +
        '5️⃣ Приглашай друзей в «Наградах»\n' +
        '6️⃣ Трать бонусы в магазине тем',
      { parse_mode: 'Markdown' },
    );
  });

  // /progress — обновляемое сообщение с прогрессом дня (dynamic island)
  bot.onText(/^\/progress/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    try {
      const text = await buildProgressText(userId);
      const sent = await bot.sendMessage(chatId, text.text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            webappUrl ? [{ text: `🧠 Открыть MentalOS (${text.done}/${text.total})`, web_app: { url: webappUrl } }] : [],
            [{ text: '🔄 Обновить', callback_data: 'refresh_progress' }],
          ].filter((r) => r.length),
        },
      });
      progressMessages.set(userId, { chatId, messageId: sent.message_id });
    } catch (e) {
      bot.sendMessage(chatId, 'Не удалось загрузить прогресс. Попробуй позже.');
    }
  });

  // ===== Единый обработчик inline-кнопок =====
  bot.on('callback_query', async (q) => {
    // -- Обновить прогресс --
    if (q.data === 'refresh_progress') {
      const userId = q.from.id;
      const meta = progressMessages.get(userId);
      if (!meta) return bot.answerCallbackQuery(q.id);
      try {
        const text = await buildProgressText(userId);
        await bot.editMessageText(text.text, {
          chat_id: meta.chatId,
          message_id: meta.messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              webappUrl ? [{ text: `🧠 Открыть MentalOS (${text.done}/${text.total})`, web_app: { url: webappUrl } }] : [],
              [{ text: '🔄 Обновить', callback_data: 'refresh_progress' }],
            ].filter((r) => r.length),
          },
        });
        return bot.answerCallbackQuery(q.id, { text: 'Обновлено ✓' });
      } catch (e) {
        return bot.answerCallbackQuery(q.id, { text: 'Уже актуально' });
      }
    }

    // -- Бадди: согласие через кнопки --
    if (q.data?.startsWith('buddy_')) {
      const [, action, rowIdStr] = q.data.split('_');
      const rowId = Number(rowIdStr);
      const userId = q.from.id;
      try {
        const { rows } = await pool.query(
          `SELECT user_id FROM buddies WHERE id = $1 AND buddy_id = $2 AND status = 'pending'`,
          [rowId, userId],
        );
        if (!rows.length) return bot.answerCallbackQuery(q.id, { text: 'Заявка уже неактуальна' });
        const inviterId = rows[0].user_id;

        if (action === 'accept') {
          await pool.query(`UPDATE buddies SET status = 'accepted' WHERE id = $1`, [rowId]);
          await pool.query(
            `INSERT INTO buddies (user_id, buddy_id, status) VALUES ($1, $2, 'accepted')
             ON CONFLICT (user_id, buddy_id) DO UPDATE SET status = 'accepted'`,
            [userId, inviterId],
          );
          bot.answerCallbackQuery(q.id, { text: '✅ Вы теперь бадди!' });
          bot.editMessageText(`🤝 *${q.from.first_name || 'Друг'}* принял заявку — вы теперь бадди!`, {
            chat_id: q.message.chat.id, message_id: q.message.message_id, parse_mode: 'Markdown',
          }).catch(() => {});
          bot.sendMessage(inviterId, `🤝 *${q.from.first_name || 'Друг'}* принял твою заявку в бадди! Теперь вы видите прогресс друг друга.`, { parse_mode: 'Markdown' }).catch(() => {});
        } else if (action === 'decline') {
          await pool.query(`DELETE FROM buddies WHERE id = $1`, [rowId]);
          bot.answerCallbackQuery(q.id, { text: 'Заявка отклонена' });
          bot.editMessageText('Заявка отклонена.', { chat_id: q.message.chat.id, message_id: q.message.message_id }).catch(() => {});
        }
      } catch (e) {
        bot.answerCallbackQuery(q.id, { text: 'Ошибка' });
      }
      return;
    }

    // -- Дуэли: согласие через кнопки --
    if (q.data?.startsWith('duel_')) {
      const [, action, duelIdStr] = q.data.split('_');
      const duelId = Number(duelIdStr);
      const userId = q.from.id;
      try {
        const { rows } = await pool.query(
          `SELECT * FROM duels WHERE id = $1 AND opponent_id = $2 AND status = 'pending'`,
          [duelId, userId],
        );
        if (!rows.length) return bot.answerCallbackQuery(q.id, { text: 'Дуэль уже неактуальна' });
        const duel = rows[0];

        if (action === 'accept') {
          await pool.query(`UPDATE duels SET status = 'active' WHERE id = $1`, [duelId]);
          bot.answerCallbackQuery(q.id, { text: '⚔️ Дуэль началась!' });
          bot.editMessageText(`⚔️ Дуэль принята! Победит тот, у кого серия длиннее.\nСтавка: *${duel.wager}* 🪙\nЗаверши дуэль в MentalOS, когда будешь уверен (Ещё → Битвы).`, {
            chat_id: q.message.chat.id, message_id: q.message.message_id, parse_mode: 'Markdown',
          }).catch(() => {});
          bot.sendMessage(duel.challenger_id, `⚔️ Твою дуэль приняли! Ставка: *${duel.wager}* 🪙. Кто дольше продержит серию — забирает банк.`, { parse_mode: 'Markdown' }).catch(() => {});
        } else if (action === 'decline') {
          await pool.query(`UPDATE duels SET status = 'declined', finished_at = NOW() WHERE id = $1`, [duelId]);
          await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2`, [duel.wager, duel.challenger_id]);
          await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'duel_refund')`, [duel.challenger_id, duel.wager]);
          bot.answerCallbackQuery(q.id, { text: 'Дуэль отклонена' });
          bot.editMessageText('Дуэль отклонена. Ставка возвращена.', { chat_id: q.message.chat.id, message_id: q.message.message_id }).catch(() => {});
          bot.sendMessage(duel.challenger_id, `🤝 Дуэль отклонена — ставка *${duel.wager}* 🪙 возвращена.`, { parse_mode: 'Markdown' }).catch(() => {});
        }
      } catch (e) {
        bot.answerCallbackQuery(q.id, { text: 'Ошибка' });
      }
      return;
    }

    return bot.answerCallbackQuery(q.id);
  });

  // /recap — недельный отчёт
  bot.onText(/^\/recap/, async (msg) => {
    const userId = msg.from.id;
    try {
      const r = await buildRecapText(userId);
      bot.sendMessage(msg.chat.id, r, {
        parse_mode: 'Markdown',
        reply_markup: webappUrl ? { inline_keyboard: [[{ text: '🧠 Открыть MentalOS', web_app: { url: webappUrl } }]] } : {},
      });
    } catch {
      bot.sendMessage(msg.chat.id, 'Не удалось построить отчёт.');
    }
  });

  bot.on('polling_error', (err) => console.error('⚠️  polling:', err.message));

  console.log('🤖 Бот MentalOS запущен.');
  startScheduler(bot);
  return bot;
}
