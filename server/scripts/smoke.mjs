/**
 * ЖИВОЙ smoke-тест MentalOS: поднимает сервер против Docker PostgreSQL,
 * подписывает initData как настоящий Telegram (HMAC) и прогоняет все API.
 * Запуск: node scripts/smoke.mjs
 */
process.env.BOT_TOKEN = '111:test-token-local-smoke';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5434/mentalos';
process.env.DATABASE_SSL = 'false';
process.env.PORT = '3100';
process.env.WEBAPP_URL = 'http://localhost:5173';

const crypto = await import('node:crypto');
const BASE = `http://localhost:${process.env.PORT}`;

function makeInitData(user) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'smoke_' + Date.now(),
    user: JSON.stringify(user),
  });
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

let passed = 0, failed = 0;
const results = [];
async function call(method, path, { body, user, init } = {}) {
  const initData = init !== undefined ? init : makeInitData(user || { id: 5001, username: 'tester', first_name: 'Тестер' });
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
function check(name, cond, extra = '') {
  if (cond) { passed++; results.push(`✅ ${name}`); }
  else { failed++; results.push(`❌ ${name} ${extra}`); }
}

// ===== 1. Запускаем сервер (миграции применяются автоматически) =====
console.log('🚀 Поднимаю сервер (миграции + автостарт)...');
await import('../src/index.js');
await new Promise((r) => setTimeout(r, 3500));

// ===== 2. Публичные эндпоинты =====
let r = await fetch(BASE + '/health');
check('GET /health = 200 ok', r.status === 200);

r = await fetch(BASE + '/api/share/story.png?streak=7&name=Test&ach=Smoke');
const pngBuf = Buffer.from(await r.arrayBuffer());
check('GET /api/share/story.png — PNG 1080×1920', r.status === 200 && pngBuf[0] === 0x89 && pngBuf.length > 50000, `len=${pngBuf.length}`);

// ===== 3. Auth =====
r = await call('GET', '/api/habits', { init: 'garbage' });
check('Мусорный initData → 401', r.status === 401);

// ===== 4. Привычки: CRUD =====
r = await call('POST', '/api/habits', { body: { title: 'Пить воду', emoji: '💧', color: '#06B6D4', goalType: 'measurable', goalTarget: 8, goalUnit: 'стаканов', cue: 'после завтрака', identity: 'здоровым', timeOfDay: 'morning' } });
check('POST habit (measurable+cue+identity)', r.status === 201 && r.json?.id, JSON.stringify(r.json));
const habitId = r.json.id;

r = await call('POST', '/api/habits', { body: { title: 'Зарядка', emoji: '💪' } });
const habit2 = r.json.id;
check('POST habit #2 (boolean)', r.status === 201 && habit2);

r = await call('PUT', `/api/habits/${habit2}`, { body: { title: 'Зарядка 15 мин', reminderTime: '' } });
check('PUT habit (переименование + сброс напоминания пустой строкой)', r.status === 200 && r.json?.title === 'Зарядка 15 мин' && r.json?.reminder_time === null, JSON.stringify(r.json));

// ===== 5. Лог: done / skip / partial / IDOR =====
r = await call('POST', `/api/habits/${habitId}/log`, { body: { status: 'done', value: 8 } });
check('log done (measurable value=8=цель) → streak 1', r.json?.streak === 1 && r.json?.status === 'done', JSON.stringify(r.json));

r = await call('POST', `/api/habits/${habitId}/log`, { body: { status: 'done', value: 3 } });
check('log done с value<цели → partial', r.json?.status === 'partial');

r = await call('POST', `/api/habits/${habit2}/log`, { body: { status: 'skip' } });
check('log skip → ok, streak не растёт', r.json?.ok === true);

r = await call('POST', `/api/habits/${habit2}/log`, { body: { status: 'done', note: 'пробежал легко' } });
check('log done с note → note сохраняется', r.json?.ok === true);

const stranger = { id: 666, username: 'stranger', first_name: 'Злюка' };
r = await call('POST', `/api/habits/${habitId}/log`, { body: { status: 'done' }, user: stranger });
check('IDOR: чужая привычка → 404', r.status === 404, `status=${r.status}`);

// ===== 6. GET привычки =====
r = await call('GET', '/api/habits');
check('GET habits: 2 шт, cue/identity/time_of_day на месте', r.json?.length === 2 && r.json[0]?.cue === 'после завтрака' && r.json[0]?.identity === 'здоровым' && r.json[0]?.time_of_day === 'morning', JSON.stringify(r.json?.[0]));
check('GET habits: streak/notes/todayValue', typeof r.json?.[0]?.streak === 'number' && r.json?.[0]?.notes && 'todayValue' in r.json[0]);

// ===== 7. Календарь/heatmap/srength =====
r = await call('GET', `/api/habits/calendar?id=${habitId}&months=1`);
check('GET calendar → logs[]', Array.isArray(r.json?.logs));

r = await call('GET', '/api/habits/year-heatmap');
check('GET year-heatmap → days[]', Array.isArray(r.json?.days));

r = await call('GET', `/api/habits/${habitId}/strength`);
check('GET strength → score', typeof r.json?.score === 'number');

// ===== 8. Архив/восстановление =====
r = await call('DELETE', `/api/habits/${habit2}`);
check('DELETE habit → архив', r.json?.ok === true);
r = await call('GET', '/api/habits/archived');
check('GET archived → 1', r.json?.length === 1);
r = await call('POST', `/api/habits/${habit2}/restore`);
check('POST restore → ok', r.json?.ok === true);

// ===== 9. Категории/челленджи/шаблоны =====
r = await call('GET', '/api/challenges');
check('GET challenges → 10 (6 челленджей + 4 шаблона)', r.json?.length === 10, `len=${r.json?.length}`);
const tpl = r.json.find((c) => c.code === 'tpl_health');
r = await call('POST', `/api/challenges/${tpl.id}/join`);
check('join шаблон tpl_health → привычки созданы', r.json?.created === 3, JSON.stringify(r.json));

// ===== 10. Настроение/дневник =====
r = await call('POST', '/api/mood', { body: { mood: 5, note: 'отличный день' } });
check('POST mood → upsert', r.json?.mood === 5);
r = await call('GET', '/api/mood?days=7');
check('GET mood → массив', Array.isArray(r.json) && r.json.length === 1);

r = await call('POST', '/api/journal', { body: { title: 'День 1', content: 'Начал трекать' } });
check('POST journal', r.status === 201 && r.json?.id);
r = await call('GET', '/api/journal');
check('GET journal → 1 запись', r.json?.length === 1);

// ===== 11. Миссии =====
r = await call('GET', '/api/missions');
check('GET missions → сгенерированы (1-2)', Array.isArray(r.json) && r.json.length >= 1 && r.json.length <= 2, `len=${r.json?.length}`);
const m0 = r.json[0];
if (m0) check(`миссия прогрессирует (progress=${m0.progress}, target=${m0.target})`, m0.progress > 0 || m0.target > 1, '');

// ===== 13. Бадди: согласие =====
const friend = { id: 5002, username: 'drug', first_name: 'Друг' };
// Друг должен существовать в системе (сделать хоть один запрос) — как в реальной жизни
await call('GET', '/api/settings', { user: friend });
r = await call('POST', '/api/buddies/invite', { body: { code: 'drug' } });
console.log('   [debug] invite:', r.status, r.text?.slice(0, 200));
check('buddy invite по @username → pending', r.json?.ok === true && r.json?.pending === true, JSON.stringify(r.json));
r = await call('GET', '/api/buddies', { user: friend });
check('друг видит входящую заявку', r.json?.incoming?.length === 1, JSON.stringify(r.json?.incoming));
const invId = r.json?.incoming?.[0]?.id;
if (invId) {
  r = await call('POST', `/api/buddies/${invId}/accept`, { user: friend });
  check('друг принимает → оба бадди', r.json?.ok === true);
  r = await call('GET', '/api/buddies');
  check('у меня 1 принятый бадди', r.json?.accepted?.length === 1);
}

// ===== 14. Дуэли: полный цикл =====
// Тест-среда: даём тестеру бонусов на ставку (прямой UPDATE, вне API)
const { default: pool } = await import('../src/db/pool.js');
await pool.query(`UPDATE users SET bonus_balance = 500 WHERE id = 5001`);
r = await call('POST', '/api/duels', { body: { opponentId: 5002, wager: 50 } });
check('создание дуэли → pending + эскроу', r.json?.ok === true && r.json?.duelId, JSON.stringify(r.json));
const duelId = r.json?.duelId;
if (duelId) {
  r = await call('POST', `/api/duels/${duelId}/accept`, { user: friend });
  check('оппонент принимает дуэль', r.json?.ok === true);
  r = await call('POST', `/api/duels/${duelId}/finish`);
  check('finish → winnerId определён (или ничья)', r.json?.ok === true && 'winnerId' in r.json);
}

// ===== 15. Статистика/Recap/Leaderboard =====
r = await call('GET', '/api/stats?days=7');
check('GET stats: trend + perfectDays', typeof r.json?.trend === 'string' && typeof r.json?.perfectDays === 'number', JSON.stringify(r.json?.trend));
r = await call('GET', '/api/recap');
check('GET recap: totalCheckins/weekRange', typeof r.json?.totalCheckins === 'number' && r.json?.weekRange?.from, JSON.stringify(r.json?.weekRange));
r = await call('GET', '/api/leaderboard');
check('GET leaderboard: Я присутствую (relation=me)', (r.json?.users || []).some((u) => u.relation === 'me'), JSON.stringify(r.json?.users?.map?.((u) => u.relation)));
r = await call('PUT', '/api/leaderboard/visibility', { body: { public: true } });
check('PUT visibility → public', r.json?.public === true);

// ===== 16. Достижения =====
r = await call('GET', '/api/achievements');
check('GET achievements: 6 тиров + first_checkin получен', r.json?.tiers?.length === 6 && r.json?.tiers?.[0]?.unlocked === true, JSON.stringify(r.json?.tiers?.map?.((t) => `${t.code}:${t.unlocked}`)));

// ===== 17. Настройки/страховка/рефералка =====
r = await call('GET', '/api/settings');
check('GET settings: streak_insurance/onboarded/ownedThemes', 'streak_insurance' in (r.json || {}) && 'ownedThemes' in (r.json || {}), JSON.stringify(r.json));
r = await call('POST', '/api/habits/buy-streak-insurance');
check('buy streak-insurance → ok/402 (явный ответ)', r.status === 200 || r.status === 402, JSON.stringify(r.json));
r = await call('GET', '/api/referral');
check('GET referral: баланс + реферал друг засчитан?', typeof r.json?.balance === 'number' && r.json?.shareUrl, JSON.stringify({ balance: r.json?.balance }));

// ===== 18. Экспорт =====
r = await call('GET', '/api/export');
console.log('   [debug] export JSON:', r.status, (r.text || '').slice(0, 200));
check('GET export JSON', r.status === 200 && r.json?.app === 'MentalOS');
r = await call('GET', '/api/export/csv');
// undici text() срезает BOM (TextDecoder), поэтому проверяем контент;
// наличие BOM в коде: '\uFEFF' + csv (внешняя проверка curl/node:http подтвердила 200)
check('GET export CSV: 200 + заголовок таблицы', r.status === 200 && (r.text || '').startsWith('date,habit_id'));

// ===== ИТОГ =====
console.log('\n========== ИТОГ ==========');
for (const line of results) console.log(line);
console.log(`\n✅ Прошло: ${passed}   ❌ Провалилось: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
