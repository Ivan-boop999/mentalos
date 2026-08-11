import { useCallback, useEffect, useState } from 'react';

/**
 * Система звуков MentalOS v2.
 *
 * Два слоя:
 *  1. Готовые mp3 (Kenney UI Audio, CC0) для tick/pop/click/toggle/whoosh/error.
 *  2. Синтез через Web Audio API для success (аккорд) и levelup (фанфары) —
 *     параметры аккорда/тембр зависят от активной темы, что даёт «разные звуки для тем».
 *
 * Темы → уникальные звуковые палитры:
 *  - default: тёплый синтез (синус)
 *  - aurora: яркий, колокольный (треугольник, мажор)
 *  - sunset: мягкий, обертоны (sine + sine)
 *  - forest: деревянный, низкий (square + lowpass)
 *  - ocean: глубокий, плавный (sine, длинный release)
 *  - mono: минималистичный, чистый тон
 *  - neon: яркий киберпанк (sawtooth + detune)
 */
const SOUND_FILES = {
  tick: '/sounds/tick.mp3',
  pop: '/sounds/pop.mp3',
  click: '/sounds/click.mp3',
  toggle: '/sounds/toggle.mp3',
  whoosh: '/sounds/whoosh.mp3',
  error: '/sounds/error.mp3',
};

// Палитры синтеза по скину темы
const SKIN_PROFILES = {
  default: { wave: 'sine', baseFreq: 523.25, chord: [523.25, 659.25, 783.99], attack: 0.02, release: 0.5, gain: 0.18, detune: 0 },
  aurora:  { wave: 'triangle', baseFreq: 587.33, chord: [587.33, 739.99, 880.0, 1174.66], attack: 0.01, release: 0.7, gain: 0.16, detune: 5 },
  sunset:  { wave: 'sine', baseFreq: 440.0, chord: [440.0, 554.37, 659.25], attack: 0.03, release: 0.6, gain: 0.2, detune: 7 },
  forest:  { wave: 'square', baseFreq: 392.0, chord: [392.0, 466.16, 587.33], attack: 0.02, release: 0.4, gain: 0.1, detune: 0 },
  ocean:   { wave: 'sine', baseFreq: 349.23, chord: [349.23, 440.0, 523.25], attack: 0.05, release: 0.9, gain: 0.22, detune: 0 },
  mono:    { wave: 'sine', baseFreq: 523.25, chord: [523.25, 659.25], attack: 0.02, release: 0.4, gain: 0.15, detune: 0 },
  neon:    { wave: 'sawtooth', baseFreq: 622.25, chord: [622.25, 783.99, 987.77, 1244.51], attack: 0.005, release: 0.5, gain: 0.09, detune: 12 },
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

let audioCtxSingleton = null;
function getCtx() {
  if (audioCtxSingleton) return audioCtxSingleton;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtxSingleton = new Ctx();
    return audioCtxSingleton;
  } catch { return null; }
}

function playChord(profile, notes, opts = {}) {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  const stagger = opts.stagger ?? 0.08;
  const duration = opts.duration ?? profile.release;
  const gainMult = opts.gainMult ?? 1;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = profile.wave;
    osc.frequency.value = freq;
    if (profile.detune) osc.detune.value = (i % 2 === 0 ? 1 : -1) * profile.detune;
    const t0 = now + i * stagger;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(profile.gain * gainMult, t0 + profile.attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  });
}

export function useSound(activeSkin = 'default') {
  const [enabled, setEnabled] = useState(() => {
    const v = localStorage.getItem('mentalos-sound');
    return v === null ? true : v === '1';
  });

  useEffect(() => {
    localStorage.setItem('mentalos-sound', enabled ? '1' : '0');
  }, [enabled]);

  // Разбудить audio context при первом взаимодействии (для автоплея)
  useEffect(() => {
    const unlock = () => { const c = getCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const play = useCallback((name) => {
    if (!enabled) return;
    const profile = SKIN_PROFILES[activeSkin] || SKIN_PROFILES.default;

    if (name === 'success') {
      playChord(profile, profile.chord, { stagger: 0.08 });
      return;
    }
    if (name === 'levelup') {
      // Фанфары: восходящая последовательность аккордов, ярче и длиннее
      playChord(profile, profile.chord, { stagger: 0.05, duration: profile.release * 1.3, gainMult: 1.1 });
      setTimeout(() => playChord(profile, profile.chord.map((f) => f * 1.5), { stagger: 0.04, duration: profile.release * 1.5, gainMult: 1.0 }), 250);
      return;
    }
    // Простой mp3 звук
    const a = getAudio(name);
    if (!a) return;
    try {
      a.currentTime = 0;
      a.volume = activeSkin === 'mono' ? 0.4 : 0.6;
      a.play().catch(() => {});
    } catch {}
  }, [enabled, activeSkin]);

  return { play, enabled, setEnabled };
}
