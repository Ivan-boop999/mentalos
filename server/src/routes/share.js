import { Router } from 'express';
import { createCanvas } from '@napi-rs/canvas';

const router = Router();

/**
 * GET /api/share/story.png?name=...&streak=...&ach=...
 * Публичный (без авторизации — Telegram сам скачивает картинку по URL).
 * Генерирует branded-изображение 1080×1920 для Telegram Stories (shareToStory API).
 */
router.get('/story.png', async (req, res) => {
  try {
    const name = String(req.query.name || '').slice(0, 40);
    const streak = Math.max(0, Math.min(9999, Number(req.query.streak) || 0));
    const ach = String(req.query.ach || '').slice(0, 60);

    const W = 1080;
    const H = 1920;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Фон: глубокий градиент
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0E0B1E');
    bg.addColorStop(0.5, '#14102A');
    bg.addColorStop(1, '#0A0A16');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Свечения
    const glow1 = ctx.createRadialGradient(W * 0.85, H * 0.15, 0, W * 0.85, H * 0.15, 640);
    glow1.addColorStop(0, 'rgba(124,58,237,0.55)');
    glow1.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(W * 0.1, H * 0.85, 0, W * 0.1, H * 0.85, 700);
    glow2.addColorStop(0, 'rgba(6,182,212,0.4)');
    glow2.addColorStop(1, 'rgba(6,182,212,0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';

    // Логотип
    ctx.font = '700 92px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('MentalOS', W / 2, 300);
    ctx.font = '400 40px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('трекер привычек', W / 2, 365);

    // Главное число: серия
    const bigY = 760;
    ctx.beginPath();
    ctx.arc(W / 2, bigY, 250, 0, Math.PI * 2);
    const circleFill = ctx.createLinearGradient(W / 2 - 250, bigY - 250, W / 2 + 250, bigY + 250);
    circleFill.addColorStop(0, '#7C3AED');
    circleFill.addColorStop(1, '#06B6D4');
    ctx.fillStyle = circleFill;
    ctx.fill();

    ctx.font = '800 200px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(String(streak), W / 2, bigY + 70);
    ctx.font = '600 44px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('дней подряд 🔥', W / 2, bigY + 150);

    // Имя
    if (name) {
      ctx.font = '700 64px system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(name, W / 2, 1150);
    }

    // Достижение
    if (ach) {
      ctx.font = '600 46px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(ach, W / 2, 1230);
    }

    // CTA внизу
    ctx.font = '600 42px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('Присоединяйся к MentalOS', W / 2, H - 140);

    const png = await canvas.encode('png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(png);
  } catch (err) {
    console.error('story.png:', err);
    res.status(500).json({ error: 'Ошибка генерации' });
  }
});

export default router;
