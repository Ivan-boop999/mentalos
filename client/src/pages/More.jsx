import { Settings as SettingsIcon, BookOpen, Trophy, ChevronRight, Crown, Archive as ArchiveIcon, Users } from 'lucide-react';

export default function MorePage({ onNavigate }) {
  const items = [
    { key: 'buddies', title: 'Бадди', desc: 'Друзья для взаимной поддержки', Icon: Users, color: '#EC4899' },
    { key: 'leaderboard', title: 'Топ игроков', desc: 'Сравни прогресс с друзьями', Icon: Crown, color: '#F59E0B' },
    { key: 'settings', title: 'Настройки', desc: 'Тема, профиль, экспорт, часовой пояс', Icon: SettingsIcon, color: '#7C3AED' },
    { key: 'achievements', title: 'Достижения', desc: 'Награды за серии и активность', Icon: Trophy, color: '#10B981' },
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
