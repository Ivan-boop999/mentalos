import { useEffect, useState } from 'react';
import { api } from '../api/client';

/**
 * Определяет часовой пояс пользователя (IANA, напр. Europe/Moscow)
 * и синхронизирует его с сервером.
 */
export function useTimezone(initData) {
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  );

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setTimezone(detected);

    if (!initData || initData === 'dev') return;

    // Получаем текущее значение с сервера и при необходимости обновляем
    (async () => {
      try {
        const s = await api.getSettings();
        if (s.timezone !== detected) {
          await api.updateSettings({ timezone: detected });
        }
      } catch {
        /* noop */
      }
    })();
  }, [initData]);

  return timezone;
}
