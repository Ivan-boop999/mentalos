import { Home, BarChart3, Gift, Trophy, Settings } from 'lucide-react';

const items = [
  { key: 'home', label: 'Сегодня', Icon: Home },
  { key: 'stats', label: 'Статистика', Icon: BarChart3 },
  { key: 'rewards', label: 'Награды', Icon: Gift },
  { key: 'achievements', label: 'Достижения', Icon: Trophy },
  { key: 'settings', label: 'Настройки', Icon: Settings },
];

export default function BottomNav({ current, onChange }) {
  return (
    <nav className="bottom-nav">
      {items.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={`nav-item ${current === key ? 'active' : ''}`}
          onClick={() => onChange(key)}
        >
          <Icon size={20} strokeWidth={2.2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
