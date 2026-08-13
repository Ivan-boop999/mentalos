import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

const MISSION_TEMPLATES = [
  { code: 'checkin_3', title: '🔥 3 отметки', desc: 'Отметь 3 любые привычки сегодня', target: 3, reward: 15 },
  { code: 'perfect_morning', title: '🌅 Идеальное утро', desc: 'Выполни все утренние привычки', target: 1, reward: 25 },
  { code: 'mood', title: '😊 Отметь настроение', desc: 'Запиши настроение дня', target: 1, reward: 10 },
  { code: 'note', title: '📝 Заметка дня', desc: 'Добавь заметку к отметке', target: 1, reward: 10 },
  { code: 'checkin_5', title: '💪 5 отметок', desc: 'Отметь 5 привычек сегодня', target: 5, reward: 30 },
  { code: 'streak_day', title: '🔥 Не прерывай', desc: 'Сохрани все стрики сегодня', target: 1, reward: 20 },
];

/** GET /api/missions — миссия дня (генерируется раз в день) */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    // Проверяем есть ли миссия на сегодня
    const { rows: existing } = await pool.query(
      `SELECT id, code, title, description, target, progress, reward, completed FROM missions WHERE user_id = $1 AND mission_date = CURRENT_DATE`,
      [userId],
    );

    if (!existing.length) {
      // Генерируем 2 случайные миссии на день (детерминированно по дню года)
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
      const idx1 = dayOfYear % MISSION_TEMPLATES.length;
      const idx2 = (dayOfYear + 3) % MISSION_TEMPLATES.length;
      for (const tpl of [MISSION_TEMPLATES[idx1], MISSION_TEMPLATES[idx2]]) {
        await pool.query(
          `INSERT INTO missions (user_id, code, title, description, target, reward) VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, code, mission_date) DO NOTHING`,
          [userId, tpl.code, tpl.title, tpl.desc, tpl.target, tpl.reward],
        );
      }
      const { rows: fresh } = await pool.query(`SELECT id, code, title, description, target, progress, reward, completed FROM missions WHERE user_id = $1 AND mission_date = CURRENT_DATE`, [userId]);
      return res.json(fresh);
    }

    res.json(existing);
  } catch (err) {
    console.error('GET missions:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Внутренняя: прогресс миссий при отметке привычки / mood / note.
 */
export async function updateMissionsOnAction(userId, action) {
  // action: { type: 'checkin'|'mood'|'note', timeOfDay?: 'morning' }
  try {
    const { rows: missions } = await pool.query(
      `SELECT id, code, target, progress, completed, reward FROM missions WHERE user_id = $1 AND mission_date = CURRENT_DATE AND completed = FALSE`,
      [userId],
    );
    for (const m of missions) {
      let inc = 0;
      if (m.code === 'checkin_3' && action.type === 'checkin') inc = 1;
      if (m.code === 'checkin_5' && action.type === 'checkin') inc = 1;
      if (m.code === 'mood' && action.type === 'mood') inc = 1;
      if (m.code === 'note' && action.type === 'note') inc = 1;
      if (m.code === 'perfect_morning' && action.type === 'checkin' && action.timeOfDay === 'morning') inc = 1;
      if (m.code === 'streak_day' && action.type === 'checkin') inc = 1;

      if (inc > 0 && m.progress + inc <= m.target) {
        const newProgress = m.progress + inc;
        const completed = newProgress >= m.target;
        await pool.query(`UPDATE missions SET progress = $1, completed = $2 WHERE id = $3`, [newProgress, completed, m.id]);
        if (completed) {
          await pool.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2`, [m.reward, userId]);
          await pool.query(`INSERT INTO bonus_transactions (user_id, amount, reason) VALUES ($1, $2, 'mission')`, [userId, m.reward]);
        }
      }
    }
  } catch (e) { /* ignore */ }
}

export default router;
