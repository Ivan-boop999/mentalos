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

      const onTheme = () => setTgTheme(wa.colorScheme || 'light');
      wa.onEvent('themeChanged', onTheme);

      // P1 FIX: cleanup listener при размонтировании
      return () => {
        try { wa.offEvent('themeChanged', onTheme); } catch {}
        try { wa.BackButton?.hide(); } catch {}
        try { wa.MainButton?.hide(); } catch {}
      };
    } else {
      setInTelegram(false);
      setInitData('dev');
    }
  }, []);

  const hapticFeedback = (style = 'light') => {
    try { tg?.HapticFeedback?.impactOccurred?.(style); } catch {}
  };

  // P1 FIX: BackButton с offClick cleanup
  const showBackButton = (onClick) => {
    try {
      const bb = tg?.BackButton;
      if (!bb) return;
      bb.onClick(onClick);
      bb._mentalosHandler = onClick; // сохраняем для cleanup
      bb.show();
    } catch {}
  };
  const hideBackButton = () => {
    try {
      const bb = tg?.BackButton;
      if (!bb) return;
      if (bb._mentalosHandler) { bb.offClick(bb._mentalosHandler); bb._mentalosHandler = null; }
      bb.hide();
    } catch {}
  };

  const showMainButton = (text, onClick) => {
    try {
      const mb = tg?.MainButton;
      if (!mb) return;
      mb.setText(text);
      mb.onClick(onClick);
      mb._mentalosHandler = onClick;
      mb.show();
    } catch {}
  };
  const hideMainButton = () => {
    try {
      const mb = tg?.MainButton;
      if (!mb) return;
      if (mb._mentalosHandler) { mb.offClick(mb._mentalosHandler); mb._mentalosHandler = null; }
      mb.hide();
    } catch {}
  };

  const cloudGet = (key) => new Promise((resolve) => {
    try { tg?.CloudStorage?.getItem(key, (err, val) => resolve(err ? null : val)); } catch { resolve(null); }
  });
  const cloudSet = (key, value) => new Promise((resolve) => {
    try { tg?.CloudStorage?.setItem(key, value, (err) => resolve(!err)); } catch { resolve(false); }
  });

  const disableVerticalSwipes = () => { try { tg?.disableVerticalSwipes?.(); } catch {} };
  const enableVerticalSwipes = () => { try { tg?.enableVerticalSwipes?.(); } catch {} };

  return {
    tg, initData, inTelegram, tgTheme, hapticFeedback,
    showMainButton, hideMainButton, showBackButton, hideBackButton,
    cloudGet, cloudSet, disableVerticalSwipes, enableVerticalSwipes,
  };
}
