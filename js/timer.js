/**
 * Rest timer. Single global instance. Counts down, vibrates + beeps at 0.
 * UI binds via start/stop and onTick.
 */
import { getDefaultRest } from './store.js';

let intervalId = null;
let remaining = 0;
let listeners = new Set();

function emit() {
  for (const fn of listeners) {
    try { fn(remaining); } catch (e) { console.warn('timer listener', e); }
  }
}

function tone() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.25;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 350);
  } catch { /* ignore */ }
}

function vibrate() {
  if (navigator.vibrate) navigator.vibrate([180, 80, 180]);
}

export function startTimer(seconds = getDefaultRest()) {
  stopTimer();
  remaining = Math.max(1, Math.round(seconds));
  emit();
  intervalId = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      stopTimer();
      remaining = 0;
      emit();
      vibrate();
      tone();
      return;
    }
    emit();
  }, 1000);
}

export function stopTimer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  remaining = 0;
  emit();
}

export function isRunning() {
  return intervalId != null;
}

export function getRemaining() {
  return remaining;
}

export function onTick(fn) {
  listeners = new Set([...listeners, fn]);
  return () => {
    listeners = new Set([...listeners].filter((f) => f !== fn));
  };
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
