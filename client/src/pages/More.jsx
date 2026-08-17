import { Settings as SettingsIcon, BookOpen, Trophy, ChevronRight, Crown, Archive as ArchiveIcon, Users, Target, Swords, BarChart3, TreePine } from 'lucide-react';

export default function MorePage({ onNavigate }) {
  const items = [
    { key: 'missions', title: 'Миссии дня', desc: 'Мини-задания за бонусы', Icon: Target, color: '#EC4899' },
    { key: 'recap', title: 'Отчёт за неделю', desc: 'Статистика и динамика', Icon: BarChart3, color: '#06B6D4' },
    { key: 'tree', title: 'Дерево привычек', desc: 'Визуальный рост от прогресса', Icon: TreePine, color: '#10B981' },
    { key: 'buddies', title: 'Бадди', desc: 'Друзья для взаимной поддержки', Icon: Users, color: '#EC4899' },
    { key: 'duels', title: 'Битвы привычек', desc: 'PvP: кто дольше продержит стрик', Icon: Swords, color: '#EF4444' },
    { key: 'leaderboard', title: 'Топ игроков', desc: 'Сравни прогресс с друзьями', Icon: Crown, color: '#F59E0B' },
    { key: 'settings', title: 'Настройки', desc: 'Тема, профиль, экспорт, часовой пояс', Icon: SettingsIcon, color: '#7C3AED' },
    { key: 'achievements', title: 'Достижения', desc: 'Витрина наград (Case Showcase)', Icon: Trophy, color: '#10B981' },
    { key: 'journal', title: 'Дневник', desc: 'Записи, мысли, благодарности', Icon: BookOpen, color: '#06B6D4' },
    { key: 'archive', title: 'Архив', desc: 'Восстановить удалённые привычки', Icon: ArchiveIcon, color: '#64748B' },
  ];

  return (
    <div className="page more">
      <h2 className="card-title">Ещё</h2>
      <div className="more-list">
        {items.map(({ key, title, desc, Icon, color }) => (
          <button key={key} className="more-row" onClick={() => onNavigate(key)}>
            <div className="more-icon" style={{ background: color + '22', color }}>
              <Icon size={22} />
            </div>
            <div className="more-text">
              <strong>{title}</strong>
              <span className="muted small">{desc}</span>
            </div>
            <ChevronRight size={20} className="muted" />
          </button>
        ))}
      </div>
    </div>
  );
}
