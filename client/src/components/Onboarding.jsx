import { useState } from 'react';
import { api } from '../api/client';
import { Sparkles, Flame, Trophy, Gift } from 'lucide-react';

const SLIDES = [
  { emoji: '🧠', title: 'Добро пожаловать в MentalOS', text: 'Твой персональный трекер привычек с мотивацией, статистикой и наградами.', Icon: Sparkles, color: '#7C3AED' },
  { emoji: '✅', title: 'Отмечай каждый день', text: 'Тапни по чекбоксу привычки — это займёт 1 секунду. Чем регулярнее, тем длиннее серия 🔥', Icon: Flame, color: '#F59E0B' },
  { emoji: '🏆', title: 'Открывай достижения', text: '7, 30, 100 дней подряд — новые награды и бонусы. Не прерывай серию!', Icon: Trophy, color: '#10B981' },
  { emoji: '🎁', title: 'Приглашай друзей', text: 'Дари +50 бонусов другу и получай +100 за каждого. Трать их в магазине тем!', Icon: Gift, color: '#EC4899' },
];

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const last = step === SLIDES.length - 1;
  const s = SLIDES[step];

  const next = async () => {
    if (last) {
      try { await api.updateSettings({ onboarded: true }); } catch {}
      onDone();
    } else {
      setStep((v) => v + 1);
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card" style={{ '--slide-color': s.color }}>
        {/* --slide-color используется в CSS для подцветки emoji */}
        <div className="onboarding-skip" onClick={next}>{last ? '' : 'Пропустить'}</div>
        <div className="onboarding-emoji">{s.emoji}</div>
        <h2>{s.title}</h2>
        <p>{s.text}</p>
        <div className="onboarding-dots">
          {SLIDES.map((_, i) => (
            <span key={i} className={`dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>
        <button className="primary-btn" onClick={next}>
          {last ? '🚀 Начать!' : 'Далее'}
        </button>
      </div>
    </div>
  );
}
