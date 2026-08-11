import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

import pool from './db/pool.js';
import { authMiddleware } from './middleware/auth.js';
import habitsRouter from './routes/habits.js';
import statsRouter from './routes/stats.js';
import settingsRouter from './routes/settings.js';
import achievementsRouter from './routes/achievements.js';
import { initBot } from './bot/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Применяет миграции автоматически при старте сервера.
 * Так бесплатный тариф на Render работает без Shell (который платный).
 */
async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL не задан — миграции пропущены.');
    return;
  }
  try {
    const sql = readFileSync(join(__dirname, 'db/migrations.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ Миграции применены. Схема MentalOS готова.');
  } catch (err) {
    console.error('❌ Ошибка миграции при старте:', err.message);
    // Не падаем — таблицы могут уже существовать (CREATE TABLE IF NOT EXISTS)
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// ===== Глобальные middleware =====
app.use(cors());
app.use(express.json());

// Проверка здоровья (нужна Render)
app.get('/health', (_req, res) => res.json({ ok: true, name: 'MentalOS' }));

// ===== API (всё под защитой authMiddleware) =====
app.use('/api/habits', authMiddleware, habitsRouter);
app.use('/api/stats', authMiddleware, statsRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/achievements', authMiddleware, achievementsRouter);

// Экспорт-эндпоинт для шеринга в сторис (генерит PNG статистики)
// Подключим ниже в файле

// ===== Отдаём собранный фронтенд (статика) =====
// Папка client/dist появляется после `npm run build` во фронтенде.
const clientDist = join(__dirname, '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA-фолбэк: любые не-API маршруты отдают index.html
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
  console.log(`📦 Отдаём фронтенд из ${clientDist}`);
}

// ===== Запуск =====
app.listen(PORT, async () => {
  console.log(`\n🚀 MentalOS сервер запущен на порту ${PORT}`);
  console.log(`   API:    http://localhost:${PORT}/api`);
  console.log(`   Health: http://localhost:${PORT}/health`);

  // Применяем миграции автоматически при старте
  await runMigrations();

  // Бот стартует отдельно (polling) — не блокирует API
  initBot();

  console.log('');
});
