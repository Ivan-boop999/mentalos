import TelegramBot from 'node-telegram-bot-api';
import { startScheduler } from './scheduler.js';

/**
 * Создаёт и настраивает Telegram-бота MentalOS.
 * Запускается только если задан BOT_TOKEN.
 */
export function initBot() {
  const token = process.env.BOT_TOKEN;
  const webappUrl = process.env.WEBAPP_URL;

  if (!token) {
    console.warn('⚠️  BOT_TOKEN не задан — бот не запущен. API всё равно работает.');
    return null;
  }

  // polling — простейший способ получать сообщения без вебхуков
  const bot = new TelegramBot(token, { polling: true });

  // ===== Команды =====

  bot.setMyCommands([
    { command: 'start', description: 'Запустить MentalOS 🚀' },
    { command: 'help', description: 'Как пользоваться' },
  ]);

  bot.onText(/^\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from?.first_name || 'друг';

    const keyboard = {
      reply_markup: {
        keyboard: [
          webappUrl
            ? [{ text: '🧠 Открыть MentalOS', web_app: { url: webappUrl } }]
            : [],
        ].filter((row) => row.length),
        resize_keyboard: true,
      },
    };

    const inline = webappUrl
      ? {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🧠 Открыть MentalOS', web_app: { url: webappUrl } }],
            ],
          },
        }
      : {};

    bot.sendMessage(
      chatId,
      `Привет, ${name}! 👋\n\nЯ MentalOS — твой трекер привычек.\n` +
        `Отмечай выполнение, веди серии 🔥 и следи за прогрессом.\n\n` +
        `Нажми кнопку ниже, чтобы открыть мини-апп.`,
      webappUrl ? inline : keyboard,
    );
  });

  bot.onText(/^\/help/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      '📖 *Как пользоваться MentalOS:*\n\n' +
        '1️⃣ Нажми «Открыть MentalOS»\n' +
        '2️⃣ Добавь привычки (зарядка, чтение, спорт...)\n' +
        '3️⃣ Каждый день отмечай выполнение\n' +
        '4️⃣ Следи за сериями 🔥 и статистикой\n\n' +
        'Я буду присылать напоминания в заданное время.',
      { parse_mode: 'Markdown' },
    );
  });

  bot.on('polling_error', (err) => {
    console.error('⚠️  Ошибка polling бота:', err.message);
  });

  console.log('🤖 Бот MentalOS запущен.');
  startScheduler(bot);
  return bot;
}
