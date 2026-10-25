// ==========================================
// GAME OF LIFE mode sound: the page plays itself. Each generation's births pick a note from a
// pentatonic scale, so a busy board ripples and a settling one goes quiet. Synthesized, soft.
// ==========================================

const STORAGE_KEY = "life-muted";
const VOLUME = 0.4;
// A minor pentatonic over three octaves
const SCALE = [220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5, 1568];

export class Sound {
  muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private last = 0;

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
      // a touch of echo so the plucks blur into a texture
      const delay = this.ctx.createDelay(1);
      delay.delayTime.value = 0.23;
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this.master.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(this.ctx.destination);
    }
    void this.ctx.resume();
  }

  private pluck(freq: number, start: number, vol: number, len = 0.5) {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + len);
    osc.connect(g).connect(master);
    osc.start(start);
    osc.stop(start + len);
  }

  /** One generation: more births, higher and a little louder. */
  generation(births: number, deaths: number) {
    const ctx = this.ctx;
    if (!ctx || !births || ctx.currentTime - this.last < 0.07) return;
    this.last = ctx.currentTime;
    const i = Math.min(SCALE.length - 1, Math.floor(Math.log2(births + 1) * 1.3) + (births % 3));
    const vol = Math.min(0.06, 0.012 + Math.log10(births + 1) * 0.012);
    this.pluck(SCALE[i], ctx.currentTime, vol);
    // a lower note underneath when the board is mostly dying back
    if (deaths > births * 2) this.pluck(SCALE[Math.max(0, i - 5)] / 2, ctx.currentTime, vol * 0.6, 0.8);
  }

  /** The scan line sweeping across: a rising (or falling) shimmer. */
  sweep(down: boolean) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = down ? SCALE.slice(4, 13) : SCALE.slice(4, 13).reverse();
    notes.forEach((f, i) => this.pluck(f, t + i * 0.09, 0.04, 0.6));
  }

  /** A burst of gliders or random cells. */
  spark() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    [1318.5, 1568, 2093].forEach((f, i) => this.pluck(f, t + i * 0.04, 0.05, 0.3));
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
  }
}
