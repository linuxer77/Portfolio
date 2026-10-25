// ==========================================
// PAC-MAN mode sound: all synthesized with Web Audio, in the spirit of the arcade (a two-tone
// waka, a siren that rises with the ghosts, a warble when they're scared) without its tunes.
// ==========================================

const STORAGE_KEY = "pacman-muted";
const VOLUME = 0.45;

export class Sound {
  muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private siren: { osc: OscillatorNode; gain: GainNode } | null = null;
  private waka = false;
  private lastWaka = 0;

  constructor() {
    try {
      this.muted = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // storage blocked: sound on
    }
  }

  /** Must run inside a user gesture (browsers keep audio locked until then). */
  unlock() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : VOLUME;
      this.master.connect(this.ctx.destination);
    }
    void this.ctx.resume();
  }

  private tone(type: OscillatorType, from: number, to: number, start: number, len: number, vol: number) {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + len);
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + len);
    osc.connect(g).connect(master);
    osc.start(start);
    osc.stop(start + len);
  }

  /** One half of the waka, alternating down and up; rate-limited to the chomp. */
  chomp() {
    const ctx = this.ctx;
    if (!ctx || ctx.currentTime - this.lastWaka < 0.13) return;
    this.lastWaka = ctx.currentTime;
    this.waka = !this.waka;
    const [a, b] = this.waka ? [500, 210] : [210, 500];
    this.tone("triangle", a, b, ctx.currentTime, 0.11, 0.35);
  }

  pellet() {
    const t = this.ctx?.currentTime ?? 0;
    this.tone("square", 130, 520, t, 0.25, 0.12);
    this.tone("square", 520, 130, t + 0.22, 0.25, 0.1);
  }

  /** A whole box going down in one gulp. */
  gulp(size: number) {
    const t = this.ctx?.currentTime ?? 0;
    const low = Math.max(50, 160 - size * 0.4);
    this.tone("sine", low * 2.5, low, t, 0.22, 0.6);
    this.tone("triangle", 900, 300, t, 0.08, 0.15);
  }

  eatGhost() {
    const t = this.ctx?.currentTime ?? 0;
    this.tone("square", 180, 1400, t, 0.32, 0.12);
  }

  die() {
    const t = this.ctx?.currentTime ?? 0;
    for (let i = 0; i < 9; i++) this.tone("triangle", 900 - i * 80, 400 - i * 35, t + i * 0.13, 0.12, 0.25);
    this.tone("sine", 160, 60, t + 1.2, 0.18, 0.4);
    this.tone("sine", 160, 60, t + 1.38, 0.18, 0.4);
  }

  /** A short original fanfare for READY! */
  start() {
    const t = this.ctx?.currentTime ?? 0;
    const notes = [523, 659, 784, 1046, 784, 1046, 1319];
    notes.forEach((f, i) => this.tone("square", f, f * 0.99, t + i * 0.11, 0.1, 0.08));
    this.tone("triangle", 131, 130, t, 0.77, 0.25);
  }

  win() {
    const t = this.ctx?.currentTime ?? 0;
    [523, 659, 784, 1046, 1319, 1568].forEach((f, i) => this.tone("square", f, f, t + i * 0.09, 0.16, 0.09));
  }

  /** The background siren: pitch climbs as the page empties; it warbles while ghosts are scared. */
  setSiren(on: boolean, progress: number, scared: boolean, time: number) {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    if (!on) {
      this.siren?.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      return;
    }
    if (!this.siren) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      gain.gain.value = 0;
      osc.connect(gain).connect(master);
      osc.start();
      this.siren = { osc, gain };
    }
    const { osc, gain } = this.siren;
    const tri = Math.abs(((time * (scared ? 6 : 2.4)) % 2) - 1);
    const f = scared ? 160 + tri * 140 : 380 + progress * 260 + tri * (240 + progress * 160);
    osc.type = scared ? "square" : "triangle";
    osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.02);
    gain.gain.setTargetAtTime(scared ? 0.035 : 0.05, ctx.currentTime, 0.05);
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

  destroy() {
    void this.ctx?.close();
    this.ctx = null;
    this.siren = null;
  }
}
