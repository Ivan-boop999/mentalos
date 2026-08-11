-- ============================================================
--  MentalOS — схема базы данных PostgreSQL
-- ============================================================

-- Пользователи Telegram (создаются автоматически при первом входе в мини-апп)
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT PRIMARY KEY,            -- telegram user id (уникальный)
    username        TEXT,                          -- @username (может быть NULL)
    first_name      TEXT,                          -- имя из Telegram
    theme           TEXT NOT NULL DEFAULT 'auto',  -- 'auto' | 'light' | 'dark'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Привычки пользователя
CREATE TABLE IF NOT EXISTS habits (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,                  -- название, напр. "Зарядка"
    emoji           TEXT NOT NULL DEFAULT '✨',     -- иконка-эмодзи
    color           TEXT NOT NULL DEFAULT '#7C3AED',-- цвет акцента (HEX)
    frequency       JSONB NOT NULL DEFAULT '{"type":"daily"}'::jsonb,
                    -- {"type":"daily"}               — каждый день
                    -- {"type":"weekly","days":[1,3,5]} — пн, ср, пт (0=вс ... 6=сб)
    reminder_time   TIME,                           -- время напоминания, напр. '09:00' (NULL = без напоминания)
    archived        BOOLEAN NOT NULL DEFAULT FALSE, -- мягкое удаление
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id) WHERE archived = FALSE;

-- Отметки выполнения (одна запись = одна привычка выполнена в определённый день)
CREATE TABLE IF NOT EXISTS habit_logs (
    id              SERIAL PRIMARY KEY,
    habit_id        INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date        DATE NOT NULL,                  -- дата выполнения (без времени)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (habit_id, log_date)                     -- нельзя отметить дважды за один день
);

CREATE INDEX IF NOT EXISTS idx_logs_habit_date ON habit_logs(habit_id, log_date);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON habit_logs(user_id, log_date);
