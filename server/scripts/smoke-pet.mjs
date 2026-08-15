/**
 * ЖИВОЙ тест-стенд для /api/pet — страница питомца, коллекция, приключения, дневник.
 */
process.env.BOT_TOKEN = '111:test-pet-smoke';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5434/mentalos';
process.env.DATABASE_SSL = 'false';
process.env.PORT = '3103';
process.env.WEBAPP_URL = 'http://localhost:5173';

const crypto = await import('node:crypto');
const BASE = `http://localhost:${process.env.PORT}`;
const U = { id: 9501, username: 'pettester', first_name: 'ТестерПитомца' };
const V = { id: 9502, username: 'other', first_name: 'Другой' };

function mk(user = U) {
  const p = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'pt_' + Date.now() + Math.random().toString(36).slice(2, 6),
    user: JSON.stringify(user),
  });
  const dcs = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const s = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
  p.set('hash', crypto.createHmac('sha256', s).update(dcs).digest('hex'));
  return p.toString();
}

let passed = 0, failed = 0; const R = [];
async function req(method, path, { body, user } = {}) {
  const res = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': mk(user) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
function ok(name, cond, extra = '') { cond ? (passed++, R.push(`✅ ${name}`)) : (failed++, R.push(`❌ ${name} ${extra}`)); }
function isoDaysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }

console.log('🚀 Поднимаю сервер...');
await import('../src/index.js');
const { default: pool } = await import('../src/db/pool.js');
await new Promise((r) => setTimeout(r, 3500));

// ============================================
console.log('\n--- 1. GET /api/pet: начальный стейт ---');
// ============================================
let r = await req('GET', '/api/pet');
ok('GET pet: 200', r.status === 200, `s=${r.status}`);
ok('pet.name = Спарк (дефолт)', r.json?.pet?.name === 'Спарк', r.json?.pet?.name);
ok('pet.species = spark (дефолт)', r.json?.pet?.species === 'spark');
ok('pet.stage = egg (xp=0)', r.json?.pet?.stage === 'egg');
ok('pet.level = 1', r.json?.pet?.level === 1);
ok('pet.xpToNext = 50, xpForThis = 0', r.json?.pet?.xpToNext === 50 && r.json?.pet?.xpForThis === 0);
ok('pet.trait = curious (дефолт)', r.json?.pet?.trait === 'curious');
ok('pet.colors есть (объект)', typeof r.json?.pet?.colors === 'object' && r.json.pet.colors.main);
ok('species: 8 видов', r.json?.species?.length === 8, `len=${r.json?.species?.length}`);
ok('species[0] = spark (бесплатный)', r.json?.species?.[0]?.code === 'spark' && r.json.species[0].price === 0);
ok('species[7] = rainbow (2000)', r.json?.species?.[7]?.code === 'rainbow' && r.json.species[7].price === 2000);
ok('collection: 1 питомец (базовый spark)', r.json?.collection?.length === 1, `len=${r.json?.collection?.length}`);
ok('collection[0] is_active = true', r.json?.collection?.[0]?.is_active === true);
ok('adventure = null (нет активного)', r.json?.adventure === null);
ok('shopBonusAvailable = true (первый визит)', r.json?.shopBonusAvailable === true);
ok('balance = число', typeof r.json?.balance === 'number');
ok('events = [] (пустой дневник)', Array.isArray(r.json?.events) && r.json.events.length === 0);

// ============================================
console.log('\n--- 2. Вылупление + милстоуны + события ---');
// ============================================
const habit = (await req('POST', '/api/habits', { body: { title: 'Для питомца', emoji: '🎯' } })).json.id;
let lastEvolution = null;
for (let i = 0; i < 4; i++) {
  const logRes = await req('POST', `/api/habits/${habit}/log`, { body: { status: 'done', date: isoDaysAgo(i) } });
  if (logRes.json?.evolution) lastEvolution = logRes.json.evolution;
}
ok('Милстоун: evolution на 4-й отметке', lastEvolution?.stage === 'baby', JSON.stringify(lastEvolution));
r = await req('GET', '/api/pet');
ok('После вылупления: stage=baby', r.json?.pet?.stage === 'baby');
ok('birthday записан', !!r.json?.pet?.birthday);
ok('isBirthday=true (сегодня вылупился)', r.json?.pet?.isBirthday === true);
ok('events: есть событие hatch', r.json?.events?.some((e) => e.type === 'hatch'), JSON.stringify(r.json?.events?.map?.((e) => e.type)));

// Эволюция в teen
await pool.query(`UPDATE users SET companion_xp = 800 WHERE id = $1`, [U.id]);
await req('POST', `/api/habits/${habit}/log`, { body: { status: 'done', date: isoDaysAgo(10) } });
r = await req('GET', '/api/pet');
ok('После xp=800: stage=teen', r.json?.pet?.stage === 'teen');
ok('events: есть событие evolve', r.json?.events?.some((e) => e.type === 'evolve'));

// ============================================
console.log('\n--- 3. Приключения ---');
// ============================================
r = await req('POST', '/api/companion/adventure/start');
ok('ADV: старт ок', r.json?.ok === true && r.json?.returnsAt, JSON.stringify(r.json));
r = await req('GET', '/api/pet');
ok('ADV: в стейте adventure.status=active', r.json?.adventure?.status === 'active');
r = await req('POST', '/api/companion/adventure/claim');
ok('ADV: ранний claim → 400', r.status === 400);
// Тайм-тревел
await pool.query(`UPDATE adventures SET returns_at = NOW() - INTERVAL '1 hour' WHERE user_id = $1 AND status = 'active'`, [U.id]);
r = await req('POST', '/api/companion/adventure/claim');
ok('ADV: claim после возврата → rewardLabel', r.json?.ok === true && r.json?.rewardLabel?.length > 0, JSON.stringify(r.json));
r = await req('GET', '/api/pet');
ok('ADV: событие adventure в дневнике', r.json?.events?.some((e) => e.type === 'adventure'));
ok('ADV: после claim adventure=null', r.json?.adventure === null);

// Яйцо не ходит
await pool.query(`UPDATE users SET companion_xp = 0 WHERE id = $1`, [U.id]);
r = await req('POST', '/api/companion/adventure/start');
ok('ADV: яйцо → 400', r.status === 400);
await pool.query(`UPDATE users SET companion_xp = 100 WHERE id = $1`, [U.id]);

// ============================================
console.log('\n--- 4. Коллекция: покупка + переключение ---');
// ============================================
await pool.query(`UPDATE users SET bonus_balance = 3000 WHERE id = $1`, [U.id]);

// Купить star (500)
r = await req('POST', '/api/pet/buy', { body: { species: 'star' } });
ok('BUY star: ok', r.json?.ok === true && r.json?.balance === 2500, JSON.stringify(r.json));
r = await req('GET', '/api/pet');
ok('После покупки: collection = 2', r.json?.collection?.length === 2);
ok('star owned=true в species', r.json?.species?.find?.((s) => s.code === 'star')?.owned === true);

// Повторная покупка — alreadyOwned
r = await req('POST', '/api/pet/buy', { body: { species: 'star' } });
ok('BUY star повторно: alreadyOwned, без списания', r.json?.ok === true && r.json?.alreadyOwned === true);

// Покупка без денег
await pool.query(`UPDATE users SET bonus_balance = 100 WHERE id = $1`, [U.id]);
r = await req('POST', '/api/pet/buy', { body: { species: 'rainbow' } });
ok('BUY rainbow без денег: 402', r.status === 402);

// Несуществующий вид
r = await req('POST', '/api/pet/buy', { body: { species: 'dragon' } });
ok('BUY dragon: 404', r.status === 404);

// Переключиться на star
await pool.query(`UPDATE users SET bonus_balance = 3000 WHERE id = $1`, [U.id]);
r = await req('POST', '/api/pet/switch', { body: { species: 'star' } });
ok('SWITCH на star: ok', r.json?.ok === true, JSON.stringify(r.json));
r = await req('GET', '/api/pet');
ok('После switch: активный = star', r.json?.pet?.species === 'star');
ok('После switch: star.is_active=true, spark=false',
  r.json?.collection?.find?.((c) => c.species_code === 'star')?.is_active === true &&
  r.json?.collection?.find?.((c) => c.species_code === 'spark')?.is_active === false);
ok('После switch: pet.colors = звёздные цвета', r.json?.pet?.colors?.main === '#F59E0B', JSON.stringify(r.json?.pet?.colors));
ok('После switch: событие new_pet в дневнике', r.json?.events?.some?.((e) => e.type === 'new_pet'));

// Switch на неверладеемого
r = await req('POST', '/api/pet/switch', { body: { species: 'shadow' } });
ok('SWITCH на некупленного: 403', r.status === 403);

// Назад на spark
await req('POST', '/api/pet/switch', { body: { species: 'spark' } });

// ============================================
console.log('\n--- 5. Переименование ---');
// ============================================
r = await req('POST', '/api/pet/rename', { body: { name: 'Пушок' } });
ok('RENAME: ok', r.json?.ok === true);
r = await req('GET', '/api/pet');
ok('RENAME: pet.name = Пушок', r.json?.pet?.name === 'Пушок');
// users.companion_name тоже?
const cn = await pool.query(`SELECT companion_name FROM users WHERE id = $1`, [U.id]);
ok('RENAME: users.companion_name синхронизирован', cn.rows[0]?.companion_name === 'Пушок');
r = await req('POST', '/api/pet/rename', { body: { name: '' } });
ok('RENAME пустое: 400', r.status === 400);
r = await req('POST', '/api/pet/rename', { body: { name: 'A'.repeat(25) } });
ok('RENAME >20: 400', r.status === 400);

// ============================================
console.log('\n--- 6. Ежедневная бесплатка ---');
// ============================================
r = await req('POST', '/api/companion/shop/daily-bonus');
ok('BONUS: первый → +10', r.json?.ok === true);
r = await req('POST', '/api/companion/shop/daily-bonus');
ok('BONUS: повтор → 409', r.status === 409);
r = await req('GET', '/api/pet');
ok('BONUS: shopBonusAvailable=false', r.json?.shopBonusAvailable === false);

// ============================================
console.log('\n--- 7. IDOR ---');
// ============================================
r = await req('POST', '/api/pet/switch', { body: { species: 'star' }, user: V });
ok('IDOR: чужой switch — может переключить СВОЕГО (не моего)', r.status === 200 || r.status === 403);
const myPet = await req('GET', '/api/pet');
ok('IDOR: мой питомец не изменился', myPet.json?.pet?.species === 'spark');

// ============================================
console.log('\n--- 8. Инварианты ---');
// ============================================
const multiActive = await pool.query(`SELECT user_id, COUNT(*) c FROM user_pets WHERE is_active = TRUE GROUP BY user_id HAVING COUNT(*) > 1`);
ok('Нет юзеров с 2+ активными питомцами', multiActive.rows.length === 0);
const syncCheck = await pool.query(`
  SELECT u.id FROM users u
  LEFT JOIN user_pets up ON up.user_id = u.id AND up.is_active = TRUE
  WHERE u.active_species != COALESCE(up.species_code, u.active_species)
`);
ok('active_species синхронизирован с user_pets.is_active', syncCheck.rows.length === 0, `desync=${syncCheck.rows.length}`);

// ===== ИТОГ =====
console.log('\n========== PET ИТОГ ==========');
for (const l of R) console.log(l);
console.log(`\n✅ Прошло: ${passed}   ❌ Провалилось: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
