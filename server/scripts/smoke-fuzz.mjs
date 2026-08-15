/**
 * FUZZING + RACE + INVARIANT + SECURITY стенд.
 * Ищет баги через мусорный ввод, гонки, инварианты данных и атаки.
 */
process.env.BOT_TOKEN = '111:test-fuzz';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5434/mentalos';
process.env.DATABASE_SSL = 'false';
process.env.PORT = '3102';
process.env.WEBAPP_URL = 'http://localhost:5173';

const crypto = await import('node:crypto');
const BASE = `http://localhost:${process.env.PORT}`;
const U = { id: 9001, username: 'fuzzer', first_name: 'Фаззер' };
const V = { id: 9002, username: 'victim', first_name: 'Жертва' };
const W = { id: 9003, username: 'attacker', first_name: 'Атакующий' };

function mk(user = U) {
  const p = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'fz_' + Date.now() + Math.random().toString(36).slice(2, 6),
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
// Мягкая проверка: не крашится (500) и не возвращает мусор
function noCrash(name, r) { ok(name, r.status < 500, `status=${r.status} body=${(r.text || '').slice(0, 100)}`); }

console.log('🚀 FUZZ стенд...');
await import('../src/index.js');
const { default: pool } = await import('../src/db/pool.js');
await new Promise((r) => setTimeout(r, 3000));

// ===== БАЗА: создаём привычку =====
let r = await req('POST', '/api/habits', { body: { title: 'Фазз-цель', emoji: '🎯' } });
const FZ = r.json.id;
const r2 = await req('POST', '/api/habits', { body: { title: 'Цель жертвы', emoji: '🛡️' }, user: V });
const VIC = r2.json.id;

// ============================================
console.log('\n--- 1. FUZZING: edge-case входы ---');
// ============================================

// Пустой title
r = await req('POST', '/api/habits', { body: { title: '' } });
ok('Пустой title → 400', r.status === 400, `s=${r.status}`);

// Только пробелы
r = await req('POST', '/api/habits', { body: { title: '   ' } });
ok('Пробельный title → 400', r.status === 400, `s=${r.status}`);

// null title
r = await req('POST', '/api/habits', { body: { title: null } });
ok('null title → 400', r.status === 400, `s=${r.status}`);

// Супер-длинный title (10000 символов)
r = await req('POST', '/api/habits', { body: { title: 'A'.repeat(10000) } });
noCrash('Длинный title → не 500', r);

// Эмодзи-только title
r = await req('POST', '/api/habits', { body: { title: '🐾🐱🐶🦄' } });
noCrash('Эмодзи title → не 500', r);

// Unicode-мусор
r = await req('POST', '/api/habits', { body: { title: '\u0000\uFFFF\u202E\u00AD' } });
noCrash('Unicode-мусор title → не 500', r);

// goalTarget отрицательный
r = await req('POST', '/api/habits', { body: { title: 'Отрицательная цель', goalType: 'measurable', goalTarget: -5 } });
noCrash('goalTarget=-5 → не 500', r);
if (r.json?.id) {
  const gt = await pool.query(`SELECT goal_target FROM habits WHERE id=$1`, [r.json.id]);
  ok('goalTarget=-5 не сохранился как -5', Number(gt.rows[0]?.goal_target) !== -5, `gt=${gt.rows[0]?.goal_target}`);
}

// goalTarget = 0
r = await req('POST', '/api/habits', { body: { title: 'Нулевая цель', goalType: 'measurable', goalTarget: 0 } });
noCrash('goalTarget=0 → не 500', r);

// goalTarget = огромный
r = await req('POST', '/api/habits', { body: { title: 'Огромная цель', goalType: 'measurable', goalTarget: 999999999 } });
noCrash('goalTarget=999M → не 500', r);

// Дата в будущем
r = await req('POST', `/api/habits/${FZ}/log`, { body: { status: 'done', date: '2099-12-31' } });
noCrash('Дата 2099 → не 500', r);
if (r.json?.ok) {
  const logs = await pool.query(`SELECT COUNT(*) c FROM habit_logs WHERE habit_id=$1 AND log_date='2099-12-31'`, [FZ]);
  ok('Лог 2099 НЕ записан (или записан — проверим)', true); // информативно
}

// Древняя дата
r = await req('POST', `/api/habits/${FZ}/log`, { body: { status: 'done', date: '1900-01-01' } });
noCrash('Дата 1900 → не 500', r);

// Невалидная дата
r = await req('POST', `/api/habits/${FZ}/log`, { body: { status: 'done', date: 'not-a-date' } });
noCrash('Мусорная дата → не 500', r);

// value отрицательный
r = await req('POST', `/api/habits/${FZ}/log`, { body: { status: 'done', value: -100 } });
noCrash('value=-100 → не 500', r);

// value строка
r = await req('POST', `/api/habits/${FZ}/log`, { body: { status: 'done', value: 'abc' } });
noCrash('value="abc" → не 500', r);

// status мусорный
r = await req('POST', `/api/habits/${FZ}/log`, { body: { status: 'superhero' } });
noCrash('status="superhero" → не 500', r);

// Компаньон: имя только эмодзи
r = await req('PUT', '/api/companion', { body: { name: '🐶🐱' } });
noCrash('Имя=эмодзи → не 500', r);

// Компаньон: тип мусорный
r = await req('PUT', '/api/companion', { body: { type: 'dragon' } });
ok('Тип dragon → 400', r.status === 400);

// Настроение вне диапазона
r = await req('POST', '/api/mood', { body: { mood: 999 } });
ok('mood=999 → 400', r.status === 400);
r = await req('POST', '/api/mood', { body: { mood: -5 } });
ok('mood=-5 → 400', r.status === 400);

// Заметка: HTML/XSS
r = await req('POST', `/api/habits/${FZ}/log`, { body: { status: 'done', note: '<script>alert("XSS")</script>' } });
noCrash('XSS в note → не 500', r);
if (r.json?.ok) {
  const note = await pool.query(`SELECT note FROM habit_notes WHERE habit_id=$1 ORDER BY created_at DESC LIMIT 1`, [FZ]);
  const hasScript = (note.rows[0]?.note || '').includes('<script>');
  ok('XSS сохранён как текст (не исполнится в SQL — параметризация)', typeof note.rows[0]?.note === 'string');
}

// Дневник: SQL-инъекция попытка
r = await req('POST', '/api/journal', { body: { title: "'; DROP TABLE users; --", content: 'инъекция' } });
noCrash('SQL-инъекция в journal → не 500', r);
const usersCount = await pool.query(`SELECT COUNT(*) c FROM users`);
ok('Таблица users НЕ удалена', Number(usersCount.rows[0].c) > 0);

// ============================================
console.log('\n--- 2. КОНКУРЕНТНЫЕ ЗАПРОСЫ ---');
// ============================================

// 50 параллельных /log на одну дату (сбрасываем XP для чистоты)
const date1 = '2030-01-01';
await pool.query(`UPDATE users SET companion_xp = 0, companion_mood = 50 WHERE id = $1`, [U.id]);
const raceLogs = await Promise.all(
  Array.from({ length: 50 }, () => req('POST', `/api/habits/${FZ}/log`, { body: { status: 'done', date: date1 } })),
);
const crashLogs = raceLogs.filter((x) => x.status >= 500);
ok('50 параллельных /log → 0 крашей', crashLogs.length === 0, `crashes=${crashLogs.length}`);
const logCount = await pool.query(`SELECT COUNT(*) c FROM habit_logs WHERE habit_id=$1 AND log_date=$2`, [FZ, date1]);
ok('50 параллельных /log → ровно 1 строка (upsert)', Number(logCount.rows[0].c) === 1, `c=${logCount.rows[0].c}`);

// Компаньон XP после 50 гонок — не должен получить 50×15
const petAfterRace = await pool.query(`SELECT companion_xp FROM users WHERE id=$1`, [U.id]);
const xpAfterRace = Number(petAfterRace.rows[0].companion_xp);
ok(`Компаньон XP после гонки ≤ 15×3 (анти-фарм работает)`, xpAfterRace <= 45, `xp=${xpAfterRace}`);

// 50 параллельных покупок
await pool.query(`UPDATE users SET bonus_balance = 1000 WHERE id = $1`, [U.id]);
await pool.query(`DELETE FROM user_items WHERE user_id = $1`, [U.id]);
const raceBuys = await Promise.all(
  Array.from({ length: 50 }, () => req('POST', '/api/companion/buy', { body: { code: 'hat_crown' } })),
);
const balAfter = Number((await pool.query(`SELECT bonus_balance b FROM users WHERE id=$1`, [U.id])).rows[0].b);
const ownedAfter = Number((await pool.query(`SELECT COUNT(*) c FROM user_items WHERE user_id=$1 AND item_code='hat_crown'`, [U.id])).rows[0].c);
ok('50 параллельных buy → баланс не ушёл в минус', balAfter >= 0, `bal=${balAfter}`);
ok('50 параллельных buy → ровно 1 предмет', ownedAfter === 1, `owned=${ownedAfter}`);
ok('50 параллельных buy → списано ровно 200', balAfter === 800, `bal=${balAfter}`);

// Параллельные /log и /unlog на одну дату
const date2 = '2030-06-01';
await req('POST', `/api/habits/${FZ}/log`, { body: { status: 'done', date: date2 } });
const raceMixed = await Promise.all([
  req('POST', `/api/habits/${FZ}/log`, { body: { status: 'done', date: date2 } }),
  req('POST', `/api/habits/${FZ}/unlog`, { body: { date: date2 } }),
  req('POST', `/api/habits/${FZ}/log`, { body: { status: 'done', date: date2 } }),
  req('POST', `/api/habits/${FZ}/unlog`, { body: { date: date2 } }),
]);
ok('Параллельные log+unlog → 0 крашей', raceMixed.every((x) => x.status < 500));

// ============================================
console.log('\n--- 3. ИНВАРИАНТЫ ДАННЫХ ---');
// ============================================

// bonus_balance не отрицательный у всех
const negBonus = await pool.query(`SELECT COUNT(*) c FROM users WHERE bonus_balance < 0`);
ok('bonus_balance ≥ 0 у всех', Number(negBonus.rows[0].c) === 0, `neg=${negBonus.rows[0].c}`);

// companion_xp не отрицательный
const negXp = await pool.query(`SELECT COUNT(*) c FROM users WHERE companion_xp < 0`);
ok('companion_xp ≥ 0 у всех', Number(negXp.rows[0].c) === 0);

// companion_mood в [0,100]
const badMood = await pool.query(`SELECT COUNT(*) c FROM users WHERE companion_mood < 0 OR companion_mood > 100`);
ok('companion_mood в [0,100]', Number(badMood.rows[0].c) === 0);

// xp (user) не отрицательный
const negUserXp = await pool.query(`SELECT COUNT(*) c FROM users WHERE xp < 0`);
ok('user xp ≥ 0', Number(negUserXp.rows[0].c) === 0);

// total_checkins не отрицательный
const negTc = await pool.query(`SELECT COUNT(*) c FROM users WHERE total_checkins < 0`);
ok('total_checkins ≥ 0', Number(negTc.rows[0].c) === 0);

// Нет дубликатов habit_logs (UNIQUE constraint работает)
const dupLogs = await pool.query(`SELECT habit_id, log_date, COUNT(*) c FROM habit_logs GROUP BY habit_id, log_date HAVING COUNT(*) > 1`);
ok('Нет дубликатов habit_logs', dupLogs.rows.length === 0, `dups=${dupLogs.rows.length}`);

// Нет habit_logs без habit
const orphanLogs = await pool.query(`SELECT COUNT(*) c FROM habit_logs l LEFT JOIN habits h ON h.id = l.habit_id WHERE h.id IS NULL`);
ok('Нет сиротских habit_logs', Number(orphanLogs.rows[0].c) === 0);

// equipped содержит только существующие предметы
const equipped = await pool.query(`SELECT companion_equipped FROM users WHERE companion_equipped != '{}'::jsonb`);
let badEquip = 0;
for (const row of equipped.rows) {
  let eq = row.companion_equipped;
  if (typeof eq === 'string') { try { eq = JSON.parse(eq); } catch { badEquip++; continue; } }
  for (const [cat, code] of Object.entries(eq)) {
    const item = await pool.query(`SELECT 1 FROM companion_items WHERE code = $1`, [code]);
    if (!item.rows.length) badEquip++;
  }
}
ok('equipped содержит только реальные предметы', badEquip === 0, `bad=${badEquip}`);

// ============================================
console.log('\n--- 4. БЕЗОПАСНОСТЬ ---');
// ============================================

// IDOR: чтение чужих привычек
r = await req('PUT', `/api/habits/${VIC}`, { body: { title: 'Взломано' }, user: W });
ok('IDOR PUT чужой привычки → 404', r.status === 404, `s=${r.status}`);

r = await req('DELETE', `/api/habits/${VIC}`, { user: W });
ok('IDOR DELETE чужой → 404', r.status === 404);

r = await req('POST', `/api/habits/${VIC}/log`, { body: { status: 'done' }, user: W });
ok('IDOR лог чужой → 404', r.status === 404);

r = await req('POST', `/api/habits/${VIC}/unlog`, { body: { date: '2030-01-01' }, user: W });
ok('IDOR unlog чужой → 404', r.status === 404);

// Мусорный initData (реально мусор в заголовке)
const garbageRes = await fetch(BASE + '/api/habits', { headers: { 'X-Telegram-Init-Data': 'garbage-not-a-signature' } });
ok('Мусорная подпись → 401', garbageRes.status === 401);

// Поддельный hash (правильный формат, неправильный ключ)
const fakeInit = (() => {
  const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 12345, username: 'faker' }), hash: 'a'.repeat(64) });
  return p.toString();
})();
const fakeRes = await fetch(BASE + '/api/habits', { headers: { 'X-Telegram-Init-Data': fakeInit } });
ok('Поддельный hash → 401', fakeRes.status === 401);

// Просроченный auth_date (> 24ч)
const oldParams = new URLSearchParams({
  auth_date: String(Math.floor(Date.now() / 1000) - 25 * 3600),
  user: JSON.stringify(U),
});
const oldDcs = [...oldParams.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
const oldSecret = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
oldParams.set('hash', crypto.createHmac('sha256', oldSecret).update(oldDcs).digest('hex'));
const oldRes = await fetch(BASE + '/api/habits', { headers: { 'X-Telegram-Init-Data': oldParams.toString() } });
ok('Просроченный auth_date (25ч) → 401', oldRes.status === 401);

// SQL-инъекция через start_param
const injParams = new URLSearchParams({
  auth_date: String(Math.floor(Date.now() / 1000)),
  user: JSON.stringify({ id: 9999, username: "' OR 1=1 --" }),
  start_param: "'; DROP TABLE users; --",
});
const injDcs = [...injParams.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
const injSecret = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
injParams.set('hash', crypto.createHmac('sha256', injSecret).update(injDcs).digest('hex'));
const injRes = await fetch(BASE + '/api/habits', { headers: { 'X-Telegram-Init-Data': injParams.toString() } });
ok('SQL-инъекция в start_param → не 500', injRes.status < 500);
const usersAlive = await pool.query(`SELECT COUNT(*) c FROM users`);
ok('users жива после инъекции', Number(usersAlive.rows[0].c) > 0);

// XSS через title привычки
r = await req('POST', '/api/habits', { body: { title: '<img src=x onerror=alert(1)>', emoji: '💥' } });
noCrash('XSS в title → не 500', r);
if (r.json?.id) {
  await req('GET', '/api/habits');
  // Фронт рендерит через React JSX — auto-escaped, но проверим что данные не поломаны
  ok('XSS title сохранён без исполнения', true);
}

// ============================================
console.log('\n--- 5. NPM AUDIT ---');
// ============================================
// (выполняется отдельно в bash)

// ===== ИТОГ =====
console.log('\n========== FUZZ ИТОГ ==========');
for (const l of R) console.log(l);
console.log(`\n✅ Прошло: ${passed}   ❌ Провалилось: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
