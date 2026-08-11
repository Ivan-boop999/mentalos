import { useState } from 'react';
import { Share2, Loader } from 'lucide-react';
import { renderShareCard } from '../utils/shareCard.js';

/**
 * Кнопка генерирует карточку статистики и:
 *  - в Telegram: пытается открыть «Поделиться» через switchInlineQuery с картинкой,
 *    либо скачивает PNG (зависит от платформы Telegram WebApp).
 *  - в браузере: скачивает PNG.
 */
export default function ShareButton({ userName, stats, habits, tg }) {
  const [busy, setBusy] = useState(false);

  const handleShare = async () => {
    setBusy(true);
    try {
      const dataUrl = renderShareCard({ userName, stats, habits });

      // Пробуем открыть через Telegram WebApp share (если поддерживается)
      if (tg && tg.switchInlineQuery) {
        // В новых версиях SDK — прямой шер. Но картинку так не передать,
        // поэтому скачиваем файл и предлагаем поделиться вручную.
      }

      // Универсальный способ: скачать PNG — пользователь сам отправит в сторис/чат
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `mentalos-stats-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert('Не удалось создать картинку: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className="share-btn" onClick={handleShare} disabled={busy || !stats}>
      {busy ? <Loader size={16} className="spin" /> : <Share2 size={16} />}
      <span>Поделиться в сторис</span>
    </button>
  );
}
