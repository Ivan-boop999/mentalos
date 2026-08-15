import { Home, BarChart3, Target, Smile, Gift, Grid } from 'lucide-react';

// Основная навигация: 6 пунктов. «Ещё» открывает экран с Настройками/Дневником/Достижениями.
const items = [
  { key: 'home', label: 'Сегодня', Icon: Home },
  { key: 'stats', label: 'Стат.', Icon: BarChart3 },
  { key: 'challenges', label: 'Челленджи', Icon: Target },
  { key: 'mood', label: 'Настроение', Icon: Smile },
  { key: 'rewards', label: 'Награды', Icon: Gift },
  { key: 'more', label: 'Ещё', Icon: Grid },
];

export default function BottomNav({ current, onChange }) {
  // Подсветка «Ещё» когда активна любая страница из неё
  const morePages = ['more', 'settings', 'journal', 'achievements', 'leaderboard', 'archive', 'buddies', 'missions', 'duels', 'recap', 'tree', 'companion-shop', 'pet'];
  return (
    <nav className="bottom-nav">
      {items.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={`nav-item ${current === key || (key === 'more' && morePages.includes(current)) ? 'active' : ''}`}
          onClick={() => onChange(key)}
        >
          <Icon size={20} strokeWidth={2.2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
