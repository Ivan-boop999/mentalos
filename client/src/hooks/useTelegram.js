import { useEffect, useState } from 'react';

/**
 * Доступ к Telegram WebApp SDK + нативным API.
 * Вне Telegram работает в режиме заглушки.
 */
export function useTelegram() {
  const [tg, setTg] = useState(null);
  const [initData, setInitData] = useState('');
  const [inTelegram, setInTelegram] = useState(false);
  const [tgTheme, setTgTheme] = useState('light');

  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    if (wa) {
      wa.ready();
      wa.expand();
      setTg(wa);
      setInitData(wa.initData || '');
      setInTelegram(true);
      setTgTheme(wa.colorScheme || 'light');
      wa.onEvent('themeChanged', () => setTgTheme(wa.colorScheme || 'light'));
    } else {
      setInTelegram(false);
      setInitData('dev');
    }
  }, []);

  const hapticFeedback = (style = 'light') => {
    try { tg?.HapticFeedback?.impactOccurred?.(style); } catch {}
  };

  // ===== Нативные кнопки (MainButton, BackButton) =====
  const showMainButton = (text, onClick) => {
    try {
      const mb = tg?.MainButton;
      if (!mb) return;
      mb.setText(text);
      mb.show();
      mb.onClick(onClick);
    } catch {}
  };
  const hideMainButton = () => {
    try { tg?.MainButton?.hide(); } catch {}
  };
  const showBackButton = (onClick) => {
    try {
      const bb = tg?.BackButton;
      if (!bb) return;
      bb.show();
      bb.onClick(onClick);
    } catch {}
  };
  const hideBackButton = () => {
    try { tg?.BackButton?.hide(); } catch {}
  };

  // ===== CloudStorage (офлайн кэш) =====
  const cloudGet = (key) => new Promise((resolve) => {
    try {
      tg?.CloudStorage?.getItem(key, (err, val) => resolve(err ? null : val));
    } catch { resolve(null); }
  });
  const cloudSet = (key, value) => new Promise((resolve) => {
    try {
      tg?.CloudStorage?.setItem(key, value, (err, ok) => resolve(err ? false : true));
    } catch { resolve(false); }
  });

  // ===== Disable vertical swipe (чтобы не закрывал мини-апп) =====
  const disableVerticalSwipes = () => {
    try { tg?.disableVerticalSwipes?.(); } catch {}
  };
  const enableVerticalSwipes = () => {
    try { tg?.enableVerticalSwipes?.(); } catch {}
  };

  return {
    tg, initData, inTelegram, tgTheme, hapticFeedback,
    showMainButton, hideMainButton, showBackButton, hideBackButton,
    cloudGet, cloudSet, disableVerticalSwipes, enableVerticalSwipes,
  };
}
