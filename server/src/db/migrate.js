import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pool from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL не задан. Создай .env по образцу .env.example');
    process.exit(1);
  }

  const sql = readFileSync(join(__dirname, 'migrations.sql'), 'utf8');
  const client = await pool.connect();

  try {
    await client.query(sql);
    console.log('✅ Миграции применены. Схема MentalOS готова.');
  } catch (err) {
    console.error('❌ Ошибка миграции:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
