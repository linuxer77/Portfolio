import { noiseBuffer } from "../streetfighter/assets";

// ==========================================
// POKÉMON mode sound, synthesized: the ball's throw, pop and recall zap, roars, hits that
// sound different when they're super effective (or not very), fire and water streams, slams,
// the shell's whirr, the low-HP beep, and a little fanfare for the winner.
// ==========================================

const STORAGE_KEY = "pokemon-muted";
const VOLUME = 0.45;

export class Sound {
  muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;

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
      this.noise = noiseBuffer(this.ctx);
    }
    void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch {
      // storage blocked: just this visit
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : VOLUME, this.ctx.currentTime, 0.02);
  }

  destroy() {
    void this.ctx?.close();
    this.ctx = null;
  }

  // ---------- building blocks ----------

  private tone(
    freq: number,
    to: number,
    dur: number,
    type: OscillatorType = "square",
    vol = 0.2,
    delay = 0,
    attack = 0.005
  ) {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private hiss(
    dur: number,
    filter: BiquadFilterType,
    freq: number,
    to: number,
    vol = 0.3,
    delay = 0,
    q = 1,
    attack = 0.01
  ) {
    const { ctx, master, noise } = this;
    if (!ctx || !master || !noise) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  // ---------- the sounds ----------

  throwBall() {
    this.hiss(0.45, "bandpass", 600, 2400, 0.12, 0, 2);
  }

  /** The ball pops open: a bright pop and a sparkle. */
  ballOpen() {
    this.tone(1200, 300, 0.12, "square", 0.12);
    [1568, 2093, 2637].forEach((f, i) => this.tone(f, f, 0.18, "triangle", 0.08, 0.06 + i * 0.05));
  }

  /** A synthesized roar, rough and falling; a big Pokémon roars lower. */
  roar(low: boolean) {
    const base = low ? 150 : 230;
    this.tone(base * 1.6, base * 0.7, 0.7, "sawtooth", 0.16, 0, 0.04);
    this.tone(base * 1.62, base * 0.68, 0.7, "square", 0.06, 0.01, 0.04);
    this.hiss(0.7, "bandpass", base * 4, base * 2, 0.18, 0, 3, 0.04);
  }

  hit(effect: number, crit: boolean) {
    if (effect > 1) {
      // super effective: the harder, brighter double crack
      this.hiss(0.18, "highpass", 3000, 800, 0.4);
      this.tone(180, 60, 0.2, "square", 0.28);
      this.tone(900, 1800, 0.08, "square", 0.12, 0.06);
    } else if (effect < 1) {
      // not very effective: a dull thud
      this.hiss(0.12, "lowpass", 900, 200, 0.3);
      this.tone(110, 70, 0.12, "triangle", 0.2);
    } else {
      this.hiss(0.14, "bandpass", 1800, 500, 0.32, 0, 1.2);
      this.tone(220, 80, 0.14, "square", 0.18);
    }
    if (crit) this.tone(1400, 2200, 0.1, "square", 0.1, 0.08);
  }

  swipe() {
    this.hiss(0.16, "highpass", 2500, 6000, 0.18);
  }

  flame(dur: number) {
    this.hiss(dur, "lowpass", 900, 2200, 0.32, 0, 0.8, 0.05);
    this.hiss(dur, "bandpass", 300, 180, 0.2, 0, 1.5, 0.05);
  }

  water(dur: number) {
    this.hiss(dur, "highpass", 1800, 1200, 0.3, 0, 0.7, 0.04);
    this.hiss(dur, "bandpass", 500, 700, 0.18, 0, 2, 0.04);
  }

  wave() {
    this.hiss(2.2, "lowpass", 300, 1400, 0.45, 0, 0.7, 0.4);
    this.hiss(2.2, "highpass", 2000, 4000, 0.15, 0.3, 0.7, 0.4);
  }

  slam() {
    this.tone(120, 35, 0.5, "sine", 0.5);
    this.hiss(0.5, "lowpass", 1200, 100, 0.45);
  }

  boom() {
    this.tone(90, 30, 1.2, "sine", 0.55);
    this.hiss(1.2, "lowpass", 2400, 120, 0.5, 0, 0.7, 0.02);
  }

  whoosh() {
    this.hiss(0.5, "bandpass", 400, 1600, 0.2, 0, 1.5, 0.08);
  }

  spin() {
    this.tone(200, 520, 0.55, "sawtooth", 0.06);
    this.hiss(0.55, "bandpass", 900, 1800, 0.15, 0, 4);
  }

  dodge() {
    this.hiss(0.16, "bandpass", 1500, 3200, 0.14, 0, 2);
  }

  /** The low-HP alarm: one beep of the pair, called on a loop while HP is in the red. */
  lowHp(high: boolean) {
    this.tone(high ? 1100 : 880, high ? 1100 : 880, 0.11, "square", 0.05);
  }

  burned() {
    this.hiss(0.3, "bandpass", 1200, 500, 0.15, 0, 2);
  }

  faint() {
    this.tone(600, 80, 0.9, "square", 0.12);
  }

  recall() {
    this.tone(300, 1800, 0.35, "sawtooth", 0.08);
    this.tone(1800, 600, 0.25, "square", 0.05, 0.3);
  }

  /** Two attacks meeting head-on: a hard metallic crack. */
  clash() {
    this.tone(1800, 700, 0.12, "square", 0.1);
    this.hiss(0.15, "highpass", 4000, 1500, 0.3);
    this.tone(140, 70, 0.18, "sine", 0.25);
  }

  /** Fire meeting water: a hiss of steam. */
  steam() {
    this.hiss(0.45, "highpass", 3500, 2200, 0.22, 0, 0.7, 0.02);
  }

  /** A projectile bouncing off a spinning shell. */
  ricochet() {
    this.tone(2400, 3600, 0.08, "square", 0.08);
    this.tone(1200, 1200, 0.1, "triangle", 0.06, 0.05);
  }

  /** Mega Evolution: a shimmering arpeggio climbing up, then a burst. */
  megaEvolve() {
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, f, 0.22, "triangle", 0.07, i * 0.09));
    this.hiss(0.9, "bandpass", 1500, 7000, 0.15, 0, 3, 0.3);
  }

  /** Something huge falling from the sky. */
  incoming(dur: number) {
    this.tone(1800, 300, dur, "sine", 0.1);
    this.hiss(dur, "bandpass", 3000, 600, 0.2, 0, 4, 0.2);
  }

  /** A Burst's cut-in: a rising swoosh and a stab. */
  cutin() {
    this.hiss(0.45, "bandpass", 600, 6000, 0.3, 0, 2, 0.02);
    this.tone(220, 880, 0.4, "sawtooth", 0.09);
    this.tone(1320, 1320, 0.25, "square", 0.07, 0.38);
    this.tone(660, 660, 0.3, "square", 0.07, 0.38);
  }

  /** The ground rumbling under a Burst, for `dur` seconds. */
  rumble(dur: number) {
    this.tone(48, 36, dur, "sine", 0.5, 0, 0.1);
    this.hiss(dur, "lowpass", 260, 120, 0.45, 0, 0.7, 0.15);
  }

  /** One fire geyser bursting out of the page. */
  eruption() {
    this.hiss(0.35, "lowpass", 2200, 300, 0.22);
    this.tone(150, 55, 0.3, "sine", 0.18);
  }

  fireBlast() {
    this.tone(160, 50, 0.9, "sawtooth", 0.14);
    this.hiss(0.9, "lowpass", 3000, 300, 0.45, 0, 0.7, 0.01);
  }

  airSlash() {
    [0, 0.06, 0.12].forEach((d) => this.hiss(0.14, "bandpass", 3500, 7000, 0.16, d, 3));
  }

  iceBeam(dur: number) {
    this.hiss(dur, "highpass", 5000, 3500, 0.16, 0, 0.7, 0.04);
    [1760, 2349, 2637, 3136].forEach((f, i) => this.tone(f, f, 0.18, "triangle", 0.05, i * (dur / 5)));
  }

  quake() {
    this.tone(60, 28, 1.4, "sine", 0.55);
    this.hiss(1.4, "lowpass", 400, 60, 0.6, 0, 0.7, 0.02);
    this.hiss(0.6, "bandpass", 900, 300, 0.25, 0.1, 1.5);
  }

  shadowBall() {
    // a dark warble: two detuned tones beating against each other
    this.tone(180, 120, 0.5, "sine", 0.18);
    this.tone(186, 116, 0.5, "triangle", 0.12);
    this.hiss(0.4, "bandpass", 400, 900, 0.12, 0, 4);
  }

  burstDark() {
    this.tone(220, 55, 0.5, "sawtooth", 0.12);
    this.hiss(0.5, "lowpass", 1600, 200, 0.35);
  }

  splat() {
    this.hiss(0.3, "lowpass", 700, 150, 0.4);
    [300, 380, 260].forEach((f, i) => this.tone(f, f * 1.6, 0.07, "sine", 0.12, 0.1 + i * 0.09));
  }

  hypnosis() {
    for (let i = 0; i < 6; i++) this.tone(520 + (i % 2) * 140, 520 + (i % 2) * 140, 0.16, "sine", 0.07, i * 0.12);
  }

  nightShade() {
    this.tone(400, 90, 1.6, "sawtooth", 0.08, 0, 0.3);
    this.tone(404, 88, 1.6, "square", 0.04, 0, 0.3);
    this.hiss(1.6, "bandpass", 300, 120, 0.25, 0, 2, 0.3);
  }

  lick() {
    this.hiss(0.2, "bandpass", 500, 1400, 0.18, 0, 5);
  }

  sink() {
    this.tone(500, 120, 0.4, "sine", 0.1);
  }

  /** Gengar's cackle: a quick wobbling ha-ha-ha. */
  cackle() {
    [0, 0.13, 0.26, 0.39].forEach((d, i) => this.tone(700 - i * 60, 500 - i * 60, 0.1, "square", 0.06, d));
  }

  frozen() {
    this.hiss(0.25, "highpass", 4000, 2000, 0.3);
    this.tone(2400, 1800, 0.2, "triangle", 0.08);
  }

  zap() {
    this.tone(1200, 300, 0.15, "sawtooth", 0.08);
    this.hiss(0.15, "highpass", 3000, 3000, 0.15);
  }

  asleep() {
    this.tone(660, 440, 0.4, "triangle", 0.08);
  }

  win() {
    const notes = [784, 784, 784, 988, 1175, 988, 1175, 1568];
    const at = [0, 0.12, 0.24, 0.36, 0.5, 0.64, 0.78, 0.92];
    notes.forEach((f, i) => this.tone(f, f, i === notes.length - 1 ? 0.6 : 0.13, "square", 0.08, at[i]));
    notes.forEach((f, i) => this.tone(f / 2, f / 2, 0.13, "triangle", 0.08, at[i]));
  }

  lose() {
    [523, 494, 466, 440].forEach((f, i) => this.tone(f, f * (i === 3 ? 0.8 : 1), 0.3, "square", 0.07, i * 0.28));
  }
}
