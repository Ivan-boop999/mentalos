import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { Sun, Moon, Monitor, Clock } from 'lucide-react';

export default function SettingsPage({ timezone = 'UTC' }) {
  const { mode, setMode } = useTheme();
  const [serverTheme, setServerTheme] = useState(null);

  useEffect(() => {
    api.getSettings().then((s) => setServerTheme(s.theme)).catch(() => {});
  }, []);

  const change = (next) => {
    setMode(next);
    setServerTheme(next);
  };

  const options = [
    { value: 'auto', label: 'Авто', desc: 'По системе', Icon: Monitor },
    { value: 'light', label: 'Светлая', desc: 'Дневная', Icon: Sun },
    { value: 'dark', label: 'Тёмная', desc: 'Ночная', Icon: Moon },
  ];

  return (
    <div className="page settings">
      <section className="settings-section">
        <h3 className="card-title">Тема оформления</h3>
        <div className="theme-options">
          {options.map(({ value, label, desc, Icon }) => (
            <button
              key={value}
              className={`theme-option ${mode === value ? 'active' : ''}`}
              onClick={() => change(value)}
            >
              <div className="theme-option-icon">
                <Icon size={22} />
              </div>
              <div className="theme-option-text">
                <strong>{label}</strong>
                <span>{desc}</span>
              </div>
              <div className={`radio ${mode === value ? 'on' : ''}`} />
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h3 className="card-title">О приложении</h3>
        <div className="about-card">
          <div className="about-row">
            <span>MentalOS</span>
            <span className="muted">версия 1.1</span>
          </div>
          <div className="about-row">
            <span>Telegram Mini App</span>
            <span className="muted">React + Node.js</span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="card-title">Часовой пояс</h3>
        <div className="tz-card">
          <Clock size={20} />
          <div>
            <strong>{timezone}</strong>
            <span className="muted small">Напоминания приходят по этому времени</span>
          </div>
        </div>
        <p className="settings-hint">
          Часовой пояс определяется автоматически по устройству. Если он неверный — проверь настройки даты/времени телефона.
        </p>
      </section>

      <p className="settings-hint">
        💡 Тема сохраняется на сервере и синхронизируется между устройствами.
      </p>
    </div>
  );
}
