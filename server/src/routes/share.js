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

    // Питомец (простое существо в стиле SVG-кастомизации)
    const petName = String(req.query.pet || '').slice(0, 20);
    const petType = String(req.query.ptype || 'spark').slice(0, 10);
    const petY = 1420;
    if (petName) {
      const r = 130;
      const cx = W / 2;
      // Свечение
      const aura = ctx.createRadialGradient(cx, petY, 0, cx, petY, r * 1.8);
      aura.addColorStop(0, 'rgba(124,58,237,0.35)');
      aura.addColorStop(1, 'rgba(124,58,237,0)');
      ctx.fillStyle = aura;
      ctx.fillRect(cx - r * 2, petY - r * 2, r * 4, r * 4);
      // Тело
      const bodyGrad = ctx.createRadialGradient(cx - r * 0.3, petY - r * 0.35, r * 0.1, cx, petY, r);
      const petColors = {
        spark: ['#C4B5FD', '#7C3AED'], leaf: ['#6EE7B7', '#10B981'],
        drop: ['#67E8F9', '#06B6D4'], flame: ['#FCD34D', '#F59E0B'],
      };
      const [c1, c2] = petColors[petType] || petColors.spark;
      bodyGrad.addColorStop(0, c1);
      bodyGrad.addColorStop(1, c2);
      ctx.beginPath();
      ctx.arc(cx, petY, r, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      // Блик
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.35, petY - r * 0.35, r * 0.35, r * 0.25, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      // Глаза
      for (const ex of [-r * 0.35, r * 0.35]) {
        ctx.beginPath(); ctx.arc(cx + ex, petY - r * 0.1, r * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + ex + 3, petY - r * 0.08, r * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = '#1A1A2E'; ctx.fill();
      }
      // Улыбка
      ctx.beginPath();
      ctx.arc(cx, petY + r * 0.15, r * 0.3, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.strokeStyle = '#1A1A2E'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke();
      // Румянец
      for (const ex of [-r * 0.62, r * 0.62]) {
        ctx.beginPath(); ctx.ellipse(cx + ex, petY + r * 0.18, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,150,180,0.4)'; ctx.fill();
      }
      // Имя питомца
      ctx.font = '700 56px system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${petName} хочет познакомиться`, W / 2, petY + 230);
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
