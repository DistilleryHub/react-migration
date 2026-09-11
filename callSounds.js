// Lightweight WebAudio-based ringtone / ringback tone generator.
// No audio files needed — nothing to upload, nothing that can 404.

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function beep(ctx, freq, when, duration, volume) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration);
}

// Ringback tone — CALLER sunta hai jab tak doosra pick na kare.
export function startRingback() {
  const ctx = getCtx();
  let stopped = false;
  let timeoutId = null;

  function cycle() {
    if (stopped) return;
    const now = ctx.currentTime;
    beep(ctx, 425, now, 1.2, 0.1);
    timeoutId = setTimeout(cycle, 3000);
  }
  cycle();

  return function stop() {
    stopped = true;
    if (timeoutId) clearTimeout(timeoutId);
  };
}

// Ringtone — CALLEE sunta hai jab incoming call aaye, + vibration.
export function startRingtone() {
  const ctx = getCtx();
  let stopped = false;
  let timeoutId = null;

  function cycle() {
    if (stopped) return;
    const now = ctx.currentTime;
    beep(ctx, 1000, now, 0.35, 0.14);
    beep(ctx, 1000, now + 0.45, 0.35, 0.14);
    if (navigator.vibrate) {
      try { navigator.vibrate([350, 150, 350, 1500]); } catch (e) { /* ignore */ }
    }
    timeoutId = setTimeout(cycle, 2200);
  }
  cycle();

  return function stop() {
    stopped = true;
    if (timeoutId) clearTimeout(timeoutId);
    if (navigator.vibrate) {
      try { navigator.vibrate(0); } catch (e) { /* ignore */ }
    }
  };
}
