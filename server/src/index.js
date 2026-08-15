import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

import pool from './db/pool.js';
import { authMiddleware } from './middleware/auth.js';
import habitsRouter from './routes/habits.js';
import subtasksRouter from './routes/subtasks.js';
import statsRouter from './routes/stats.js';
import settingsRouter from './routes/settings.js';
import achievementsRouter from './routes/achievements.js';
import categoriesRouter from './routes/categories.js';
import referralRouter from './routes/referral.js';
import moodRouter from './routes/mood.js';
import journalRouter from './routes/journal.js';
import challengesRouter from './routes/challenges.js';
import leaderboardRouter from './routes/leaderboard.js';
import companionRouter from './routes/companion.js';
import petRouter from './routes/pet.js';
import buddiesRouter from './routes/buddies.js';
import missionsRouter from './routes/missions.js';
import duelsRouter from './routes/duels.js';
import recapRouter from './routes/recap.js';
import shareRouter from './routes/share.js';
import exportRouter from './routes/export.js';
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

// Self-ping эндпоинт — чтобы Render не усыплял Free-сервис
app.get('/keep-alive', (_req, res) => res.json({ ok: true, t: Date.now() }));

// ===== Публичные роуты (без авторизации — Telegram скачивает сам) =====
app.use('/api/share', shareRouter);

// ===== API (всё под защитой authMiddleware) =====
app.use('/api/habits', authMiddleware, habitsRouter);
app.use('/api/habits/:id/subtasks', authMiddleware, subtasksRouter);
app.use('/api/stats', authMiddleware, statsRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/achievements', authMiddleware, achievementsRouter);
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/referral', authMiddleware, referralRouter);
app.use('/api/mood', authMiddleware, moodRouter);
app.use('/api/journal', authMiddleware, journalRouter);
app.use('/api/challenges', authMiddleware, challengesRouter);
app.use('/api/leaderboard', authMiddleware, leaderboardRouter);
app.use('/api/companion', authMiddleware, companionRouter);
app.use('/api/pet', authMiddleware, petRouter);
app.use('/api/buddies', authMiddleware, buddiesRouter);
app.use('/api/missions', authMiddleware, missionsRouter);
app.use('/api/duels', authMiddleware, duelsRouter);
app.use('/api/recap', authMiddleware, recapRouter);
app.use('/api/export', authMiddleware, exportRouter);

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

  // ===== Keep-alive: пингуем себя каждые 5 минут, чтобы Free-сервис не уснул =====
  // Это критично для напоминаний — если сервер уснёт, cron-задачи не сработают.
  const ownUrl = process.env.RENDER_EXTERNAL_URL || process.env.WEBAPP_URL;
  if (ownUrl) {
    setInterval(async () => {
      try {
        await fetch(`${ownUrl}/keep-alive`);
      } catch {
        /* noop */
      }
    }, 5 * 60 * 1000);
    console.log('🫀 Keep-alive активен (пинг каждые 5 мин).');
  }

  console.log('');
});
