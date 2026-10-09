// Short UI sound cues, synthesised with the Web Audio API so there are no
// audio files to ship or license. Every call is fire-and-forget and silently
// does nothing on the server, when muted, or when audio is unavailable.

export type SoundCue = "hover" | "click" | "confirm" | "tile" | "success" | "fail" | "tick";

const MUTE_KEY = "countdowndle:muted";
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let muted: boolean | null = null;

export function isMuted(): boolean {
  if (muted === null) {
    try {
      muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      muted = false;
    }
  }
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // storage blocked: the setting just won't persist
  }
  listeners.forEach((l) => l());
}

// For useSyncExternalStore.
export function subscribeMuted(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface Note {
  freq: number;
  at?: number; // seconds after now
  dur: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number; // end frequency
}

const CUES: Record<SoundCue, Note[]> = {
  hover: [{ freq: 1800, dur: 0.025, type: "sine", gain: 0.03 }],
  click: [
    { freq: 520, dur: 0.06, type: "triangle", gain: 0.12, slideTo: 880 },
    { freq: 1320, at: 0.05, dur: 0.08, type: "sine", gain: 0.06 },
  ],
  confirm: [{ freq: 660, dur: 0.09, type: "triangle", gain: 0.1 }],
  tile: [{ freq: 980, dur: 0.05, type: "square", gain: 0.035, slideTo: 760 }],
  success: [
    { freq: 523.25, dur: 0.12, type: "triangle", gain: 0.1 },
    { freq: 659.25, at: 0.1, dur: 0.12, type: "triangle", gain: 0.1 },
    { freq: 783.99, at: 0.2, dur: 0.25, type: "triangle", gain: 0.11 },
  ],
  fail: [
    { freq: 330, dur: 0.16, type: "sawtooth", gain: 0.05, slideTo: 220 },
    { freq: 220, at: 0.15, dur: 0.22, type: "sawtooth", gain: 0.05, slideTo: 150 },
  ],
  tick: [{ freq: 1200, dur: 0.03, type: "square", gain: 0.03 }],
};

export function playSound(cue: SoundCue): void {
  if (isMuted()) return;
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  for (const n of CUES[cue]) {
    const start = now + (n.at ?? 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.setValueAtTime(n.freq, start);
    if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, start + n.dur);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(n.gain ?? 0.08, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + n.dur + 0.02);
  }
}
