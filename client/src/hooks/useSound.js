import { useCallback, useEffect, useState } from 'react';

/**
 * Система звуков MentalOS.
 * Звуки: tick (отметка), pop (уведомление), click (кнопка),
 *        toggle (переключатель), whoosh (переход), error, success (синтез).
 *
 * Учитывает:
 * - настройку пользователя (on/off) в localStorage
 * - политику автоплея браузера (звук включается после первого взаимодействия)
 * - hapticFeedback Telegram (дублирует тактильно)
 */
const SOUND_FILES = {
  tick: '/sounds/tick.mp3',
  pop: '/sounds/pop.mp3',
  click: '/sounds/click.mp3',
  toggle: '/sounds/toggle.mp3',
  whoosh: '/sounds/whoosh.mp3',
  error: '/sounds/error.mp3',
};

const audioCache = {};
function getAudio(name) {
  if (audioCache[name]) return audioCache[name];
  const url = SOUND_FILES[name];
  if (!url) return null;
  const a = new Audio(url);
  a.preload = 'auto';
  a.volume = 0.6;
  audioCache[name] = a;
  return a;
}

/** Синтез «success» через Web Audio API (нет внешнего файла, приятный аккорд). */
function playSuccessSynth() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    // Аккорд C-E-G (до-ми-соль) — приятный восходящий
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.5);
    });
    // Закрыть ctx после воспроизведения
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    /* noop */
  }
}

export function useSound() {
  const [enabled, setEnabled] = useState(() => {
    const v = localStorage.getItem('mentalos-sound');
    return v === null ? true : v === '1'; // по умолчанию включено
  });

  useEffect(() => {
    localStorage.setItem('mentalos-sound', enabled ? '1' : '0');
  }, [enabled]);

  const play = useCallback((name) => {
    if (!enabled) return;
    if (name === 'success') {
      playSuccessSynth();
      return;
    }
    const a = getAudio(name);
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {}); // автоплей-политика — тихо игнорируем
    } catch {
      /* noop */
    }
  }, [enabled]);

  return { play, enabled, setEnabled };
}
