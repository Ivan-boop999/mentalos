# 🧠 MentalOS — Telegram Mini App «Трекер привычек»

Современный мини-апп для Telegram: отмечай привычки, веди серии 🔥, следи за статистикой и получай напоминания.

**Стек:** React + Vite (фронтенд) · Node.js + Express (бэкенд) · PostgreSQL (БД) · Telegram Bot API

---

## 📋 Что нужно сделать ТЕБЕ (около 15 минут)

Весь код уже написан. От тебя нужно только 4 шага — потому что доступы к твоим аккаунтам есть только у тебя.

### ⚠️ Шаг 0. ПЕРЕВЫПУСТИ ТОКЕН (безопасность!)

> Токен MentalOS ранее был в чате — его нужно сделать недействительным.

1. Открой [@BotFather](https://t.me/BotFather)
2. `/mybots` → выбери **MentalOS**
3. **API Token** → **Revoke current token**
4. Скопируй **новый токен** — именно его будешь использовать

---

### 🚀 Шаг 1. Локальный запуск (чтобы проверить)

Открой терминал (Git Bash) в папке проекта и выполни:

```bash
# 1. Установить все зависимости
npm run install:all

# 2. Создать файл .env из шаблона и заполнить его
cp .env.example .env
```

Открой файл `.env` в блокноте и впиши значения:

```env
BOT_TOKEN=твой_новый_токен_из_шага_0
DATABASE_URL=postgres://postgres:postgres@localhost:5432/mentalos
WEBAPP_URL=http://localhost:5173
PORT=3001
```

> 💡 Для DATABASE_URL локально нужен PostgreSQL. Если его нет — переходи сразу к **Шагу 2** (деплой на Render, там БД создаётся автоматически).

```bash
# 3. Применить миграции (создать таблицы) — только если есть локальная БД
npm run db:migrate

# 4. Запустить и фронтенд, и бэкенд (в двух терминалах)
npm run dev:server   # в первом терминале — бэкенд на :3001
npm run dev:client   # во втором терминале — фронтенд на :5173
```

Открой http://localhost:5173 в браузере — увидишь приложение. Вне Telegram данные будут фейковыми (режим разработки).

---

### 🌐 Шаг 2. Деплой на Render (бесплатно)

Render попросит подключить GitHub-репозиторий, поэтому сначала зальём код.

#### 2.1. Залить код на GitHub

Я (ZCode) могу сделать это за тебя, так как на твоём компе авторизован GitHub CLI. Просто попроси меня:

> «Залей MentalOS на мой GitHub»

Или вручную:

```bash
git init
git add .
git commit -m "MentalOS: трекер привычек"
gh repo create mentalos --public --source=. --push
```

#### 2.2. Зарегистрироваться на Render

1. Открой https://render.com
2. Нажми **Sign Up** → **GitHub** (авторизация через твой GitHub)
3. Разреши Render доступ к GitHub

#### 2.3. Создать базу данных PostgreSQL

1. В дашборде Render → **New +** → **PostgreSQL**
2. **Name:** `mentalos-db`
3. **Database:** `mentalos`
4. **User:** оставь auto-generated
5. **Region:** Frankfurt (ближе всего к СНГ) или любой
6. **Plan:** Free
7. Нажми **Create Database**
8. Жди ~2 минуты, пока создастся
9. Скопируй **Internal Database URL** (понадобится в п.2.4)

#### 2.4. Создать Web Service (бэкенд + фронтенд)

1. В дашборде Render → **New +** → **Web Service**
2. Выбери репозиторий **mentalos**
3. Заполни:
   - **Name:** `mentalos`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm --prefix server install && npm --prefix client install && npm --prefix client run build`
   - **Start Command:** `npm --prefix server start`
   - **Plan:** Free
4. Прокрути вниз → **Environment Variables** → добавь:

   | Key | Value |
   |-----|-------|
   | `BOT_TOKEN` | твой_новый_токен_из_шага_0 |
   | `DATABASE_URL` | Internal Database URL из п.2.3 |
   | `DATABASE_SSL` | `true` |
   | `WEBAPP_URL` | оставь пока пустым — впишешь после п.2.5 |
   | `NODE_VERSION` | `22.19.0` |

5. Нажми **Create Web Service**
6. Render будет собирать ~3-5 минут. В логах в конце увидишь `🚀 MentalOS сервер запущен`
7. После успешного старта найди свой URL сверху: `https://mentalos-xxxx.onrender.com`

#### 2.5. Применить миграции на проде

В Render открой твой Web Service → **Shell** (вкладка слева) и выполни:

```bash
cd server && npm run migrate
```

Увидишь: `✅ Миграции применены. Схема MentalOS готова.`

#### 2.6. Вернуться и вписать WEBAPP_URL

1. Render → твой Web Service → **Environment**
2. `WEBAPP_URL` = `https://mentalos-xxxx.onrender.com` (твой URL)
3. Save → сервис перезапустится

---

### 🔗 Шаг 3. Привязать Mini App к боту

1. Открой [@BotFather](https://t.me/BotFather)
2. `/mybots` → **MentalOS** → **Bot Settings** → **Menu Button** → **Configure menu button**
3. Отправь URL: `https://mentalos-xxxx.onrender.com` (твой URL из Render)
4. Текст кнопки: `🧠 Открыть MentalOS`

Также можно задать **Mini App URL**:
- **Bot Settings** → **Menu Button** → и впиши URL

---

### ✅ Шаг 4. Готово!

Открой своего бота MentalOS в Telegram → нажми кнопку меню → мини-апп откроется. 🎉

---

## 📁 Структура проекта

```
Трекер привычек/
├── client/              ← React-фронтенд
│   ├── src/
│   │   ├── components/  ← HabitCard, BottomNav, AddHabitModal
│   │   ├── pages/       ← Home, Stats, Settings
│   │   ├── context/     ← ThemeContext
│   │   ├── hooks/       ← useTelegram
│   │   ├── api/         ← API-клиент
│   │   └── styles/      ← theme.css, app.css
│   └── vite.config.js
├── server/              ← Node.js бэкенд
│   ├── src/
│   │   ├── routes/      ← habits, stats, settings
│   │   ├── db/          ← pool.js, migrations.sql, migrate.js
│   │   ├── bot/         ← index.js, scheduler.js
│   │   ├── middleware/  ← auth.js (проверка initData)
│   │   └── index.js
│   └── package.json
├── .env.example
└── README.md
```

## 🔒 Безопасность

- Токен бота хранится **только в переменных окружения** (`.env` локально, Environment Variables на Render)
- `.env` в `.gitignore` — не попадает в GitHub
- Авторизация каждого запроса проверяется через подпись Telegram (HMAC-SHA256) на сервере
- Пользователь не может получить данные другого пользователя

## ❓ Частые вопросы

**Q: Напоминания приходят в неправильное время.**
A: Время хранится в UTC. Если ты в Москве (UTC+3) и хочешь напоминание в 9:00, ставь `06:00`.

**Q: Бесплатный тариф Render засыпает.**
A: Да, через 15 минут бездействия сервис «засыпает» и просыпается ~30 сек при первом запросе. Для продакшена — апгрейд до Starter ($7/мес).

**Q: Можно поменять цвета/иконки?**
A: Да, в `client/src/styles/theme.css` меняй CSS-переменные. Иконки привычек — эмодзи, выбор из палитры в интерфейсе.

---

Сделано с ❤️ для развития полезных привычек.
