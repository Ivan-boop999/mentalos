import { useState, useMemo } from 'react';
import { X, Sparkles, ChevronDown } from 'lucide-react';

// Кураторский набор: компактная горизонтальная полоса вместо огромной сетки
const EMOJIS = ['✨','💧','💪','🏃','🥗','📚','🧘','😴','🦷','🧠','✍️','🎸','💊','☀️','🌙','☕','🚭','🚶','🏋️','🥦','🍎','❤️','🙏','💻','🌱','⏰','🎧','🎯'];
const COLORS = ['#7C3AED','#3B82F6','#06B6D4','#10B981','#F59E0B','#EF4444','#EC4899','#64748B'];
const DAYS = [{n:1,label:'Пн'},{n:2,label:'Вт'},{n:3,label:'Ср'},{n:4,label:'Чт'},{n:5,label:'Пт'},{n:6,label:'Сб'},{n:0,label:'Вс'}];
const UNITS = ['раз','мин','час','л','мл','км','кг','ккал','стр.','шт.'];
const TOD_SLOTS = [{v:'morning',l:'🌅 Утро'},{v:'afternoon',l:'☀️ День'},{v:'evening',l:'🌙 Вечер'},{v:'any',l:'Любое'}];
const IDENTITIES = ['бегун 🏃','читатель 📚','спортсмен 💪','здоровый человек 🌱','творец 🎨','медитирующий 🧘','предприниматель 💼','ученик 🎓','писатель ✍️','музыкант 🎵'];

// Быстрые пресеты — привычка в 1 тап (как в Streaks/Finch)
const PRESETS = [
  { title: 'Пить воду', emoji: '💧', color: '#3B82F6', goalType: 'measurable', goalTarget: 8, goalUnit: 'раз' },
  { title: 'Зарядка', emoji: '💪', color: '#EF4444' },
  { title: 'Читать', emoji: '📚', color: '#F59E0B', goalType: 'measurable', goalTarget: 20, goalUnit: 'стр.' },
  { title: 'Медитация', emoji: '🧘', color: '#7C3AED', goalType: 'measurable', goalTarget: 10, goalUnit: 'мин' },
  { title: 'Английский', emoji: '🧠', color: '#06B6D4', goalType: 'measurable', goalTarget: 15, goalUnit: 'мин' },
];

// Авто-подбор иконки и цвета по ключевым словам (как Habitify/Streaks)
const AUTO_MATCH = [
  { keys: ['вод', 'пить', 'вода'], emoji: '💧', color: '#3B82F6' },
  { keys: ['бег', 'заряд', 'спорт', 'зал', 'кач', 'фитнес', 'присед', 'отжим'], emoji: '💪', color: '#EF4444' },
  { keys: ['шаг', 'ходьб', 'гуля', 'прогул'], emoji: '🚶', color: '#10B981' },
  { keys: ['чита', 'книг', 'книга'], emoji: '📚', color: '#F59E0B' },
  { keys: ['медит', 'дыш', 'дых'], emoji: '🧘', color: '#7C3AED' },
  { keys: ['сон', 'спать', 'ложусь', 'отход ко сну'], emoji: '😴', color: '#64748B' },
  { keys: ['зуб', 'чист'], emoji: '🦷', color: '#06B6D4' },
  { keys: ['калор', 'еда', 'еда', 'питан', 'диет', 'овощ', 'фрукт', 'яблок'], emoji: '🥗', color: '#10B981' },
  { keys: ['английск', 'язык', 'учёб', 'учеб', 'урок', 'слов'], emoji: '🧠', color: '#06B6D4' },
  { keys: ['дневник', 'пишу', 'писат', 'заметк'], emoji: '✍️', color: '#EC4899' },
  { keys: ['гитар', 'музык', 'пиан', 'укел'], emoji: '🎸', color: '#F59E0B' },
  { keys: ['таблет', 'витамин', 'лекарств', 'омега'], emoji: '💊', color: '#EF4444' },
  { keys: ['утр', 'подъём', 'подъем', 'раньше'], emoji: '☀️', color: '#F59E0B' },
  { keys: ['курить', 'курен', 'сигарет', 'вейп'], emoji: '🚭', color: '#64748B' },
  { keys: ['кофе', 'чай'], emoji: '☕', color: '#EC4899' },
  { keys: ['растяж', 'йог', 'стретч'], emoji: '🤸', color: '#06B6D4' },
  { keys: ['код', 'программ', 'работ', 'проект'], emoji: '💻', color: '#64748B' },
  { keys: ['благодар', 'молитв', 'молит'], emoji: '🙏', color: '#7C3AED' },
  { keys: ['водн', 'бассейн', 'плав'], emoji: '💧', color: '#3B82F6' },
  { keys: ['растение', 'цветы', 'полив'], emoji: '🌱', color: '#10B981' },
];

function autoMatch(title) {
  const t = title.toLowerCase();
  for (const m of AUTO_MATCH) if (m.keys.some((k) => t.includes(k))) return m;
  return null;
}

export default function AddHabitModal({ onClose, onSubmit, habit = null, allHabits = [], timezone = 'UTC' }) {
  const editing = !!habit;
  const [title, setTitle] = useState(habit?.title || '');
  const [emoji, setEmoji] = useState(habit?.emoji || '✨');
  const [color, setColor] = useState(habit?.color || COLORS[0]);
  const [userTouchedEmoji, setUserTouchedEmoji] = useState(!!habit);
  const freq = typeof habit?.frequency === 'object' ? habit.frequency : { type: 'daily' };
  const isPlainWeekdays = freq.type === 'weekly' && Array.isArray(freq.days) && freq.days.length === 5 && [1,2,3,4,5].every((d) => freq.days.includes(d));
  const [freqType, setFreqType] = useState(freq.type === 'weekly' ? (isPlainWeekdays ? 'weekdays' : 'custom') : 'daily');
  const initialDays = freq.type === 'weekly' ? (freq.days || [1,2,3,4,5]) : [1,2,3,4,5];
  const [days, setDays] = useState(initialDays);
  const [reminder, setReminder] = useState(habit?.reminder_time ? String(habit.reminder_time).slice(0, 5) : '');
  const [goalType, setGoalType] = useState(habit?.goal_type || 'boolean');
  const [goalTarget, setGoalTarget] = useState(habit?.goal_target || 1);
  const [goalUnit, setGoalUnit] = useState(habit?.goal_unit || 'раз');
  const [cue, setCue] = useState(habit?.cue || '');
  const [identity, setIdentity] = useState(habit?.identity || '');
  const [timeOfDay, setTimeOfDay] = useState(habit?.time_of_day || 'any');
  const [stackAfter, setStackAfter] = useState(habit?.stack_after || null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPsych, setShowPsych] = useState(false);

  // Авто-подбор иконки и цвета, пока пользователь не выбрал вручную
  const auto = useMemo(() => (userTouchedEmoji ? null : autoMatch(title)), [title, userTouchedEmoji]);
  const effectiveEmoji = auto?.emoji || emoji;
  const effectiveColor = auto?.color || color;

  const toggleDay = (n) => setDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort()));

  const applyPreset = (p) => {
    setTitle(p.title); setEmoji(p.emoji); setColor(p.color);
    setUserTouchedEmoji(true);
    if (p.goalType) { setGoalType(p.goalType); setGoalTarget(p.goalTarget); setGoalUnit(p.goalUnit); }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const frequency = freqType === 'daily'
      ? { type: 'daily' }
      : { type: 'weekly', days: freqType === 'weekdays' ? [1, 2, 3, 4, 5] : (days.length ? days : [1,2,3,4,5,6,0]) };
    onSubmit({
      title: title.trim(), emoji: effectiveEmoji, color: effectiveColor,
      frequency,
      reminderTime: reminder,
      goalType, goalTarget: Number(goalTarget) || 1, goalUnit,
      cue: cue.trim() || null,
      identity: identity.trim() || null,
      timeOfDay, stackAfter: stackAfter ? Number(stackAfter) : null,
    });
  };

  const freqChips = [
    { key: 'daily', label: 'Каждый день' },
    { key: 'weekdays', label: 'Пн–Пт' },
    { key: 'custom', label: 'По дням' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{editing ? 'Редактировать' : 'Новая привычка'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={22} /></button>
        </header>

        <form onSubmit={submit} className="modal-form">
          {/* Пресеты для быстрого старта (только при создании) */}
          {!editing && !title && (
            <div className="preset-row">
              {PRESETS.map((p) => (
                <button type="button" key={p.title} className="preset-chip" style={{ '--pc': p.color }} onClick={() => applyPreset(p)}>
                  {p.emoji} {p.title}
                </button>
              ))}
            </div>
          )}

          {/* Имя + выбранная иконка/цвет — живой превью */}
          <div className="name-row">
            <div className="name-emoji" style={{ background: effectiveColor + '22', color: effectiveColor }}>
              {effectiveEmoji}
            </div>
            <input
              className="input" placeholder="Например: Пить воду"
              value={title} onChange={(e) => setTitle(e.target.value)}
              autoFocus maxLength={40}
            />
          </div>
          {auto && <p className="hint auto-hint">✨ Подобрали иконку и цвет автоматически</p>}

          {/* Иконки — компактная горизонтальная полоса */}
          <div className="emoji-strip">
            {EMOJIS.map((e) => (
              <button
                type="button" key={e}
                className={`emoji-chip ${effectiveEmoji === e ? 'active' : ''}`}
                onClick={() => { setEmoji(e); setUserTouchedEmoji(true); }}
              >{e}</button>
            ))}
          </div>

          {/* Цвет — одна компактная строка */}
          <div className="color-strip">
            {COLORS.map((c) => (
              <button
                type="button" key={c}
                className={`color-chip ${effectiveColor === c ? 'active' : ''}`}
                style={{ background: c, color: c }}
                onClick={() => { setColor(c); setUserTouchedEmoji(true); }}
              />
            ))}
          </div>

          {/* Тип цели */}
          <div className="seg-control">
            <button type="button" className={`seg-btn ${goalType === 'boolean' ? 'active' : ''}`} onClick={() => setGoalType('boolean')}>Да / Нет</button>
            <button type="button" className={`seg-btn ${goalType === 'measurable' ? 'active' : ''}`} onClick={() => setGoalType('measurable')}>Количество</button>
          </div>
          {goalType === 'measurable' && (
            <div className="goal-row">
              <input type="number" className="input" placeholder="Цель" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} min={1} />
              <select className="input" value={goalUnit} onChange={(e) => setGoalUnit(e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}

          {/* Частота — чипсами (каждый день / пн-пт / по дням) */}
          <div className="seg-control">
            {freqChips.map((f) => (
              <button key={f.key} type="button" className={`seg-btn ${freqType === f.key ? 'active' : ''}`} onClick={() => setFreqType(f.key)}>{f.label}</button>
            ))}
          </div>
          {freqType === 'custom' && (
            <div className="days-grid">
              {DAYS.map(({n,label}) => <button type="button" key={n} className={`day-chip ${days.includes(n) ? 'active' : ''}`} onClick={() => toggleDay(n)}>{label}</button>)}
            </div>
          )}

          {/* Продвинутые настройки — скрыты по умолчанию */}
          <button type="button" className="psych-toggle" onClick={() => setShowAdvanced((v) => !v)}>
            <ChevronDown size={14} className={`chev ${showAdvanced ? 'open' : ''}`} /> Ещё настройки
          </button>
          {showAdvanced && (
            <>
              <label className="field-label">Время дня</label>
              <div className="seg-control">
                {TOD_SLOTS.map((s) => <button key={s.v} type="button" className={`seg-btn ${timeOfDay === s.v ? 'active' : ''}`} onClick={() => setTimeOfDay(s.v)}>{s.l}</button>)}
              </div>

              <label className="field-label">Напоминание <span className="muted small">({timezone})</span></label>
              <input type="time" className="input" value={reminder} onChange={(e) => setReminder(e.target.value)} />
              <p className="hint">Оставь пустым — без напоминания.</p>

              <button type="button" className="psych-toggle" onClick={() => setShowPsych((v) => !v)}>
                <Sparkles size={14} /> Психология привычек {showPsych ? '▲' : '▼'}
              </button>
              {showPsych && (
                <>
                  <label className="field-label">После чего будешь делать? <span className="muted small">(implementation intention)</span></label>
                  <input className="input" placeholder="напр. «после чистки зубов»" value={cue} onChange={(e) => setCue(e.target.value)} maxLength={60} />

                  <label className="field-label">Кем ты становишься? <span className="muted small">(identity habit)</span></label>
                  <input className="input" placeholder="напр. «бегуном»" value={identity} onChange={(e) => setIdentity(e.target.value)} list="identities" maxLength={40} />
                  <datalist id="identities">{IDENTITIES.map((i) => <option key={i} value={i} />)}</datalist>

                  {allHabits.length > 0 && (
                    <>
                      <label className="field-label">Выполнять после привычки <span className="muted small">(habit stacking)</span></label>
                      <select className="input" value={stackAfter || ''} onChange={(e) => setStackAfter(e.target.value || null)}>
                        <option value="">— не привязывать —</option>
                        {allHabits.filter((h) => h.id !== habit?.id).map((h) => <option key={h.id} value={h.id}>{h.emoji} {h.title}</option>)}
                      </select>
                    </>
                  )}
                  <p className="hint">💡 Научный подход из «Atomic Habits»: конкретный план + идентичность + привязка увеличивают шанс выполнения в 2-3 раза.</p>
                </>
              )}
            </>
          )}

          <button type="submit" className="primary-btn" disabled={!title.trim()}>{editing ? 'Сохранить' : 'Создать привычку'}</button>
        </form>
      </div>
    </div>
  );
}
