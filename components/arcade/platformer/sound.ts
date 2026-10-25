// ==========================================
// Stack Runner sound: original chiptune SFX and a music loop, synthesized with Web Audio.
// ==========================================

export type Sfx =
  | "jump"
  | "coin"
  | "skill"
  | "bump"
  | "stomp"
  | "sprout"
  | "powerup"
  | "hurt"
  | "die"
  | "win";

const STORAGE_KEY = "stack-runner-muted";
const VOLUME = 0.5;
const EIGHTH = 0.2; // 150 bpm

// 4 bars of eighth notes (MIDI, 0 = rest) over a C – D – E – G bass walk
const LEAD = [
  72, 0, 76, 79, 0, 76, 74, 72,
  74, 0, 77, 81, 0, 79, 77, 74,
  76, 0, 79, 84, 0, 83, 81, 79,
  77, 76, 74, 72, 74, 0, 67, 0,
];
const BASS_ROOTS = [48, 50, 52, 43];

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class Sound {
  muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer = 0;
  private step = 0;
  private nextAt = 0;

  constructor() {
    try {
      this.muted = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // storage blocked: default to sound on
    }
  }

  /** Must run inside a user gesture (browsers keep audio locked until then). */
  unlock() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : VOLUME;
      this.master.connect(this.ctx.destination);
    }
    void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch {
      // ignore
    }
    if (this.master) this.master.gain.value = muted ? 0 : VOLUME;
  }

  sfx(name: Sfx) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const seq = (notes: number[], step: number, type: OscillatorType = "square", vol = 0.12) =>
      notes.forEach((n, i) => this.note(hz(n), t + i * step, step * 1.6, type, vol));

    switch (name) {
      case "jump":
        return this.note(300, t, 0.14, "square", 0.1, 620);
      case "coin":
        this.note(hz(83), t, 0.06, "square", 0.1);
        return this.note(hz(88), t + 0.06, 0.28, "square", 0.1);
      case "skill":
        return seq([72, 76, 79, 84, 88], 0.05);
      case "bump":
        return this.note(140, t, 0.09, "triangle", 0.35, 70);
      case "stomp":
        return this.note(520, t, 0.1, "square", 0.12, 110);
      case "sprout":
        return this.note(220, t, 0.35, "triangle", 0.3, 880);
      case "powerup":
        return seq([60, 64, 67, 72, 76, 79, 84], 0.045);
      case "hurt":
        return this.note(440, t, 0.3, "square", 0.12, 110);
      case "die":
        return seq([76, 72, 67, 64, 60, 55], 0.12);
      case "win":
        seq([72, 76, 79, 84, 79, 84, 88], 0.12);
        return seq([48, 55, 60, 55, 60, 64, 60], 0.12, "triangle", 0.2);
    }
  }

  music(on: boolean) {
    window.clearInterval(this.musicTimer);
    this.musicTimer = 0;
    const ctx = this.ctx;
    if (!on || !ctx) return;
    this.step = 0;
    this.nextAt = ctx.currentTime + 0.05;
    // look-ahead scheduler: queue notes slightly ahead so timer jitter never makes them late
    this.musicTimer = window.setInterval(() => {
      while (this.nextAt < ctx.currentTime + 0.15) {
        const i = this.step % LEAD.length;
        if (LEAD[i]) this.note(hz(LEAD[i]), this.nextAt, EIGHTH * 0.9, "square", 0.04);
        const root = BASS_ROOTS[Math.floor(i / 8)];
        this.note(hz(i % 2 ? root + 12 : root), this.nextAt, EIGHTH * 0.8, "triangle", 0.1);
        this.nextAt += EIGHTH;
        this.step++;
      }
    }, 25);
  }

  destroy() {
    this.music(false);
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }

  private note(freq: number, at: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }
}
