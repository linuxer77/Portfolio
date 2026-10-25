import { noiseBuffer } from "../streetfighter/assets";

// ==========================================
// BLACK HOLE mode sound, synthesized: a drone that deepens and swells with the hole's mass,
// a hiss for whatever crosses the horizon, a rising scream for the collapse, a boom for the
// Big Bang, and soft chimes as the page lands back in place.
// ==========================================

const STORAGE_KEY = "blackhole-muted";
const VOLUME = 0.5;

export class Sound {
  muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private drone: { sub: OscillatorNode; hum: OscillatorNode; air: BiquadFilterNode; gain: GainNode } | null = null;
  private lastHiss = 0;
  private lastChime = 0;

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

  /** The hole's hum: `size` 0 (newborn) to 1 (enormous). */
  setDrone(size: number, on: boolean) {
    const { ctx, master, noise } = this;
    if (!ctx || !master || !noise) return;
    if (!this.drone) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(master);
      const sub = ctx.createOscillator();
      sub.type = "sine";
      const hum = ctx.createOscillator();
      hum.type = "triangle";
      const subGain = ctx.createGain();
      subGain.gain.value = 0.7;
      const humGain = ctx.createGain();
      humGain.gain.value = 0.12;
      sub.connect(subGain).connect(gain);
      hum.connect(humGain).connect(gain);
      // a slow wash of filtered noise: the disk churning
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const air = ctx.createBiquadFilter();
      air.type = "lowpass";
      air.Q.value = 6;
      const airGain = ctx.createGain();
      airGain.gain.value = 0.25;
      src.connect(air).connect(airGain).connect(gain);
      sub.start();
      hum.start();
      src.start();
      this.drone = { sub, hum, air, gain };
    }
    const t = ctx.currentTime;
    const { sub, hum, air, gain } = this.drone;
    sub.frequency.setTargetAtTime(70 - size * 38, t, 0.3);
    hum.frequency.setTargetAtTime(140 - size * 70, t, 0.3);
    air.frequency.setTargetAtTime(300 + size * 500 + Math.sin(t * 0.7) * 120, t, 0.3);
    gain.gain.setTargetAtTime(on ? 0.12 + size * 0.5 : 0, t, on ? 0.4 : 0.08);
  }

  private tone(type: OscillatorType, from: number, to: number, start: number, len: number, vol: number) {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + len);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + Math.min(0.03, len / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, start + len);
    osc.connect(g).connect(master);
    osc.start(start);
    osc.stop(start + len);
  }

  private burst(start: number, len: number, from: number, to: number, vol: number) {
    const { ctx, master, noise } = this;
    if (!ctx || !master || !noise) return;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, start);
    f.frequency.exponentialRampToValueAtTime(to, start + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + len);
    src.connect(f).connect(g).connect(master);
    src.start(start);
    src.stop(start + len);
  }

  /** Something crosses the horizon; bigger things hiss lower. */
  swallow(big: boolean) {
    const ctx = this.ctx;
    if (!ctx || ctx.currentTime - this.lastHiss < (big ? 0.05 : 0.09)) return;
    this.lastHiss = ctx.currentTime;
    this.burst(ctx.currentTime, big ? 0.5 : 0.14, big ? 1200 : 3000, big ? 150 : 900, big ? 0.35 : 0.05);
  }

  collapse() {
    const t = this.ctx?.currentTime ?? 0;
    this.tone("sawtooth", 60, 1800, t, 0.75, 0.08);
    this.burst(t, 0.75, 200, 6000, 0.25);
  }

  bang() {
    const t = this.ctx?.currentTime ?? 0;
    this.tone("sine", 120, 28, t, 1.6, 0.9);
    this.burst(t, 1.8, 5000, 80, 0.6);
  }

  /** A letter lands back in place; rate-limited into a shimmer. */
  land() {
    const ctx = this.ctx;
    if (!ctx || ctx.currentTime - this.lastChime < 0.045) return;
    this.lastChime = ctx.currentTime;
    const notes = [1047, 1175, 1319, 1568, 1760, 2093];
    const f = notes[Math.floor(Math.random() * notes.length)];
    this.tone("sine", f, f * 0.995, ctx.currentTime, 0.35, 0.03);
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
    this.drone = null;
  }
}
