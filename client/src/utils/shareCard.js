/**
 * Рисует карточку статистики MentalOS на <canvas> и возвращает dataURL (PNG).
 * Размер оптимизирован под Instagram/Telegram Stories (9:16).
 */

const W = 1080;
const H = 1920;

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 124, g: 58, b: 237 };
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = text.split(' ');
  let line = '';
  let lines = [];
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  lines.push(line);
  lines = lines.slice(0, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return lines.length * lineHeight;
}

/**
 * @param {object} params
 * @param {string} params.userName - имя пользователя
 * @param {object} params.stats - ответ api.getStats()
 * @param {Array}  params.habits - список привычек (для топа)
 */
export function renderShareCard({ userName, stats, habits = [] }) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const accent = '#7C3AED';
  const accentRgb = hexToRgb(accent);

  // ===== Фон (градиент) =====
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0E0E14');
  bg.addColorStop(0.5, '#16161F');
  bg.addColorStop(1, '#0E0E14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Декоративные пятна
  ctx.fillStyle = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.25)`;
  ctx.beginPath();
  ctx.arc(W - 150, 250, 350, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(99,102,241,0.18)';
  ctx.beginPath();
  ctx.arc(150, H - 300, 400, 0, Math.PI * 2);
  ctx.fill();

  // ===== Лого / Заголовок =====
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px -apple-system, system-ui, sans-serif';
  ctx.fillText('🧠 MentalOS', W / 2, 150);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '32px system-ui, sans-serif';
  ctx.fillText(userName ? `Прогресс ${userName}` : 'Твой прогресс', W / 2, 210);

  // ===== Главная цифра: % выполнения =====
  const cy = 480;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(W / 2, cy, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 120px system-ui, sans-serif';
  ctx.fillText(`${stats.completionRate}%`, W / 2, cy + 40);

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText('средняя регулярность', W / 2, cy + 90);

  // ===== Три метрики =====
  const metrics = [
    { label: 'Сегодня', value: `${stats.doneToday}/${stats.totalHabits}` },
    { label: 'Лучшая серия', value: `${stats.bestStreak} 🔥` },
    { label: 'Привычек', value: stats.totalHabits },
  ];
  const my = 820;
  metrics.forEach((m, i) => {
    const x = (W / 3) * i + W / 6;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText(String(m.value), x, my);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillText(m.label, x, my + 45);
  });

  // ===== Топ привычек =====
  const top = [...habits].slice(0, 5);
  if (top.length) {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText('ТОП ПРИВЫЧЕК', 100, 1050);

    let ty = 1120;
    top.forEach((h, i) => {
      const s = stats.perHabit?.find((p) => p.id === h.id);
      const pct = s?.completionRate ?? 0;

      // Эмодзи + название
      ctx.fillStyle = '#fff';
      ctx.font = '36px system-ui, sans-serif';
      ctx.fillText(`${h.emoji}  ${h.title}`, 100, ty);

      // Процент
      ctx.fillStyle = accent;
      ctx.textAlign = 'right';
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.fillText(`${pct}%`, W - 100, ty);
      ctx.textAlign = 'left';

      // Полоска прогресса
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      roundRect(ctx, 100, ty + 20, W - 200, 12, 6);
      ctx.fill();
      ctx.fillStyle = h.color || accent;
      const barW = Math.max(12, (W - 200) * (pct / 100));
      roundRect(ctx, 100, ty + 20, barW, 12, 6);
      ctx.fill();

      ty += 110;
    });
  }

  // ===== Подпись снизу =====
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText('Отслеживай свои привычки в MentalOS', W / 2, H - 80);

  return canvas.toDataURL('image/png');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
