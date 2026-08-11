import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Тема: --data-theme (light/dark) + --data-theme-skin (default/aurora/sunset/...)
 */
const ThemeContext = createContext(null);

export function ThemeProvider({ children, telegramTheme = 'light', activeSkin = 'default', onPersist }) {
  const [mode, setMode] = useState(() => localStorage.getItem('mentalos-theme') || 'auto');

  const effective = useMemo(() => {
    if (mode === 'auto') {
      if (telegramTheme) return telegramTheme;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  }, [mode, telegramTheme]);

  useEffect(() => {
    document.documentElement.dataset.theme = effective;
    document.documentElement.dataset.themeSkin = activeSkin;
  }, [effective, activeSkin]);

  const changeMode = (next) => {
    setMode(next);
    localStorage.setItem('mentalos-theme', next);
    onPersist?.(next);
  };

  const value = useMemo(() => ({ mode, effective, skin: activeSkin, setMode: changeMode }), [mode, effective, activeSkin]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme внутри ThemeProvider');
  return ctx;
}
