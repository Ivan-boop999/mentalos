import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Тема: 'auto' | 'light' | 'dark'
 * - 'auto' — следует за темой Telegram (или системой в браузере)
 * - 'light' / 'dark' — фиксируется пользователем
 *
 * Реальная применяемая тема хранится в localStorage и дублируется на сервер.
 */
const ThemeContext = createContext(null);

export function ThemeProvider({ children, telegramTheme = 'light', onPersist }) {
  const [mode, setMode] = useState(() => localStorage.getItem('mentalos-theme') || 'auto');

  // Эффективная тема (light/dark), учитывая auto
  const effective = useMemo(() => {
    if (mode === 'auto') {
      // В Telegram — берём из SDK, в браузере — из prefers-color-scheme
      if (telegramTheme) return telegramTheme;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  }, [mode, telegramTheme]);

  // Применяем атрибут на <html>
  useEffect(() => {
    document.documentElement.dataset.theme = effective;
  }, [effective]);

  // Сохраняем выбор пользователя
  const changeMode = (next) => {
    setMode(next);
    localStorage.setItem('mentalos-theme', next);
    onPersist?.(next);
  };

  const value = useMemo(
    () => ({ mode, effective, setMode: changeMode }),
    [mode, effective],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme должен использоваться внутри ThemeProvider');
  return ctx;
}
