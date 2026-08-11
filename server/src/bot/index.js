import TelegramBot from 'node-telegram-bot-api';
import { startScheduler } from './scheduler.js';

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

  bot.on('polling_error', (err) => console.error('⚠️  polling:', err.message));

  console.log('🤖 Бот MentalOS запущен.');
  startScheduler(bot);
  return bot;
}
