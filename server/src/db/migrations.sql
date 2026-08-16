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

-- Подзадачи (sub-tasks) внутри привычек
CREATE TABLE IF NOT EXISTS habit_subtasks (
    id              SERIAL PRIMARY KEY,
    habit_id        INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    done            BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Бадди (партнёры по ответственности)
CREATE TABLE IF NOT EXISTS buddies (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buddy_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | declined
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, buddy_id)
);

-- Таблица для дедупликации buddy-уведомлений (должна быть в миграции, не на лету)
CREATE TABLE IF NOT EXISTS buddy_notified (
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    PRIMARY KEY (user_id, date)
);

-- Дедупликация «голоса питомца» (утро/вечер/возвращение — не чаще раза в день)
CREATE TABLE IF NOT EXISTS pet_notified (
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    kind            TEXT NOT NULL,                -- morning | evening | comeback | visit:1:2
    PRIMARY KEY (user_id, date, kind)
);

-- Приключения питомца (appointment-цикл Finch)
CREATE TABLE IF NOT EXISTS adventures (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returns_at      TIMESTAMPTZ NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active',  -- active | completed | claimed
    reward_type     TEXT,                           -- bonus | xp | item | mood | egg
    reward_amount   INTEGER,
    reward_item     TEXT,
    egg_species     TEXT,                           -- если reward_type='egg' → какой вид вылупится
    claimed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_adventures_user ON adventures(user_id);
CREATE INDEX IF NOT EXISTS idx_adventures_active ON adventures(status, returns_at) WHERE status = 'active';

-- Виды питомцев (каталог)
CREATE TABLE IF NOT EXISTS pet_species (
    code            TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    emoji           TEXT NOT NULL,
    price           INTEGER NOT NULL DEFAULT 0,      -- 0 = бесплатный (базовые 4)
    colors          JSONB NOT NULL,                   -- {main, light, glow, accent}
    sort_order      INTEGER NOT NULL DEFAULT 0
);

-- Коллекция питомцев пользователя
CREATE TABLE IF NOT EXISTS user_pets (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    species_code    TEXT NOT NULL REFERENCES pet_species(code),
    name            TEXT NOT NULL DEFAULT 'Спарк',
    xp              INTEGER NOT NULL DEFAULT 0,
    mood            INTEGER NOT NULL DEFAULT 50,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    is_shiny        BOOLEAN NOT NULL DEFAULT FALSE,
    obtained_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, species_code)
);

-- Дневник питомца (таймлайн событий)
CREATE TABLE IF NOT EXISTS pet_events (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    species_code    TEXT,
    event_type      TEXT NOT NULL,                    -- hatch | evolve | adventure | birthday | visit | item
    event_data      JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_events_user ON pet_events(user_id, created_at DESC);

-- Кастомизация компаньона (шапки, очки, одежда — покупаются за бонусы)
CREATE TABLE IF NOT EXISTS companion_items (
    id              SERIAL PRIMARY KEY,
    code            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    category        TEXT NOT NULL,           -- hat | glasses | accessory | body
    emoji           TEXT NOT NULL,
    price           INTEGER NOT NULL DEFAULT 50,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

-- Инвентарь пользователя (купленные предметы)
CREATE TABLE IF NOT EXISTS user_items (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_code       TEXT NOT NULL,
    equipped        BOOLEAN NOT NULL DEFAULT FALSE,
    acquired_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, item_code)
);

-- Миссии дня (Mission of the Day)
CREATE TABLE IF NOT EXISTS missions (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,           -- напр. 'checkin_3_morning'
    title           TEXT NOT NULL,
    description     TEXT,
    target          INTEGER NOT NULL DEFAULT 1,
    progress        INTEGER NOT NULL DEFAULT 0,
    reward          INTEGER NOT NULL DEFAULT 10,
    completed       BOOLEAN NOT NULL DEFAULT FALSE,
    mission_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, code, mission_date)
);

-- Битвы привычек (Duels PvP)
CREATE TABLE IF NOT EXISTS duels (
    id              SERIAL PRIMARY KEY,
    challenger_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending', -- pending | active | finished
    challenger_streak INTEGER NOT NULL DEFAULT 0,
    opponent_streak  INTEGER NOT NULL DEFAULT 0,
    winner_id       BIGINT REFERENCES users(id),
    wager           INTEGER NOT NULL DEFAULT 50,     -- ставка в бонусах
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMPTZ,
    UNIQUE (challenger_id, opponent_id, started_at)
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
DO $$ BEGIN ALTER TABLE users ADD COLUMN total_checkins INTEGER NOT NULL DEFAULT 0;         EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN public_profile BOOLEAN NOT NULL DEFAULT FALSE;     EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN companion_name TEXT NOT NULL DEFAULT 'Спарк';       EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN companion_type TEXT NOT NULL DEFAULT 'spark';      EXCEPTION WHEN duplicate_column THEN NULL; END $$; -- spark|leaf|drop|flame
DO $$ BEGIN ALTER TABLE users ADD COLUMN companion_xp INTEGER NOT NULL DEFAULT 0;            EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN companion_mood INTEGER NOT NULL DEFAULT 50;         EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN last_mood_decay TIMESTAMPTZ;                          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN companion_trait TEXT NOT NULL DEFAULT 'curious';      EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN companion_birthday DATE;                              EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN companion_stage TEXT NOT NULL DEFAULT 'egg';          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN last_shop_bonus DATE;                                 EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN active_species TEXT NOT NULL DEFAULT 'spark';        EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ===== Seed pet_species (8 видов: 4 бесплатных + 4 премиум) =====
INSERT INTO pet_species (code, title, emoji, price, colors, sort_order) VALUES
  ('spark', 'Спарк', '✨', 0, '{"main":"#7C3AED","light":"#A78BFA","glow":"#C4B5FD","accent":"#FBBF24"}', 1),
  ('leaf', 'Листик', '🌿', 0, '{"main":"#10B981","light":"#34D399","glow":"#6EE7B7","accent":"#84CC16"}', 2),
  ('drop', 'Капелька', '💧', 0, '{"main":"#06B6D4","light":"#22D3EE","glow":"#67E8F9","accent":"#3B82F6"}', 3),
  ('flame', 'Огонёк', '🔥', 0, '{"main":"#F59E0B","light":"#FBBF24","glow":"#FCD34D","accent":"#EF4444"}', 4),
  ('star', 'Звёздный', '🌟', 500, '{"main":"#F59E0B","light":"#FCD34D","glow":"#FDE68A","accent":"#7C3AED"}', 5),
  ('frost', 'Ледяной', '❄️', 800, '{"main":"#0EA5E9","light":"#7DD3FC","glow":"#BAE6FD","accent":"#06B6D4"}', 6),
  ('shadow', 'Теневой', '🌑', 1000, '{"main":"#1E1B4B","light":"#4C1D95","glow":"#7C3AED","accent":"#EC4899"}', 7),
  ('rainbow', 'Радужный', '🌈', 2000, '{"main":"#EC4899","light":"#F59E0B","glow":"#84CC16","accent":"#06B6D4"}', 8)
ON CONFLICT (code) DO NOTHING;

-- Автосоздание базового питомца при первом входе (миграция для существующих юзеров)
INSERT INTO user_pets (user_id, species_code, name, is_active)
SELECT u.id, u.active_species, u.companion_name, TRUE
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_pets up WHERE up.user_id = u.id)
ON CONFLICT DO NOTHING;
DO $$ BEGIN ALTER TABLE users ADD COLUMN streak_insurance BOOLEAN NOT NULL DEFAULT FALSE;    EXCEPTION WHEN duplicate_column THEN NULL; END $$; -- активная страховка стрика
DO $$ BEGIN ALTER TABLE users ADD COLUMN companion_equipped JSONB NOT NULL DEFAULT '{}'::jsonb; EXCEPTION WHEN duplicate_column THEN NULL; END $$; -- {hat, glasses, accessory} -- 0-100

DO $$ BEGIN ALTER TABLE habits ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE habits ADD COLUMN best_streak INTEGER NOT NULL DEFAULT 0;     EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- Тип цели: 'boolean' (да/нет), 'measurable' (количественная цель), 'count' (счётчик)
DO $$ BEGIN ALTER TABLE habits ADD COLUMN goal_type TEXT NOT NULL DEFAULT 'boolean';        EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE habits ADD COLUMN goal_target INTEGER NOT NULL DEFAULT 1;           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE habits ADD COLUMN goal_unit TEXT NOT NULL DEFAULT 'раз';            EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- Психология привычек (Atomic Habits):
DO $$ BEGIN ALTER TABLE habits ADD COLUMN cue TEXT;                                         EXCEPTION WHEN duplicate_column THEN NULL; END $$; -- implementation intention: «после чего?»
DO $$ BEGIN ALTER TABLE habits ADD COLUMN identity TEXT;                                    EXCEPTION WHEN duplicate_column THEN NULL; END $$; -- «Кем я становлюсь?» (напр. «бегуном»)
DO $$ BEGIN ALTER TABLE habits ADD COLUMN time_of_day TEXT NOT NULL DEFAULT 'any';          EXCEPTION WHEN duplicate_column THEN NULL; END $$; -- morning|afternoon|evening|any для smart grouping
DO $$ BEGIN ALTER TABLE habits ADD COLUMN stack_after INTEGER REFERENCES habits(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$; -- habit stacking: после какой привычки
DO $$ BEGIN ALTER TABLE habits ADD COLUMN comeback_shield BOOLEAN NOT NULL DEFAULT FALSE;   EXCEPTION WHEN duplicate_column THEN NULL; END $$; -- «щит» восстановления (1 пропуск/нед не рвёт streak)

-- habit_logs: расширяем для skip и measurable
DO $$ BEGIN ALTER TABLE habit_logs ADD COLUMN status TEXT NOT NULL DEFAULT 'done';          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE habit_logs ADD COLUMN rewarded BOOLEAN NOT NULL DEFAULT FALSE;      EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- status: 'done' (выполнено), 'skip' (пропуск, не портит streak), 'partial' (частично)
DO $$ BEGIN ALTER TABLE habit_logs ADD COLUMN value INTEGER;                                EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- value: для measurable целей — сколько выполнено (напр. 1500 мл воды)

UPDATE users SET referral_code = 'MOS' || id WHERE referral_code IS NULL;

-- ===== Seed challenges =====
INSERT INTO challenges (code, title, description, emoji, color, duration_days, habit_templates)
VALUES
  ('water_30', '30 дней воды 💧', 'Пей воду каждый день — почувствуй разницу в самочувствии', '💧', '#06B6D4', 30,
   '[{"title":"Пить 2л воды","emoji":"💧","color":"#06B6D4"}]'),
  ('morning_21', '21 день раннего подъёма', 'Вставай в одно и то же время — настрой биоритмы', '🌅', '#F59E0B', 21,
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
CREATE INDEX IF NOT EXISTS idx_subtasks_habit ON habit_subtasks(habit_id);
CREATE INDEX IF NOT EXISTS idx_buddies_user ON buddies(user_id);
CREATE INDEX IF NOT EXISTS idx_buddies_buddy ON buddies(buddy_id);
CREATE INDEX IF NOT EXISTS idx_missions_user_date ON missions(user_id, mission_date);
CREATE INDEX IF NOT EXISTS idx_duels_active ON duels(challenger_id, opponent_id) WHERE status IN ('pending', 'active');

-- ФИКС-A10: целостность инвентаря — FK на каталог предметов
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_items_item_code_fkey') THEN
        ALTER TABLE user_items ADD CONSTRAINT user_items_item_code_fkey
            FOREIGN KEY (item_code) REFERENCES companion_items(code) ON DELETE CASCADE;
    END IF;
END $$;

-- ===== Seed companion_items =====
INSERT INTO companion_items (code, title, category, emoji, price, sort_order) VALUES
  ('hat_crown', 'Корона', 'hat', '👑', 200, 1),
  ('hat_cap', 'Кепка', 'hat', '🧢', 100, 2),
  ('hat_top', 'Цилиндр', 'hat', '🎩', 150, 3),
  ('hat_party', 'Вечеринка', 'hat', '🥳', 120, 4),
  ('hat_grad', 'Выпускник', 'hat', '🎓', 180, 5),
  ('hat_santa', 'Колпак', 'hat', '🎅', 150, 6),
  ('glasses_sun', 'Солнечные', 'glasses', '🕶️', 100, 1),
  ('glasses_round', 'Круглые', 'glasses', '🤓', 120, 2),
  ('glasses_3d', '3D очки', 'glasses', '🥽', 150, 3),
  ('glasses_monocle', 'Монокль', 'glasses', '🧐', 130, 4),
  ('acc_bow', 'Бант', 'accessory', '🎀', 80, 1),
  ('acc_wings', 'Крылья', 'accessory', '🦋', 300, 2),
  ('acc_halo', 'Нимб', 'accessory', '😇', 500, 3),
  ('acc_fire', 'Огонь', 'accessory', '💫', 250, 4),
  ('acc_star', 'Звезда', 'accessory', '⭐', 150, 5),
  ('acc_balloon', 'Шарик', 'accessory', '🎈', 90, 6),
  ('home_forest', 'Лес', 'home', '🌲', 200, 1),
  ('home_beach', 'Пляж', 'home', '🏖️', 200, 2),
  ('home_space', 'Космос', 'home', '🌌', 350, 3),
  ('home_rainbow', 'Радуга', 'home', '🌈', 250, 4),
  ('home_cottage', 'Домик', 'home', '🏡', 300, 5),
  ('home_garden', 'Сад', 'home', '🌸', 220, 6),
  ('home_night', 'Ночной город', 'home', '🌃', 280, 7),
  ('home_candy', 'Конфетная', 'home', '🍬', 180, 8),
  ('home_cozy', 'Уют', 'home', '🕯️', 160, 9),
  ('home_akira', 'Неон-улица', 'home', '🏙️', 320, 10),
  ('home_autumn', 'Осень', 'home', '🍁', 200, 11),
  ('home_sakura', 'Сакура', 'home', '🌸', 260, 12),
  ('home_zen', 'Дзен', 'home', '🪷', 240, 13),
  ('home_lava', 'Вулкан', 'home', '🌋', 330, 14)
ON CONFLICT (code) DO NOTHING;
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_code ON users(referral_code);

-- ===== Seed HABIT TEMPLATES (для библиотеки) =====
INSERT INTO challenges (code, title, description, emoji, color, duration_days, habit_templates)
VALUES
  ('tpl_health', '🌱 Здоровье', 'Подборка для здоровья', '🌱', '#10B981', 0,
   '[{"title":"Пить 2л воды","emoji":"💧","color":"#06B6D4"},{"title":"8 часов сна","emoji":"😴","color":"#6366F1"},{"title":"10к шагов","emoji":"🚶","color":"#10B981"}]'),
  ('tpl_study', '📚 Учёба и фокус', 'Библиотека для учебы', '📚', '#7C3AED', 0,
   '[{"title":"Читать 30 минут","emoji":"📚","color":"#7C3AED"},{"title":"Учить 10 слов","emoji":"✍️","color":"#6366F1"},{"title":"Без телефона 1 час","emoji":"📵","color":"#EF4444"}]'),
  ('tpl_sport', '💪 Спорт', 'Спортивные привычки', '💪', '#EF4444', 0,
   '[{"title":"Зарядка 15 мин","emoji":"💪","color":"#EF4444"},{"title":"Отжимания 30","emoji":"🏋️","color":"#F59E0B"},{"title":"Растяжка","emoji":"🤸","color":"#06B6D4"}]'),
  ('tpl_mind', '🧘 Психика', 'Душевное равновесие', '🧘', '#06B6D4', 0,
   '[{"title":"Медитация 10 мин","emoji":"🧘","color":"#10B981"},{"title":"Дневник благодарностей","emoji":"🙏","color":"#EC4899"},{"title":"Глубокое дыхание","emoji":"🌬️","color":"#06B6D4"}]')
ON CONFLICT (code) DO NOTHING;
