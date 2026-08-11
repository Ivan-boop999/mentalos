import pg from 'pg';

const { Pool } = pg;

// Пул соединений читает DATABASE_URL из .env (или переменных Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // На Render и других облачных провайдерах обычно нужно SSL
  ssl:
    process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: false },
  max: 10, // максимальное число одновременных соединений
});

pool.on('error', (err) => {
  console.error('❌ Неожиданная ошибка пула БД:', err);
});

export default pool;
