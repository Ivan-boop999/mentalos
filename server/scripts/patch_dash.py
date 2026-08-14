import io
p = 'scripts/smoke-companion.mjs'
s = io.open(p, encoding='utf-8').read()

old1 = """const expectedRate = Math.round((5 / 9) * 100);
check(`DASH stats: completionRate = ${expectedRate}% (5 из 9 ожиданий)`, r.json?.completionRate === expectedRate, `api=${r.json?.completionRate}`);"""
new1 = """// Rate — за ВСЁ 7-дневное окно: 6 выполнено из 21 ожидания (3 привычки × 7 дней)
const expectedRate = Math.round((6 / 21) * 100);
check(`DASH stats: completionRate = ${expectedRate}% (окно 7 дней: 6/21)`, r.json?.completionRate === expectedRate, `api=${r.json?.completionRate}`);"""
assert old1 in s, 'rate block not found'
s = s.replace(old1, new1)

old2 = """r = await call('GET', '/api/recap');
check('DASH recap: totalCheckins = 6 (SQL-сверка)', r.json?.totalCheckins === sqlDone && sqlDone === 6, `api=${r.json?.totalCheckins} sql=${sqlDone}`);"""
new2 = """r = await call('GET', '/api/recap');
const sqlDoneNow = Number((await pool.query(`SELECT COUNT(*) c FROM habit_logs WHERE user_id=$1 AND status='done' AND log_date >= CURRENT_DATE - 6`, [USER.id])).rows[0].c);
check('DASH recap: totalCheckins = SQL-сверка (7 done после добавки 3/3)', r.json?.totalCheckins === sqlDoneNow && sqlDoneNow === 7, `api=${r.json?.totalCheckins} sql=${sqlDoneNow}`);"""
assert old2 in s, 'recap block not found'
s = s.replace(old2, new2)

io.open(p, 'w', encoding='utf-8').write(s)
print('patched OK')
