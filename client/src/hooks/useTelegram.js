import { useEffect, useState } from 'react';

/**
 * Доступ к Telegram WebApp SDK.
 * Вне Telegram (например, локально в браузере) работает в режиме заглушки —
 * удобно разрабатывать и тестировать.
 */
export function useTelegram() {
  const [tg, setTg] = useState(null);
  const [initData, setInitData] = useState('');
  const [inTelegram, setInTelegram] = useState(false);
  const [tgTheme, setTgTheme] = useState('light'); // тема самого Telegram ('light'|'dark')

  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    if (wa) {
      wa.ready();
      wa.expand();
      setTg(wa);
      setInitData(wa.initData || '');
      setInTelegram(true);
      setTgTheme(wa.colorScheme || 'light');

      // Реагируем на смену системной темы Telegram
      wa.onEvent('themeChanged', () => setTgTheme(wa.colorScheme || 'light'));
    } else {
      // Режим разработки вне Telegram
      setInTelegram(false);
      setInitData('dev');
    }
  }, []);

  const hapticFeedback = (style = 'light') => {
    try {
      tg?.HapticFeedback?.impactOccurred?.(style);
    } catch {
      /* noop */
    }
  };

  return { tg, initData, inTelegram, tgTheme, hapticFeedback };
}
