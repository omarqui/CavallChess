/**
 * Sonido sintetizado (Web Audio, sin archivos) y háptica best-effort.
 * En iOS no existe navigator.vibrate: se usa el truco del <input switch> (iOS 18+), que necesita
 * ejecutarse dentro del gesto del usuario; si una actualización lo rompe, solo se pierde el detalle.
 */

let ctx: AudioContext | null = null;
let enabled = { sound: true, haptics: true };

export function configureFeedback(opts: { sound: boolean; haptics: boolean }) {
  enabled = opts;
}

function audio(): AudioContext | null {
  if (!enabled.sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Golpe de madera corto: ruido filtrado con envolvente rápida. */
function knock(ac: AudioContext, when: number, gain = 0.5, freq = 1800) {
  const len = Math.floor(ac.sampleRate * 0.05);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = 1.4;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(when);
}

function tone(ac: AudioContext, when: number, freq: number, dur: number, gain = 0.12, type: OscillatorType = 'sine') {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g).connect(ac.destination);
  o.start(when);
  o.stop(when + dur + 0.02);
}

export function playMoveSound(capture = false) {
  const ac = audio();
  if (!ac) return;
  knock(ac, ac.currentTime, capture ? 0.75 : 0.5, capture ? 1300 : 1800);
}

export function playCorrect() {
  const ac = audio();
  if (ac) {
    const t = ac.currentTime + 0.04;
    tone(ac, t, 784, 0.25);
    tone(ac, t + 0.09, 1175, 0.35);
  }
  haptic(1);
}

export function playWrong() {
  const ac = audio();
  if (ac) {
    const t = ac.currentTime + 0.02;
    tone(ac, t, 196, 0.32, 0.1, 'triangle');
    tone(ac, t + 0.11, 165, 0.36, 0.1, 'triangle');
  }
  haptic(2);
}

let switchLabel: HTMLLabelElement | null = null;

function iosTick() {
  if (!switchLabel) {
    switchLabel = document.createElement('label');
    switchLabel.ariaHidden = 'true';
    switchLabel.style.cssText = 'position:fixed;left:-9999px;opacity:0;pointer-events:none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    switchLabel.appendChild(input);
    document.body.appendChild(switchLabel);
  }
  switchLabel.click();
}

/** `pulses` = 1 para acierto, 2 para fallo. */
export function haptic(pulses: 1 | 2) {
  if (!enabled.haptics) return;
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pulses === 1 ? 18 : [30, 60, 30]);
      return;
    }
    iosTick();
    if (pulses === 2) setTimeout(iosTick, 90);
  } catch {
    /* sin háptica */
  }
}
