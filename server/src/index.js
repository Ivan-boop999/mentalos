import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

import { authMiddleware } from './middleware/auth.js';
import habitsRouter from './routes/habits.js';
import statsRouter from './routes/stats.js';
import settingsRouter from './routes/settings.js';
import { initBot } from './bot/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
app.listen(PORT, () => {
  console.log(`\n🚀 MentalOS сервер запущен на порту ${PORT}`);
  console.log(`   API:    http://localhost:${PORT}/api`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);

  // Бот стартует отдельно (polling) — не блокирует API
  initBot();
});
