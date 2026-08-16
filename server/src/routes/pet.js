import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

function stageOf(level) {
  if (level <= 1) return 'egg';
  if (level < 5) return 'baby';
  if (level < 10) return 'teen';
  return 'adult';
}

function parseJson(v, fallback) {
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return fallback; } }
  return v || fallback;
}

/** GET /api/pet — полный стейт активного питомца + коллекция + события */
router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    // Активный питомец (XP и mood берём из users — единый источник истины)
    const { rows: pet } = await pool.query(
      `SELECT up.id, up.species_code, up.name, up.is_active, up.is_shiny, up.obtained_at,
              ps.title AS species_title, ps.emoji AS species_emoji, ps.colors,
              u.companion_xp AS xp, u.companion_mood AS mood
       FROM user_pets up
       JOIN pet_species ps ON ps.code = up.species_code
       JOIN users u ON u.id = up.user_id
       WHERE up.user_id = $1 AND up.is_active = TRUE`, [userId],
    );

    if (!pet.length) {
      // Автосоздание если нет
      const { rows: u } = await pool.query(`SELECT active_species, companion_name FROM users WHERE id = $1`, [userId]);
      const species = u[0]?.active_species || 'spark';
      await pool.query(
        `INSERT INTO user_pets (user_id, species_code, name, is_active) VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (user_id, species_code) DO UPDATE SET is_active = TRUE`,
        [userId, species, u[0]?.companion_name || 'Спарк'],
      );
      const { rows: fresh } = await pool.query(
        `SELECT up.*, ps.title AS species_title, ps.emoji AS species_emoji, ps.colors
         FROM user_pets up JOIN pet_species ps ON ps.code = up.species_code
         WHERE up.user_id = $1 AND up.is_active = TRUE`, [userId],
      );
      pet.push(...fresh);
    }

    const p = pet[0];
    const xp = Number(p.xp) || 0;
    const level = Math.floor(Math.sqrt(xp / 50)) + 1;
    const colors = parseJson(p.colors, {});
    // today больше не нужен — используем localToday по таймзоне юзера

    // Коллекция всех питомцев
    const { rows: collection } = await pool.query(
      `SELECT up.species_code, up.name, up.xp, up.mood, up.is_active, up.is_shiny, up.obtained_at::text AS obtained,
              ps.title, ps.emoji, ps.price
       FROM user_pets up JOIN pet_species ps ON ps.code = up.species_code
       WHERE up.user_id = $1 ORDER BY ps.sort_order`, [userId],
    );
    const ownedSpecies = new Set(collection.map((c) => c.species_code));

    // Все виды (для витрины)
    const { rows: allSpecies } = await pool.query(`SELECT * FROM pet_species ORDER BY sort_order`);
    const speciesList = allSpecies.map((s) => ({
      ...s,
      colors: parseJson(s.colors, {}),
      owned: ownedSpecies.has(s.code),
    }));

    // События (последние 30)
    const { rows: events } = await pool.query(
      `SELECT event_type, event_data, created_at::text AS at FROM pet_events
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`, [userId],
    );

    // Приключение
    const { rows: adv } = await pool.query(
      `SELECT id, status, returns_at::text AS returns_at FROM adventures
       WHERE user_id = $1 AND status IN ('active','completed') ORDER BY started_at DESC LIMIT 1`, [userId],
    );

    // Экипировка (общая для пользователя)
    const { rows: eq } = await pool.query(`SELECT companion_equipped FROM users WHERE id = $1`, [userId]);

    // Бонусы
    const { rows: bal } = await pool.query(`SELECT bonus_balance FROM users WHERE id = $1`, [userId]);

    // Черта характера + ДР по ЛОКАЛЬНОЙ дате (строковое сравнение — устойчиво к TZ)
    const { rows: trait } = await pool.query(
      `SELECT companion_trait, companion_birthday::text AS birthday_str, last_shop_bonus::text AS bonus_str, timezone FROM users WHERE id = $1`,
      [userId],
    );
    const userTz = trait[0]?.timezone || 'UTC';
    const localToday = new Intl.DateTimeFormat('en-CA', { timeZone: userTz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const isBirthday = !!(trait[0]?.birthday_str && trait[0].birthday_str === localToday);

    res.json({
      pet: {
        name: p.name,
        species: p.species_code,
        speciesTitle: p.species_title,
        speciesEmoji: p.species_emoji,
        xp,
        level,
        stage: stageOf(level),
        mood: Number(p.mood) || 50,
        colors,
        xpToNext: Math.pow(level, 2) * 50,
        xpForThis: Math.pow(level - 1, 2) * 50,
        trait: trait[0]?.companion_trait || 'curious',
        isBirthday,
        birthday: trait[0]?.birthday_str || null,
        isShiny: !!p.is_shiny,
      },
      equipped: parseJson(eq[0]?.companion_equipped, {}),
      adventure: adv[0] ? { status: adv[0].status === 'completed' ? 'ready' : 'active', returnsAt: adv[0].returns_at, canClaim: adv[0].status === 'completed' } : null,
      species: speciesList,
      collection,
      events: events.map((e) => ({ type: e.event_type, data: parseJson(e.event_data, {}), at: e.at })),
      balance: Number(bal[0]?.bonus_balance) || 0,
      shopBonusAvailable: trait[0]?.bonus_str !== localToday,
    });
  } catch (err) {
    console.error('GET /pet:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** POST /api/pet/switch — переключить активного питомца (транзакция + sync companion_type) */
router.post('/switch', async (req, res) => {
  const userId = req.userId;
  const species = req.body?.species;
  if (!species) return res.status(400).json({ error: 'Укажи species' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Проверяем владение
    const { rows: owned } = await client.query(
      `SELECT 1 FROM user_pets WHERE user_id = $1 AND species_code = $2 FOR UPDATE`, [userId, species],
    );
    if (!owned.length) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Сначала получи этого питомца' });
    }

    // ФИКС: синхронизируем и user_pets, и users (companion_type + active_species)
    await client.query(`UPDATE user_pets SET is_active = FALSE WHERE user_id = $1`, [userId]);
    await client.query(`UPDATE user_pets SET is_active = TRUE WHERE user_id = $1 AND species_code = $2`, [userId, species]);
    await client.query(`UPDATE users SET active_species = $1, companion_type = $1 WHERE id = $2`, [species, userId]);

    // Синхронизируем имя питомца
    const { rows: petName } = await client.query(
      `SELECT name FROM user_pets WHERE user_id = $1 AND species_code = $2`, [userId, species],
    );
    if (petName[0]?.name) {
      await client.query(`UPDATE users SET companion_name = $1 WHERE id = $2`, [petName[0].name, userId]);
    }

    await client.query('COMMIT');
    res.json({ ok: true, species });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('pet switch:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

/** POST /api/pet/buy — купить нового питомца */
router.post('/buy', async (req, res) => {
  const userId = req.userId;
  const species = req.body?.species;
  if (!species) return res.status(400).json({ error: 'Укажи species' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: u } = await client.query(`SELECT bonus_balance FROM users WHERE id = $1 FOR UPDATE`, [userId]);
    const { rows: sp } = await client.query(`SELECT * FROM pet_species WHERE code = $1`, [species]);
    if (!sp.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Вид не найден' }); }

    const { rows: existing } = await client.query(
      `SELECT 1 FROM user_pets WHERE user_id = $1 AND species_code = $2`, [userId, species],
    );
    if (existing.length) { await client.query('ROLLBACK'); return res.json({ ok: true, alreadyOwned: true }); }

    const price = sp[0].price;
    const balance = Number(u[0]?.bonus_balance) || 0;
    if (balance < price) { await client.query('ROLLBACK'); return res.status(402).json({ error: 'Недостаточно бонусов', need: price - balance }); }

    await client.query(`UPDATE users SET bonus_balance = bonus_balance - $1 WHERE id = $2`, [price, userId]);

    // ✨ ШЕЙНИ: 1% шанс блестящего питомца
    const isShiny = Math.random() < 0.01;
    await client.query(
      `INSERT INTO user_pets (user_id, species_code, name, is_active, is_shiny) VALUES ($1, $2, $3, FALSE, $4)`,
      [userId, species, sp[0].title, isShiny],
    );
    await client.query(
      `INSERT INTO bonus_transactions (user_id, amount, reason, meta) VALUES ($1, $2, 'pet_purchase', $3)`,
      [userId, -price, JSON.stringify({ species, shiny: isShiny })],
    );
    await client.query(
      `INSERT INTO pet_events (user_id, species_code, event_type, event_data) VALUES ($1, $2, 'new_pet', $3)`,
      [userId, species, JSON.stringify({ title: sp[0].title, emoji: sp[0].emoji, shiny: isShiny })],
    );
    await client.query('COMMIT');
    res.json({ ok: true, balance: balance - price, shiny: isShiny });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('pet buy:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

/** POST /api/pet/gift — отправить предмет питомцу бадди */
router.post('/gift', async (req, res) => {
  const userId = req.userId;
  const { buddyId, itemCode } = req.body;
  if (!buddyId || !itemCode) return res.status(400).json({ error: 'Укажи buddyId и itemCode' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: buddy } = await client.query(
      `SELECT 1 FROM buddies WHERE user_id = $1 AND buddy_id = $2 AND status = 'accepted'`,
      [userId, Number(buddyId)],
    );
    if (!buddy.length) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Это не твой бадди' }); }

    const { rows: owned } = await client.query(
      `SELECT 1 FROM user_items WHERE user_id = $1 AND item_code = $2`, [userId, itemCode],
    );
    if (!owned.length) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'У тебя нет этого предмета' }); }

    const { rows: item } = await client.query(
      `SELECT title, emoji FROM companion_items WHERE code = $1`, [itemCode],
    );

    await client.query(`DELETE FROM user_items WHERE user_id = $1 AND item_code = $2`, [userId, itemCode]);
    await client.query(
      `INSERT INTO user_items (user_id, item_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [Number(buddyId), itemCode],
    );

    await client.query('COMMIT');
    res.json({ ok: true, item: item[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('pet gift:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

/** POST /api/pet/rename — переименовать активного питомца */
router.post('/rename', async (req, res) => {
  const userId = req.userId;
  // ФИКС: санитизация control-символов (NUL-байты ломают PostgreSQL)
  const name = String(req.body?.name || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (!name || name.length > 20) return res.status(400).json({ error: 'Имя: 1–20 символов' });

  try {
    await pool.query(`UPDATE user_pets SET name = $1 WHERE user_id = $2 AND is_active = TRUE`, [name, userId]);
    await pool.query(`UPDATE users SET companion_name = $1 WHERE id = $2`, [name, userId]);
    res.json({ ok: true, name });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** Запись события в дневник (экспорт для других роутов) */
export async function logPetEvent(userId, speciesCode, eventType, eventData = {}) {
  try {
    await pool.query(
      `INSERT INTO pet_events (user_id, species_code, event_type, event_data) VALUES ($1, $2, $3, $4)`,
      [userId, speciesCode, eventType, JSON.stringify(eventData)],
    );
  } catch (e) { /* не критично */ }
}

export default router;
