import TelegramBot from 'node-telegram-bot-api';
import { startScheduler } from './scheduler.js';
import pool from '../db/pool.js';

// Хранилище ID сообщений прогресса (для editMessageText)
const progressMessages = new Map();

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

  const bar = '░'.repeat(Math.round(pct / 10)) + '▓'.repeat(10 - Math.round(pct / 10));
  let text = `*Прогресс дня*\n\n${bar.split('').reverse().join('')}  ${pct}%\n\n✅ Выполнено: *${done}/${total}*\n\n`;
  for (const h of habits) {
    text += `${doneSet.has(h.id) ? '✅' : '⬜️'} ${h.emoji} ${h.title}\n`;
  }
  if (total === 0) text = 'Пока нет привычек. Добавь их в MentalOS! 🌱';
  if (total > 0 && done === total) text += `\n🎉 *Идеальный день! Все выполнено!*`;
  return { text, done, total };
}

export function initBot() {
  const token = process.env.BOT_TOKEN;
  const webappUrl = process.env.WEBAPP_URL;

  if (!token) {
    console.warn('⚠️  BOT_TOKEN не задан — бот не запущен.');
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.setMyCommands([
    { command: 'start', description: 'Запустить MentalOS 🚀' },
    { command: 'progress', description: 'Прогресс дня 📊' },
    { command: 'invite', description: 'Пригласить друга и получить бонусы 🎁' },
    { command: 'help', description: 'Как пользоваться' },
  ]);

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

  // Кнопка «Обновить» — editMessageText
  bot.on('callback_query', async (q) => {
    if (q.data !== 'refresh_progress') return;
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
      bot.answerCallbackQuery(q.id, { text: 'Обновлено ✓' });
    } catch (e) {
      bot.answerCallbackQuery(q.id, { text: 'Уже актуально' });
    }
  });

  bot.on('polling_error', (err) => console.error('⚠️  polling:', err.message));

  console.log('🤖 Бот MentalOS запущен.');
  startScheduler(bot);
  return bot;
}
