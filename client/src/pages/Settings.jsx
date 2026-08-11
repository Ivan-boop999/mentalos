import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { Sun, Moon, Monitor, Clock, Download, Palette, Volume2, VolumeX } from 'lucide-react';

const SKINS = [
  { value: 'default', title: 'Стандарт', emoji: '✨' },
  { value: 'aurora', title: 'Aurora', emoji: '🌌' },
  { value: 'sunset', title: 'Закат', emoji: '🌅' },
  { value: 'forest', title: 'Лес', emoji: '🌲' },
  { value: 'ocean', title: 'Океан', emoji: '🌊' },
  { value: 'mono', title: 'Mono', emoji: '⚫' },
  { value: 'neon', title: 'Neon', emoji: '💜' },
];

export default function SettingsPage({ timezone = 'UTC', settings = {}, onChange, soundEnabled = true, onToggleSound }) {
  const { mode, setMode } = useTheme();
  const [serverTheme, setServerTheme] = useState(null);

  useEffect(() => { setServerTheme(settings.theme || null); }, [settings.theme]);

  const change = (next) => { setMode(next); setServerTheme(next); };

  const activateSkin = async (skin) => {
    if (skin === 'default') { try { await api.activateTheme('default'); onChange?.(); } catch {} return; }
    // пытаемся купить (если уже owned — бэкенд просто активирует)
    try { await api.buyItem(`theme_${skin}`); onChange?.(); }
    catch (e) { alert('Сначала купите тему в магазине: ' + e.message); }
  };

  const themeOpts = [
    { value: 'auto', label: 'Авто', desc: 'По системе', Icon: Monitor },
    { value: 'light', label: 'Светлая', desc: 'Дневная', Icon: Sun },
    { value: 'dark', label: 'Тёмная', desc: 'Ночная', Icon: Moon },
  ];

  const ownedThemes = settings.ownedThemes || ['default'];
  const activeTheme = settings.active_theme || 'default';
  const xp = settings.xp || 0;
  const level = settings.level || 1;
  const xpForNext = Math.pow(level, 2) * 100;
  const xpForThis = Math.pow(level - 1, 2) * 100;
  const xpProgress = Math.round(((xp - xpForThis) / (xpForNext - xpForThis)) * 100);

  return (
    <div className="page settings">
      {/* Профиль / XP */}
      <section className="settings-section">
        <div className="profile-card glass">
          <div className="profile-row">
            <div className="profile-avatar">Lv {level}</div>
            <div className="profile-info">
              <strong>Уровень {level}</strong>
              <span>{xp} XP</span>
            </div>
          </div>
          <div className="xp-bar"><div className="xp-fill" style={{ width: `${xpProgress}%` }} /></div>
          <span className="muted small">До уровня {level + 1}: {xpForNext - xp} XP</span>
        </div>
      </section>

      {/* Тема оформления */}
      <section className="settings-section">
        <h3 className="card-title">Тема оформления</h3>
        <div className="theme-options">
          {themeOpts.map(({ value, label, desc, Icon }) => (
            <button key={value} className={`theme-option ${mode === value ? 'active' : ''}`} onClick={() => change(value)}>
              <div className="theme-option-icon"><Icon size={22} /></div>
              <div className="theme-option-text"><strong>{label}</strong><span>{desc}</span></div>
              <div className={`radio ${mode === value ? 'on' : ''}`} />
            </button>
          ))}
        </div>
      </section>

      {/* Цветовая схема */}
      <section className="settings-section">
        <h3 className="card-title"><Palette size={16} /> Цветовая схема</h3>
        <div className="skin-grid">
          {SKINS.map((s) => {
            const owned = ownedThemes.includes(s.value);
            const active = activeTheme === s.value;
            return (
              <button key={s.value} className={`skin-chip ${active ? 'active' : ''} ${!owned ? 'locked' : ''}`} onClick={() => activateSkin(s.value)}>
                <span style={{ fontSize: 22 }}>{s.emoji}</span>
                <span>{s.title}</span>
                {!owned && <span className="muted small">🛒</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Часовой пояс */}
      <section className="settings-section">
        <h3 className="card-title">Часовой пояс</h3>
        <div className="tz-card"><Clock size={20} /><div><strong>{timezone}</strong><span className="muted small">Напоминания по этому времени</span></div></div>
      </section>

      {/* Звуки */}
      <section className="settings-section">
        <h3 className="card-title">Звуки интерфейса</h3>
        <button className={`theme-option ${soundEnabled ? 'active' : ''}`} onClick={onToggleSound} style={{ width: '100%' }}>
          <div className="theme-option-icon">{soundEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}</div>
          <div className="theme-option-text">
            <strong>{soundEnabled ? 'Звуки включены' : 'Звуки выключены'}</strong>
            <span>Отметка привычки, достижения, переходы</span>
          </div>
          <div className={`radio ${soundEnabled ? 'on' : ''}`} />
        </button>
      </section>

      {/* Экспорт данных */}
      <section className="settings-section">
        <h3 className="card-title">Данные</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="primary-btn ghost-btn" style={{ flex: 1 }} href={api.exportData()} download>
            <Download size={16} /> JSON
          </a>
          <a className="primary-btn ghost-btn" style={{ flex: 1 }} href={api.exportCsvUrl()} download>
            <Download size={16} /> CSV
          </a>
        </div>
        <p className="settings-hint">Резервная копия: привычки, история, заметки, настроение, дневник.</p>
      </section>

      {/* Статистика профиля */}
      <section className="settings-section">
        <h3 className="card-title">Профиль</h3>
        <div className="about-card">
          <div className="about-row"><span>Всего отметок</span><strong>{settings.totalCheckins || 0}</strong></div>
          <div className="about-row"><span>Уровень</span><strong>Lv {settings.level || 1}</strong></div>
          <div className="about-row"><span>Бонусов</span><strong>🪙 {settings.bonus_balance || 0}</strong></div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="card-title">О приложении</h3>
        <div className="about-card">
          <div className="about-row"><span>MentalOS</span><span className="muted">v3.0</span></div>
          <div className="about-row"><span>Telegram Mini App</span><span className="muted">React + Node.js</span></div>
        </div>
      </section>
    </div>
  );
}
