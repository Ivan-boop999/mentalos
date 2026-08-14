/**
 * ЖИВОЙ тест-стенд ПИТОМЦА (companion): Docker PG + сервер + подписанный initData.
 * Покрывает: стейт по умолчанию, рост XP/mood от отметок, капы, уровни/стадии,
 * переименование/тип, магазин (баланс/повторная покупка), инвентарь,
 * экипировка (надеть/снять/чужое), decay настроения, IDOR.
 * Запуск: node scripts/smoke-companion.mjs
 */
process.env.BOT_TOKEN = '111:test-token-local-smoke';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5434/mentalos';
process.env.DATABASE_SSL = 'false';
process.env.PORT = '3101';
process.env.WEBAPP_URL = 'http://localhost:5173';

const crypto = await import('node:crypto');
const BASE = `http://localhost:${process.env.PORT}`;
const USER = { id: 7001, username: 'petowner', first_name: 'Петовладелец' };
const OTHER = { id: 7002, username: 'petfriend', first_name: 'Другой' };

function makeInitData(user = USER) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'pet_' + Date.now() + Math.random().toString(36).slice(2, 6),
    user: JSON.stringify(user),
  });
  const dcs = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(dcs).digest('hex'));
  return params.toString();
}

let passed = 0, failed = 0; const results = [];
async function call(method, path, { body, user } = {}) {
  const res = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': makeInitData(user) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
function check(name, cond, extra = '') { cond ? (passed++, results.push(`✅ ${name}`)) : (failed++, results.push(`❌ ${name} ${extra}`)); }

console.log('🚀 Поднимаю сервер...');
await import('../src/index.js');
const { default: pool } = await import('../src/db/pool.js');
await new Promise((r) => setTimeout(r, 3000));

// ---------- 1. Дефолтный стейт ----------
let r = await call('GET', '/api/companion');
check('Дефолт: name=Спарк, type=spark, xp=0, level=1, stage=egg, mood=50',
  r.json?.name === 'Спарк' && r.json?.type === 'spark' && r.json?.xp === 0 && r.json?.level === 1 && r.json?.stage === 'egg' && r.json?.mood === 50, JSON.stringify(r.json));
check('Дефолт: equipped={} и xpToNext/xpForThis есть', r.json?.equipped && typeof r.json?.equipped === 'object' && r.json.xpToNext === 50 && r.json.xpForThis === 0, JSON.stringify(r.json?.xpToNext));

// ---------- 2. Создаём привычку и растим питомца ----------
r = await call('POST', '/api/habits', { body: { title: 'Гулять', emoji: '🚶' } });
const habitId = r.json.id;
check('Привычка создана', !!habitId);

// 3 отметки done на 3 РАЗНЫХ датах: xp +45, mood 50→74
for (let i = 0; i < 3; i++) {
  await call('POST', `/api/habits/${habitId}/log`, { body: { status: 'done', date: isoDaysAgo(i) } });
}
r = await call('GET', '/api/companion');
check('3×done → xp=45, mood=74 (50+8×3)', r.json?.xp === 45 && r.json?.mood === 74, `xp=${r.json?.xp} mood=${r.json?.mood}`);
check('xp=45 → level=1 (level 2 наступает при xp≥50)', r.json?.level === 1, `level=${r.json?.level}`);
// Граница уровня: 4-я отметка → xp=60 → level 2
await call('POST', `/api/habits/${habitId}/log`, { body: { status: 'done', date: isoDaysAgo(3) } });
r = await call('GET', '/api/companion');
check('4×done (xp=60) → level=2', r.json?.level === 2 && r.json?.xp === 60, `xp=${r.json?.xp} level=${r.json?.level}`);
await pool.query(`UPDATE users SET companion_xp = 45, companion_mood = 74 WHERE id = $1`, [USER.id]);

// skip на СВЕЖЕЙ дате: mood −3
await call('POST', `/api/habits/${habitId}/log`, { body: { status: 'skip', date: isoDaysAgo(4) } });
r = await call('GET', '/api/companion');
check('skip (новая дата) → mood=71 (−3)', r.json?.mood === 71, `mood=${r.json?.mood}`);

// skip→skip той же даты: повторный штраф НЕ начисляется
await call('POST', `/api/habits/${habitId}/log`, { body: { status: 'skip', date: isoDaysAgo(4) } });
r = await call('GET', '/api/companion');
check('skip→skip той же даты → mood остался 71', r.json?.mood === 71, `mood=${r.json?.mood}`);

// partial (measurable ниже цели) на свежей дате: mood −3, НЕ +8
await pool.query(`UPDATE habits SET goal_type='measurable', goal_target=10 WHERE id=$1`, [habitId]);
await call('POST', `/api/habits/${habitId}/log`, { body: { status: 'done', value: 2, date: isoDaysAgo(5) } });
r = await call('GET', '/api/companion');
check('partial (value<цели, новая дата) → mood=68 (−3, не +8)', r.json?.mood === 68, `mood=${r.json?.mood}`);

// ---------- 3. Капы mood ----------
await pool.query(`UPDATE users SET companion_mood = 98 WHERE id = $1`, [USER.id]);
await call('POST', `/api/habits/${habitId}/log`, { body: { status: 'done', value: 10, date: isoDaysAgo(6) } });
r = await call('GET', '/api/companion');
check('Кап сверху: mood 98+8 → 100', r.json?.mood === 100, `mood=${r.json?.mood}`);

await pool.query(`UPDATE users SET companion_mood = 1 WHERE id = $1`, [USER.id]);
r = await call('POST', `/api/habits/${habitId}/log`, { body: { status: 'skip', date: isoDaysAgo(7) } });
const floorDb = (await pool.query(`SELECT companion_mood m FROM users WHERE id=$1`, [USER.id])).rows[0].m;
console.log('   [debug floor] API log resp:', r.status, r.text?.slice(0, 120), '| DB mood:', floorDb);
r = await call('GET', '/api/companion');
check('Пол снизу: mood 1−3 → 0', r.json?.mood === 0, `api=${r.json?.mood} db=${floorDb}`);
await pool.query(`UPDATE users SET companion_mood = 50 WHERE id = $1`, [USER.id]);

// ---------- 4. Стадии эволюции (Finch-шкала: быстрое вылупление) ----------
for (const [xp, lvl, stage] of [[50, 2, 'baby'], [800, 5, 'teen'], [4050, 10, 'adult']]) {
  await pool.query(`UPDATE users SET companion_xp = $1 WHERE id = $2`, [xp, USER.id]);
  r = await call('GET', '/api/companion');
  check(`xp=${xp} → level=${lvl}, stage=${stage}`, r.json?.level === lvl && r.json?.stage === stage, `level=${r.json?.level} stage=${r.json?.stage}`);
}
await pool.query(`UPDATE users SET companion_xp = 0 WHERE id = $1`, [USER.id]);

// ---------- 5. Переименование / тип ----------
r = await call('PUT', '/api/companion', { body: { name: 'Рекс', type: 'flame' } });
check('PUT: имя Рекс + тип flame', r.json?.ok === true, JSON.stringify(r.json));
r = await call('GET', '/api/companion');
check('Изменения применились', r.json?.name === 'Рекс' && r.json?.type === 'flame', `${r.json?.name}/${r.json?.type}`);
r = await call('PUT', '/api/companion', { body: { type: 'dragon' } });
check('Невалидный тип → 400', r.status === 400, `status=${r.status}`);
r = await call('PUT', '/api/companion', { body: { name: 'ОченьДлинноеИмяБолее20Символов' } });
check('Имя >20 симв → 400', r.status === 400, `status=${r.status}`);
r = await call('PUT', '/api/companion', { body: {} });
check('Пустой PUT → 400', r.status === 400, `status=${r.status}`);

// ---------- 6. Магазин ----------
r = await call('GET', '/api/companion/shop');
const items = r.json || [];
check('Магазин: 30 предметов', items.length === 30, `len=${items.length}`);
const cats = new Set(items.map((i) => i.category));
check('Категории: hat/glasses/accessory', cats.has('hat') && cats.has('glasses') && cats.has('accessory'), [...cats].join(','));

// Покупка без денег → 402
await pool.query(`UPDATE users SET bonus_balance = 0 WHERE id = $1`, [USER.id]);
r = await call('POST', '/api/companion/buy', { body: { code: 'hat_crown' } });
check('Покупка без бонусов → 402', r.status === 402, `status=${r.status}`);

// Грантим денег; ждём оседания асинхронных наград (миссии/сюрпризы), затем относительные замеры
await pool.query(`UPDATE users SET bonus_balance = 1000 WHERE id = $1`, [USER.id]);
await new Promise((rr) => setTimeout(rr, 600));
const balPre = Number((await pool.query(`SELECT bonus_balance b FROM users WHERE id=$1`, [USER.id])).rows[0].b);
r = await call('POST', '/api/companion/buy', { body: { code: 'hat_crown' } });
check('Покупка hat_crown (200) → ok', r.json?.ok === true, JSON.stringify(r.json));
let bal = Number((await pool.query(`SELECT bonus_balance b FROM users WHERE id=$1`, [USER.id])).rows[0].b);
check('Баланс списан ровно на 200', bal === balPre - 200, `pre=${balPre} now=${bal}`);

// Повторная покупка — не списывает
r = await call('POST', '/api/companion/buy', { body: { code: 'hat_crown' } });
check('Повторная покупка → alreadyOwned, без списания', r.json?.ok === true && r.json?.alreadyOwned === true, JSON.stringify(r.json));
bal = Number((await pool.query(`SELECT bonus_balance b FROM users WHERE id=$1`, [USER.id])).rows[0].b);
check('Баланс не изменился', bal === balPre - 200, `bal=${bal}`);

// Инвентарь
r = await call('GET', '/api/companion/inventory');
check('Инвентарь: hat_crown в owned', (r.json?.owned || []).some((o) => o.item_code === 'hat_crown'), JSON.stringify(r.json?.owned));

// ---------- 7. Экипировка ----------
r = await call('POST', '/api/companion/equip', { body: { code: 'hat_crown', category: 'hat' } });
check('Экипировать hat_crown', r.json?.equipped?.hat === 'hat_crown', JSON.stringify(r.json));
r = await call('GET', '/api/companion');
check('GET /companion отдаёт equipped.hat', r.json?.equipped?.hat === 'hat_crown', JSON.stringify(r.json?.equipped));

// Вторая категория
await call('POST', '/api/companion/buy', { body: { code: 'glasses_sun' } });
r = await call('POST', '/api/companion/equip', { body: { code: 'glasses_sun', category: 'glasses' } });
check('Две категории одновременно (hat+glasses)', r.json?.equipped?.hat === 'hat_crown' && r.json?.equipped?.glasses === 'glasses_sun', JSON.stringify(r.json?.equipped));

// Снять шапку (повторный equip)
r = await call('POST', '/api/companion/equip', { body: { code: 'hat_crown', category: 'hat' } });
check('Повторный equip → снял шапку', !r.json?.equipped?.hat && r.json?.equipped?.glasses === 'glasses_sun', JSON.stringify(r.json?.equipped));

// Чужой предмет → 403
r = await call('POST', '/api/companion/equip', { body: { code: 'acc_halo', category: 'accessory' } });
check('Экипировать НЕкупленное → 403', r.status === 403, `status=${r.status}`);

// Несуществующий предмет
r = await call('POST', '/api/companion/buy', { body: { code: 'hat_invisible' } });
check('Несуществующий предмет → 404', r.status === 404, `status=${r.status}`);

// ---------- 8. decay настроения ----------
const { decayCompanionMood } = await import('../src/routes/companion.js');
// Нет активности 7 дней → target=50; mood=100 → дрейф к 90
await pool.query(`DELETE FROM habit_logs WHERE user_id = $1`, [USER.id]);
await pool.query(`UPDATE users SET companion_mood = 100, last_mood_decay = NULL WHERE id = $1`, [USER.id]);
await decayCompanionMood(USER.id);
let mood = (await pool.query(`SELECT companion_mood m FROM users WHERE id=$1`, [USER.id])).rows[0].m;
check('decay: без активности mood 100→90 (дрейф к 50 на 20%)', Number(mood) === 90, `mood=${mood}`);
// Повторный decay в тот же час не сработает через cron — но функция идемпотентна по вызову; cron защищает last_mood_decay
await decayCompanionMood(USER.id);
mood = (await pool.query(`SELECT companion_mood m FROM users WHERE id=$1`, [USER.id])).rows[0].m;
check('decay повторно: 90→82', Number(mood) === 82, `mood=${mood}`);

// ---------- 9. IDOR ----------
r = await call('PUT', '/api/companion', { body: { name: 'Взлом' }, user: OTHER });
r = await call('GET', '/api/companion');
check('IDOR: чужой PUT не меняет моего питомца', r.json?.name === 'Рекс', r.json?.name);
const otherBal = (await pool.query(`SELECT bonus_balance b FROM users WHERE id=$1`, [OTHER.id])).rows[0].b;
check('IDOR: бонусы другого не тронуты', Number(otherBal) === 0, `b=${otherBal}`);

// ---------- 10. ЭТАП-C: АНТИ-ФАРМ (тумблер done↔skip не начисляет повторно) ----------
console.log('\n--- ЭТАП C: анти-фарм / гонка / откаты ---');
await pool.query(`UPDATE users SET companion_xp=0, companion_mood=50, xp=0, bonus_balance=100, total_checkins=0 WHERE id=$1`, [USER.id]);
const habitB = (await call('POST', '/api/habits', { body: { title: 'Анти-фарм', emoji: '🧪' } })).json.id;
const d = isoDaysAgo(5);

// done → skip → done → done (классический фарм)
await call('POST', `/api/habits/${habitB}/log`, { body: { status: 'done', date: d } });
await call('POST', `/api/habits/${habitB}/log`, { body: { status: 'skip', date: d } });
await call('POST', `/api/habits/${habitB}/log`, { body: { status: 'done', date: d } });
await call('POST', `/api/habits/${habitB}/log`, { body: { status: 'done', date: d } });
let u1 = (await pool.query(`SELECT companion_xp cx, xp ux, total_checkins tc FROM users WHERE id=$1`, [USER.id])).rows[0];
// ux может быть выше из-за случайного сюрприза (+20 XP, 12%) — детерминированы cx и tc
check('АНТИ-ФАРМ: 4 записи (done→skip→done→done) = 2 начисления → cx=30, tc=2, ux≥20',
  Number(u1.cx) === 30 && Number(u1.tc) === 2 && Number(u1.ux) >= 20, `cx=${u1.cx} ux=${u1.ux} tc=${u1.tc}`);

// skip→skip не штрафует дважды
await pool.query(`UPDATE users SET companion_mood=50 WHERE id=$1`, [USER.id]);
await call('POST', `/api/habits/${habitB}/log`, { body: { status: 'skip', date: isoDaysAgo(4) } });
await call('POST', `/api/habits/${habitB}/log`, { body: { status: 'skip', date: isoDaysAgo(4) } });
u1 = (await pool.query(`SELECT companion_mood cm FROM users WHERE id=$1`, [USER.id])).rows[0];
check('АНТИ-ФАРМ: skip→skip = один штраф (mood 47, не 44)', Number(u1.cm) === 47, `cm=${u1.cm}`);

// unlog done → полный откат (парность)
await pool.query(`UPDATE users SET companion_xp=0, companion_mood=50, xp=0, bonus_balance=100, total_checkins=0 WHERE id=$1`, [USER.id]);
await call('POST', `/api/habits/${habitB}/log`, { body: { status: 'done', date: isoDaysAgo(3) } });
u1 = (await pool.query(`SELECT companion_xp cx, companion_mood cm, xp ux, bonus_balance bb, total_checkins tc FROM users WHERE id=$1`, [USER.id])).rows[0];
const uxBefore = Number(u1.ux);
const bbBefore = Number(u1.bb);
check('unlog-подготовка: после done cx=15,cm=58,ux>=10,bb>=101(сюрприз?),tc=1',
  Number(u1.cx) === 15 && Number(u1.cm) === 58 && uxBefore >= 10 && bbBefore >= 101 && Number(u1.tc) === 1, JSON.stringify(u1));
r = await call('POST', `/api/habits/${habitB}/unlog`, { body: { date: isoDaysAgo(3) } });
check('unlog: rolledBack=true', r.json?.rolledBack === true, JSON.stringify(r.json));
u1 = (await pool.query(`SELECT companion_xp cx, companion_mood cm, xp ux, bonus_balance bb, total_checkins tc FROM users WHERE id=$1`, [USER.id])).rows[0];
check('unlog: полный откат cx=0,cm=50,ux=uxBefore-10,bb=bbBefore-1,tc=0',
  Number(u1.cx) === 0 && Number(u1.cm) === 50 && Number(u1.ux) === uxBefore - 10 && Number(u1.bb) === bbBefore - 1 && Number(u1.tc) === 0, JSON.stringify(u1));

// unlog skip → НЕ трогает награды
await call('POST', `/api/habits/${habitB}/log`, { body: { status: 'skip', date: isoDaysAgo(2) } });
r = await call('POST', `/api/habits/${habitB}/unlog`, { body: { date: isoDaysAgo(2) } });
check('unlog skip: rolledBack=false', r.json?.rolledBack === false, JSON.stringify(r.json));

// unlog чужой привычки → 404
r = await call('POST', `/api/habits/${habitB}/unlog`, { body: { date: isoDaysAgo(2) }, user: OTHER });
check('unlog IDOR: чужая привычка → 404', r.status === 404, `s=${r.status}`);

// ---------- 11. ЭТАП-C: ГОНКА покупок ----------
await pool.query(`UPDATE users SET bonus_balance = 400 WHERE id = $1`, [USER.id]); // хватает ровно на ОДНУ покупку (acc_wings=300)
await pool.query(`DELETE FROM user_items WHERE user_id = $1`, [USER.id]);
await pool.query(`UPDATE users SET companion_equipped = '{}'::jsonb WHERE id = $1`, [USER.id]);
// 3 параллельные покупки предмета за 300 при балансе 400
const race = await Promise.all([
  call('POST', '/api/companion/buy', { body: { code: 'acc_wings' } }),
  call('POST', '/api/companion/buy', { body: { code: 'acc_wings' } }),
  call('POST', '/api/companion/buy', { body: { code: 'acc_wings' } }),
]);
let balNow = Number((await pool.query(`SELECT bonus_balance b FROM users WHERE id=$1`, [USER.id])).rows[0].b);
const ownWings = (await pool.query(`SELECT COUNT(*) c FROM user_items WHERE user_id=$1 AND item_code='acc_wings'`, [USER.id])).rows[0].c;
check('ГОНКА: 3 параллельных buy → списание ОДИН раз (400→100), предмет 1 шт',
  balNow === 100 && Number(ownWings) === 1, `bal=${balNow} owned=${ownWings}`);
check('ГОНКА: ответы — 1 success + 2 alreadyOwned', race.filter((x) => x.json?.ok).length === 3 && race.filter((x) => x.json?.alreadyOwned).length === 2, JSON.stringify(race.map((x) => x.json)));

// ---------- 12. ЭТАП-C: подмена категории ----------
r = await call('POST', '/api/companion/equip', { body: { code: 'acc_wings', category: 'hat' } });
check('ПОДМЕНА: acc_wings в слот hat → надет в НАСТОЯЩУЮ категорию accessory', r.json?.equipped?.accessory === 'acc_wings' && !r.json?.equipped?.hat, JSON.stringify(r.json?.equipped));

// ---------- 13. ЭТАП-C: decay skip-дни не занижают ----------
await pool.query(`DELETE FROM habit_logs WHERE user_id=$1`, [USER.id]);
// 3 РАЗНЫЕ привычки × done в один день + skip-день рядом:
// раньше skip-день попадал в знаменатель; теперь done=3, done_days=1 → target=100
const hC = (await call('POST', '/api/habits', { body: { title: 'C', emoji: '1️⃣' } })).json.id;
const hD = (await call('POST', '/api/habits', { body: { title: 'D', emoji: '2️⃣' } })).json.id;
await call('POST', `/api/habits/${habitB}/log`, { body: { status: 'done', date: isoDaysAgo(1) } });
await call('POST', `/api/habits/${hC}/log`, { body: { status: 'done', date: isoDaysAgo(1) } });
await call('POST', `/api/habits/${hD}/log`, { body: { status: 'done', date: isoDaysAgo(1) } });
await call('POST', `/api/habits/${habitB}/log`, { body: { status: 'skip', date: isoDaysAgo(0) } });
await pool.query(`UPDATE users SET companion_mood = 0 WHERE id = $1`, [USER.id]);
const dbg = (await pool.query(
  `SELECT COUNT(*) FILTER (WHERE status='done') AS done,
          COUNT(DISTINCT log_date) FILTER (WHERE status='done') AS done_days
   FROM habit_logs WHERE user_id=$1 AND log_date >= CURRENT_DATE - INTERVAL '7 days'`, [USER.id])).rows[0];
console.log('   [debug decay] done=', dbg.done, 'done_days=', dbg.done_days);
await decayCompanionMood(USER.id);
let cm = Number((await pool.query(`SELECT companion_mood m FROM users WHERE id=$1`, [USER.id])).rows[0].m);
check('DECAY: 3 done за 1 done-день (skip-день не в знаменателе) → target=100 → mood 0→20', cm === 20, `m=${cm}`);

// ---------- 14. ЭТАП-D: МИЛСТОУНЫ (hatch → birthday; эволюция → подарок) ----------
console.log('\n--- ЭТАП D: милстоуны / приключения / бесплатка ---');
await pool.query(`UPDATE users SET companion_xp=0, companion_stage='egg', companion_birthday=NULL WHERE id=$1`, [USER.id]);
const hMile = (await call('POST', '/api/habits', { body: { title: 'Милстоун', emoji: '🎯' } })).json.id;
let mres = null;
for (let i = 0; i < 4; i++) {
  mres = await call('POST', `/api/habits/${hMile}/log`, { body: { status: 'done', date: isoDaysAgo(10 + i) } });
  if (mres.json?.evolution) break;
}
check('МИЛСТОУН: вылупление на 4-й отметке → evolution.stage=baby + подарок',
  mres.json?.evolution?.stage === 'baby' && !!mres.json?.evolution?.giftLabel, JSON.stringify(mres.json?.evolution));
const bd = (await pool.query(`SELECT companion_birthday b FROM users WHERE id=$1`, [USER.id])).rows[0].b;
check('МИЛСТОУН: birthday записан (= сегодня)', bd && new Date(bd).toDateString() === new Date().toDateString(), `bd=${bd}`);
r = await call('GET', '/api/companion');
check('GET: isBirthday=true в день вылупления, stage=baby', r.json?.isBirthday === true && r.json?.stage === 'baby', JSON.stringify({ b: r.json?.isBirthday, s: r.json?.stage }));

// Эволюция teen (800 XP): подарок + companion_stage
await pool.query(`UPDATE users SET companion_xp=800 WHERE id=$1`, [USER.id]);
mres = await call('POST', `/api/habits/${hMile}/log`, { body: { status: 'done', date: isoDaysAgo(20) } });
check('МИЛСТОУН: teen-эволюция при xp>800 → evolution.stage=teen', mres.json?.evolution?.stage === 'teen', JSON.stringify(mres.json?.evolution));

// Повторный лог без перехода → evolution=null
mres = await call('POST', `/api/habits/${hMile}/log`, { body: { status: 'done', date: isoDaysAgo(21) } });
check('МИЛСТОУН: без перехода → evolution=null', mres.json?.evolution === null || !mres.json?.evolution, JSON.stringify(mres.json?.evolution));

// ---------- 15. ЭТАП-D: ПРИКЛЮЧЕНИЯ ----------
await pool.query(`UPDATE users SET companion_xp=100 WHERE id=$1`, [USER.id]);
r = await call('GET', '/api/companion');
check('ADV: adventure=null, shopBonusAvailable=true', r.json?.adventure === null && r.json?.shopBonusAvailable === true, JSON.stringify({ a: r.json?.adventure, s: r.json?.shopBonusAvailable }));

r = await call('POST', '/api/companion/adventure/start');
check('ADV: старт → returnsAt через ~6ч', r.json?.ok === true && new Date(r.json.returnsAt) > new Date(), JSON.stringify(r.json));
r = await call('POST', '/api/companion/adventure/start');
check('ADV: повторный старт → 409', r.status === 409, `s=${r.status}`);
r = await call('POST', '/api/companion/adventure/claim');
check('ADV: ранний claim → 400 (ещё в пути)', r.status === 400, `s=${r.status}`);

// Тайм-тревел: returns_at в прошлое → claim работает
await pool.query(`UPDATE adventures SET returns_at = NOW() - INTERVAL '1 hour' WHERE user_id=$1 AND status='active'`, [USER.id]);
r = await call('POST', '/api/companion/adventure/claim');
check('ADV: claim после возврата → rewardLabel', r.json?.ok === true && typeof r.json?.rewardLabel === 'string' && r.json.rewardLabel.length > 0, JSON.stringify(r.json));
r = await call('POST', '/api/companion/adventure/claim');
check('ADV: повторный claim → 404 (нет активного)', r.status === 404, `s=${r.status}`);
r = await call('GET', '/api/companion');
check('ADV: после claim adventure=null (новое можно)', r.json?.adventure === null, JSON.stringify(r.json?.adventure));

// Яйцо не ходит в приключения
await pool.query(`UPDATE users SET companion_xp=10, companion_stage='egg' WHERE id=$1`, [USER.id]);
r = await call('POST', '/api/companion/adventure/start');
check('ADV: яйцо → 400 с подсказкой', r.status === 400, `s=${r.status}`);
await pool.query(`UPDATE users SET companion_xp=100, companion_stage='baby' WHERE id=$1`, [USER.id]);

// ---------- 16. ЭТАП-D: ЕЖЕДНЕВНАЯ БЕСПЛАТКА ----------
r = await call('POST', '/api/companion/shop/daily-bonus');
check('BONUS: первый визит → +10', r.json?.ok === true && r.json?.amount === 10, JSON.stringify(r.json));
r = await call('POST', '/api/companion/shop/daily-bonus');
check('BONUS: повтор в тот же день → 409', r.status === 409, `s=${r.status}`);
r = await call('GET', '/api/companion');
check('BONUS: shopBonusAvailable=false после получения', r.json?.shopBonusAvailable === false, `s=${r.json?.shopBonusAvailable}`);

// ---------- 17. ЭТАП-D: черта характера ----------
r = await call('PUT', '/api/companion', { body: { trait: 'sassy' } });
check('TRAIT: PUT sassy → ok', r.json?.ok === true, JSON.stringify(r.json));
r = await call('GET', '/api/companion');
check('TRAIT: читается sassy', r.json?.trait === 'sassy', r.json?.trait);
r = await call('PUT', '/api/companion', { body: { trait: 'evil' } });
check('TRAIT: невалидная черта → 400', r.status === 400, `s=${r.status}`);

// ---------- 18. ЭТАП-D: МАГАЗИН 30 предметов + домик ----------
r = await call('GET', '/api/companion/shop');
const shopItems = r.json || [];
check('SHOP: 30 предметов', shopItems.length === 30, `len=${shopItems.length}`);
const homeItems = shopItems.filter((i) => i.category === 'home');
check('SHOP: 14 домиков в категории home', homeItems.length === 14, `home=${homeItems.length}`);
await pool.query(`UPDATE users SET bonus_balance=1000 WHERE id=$1`, [USER.id]);
await call('POST', '/api/companion/buy', { body: { code: 'home_forest' } });
r = await call('POST', '/api/companion/equip', { body: { code: 'home_forest' } });
check('HOME: equip домика → equipped.home', r.json?.equipped?.home === 'home_forest', JSON.stringify(r.json?.equipped));

// ---------- 19. ЭТАП-D: ДАШБОРДЫ-ЦИФРЫ (сверка Stats/Recap с SQL-расчётом) ----------
console.log('\n--- ЭТАП D: дашборды ---');
// Чистая вселенная: удаляем ВСЕ привычки юзера (каскадно чистит логи) и создаём ровно 3
await pool.query(`DELETE FROM habits WHERE user_id=$1`, [USER.id]);
const dh1 = (await call('POST', '/api/habits', { body: { title: 'Д1', emoji: '1️⃣' } })).json.id;
const dh2 = (await call('POST', '/api/habits', { body: { title: 'Д2', emoji: '2️⃣' } })).json.id;
const dh3 = (await call('POST', '/api/habits', { body: { title: 'Д3', emoji: '3️⃣' } })).json.id;
// 3 дня: позавчера 3/3 (perfect), вчера 1/3 (skip), сегодня 2/3
const writes = [];
for (const [di, statuses] of [[2, ['done', 'done', 'done']], [1, ['done', 'skip', null]], [0, ['done', 'done', null]]]) {
  const habitsForDay = [dh1, dh2, dh3];
  statuses.forEach((st, idx) => {
    if (st) writes.push(call('POST', `/api/habits/${habitsForDay[idx]}/log`, { body: { status: st, date: isoDaysAgo(di) } }));
  });
}
await Promise.all(writes);
await new Promise((res) => setTimeout(res, 800));

r = await call('GET', '/api/stats?days=7');
const sqlDone = Number((await pool.query(`SELECT COUNT(*) c FROM habit_logs WHERE user_id=$1 AND status='done' AND log_date >= CURRENT_DATE - 2`, [USER.id])).rows[0].c);
check('DASH stats: doneToday = 2 (SQL-сверка)', r.json?.doneToday === 2, `api=${r.json?.doneToday}`);
check('DASH stats: totalHabits = 3', r.json?.totalHabits === 3, `api=${r.json?.totalHabits}`);
check('DASH stats: perfectDays = 1 (только позавчера 3/3)', r.json?.perfectDays === 1, `api=${r.json?.perfectDays}`);
check('DASH stats: currentPerfectStreak = 0 (сегодня 2/3 — серия порвана)', r.json?.currentPerfectStreak === 0, `api=${r.json?.currentPerfectStreak}`);
check('DASH stats: perDay длиной 7, последний done=2/3', (r.json?.perDay || []).length === 7 && r.json.perDay[6]?.done === 2 && r.json.perDay[6]?.total === 3, JSON.stringify(r.json?.perDay?.[6]));
// Rate — за ВСЁ 7-дневное окно: 6 выполнено из 21 ожидания (3 привычки × 7 дней)
const expectedRate = Math.round((6 / 21) * 100);
check(`DASH stats: completionRate = ${expectedRate}% (окно 7 дней: 6/21)`, r.json?.completionRate === expectedRate, `api=${r.json?.completionRate}`);

// Серия идеальных: дорисуем сегодня 3/3 → currentPerfectStreak станет 1 (позавчера+сегодня? вчера порвано → 1)
await call('POST', `/api/habits/${dh3}/log`, { body: { status: 'done', date: isoDaysAgo(0) } });
r = await call('GET', '/api/stats?days=7');
check('DASH stats: после 3/3 сегодня → currentPerfectStreak=1 (вчера рвало)', r.json?.currentPerfectStreak === 1, `api=${r.json?.currentPerfectStreak}`);

// Recap
r = await call('GET', '/api/recap');
const sqlDoneNow = Number((await pool.query(`SELECT COUNT(*) c FROM habit_logs WHERE user_id=$1 AND status='done' AND log_date >= CURRENT_DATE - 6`, [USER.id])).rows[0].c);
check('DASH recap: totalCheckins = SQL-сверка (7 done после добавки 3/3)', r.json?.totalCheckins === sqlDoneNow && sqlDoneNow === 7, `api=${r.json?.totalCheckins} sql=${sqlDoneNow}`);
check('DASH recap: activeDays = 3, perfectDays = 2', r.json?.activeDays === 3 && r.json?.perfectDays === 2, JSON.stringify({ a: r.json?.activeDays, p: r.json?.perfectDays }));
check('DASH recap: weekRange.from = 6 дней назад', r.json?.weekRange?.from === isoDaysAgo(6), `${r.json?.weekRange?.from} vs ${isoDaysAgo(6)}`);

// Home hero цифры (GET /habits — то, из чего фронт строит hero)
r = await call('GET', '/api/habits');
const todayIsoStr = new Date().toISOString().slice(0, 10);
const doneApi = (r.json || []).filter((h) => (h.logs || []).some((l) => l.date === todayIsoStr && l.status === 'done')).length;
check('DASH home: hero 3/3 выполнено сегодня (фронт посчитает doneApi=3 из этих же данных)', doneApi === 3 && r.json.length === 3, `done=${doneApi} total=${r.json.length}`);
const streaksOk = (r.json || []).every((h) => typeof h.streak === 'number');
check('DASH home: у каждой привычки числовой streak', streaksOk);

// ---------- ИТОГ ----------
console.log('\n========== ПИТОМЕЦ: ИТОГ ==========');
for (const l of results) console.log(l);
console.log(`\n✅ Прошло: ${passed}   ❌ Провалилось: ${failed}`);
process.exit(failed > 0 ? 1 : 0);

function isoDaysAgo(n) { const d = new Date(Date.now() - n * 86400000); return d.toISOString().slice(0, 10); }
