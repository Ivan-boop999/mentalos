import io

def patch(path, repls):
    s = io.open(path, encoding='utf-8').read()
    for a, b in repls:
        if a in s:
            s = s.replace(a, b)
        else:
            print(f"WARN not found in {path}: {a[:70]!r}")
    io.open(path, 'w', encoding='utf-8').write(s)
    print("patched", path)

patch('src/routes/habits.js', [
    ("const today = new Date(); today.setHours(0, 0, 0, 0);",
     "const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z'); // UTC-якорь"),
    ("for (let i = 0; i < 365; i++) {\n      const d = new Date(today); d.setDate(d.getDate() - i);\n      if (!days || days.includes(d.getDay())) expectedDates.add(d.toISOString().slice(0, 10));",
     "for (let i = 0; i < 365; i++) {\n      const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);\n      if (!days || days.includes(d.getUTCDay())) expectedDates.add(d.toISOString().slice(0, 10));"),
])

patch('src/routes/achievements.js', [
    ("let streak = 0;\n  const cursor = new Date();",
     "let streak = 0;\n  let cursor = new Date();"),
    ("cursor.setHours(0, 0, 0, 0);",
     "cursor = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z'); // UTC-якорь"),
    ("const expected = !days || days.includes(cursor.getDay());",
     "const expected = !days || days.includes(cursor.getUTCDay());"),
    ("cursor.setDate(cursor.getDate() - 1);",
     "cursor.setUTCDate(cursor.getUTCDate() - 1);"),
])

patch('src/routes/stats.js', [
    ("const today = new Date();\n    today.setHours(0, 0, 0, 0);",
     "const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z'); // UTC-якорь"),
    ("const d = new Date(today);\n        d.setDate(d.getDate() - i);\n        const iso = d.toISOString().slice(0, 10);\n        const dow = d.getDay();",
     "const d = new Date(today);\n        d.setUTCDate(d.getUTCDate() - i);\n        const iso = d.toISOString().slice(0, 10);\n        const dow = d.getUTCDay();"),
    ("let streak = 0;\n  const cursor = new Date();",
     "let streak = 0;\n  const cursor = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z'); // UTC-якорь"),
    ("const expected = !days || days.includes(cursor.getDay());",
     "const expected = !days || days.includes(cursor.getUTCDay());"),
    ("cursor.setDate(cursor.getDate() - 1);",
     "cursor.setUTCDate(cursor.getUTCDate() - 1);"),
    ("const d = new Date(today);\n        d.setDate(d.getDate() - i);\n        const iso = d.toISOString().slice(0, 10);\n        if (!freq?.days || freq.days.includes(d.getDay())) {",
     "const d = new Date(today);\n        d.setUTCDate(d.getUTCDate() - i);\n        const iso = d.toISOString().slice(0, 10);\n        if (!freq?.days || freq.days.includes(d.getUTCDay())) {"),
])

# recap.js: локальный парc даты → UTC
patch('src/routes/recap.js', [
    ("const dow = new Date(dateStr + 'T00:00:00').getDay();",
     "const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay(); // UTC-день"),
])
