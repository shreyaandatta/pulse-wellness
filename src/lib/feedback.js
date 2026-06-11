// Tactile + audio feedback. Both are gentle, optional, and gated by the user's
// settings, which App keeps in sync via setFeedbackConfig. Everything degrades
// silently where unsupported (notably iOS Safari has no Vibration API).

let cfg = { haptics: true, sounds: true };
export function setFeedbackConfig(next) { cfg = { ...cfg, ...next }; }

// A short buzz. `pattern` is ms or an array (e.g. [12, 30, 18]).
export function haptic(pattern = 10) {
  if (!cfg.haptics) return;
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}

// A soft three-note chime, synthesised so we ship no audio files.
let audioCtx = null;
export function chime() {
  if (!cfg.sounds) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {   // C5 · E5 · G5
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.085;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  } catch { /* audio blocked */ }
}

// Fired together on a goal celebration.
export function celebrateFeedback() {
  haptic([14, 36, 22]);
  chime();
}
