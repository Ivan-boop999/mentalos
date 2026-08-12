import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * MentalOS Sound Engine v2 — мягкие, медитативные звуки.
 *
 * Принципы (как в Calm, Headspace, Apple Health):
 *  - Только SINE-волны (нет резких triangular/square)
 *  - Долгий attack (50-150мс) → нет щелчка
 *  - Долгий exponential release (1-2с) → «обволакивающий» хвост
 *  - Основная частота + тихий субгармоник (на октаву ниже) → теплота
 *  - ConvolverNode-реверберация (синтезированный impulse response) → пространственность
 *  - LowPass фильтр → отсечка резких верхних гармоник
 *
 * Палитры для 7 тем — отличаются основным тоном и тембром, но все мягкие.
 */

const SKIN_PROFILES = {
  default: { freq: 880.0,    chord: [523.25, 659.25, 783.99], wave: 'sine',     cutoff: 4000, detuneCents: 4 },   // A5, C-E-G
  aurora:  { freq: 987.77,   chord: [659.25, 783.99, 987.77], wave: 'sine',     cutoff: 5000, detuneCents: 6 },   // brighter, higher
  sunset:  { freq: 698.46,   chord: [440.0, 554.37, 659.25],  wave: 'sine',     cutoff: 3200, detuneCents: 5 },   // warm, lower
  forest:  { freq: 587.33,   chord: [392.0, 493.88, 587.33],  wave: 'sine',     cutoff: 2800, detuneCents: 3 },   // deep, woody
  ocean:   { freq: 783.99,   chord: [523.25, 659.25, 783.99], wave: 'sine',     cutoff: 3500, detuneCents: 7 },   // flowing
  mono:    { freq: 880.0,    chord: [659.25, 880.0],          wave: 'sine',     cutoff: 3000, detuneCents: 0 },   // minimal 2 notes
  neon:    { freq: 1046.5,   chord: [783.99, 987.77, 1318.51],wave: 'sine',     cutoff: 6000, detuneCents: 8 },   // crystalline high
};

const audioCache = {};
function getAudio(name) {
  if (audioCache[name]) return audioCache[name];
  const urls = {
    tick: '/sounds/tick.mp3',
    pop: '/sounds/pop.mp3',
    click: '/sounds/click.mp3',
    toggle: '/sounds/toggle.mp3',
    whoosh: '/sounds/whoosh.mp3',
    error: '/sounds/error.mp3',
  };
  if (!urls[name]) return null;
  const a = new Audio(urls[name]);
  a.preload = 'auto';
  a.volume = 0.45; // тише, чем раньше
  audioCache[name] = a;
  return a;
}

let ctxSingleton = null;
let masterGain = null;
let reverbNode = null;

function getCtx() {
  if (ctxSingleton) return ctxSingleton;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctxSingleton = new Ctx();

    // Master gain (общая громкость синтеза)
    masterGain = ctxSingleton.createGain();
    masterGain.gain.value = 0.7;

    // Реверберация: синтезируем «хвост» как в большом зале
    reverbNode = ctxSingleton.createConvolver();
    reverbNode.buffer = makeImpulseResponse(ctxSingleton, 2.2, 2.5); // 2.2 сек хвоста
    const reverbGain = ctxSingleton.createGain();
    reverbGain.gain.value = 0.35; // «влажность» — сколько реверба в миксе

    masterGain.connect(ctxSingleton.destination);
    masterGain.connect(reverbNode);
    reverbNode.connect(reverbGain).connect(ctxSingleton.destination);

    return ctxSingleton;
  } catch { return null; }
}

/** Синтезированный impulse response для реверберации (декорреляция + экспоненциальный затух). */
function makeImpulseResponse(ctx, duration, decay) {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

/**
 * Воспроизводит одну мягкую ноту через осциллятор с субгармоникой.
 * - attack (сек): плавное нарастание, чтобы не было «щелчка»
 * - hold (сек): удержание
 * - release (сек): длинный экспоненциальный спад → «обволакивающий» хвост
 */
function playSoftNote(ctx, freq, opts) {
  const { attack = 0.06, hold = 0.15, release = 1.4, gain = 0.16, detune = 0, wave = 'sine', cutoff = 4000, startAt = 0 } = opts;
  const t0 = (startAt || ctx.currentTime) + 0;

  // Основной осциллятор
  const osc = ctx.createOscillator();
  osc.type = wave;
  osc.frequency.value = freq;
  if (detune) osc.detune.value = detune;

  // Субгармоника (октава ниже, тихо) → добавляет «теплоту»
  const sub = ctx.createOscillator();
  sub.type = wave;
  sub.frequency.value = freq / 2;

  // Фильтр низких — срезает резкие верха
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  filter.Q.value = 0.7;

  // Огибающая громкости (ADSR-стиль, мягкая)
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + attack); // мягкий attack
  env.gain.setValueAtTime(gain, t0 + attack + hold);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release); // длинный «хвост»

  const subGain = ctx.createGain();
  subGain.gain.value = 0.4; // субгармоника вдвое тише

  osc.connect(env);
  sub.connect(subGain).connect(env);
  env.connect(filter).connect(masterGain);

  osc.start(t0);
  sub.start(t0);
  const stopAt = t0 + attack + hold + release + 0.05;
  osc.stop(stopAt);
  sub.stop(stopAt);
}

export function useSound(activeSkin = 'default') {
  const [enabled, setEnabled] = useState(() => {
    const v = localStorage.getItem('mentalos-sound');
    return v === null ? true : v === '1';
  });
  const skinRef = useRef(activeSkin);
  useEffect(() => { skinRef.current = activeSkin; }, [activeSkin]);

  useEffect(() => {
    localStorage.setItem('mentalos-sound', enabled ? '1' : '0');
  }, [enabled]);

  // Разбудить audio context при первом взаимодействии
  useEffect(() => {
    const unlock = () => {
      const c = getCtx();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const play = useCallback((name) => {
    if (!enabled) return;
    const skin = SKIN_PROFILES[skinRef.current] || SKIN_PROFILES.default;
    const ctx = getCtx();

    // ===== Медитативные синтезированные звуки =====
    if (name === 'tick') {
      // Одна мягкая нота — как касание кристаллической чаши
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      playSoftNote(ctx, skin.freq, { attack: 0.04, hold: 0.08, release: 1.1, gain: 0.18, detune: 0, wave: skin.wave, cutoff: skin.cutoff });
      return;
    }
    if (name === 'success') {
      // Восходящая мягкая арпеджио (как колокольный перезвон) — 3 ноты с задержкой
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const [a, b, c] = skin.chord;
      playSoftNote(ctx, a, { attack: 0.05, hold: 0.2, release: 1.6, gain: 0.15, wave: skin.wave, cutoff: skin.cutoff });
      playSoftNote(ctx, b, { attack: 0.05, hold: 0.2, release: 1.6, gain: 0.13, wave: skin.wave, cutoff: skin.cutoff, startAt: ctx.currentTime + 0.13 });
      playSoftNote(ctx, c, { attack: 0.05, hold: 0.25, release: 1.8, gain: 0.14, wave: skin.wave, cutoff: skin.cutoff, startAt: ctx.currentTime + 0.26 });
      return;
    }
    if (name === 'levelup') {
      // Медитативные фанфары: 4 ноты + «капля» octave-up в конце, всё мягко
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const chord = skin.chord;
      // Первая волна — восходящее арпеджио
      chord.forEach((f, i) => {
        playSoftNote(ctx, f, { attack: 0.06, hold: 0.25, release: 1.8, gain: 0.14, wave: skin.wave, cutoff: skin.cutoff, startAt: ctx.currentTime + i * 0.12 });
      });
      // Вторая волна — на октаву выше, через 0.6 сек (торжественный «звон»)
      chord.forEach((f, i) => {
        playSoftNote(ctx, f * 2, { attack: 0.08, hold: 0.3, release: 2.2, gain: 0.10, wave: skin.wave, cutoff: skin.cutoff + 1000, startAt: ctx.currentTime + 0.6 + i * 0.08 });
      });
      return;
    }

    // ===== Простые UI-действия: мягкие mp3 (тише) =====
    const a = getAudio(name);
    if (!a) return;
    try {
      a.currentTime = 0;
      a.volume = 0.35;
      a.play().catch(() => {});
    } catch {}
  }, [enabled]);

  return { play, enabled, setEnabled };
}
