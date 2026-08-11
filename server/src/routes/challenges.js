import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/** GET /api/challenges — все доступные челленджи + статус пользователя */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: challenges } = await pool.query(
      `SELECT id, code, title, description, emoji, color, duration_days, habit_templates FROM challenges ORDER BY id`,
    );
    const { rows: userCh } = await pool.query(
      `SELECT challenge_id, status, started_at::text AS started_at, finished_at::text AS finished_at
       FROM user_challenges WHERE user_id = $1`,
      [userId],
    );
    const ucMap = {};
    for (const uc of userCh) ucMap[uc.challenge_id] = uc;

    const result = challenges.map((c) => ({
      ...c,
      habit_templates: typeof c.habit_templates === 'string' ? JSON.parse(c.habit_templates) : c.habit_templates,
      userStatus: ucMap[c.id]?.status || null,
      startedAt: ucMap[c.id]?.started_at || null,
    }));
    res.json(result);
  } catch (err) {
    console.error('GET challenges:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/challenges/:id/join — присоединиться к челленджу (создаёт привычки) */
router.post('/:id/join', async (req, res) => {
  const userId = req.userId;
  const challengeId = Number(req.params.id);
  try {
    const { rows: ch } = await pool.query(`SELECT * FROM challenges WHERE id = $1`, [challengeId]);
    if (!ch.length) return res.status(404).json({ error: 'Челлендж не найден' });

    const templates = typeof ch[0].habit_templates === 'string' ? JSON.parse(ch[0].habit_templates) : ch[0].habit_templates;

    // Создаём привычки из шаблонов
    for (const t of templates) {
      await pool.query(
        `INSERT INTO habits (user_id, title, emoji, color) VALUES ($1, $2, $3, $4)`,
        [userId, t.title, t.emoji || '✨', t.color || '#7C3AED'],
      );
    }

    // Записываем участие
    await pool.query(
      `INSERT INTO user_challenges (user_id, challenge_id, status) VALUES ($1, $2, 'active')
       ON CONFLICT DO NOTHING`,
      [userId, challengeId],
    );

    res.json({ ok: true, created: templates.length });
  } catch (err) {
    console.error('join challenge:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/challenges/:id/abandon */
router.post('/:id/abandon', async (req, res) => {
  try {
    await pool.query(
      `UPDATE user_challenges SET status = 'abandoned', finished_at = NOW()
       WHERE user_id = $1 AND challenge_id = $2 AND status = 'active'`,
      [req.userId, Number(req.params.id)],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
