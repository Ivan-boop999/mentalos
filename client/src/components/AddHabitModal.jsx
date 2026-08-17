import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

const EMOJIS = ['✨','💪','📚','🏃','💧','🧘','🥗','😴','✍️','🎯','🎨','🎸','💊','🦷','☀️','🌙','☕','🚭','🚶','🏋️','🤸','🥦','🍎','🧠','❤️','🙏','🛏️','🪥','💻','🌱','⏰','🎧'];
const COLORS = ['#7C3AED','#6366F1','#3B82F6','#0EA5E9','#06B6D4','#10B981','#22C55E','#84CC16','#F59E0B','#F97316','#EF4444','#EC4899','#D946EF','#A855F7','#8B5CF6','#64748B'];
const DAYS = [{n:1,label:'Пн'},{n:2,label:'Вт'},{n:3,label:'Ср'},{n:4,label:'Чт'},{n:5,label:'Пт'},{n:6,label:'Сб'},{n:0,label:'Вс'}];
const UNITS = ['раз','мин','час','л','мл','км','кг','ккал','стр.','шт.'];
const TOD_SLOTS = [{v:'morning',l:'🌅 Утро'},{v:'afternoon',l:'☀️ День'},{v:'evening',l:'🌙 Вечер'},{v:'any',l:'Любое'}];
const IDENTITIES = ['бегун 🏃','читатель 📚','спортсмен 💪','здоровый человек 🌱','творец 🎨','медитирующий 🧘','предприниматель 💼','ученик 🎓','писатель ✍️','музыкант 🎵'];

export default function AddHabitModal({ onClose, onSubmit, habit = null, allHabits = [], timezone = 'UTC' }) {
  const editing = !!habit;
  const [title, setTitle] = useState(habit?.title || '');
  const [emoji, setEmoji] = useState(habit?.emoji || '✨');
  const [color, setColor] = useState(habit?.color || '#7C3AED');
  const [freqType, setFreqType] = useState(habit?.frequency?.type === 'weekly' ? 'weekly' : 'daily');
  const [days, setDays] = useState(habit?.frequency?.days || [1,2,3,4,5]);
  const [reminder, setReminder] = useState(habit?.reminder_time ? String(habit.reminder_time).slice(0,5) : '');
  const [goalType, setGoalType] = useState(habit?.goal_type || 'boolean');
  const [goalTarget, setGoalTarget] = useState(habit?.goal_target || 1);
  const [goalUnit, setGoalUnit] = useState(habit?.goal_unit || 'раз');
  // Психология (Atomic Habits)
  const [cue, setCue] = useState(habit?.cue || '');
  const [identity, setIdentity] = useState(habit?.identity || '');
  const [timeOfDay, setTimeOfDay] = useState(habit?.time_of_day || 'any');
  const [stackAfter, setStackAfter] = useState(habit?.stack_after || null);
  const [showPsych, setShowPsych] = useState(!!(habit?.cue || habit?.identity));

  const toggleDay = (n) => setDays((p) => (p.includes(n) ? p.filter((d) => d !== n) : [...p, n].sort()));

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(), emoji, color,
      frequency: freqType === 'weekly' ? { type: 'weekly', days } : { type: 'daily' },
      reminderTime: reminder, // пустая строка = убрать напоминание (бэкенд понимает)
      goalType, goalTarget: Number(goalTarget) || 1, goalUnit,
      cue: cue.trim() || null,
      identity: identity.trim() || null,
      timeOfDay, stackAfter: stackAfter ? Number(stackAfter) : null,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{editing ? 'Редактировать' : 'Новая привычка'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={22} /></button>
        </header>

        <form onSubmit={submit} className="modal-form">
          <input className="input" placeholder="Например: Пить воду" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={40} />

          <label className="field-label">Тип цели</label>
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

          <label className="field-label">Иконка</label>
          <div className="emoji-grid">
            {EMOJIS.map((e) => <button type="button" key={e} className={`emoji-chip ${emoji === e ? 'active' : ''}`} onClick={() => setEmoji(e)}>{e}</button>)}
          </div>

          <label className="field-label">Цвет</label>
          <div className="color-grid">
            {COLORS.map((c) => <button type="button" key={c} className={`color-chip ${color === c ? 'active' : ''}`} style={{ background: c, color: c }} onClick={() => setColor(c)} />)}
          </div>

          <label className="field-label">Время дня</label>
          <div className="seg-control">
            {TOD_SLOTS.map((s) => <button key={s.v} type="button" className={`seg-btn ${timeOfDay === s.v ? 'active' : ''}`} onClick={() => setTimeOfDay(s.v)}>{s.l}</button>)}
          </div>

          <label className="field-label">Частота</label>
          <div className="seg-control">
            <button type="button" className={`seg-btn ${freqType === 'daily' ? 'active' : ''}`} onClick={() => setFreqType('daily')}>Каждый день</button>
            <button type="button" className={`seg-btn ${freqType === 'weekly' ? 'active' : ''}`} onClick={() => setFreqType('weekly')}>По дням</button>
          </div>
          {freqType === 'weekly' && (
            <div className="days-grid">
              {DAYS.map(({n,label}) => <button type="button" key={n} className={`day-chip ${days.includes(n) ? 'active' : ''}`} onClick={() => toggleDay(n)}>{label}</button>)}
            </div>
          )}

          <label className="field-label">Напоминание <span className="muted small">({timezone})</span></label>
          <input type="time" className="input" value={reminder} onChange={(e) => setReminder(e.target.value)} />
          <p className="hint">Оставь пустым — без напоминания.</p>

          {/* Психология привычек (раскрывающийся блок) */}
          <button type="button" className="psych-toggle" onClick={() => setShowPsych((v) => !v)}>
            <Sparkles size={14} /> Настройки психологии {showPsych ? '▼' : '▶'}
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

          <button type="submit" className="primary-btn" disabled={!title.trim()}>{editing ? 'Сохранить' : 'Создать привычку'}</button>
        </form>
      </div>
    </div>
  );
}
