import { Home, BarChart3, Settings } from 'lucide-react';

const items = [
  { key: 'home', label: 'Сегодня', Icon: Home },
  { key: 'stats', label: 'Статистика', Icon: BarChart3 },
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
          <Icon size={22} strokeWidth={2.2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
