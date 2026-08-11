-- ============================================================
--  MentalOS — схема базы данных PostgreSQL
--  Идемпотентная миграция: создаёт таблицы если их нет,
--  и ДОБАВЛЯЕТ колонки если их не хватает (для обновлений).
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

-- ===== ДОБАВЛЯЕМ колонки, если их ещё нет =====
-- Это нужно, потому что CREATE TABLE IF NOT EXISTS не трогает существующие таблицы.
-- DO $$ ... EXCEPTION WHEN OTHERS THEN END $$ — подавляет ошибку "колонка уже существует".

DO $$ BEGIN
    ALTER TABLE users ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Индексы (IF NOT EXISTS поддерживается PostgreSQL 9.5+)
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_logs_habit_date ON habit_logs(habit_id, log_date);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_ach_user ON achievements(user_id);
