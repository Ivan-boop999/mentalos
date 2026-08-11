-- ============================================================
--  MentalOS — схема базы данных PostgreSQL (v2)
--  Идемпотентная миграция: создаёт таблицы и добавляет колонки.
-- ============================================================

-- ===== Таблицы =====
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT PRIMARY KEY,
    username        TEXT,
    first_name      TEXT,
    theme           TEXT NOT NULL DEFAULT 'auto',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habits (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    emoji           TEXT NOT NULL DEFAULT '✨',
    color           TEXT NOT NULL DEFAULT '#7C3AED',
    frequency       JSONB NOT NULL DEFAULT '{"type":"daily"}'::jsonb,
    reminder_time   TIME,
    archived        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
    id              SERIAL PRIMARY KEY,
    habit_id        INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date        DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (habit_id, log_date)
);

CREATE TABLE IF NOT EXISTS achievements (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_id        INTEGER REFERENCES habits(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,
    unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, habit_id, code)
);

-- Категории привычек (Health, Work, Sport...)
CREATE TABLE IF NOT EXISTS categories (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    emoji           TEXT NOT NULL DEFAULT '📂',
    color           TEXT NOT NULL DEFAULT '#7C3AED',
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Реферальная программа
CREATE TABLE IF NOT EXISTS referrals (
    id              SERIAL PRIMARY KEY,
    referrer_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_username TEXT,
    bonus_awarded   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (referred_id)
);

-- История начисления/списания бонусов
CREATE TABLE IF NOT EXISTS bonus_transactions (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          INTEGER NOT NULL,            -- +начисление, -списание
    reason          TEXT NOT NULL,               -- 'referral', 'streak_7', 'purchase_theme', ...
    meta            JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== ДОБАВЛЯЕМ колонки, если их ещё нет =====
DO $$ BEGIN ALTER TABLE users ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';        EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN bonus_balance INTEGER NOT NULL DEFAULT 0;    EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN referral_code TEXT;                          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN referred_by BIGINT;                          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN onboarded BOOLEAN NOT NULL DEFAULT FALSE;    EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE habits ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE habits ADD COLUMN best_streak INTEGER NOT NULL DEFAULT 0;     EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Заполняем referral_code для существующих пользователей
UPDATE users SET referral_code = 'MOS' || id WHERE referral_code IS NULL;

-- ===== Индексы =====
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_logs_habit_date ON habit_logs(habit_id, log_date);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_ach_user ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_cat_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_ref_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_bonus_user ON bonus_transactions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_code ON users(referral_code);
