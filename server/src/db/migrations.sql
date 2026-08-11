-- ============================================================
--  MentalOS v3 — полная схема БД (по анализу топ-трекеров)
--  Идемпотентные миграции: CREATE IF NOT EXISTS + DO $$ ALTER
-- ============================================================

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

CREATE TABLE IF NOT EXISTS categories (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    emoji           TEXT NOT NULL DEFAULT '📂',
    color           TEXT NOT NULL DEFAULT '#7C3AED',
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
    id              SERIAL PRIMARY KEY,
    referrer_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_username TEXT,
    bonus_awarded   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (referred_id)
);

CREATE TABLE IF NOT EXISTS bonus_transactions (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          INTEGER NOT NULL,
    reason          TEXT NOT NULL,
    meta            JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Заметки к отметкам (notes per check-in)
CREATE TABLE IF NOT EXISTS habit_notes (
    id              SERIAL PRIMARY KEY,
    habit_id        INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date        DATE NOT NULL,
    note            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (habit_id, log_date)
);

-- Настроения пользователя (mood tracking)
CREATE TABLE IF NOT EXISTS moods (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood            SMALLINT NOT NULL,           -- 1=плохо, 2=так себе, 3=норм, 4=хорошо, 5=отлично
    note            TEXT,
    log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, log_date)
);

-- Дневник (journal)
CREATE TABLE IF NOT EXISTS journal_entries (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT,
    content         TEXT NOT NULL,
    entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Челленджи (шаблоны + прогресс)
CREATE TABLE IF NOT EXISTS challenges (
    id              SERIAL PRIMARY KEY,
    code            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    emoji           TEXT NOT NULL DEFAULT '🎯',
    color           TEXT NOT NULL DEFAULT '#7C3AED',
    duration_days   INTEGER NOT NULL DEFAULT 30,
    habit_templates JSONB NOT NULL               -- массив {title, emoji, color}
);

CREATE TABLE IF NOT EXISTS user_challenges (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id    INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'active', -- active | done | abandoned
    UNIQUE (user_id, challenge_id, status)
);

-- ===== ДОБАВЛЯЕМ КОЛОНКИ (идемпотентно) =====
DO $$ BEGIN ALTER TABLE users ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';              EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN bonus_balance INTEGER NOT NULL DEFAULT 0;          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN referral_code TEXT;                                EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN referred_by BIGINT;                                EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN onboarded BOOLEAN NOT NULL DEFAULT FALSE;          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN xp INTEGER NOT NULL DEFAULT 0;                     EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN level INTEGER NOT NULL DEFAULT 1;                  EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN active_theme TEXT NOT NULL DEFAULT 'default';      EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN owned_themes JSONB NOT NULL DEFAULT '[]'::jsonb;   EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE habits ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE habits ADD COLUMN best_streak INTEGER NOT NULL DEFAULT 0;           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- Тип цели: 'boolean' (да/нет), 'measurable' (количественная цель), 'count' (счётчик)
DO $$ BEGIN ALTER TABLE habits ADD COLUMN goal_type TEXT NOT NULL DEFAULT 'boolean';        EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE habits ADD COLUMN goal_target INTEGER NOT NULL DEFAULT 1;           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE habits ADD COLUMN goal_unit TEXT NOT NULL DEFAULT 'раз';            EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- habit_logs: расширяем для skip и measurable
DO $$ BEGIN ALTER TABLE habit_logs ADD COLUMN status TEXT NOT NULL DEFAULT 'done';          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- status: 'done' (выполнено), 'skip' (пропуск, не портит streak), 'partial' (частично)
DO $$ BEGIN ALTER TABLE habit_logs ADD COLUMN value INTEGER;                                EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- value: для measurable целей — сколько выполнено (напр. 1500 мл воды)

UPDATE users SET referral_code = 'MOS' || id WHERE referral_code IS NULL;

-- ===== Seed challenges =====
INSERT INTO challenges (code, title, description, emoji, color, duration_days, habit_templates)
VALUES
  ('water_30', '30 дней воды 💧', 'Пей воду каждый день — почувствуй разницу в самочувствии', '💧', '#06B6D4', 30,
   '[{"title":"Пить 2л воды","emoji":"💧","color":"#06B6D4"}]'),
  ('morning_21', '21 день早起挑战', 'Вставай в одно и то же время — настрой биоритмы', '🌅', '#F59E0B', 21,
   '[{"title":"Ранний подъём","emoji":"🌅","color":"#F59E0B"},{"title":"Зарядка","emoji":"💪","color":"#EF4444"}]'),
  ('mindfulness_14', '14 дней осознанности 🧘', 'Медитация и дыхательные практики для спокойствия', '🧘', '#10B981', 14,
   '[{"title":"Медитация 10 мин","emoji":"🧘","color":"#10B981"}]'),
  ('reading_30', '30 дней чтения 📚', 'Читай по 30 минут в день — новая привычка к знаниям', '📚', '#7C3AED', 30,
   '[{"title":"Читать 30 минут","emoji":"📚","color":"#7C3AED"}]'),
  ('nofap_90', '90 дней силы 💪', 'Знаменитый челлендж самодисциплины', '🔥', '#EF4444', 90,
   '[{"title":"День без срыва","emoji":"✅","color":"#EF4444"}]'),
  ('digital_detox_7', '7 дней digital detox 📵', 'Меньше экрана — больше жизни', '📵', '#6366F1', 7,
   '[{"title":"Меньше 2ч соцсетей","emoji":"📵","color":"#6366F1"}]')
ON CONFLICT (code) DO NOTHING;

-- ===== Индексы =====
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_logs_habit_date ON habit_logs(habit_id, log_date);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_ach_user ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_cat_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_ref_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_bonus_user ON bonus_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON habit_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_moods_user_date ON moods(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_uc_user ON user_challenges(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_code ON users(referral_code);
