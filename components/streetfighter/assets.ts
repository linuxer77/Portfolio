// ==========================================
// STREET FIGHTER mode assets: Ryu's frames (one atlas cut by scripts/extract-sf2.py into
// public/sf2), a recoloured copy for player 2, the announcer and voice samples that already
// ship with the arcade easter eggs, and hit sounds synthesized with Web Audio.
// ==========================================

/** [x, y, w, h, anchorX, anchorY] inside the atlas; the anchor sits between the feet. */
type FrameMeta = [number, number, number, number, number, number];

export interface Atlas {
  image: CanvasImageSource;
  frames: Record<string, FrameMeta>;
  /** frame count per animation */
  anims: Record<string, number>;
}

export async function loadAtlases(): Promise<[Atlas, Atlas]> {
  const [meta, image] = await Promise.all([
    fetch("/sf2/ryu.json").then((r) => r.json() as Promise<{ frames: Record<string, FrameMeta>; anims: Record<string, number> }>),
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = "/sf2/ryu.png";
    }),
  ]);
  return [
    { image, ...meta },
    { image: recolour(image), ...meta },
  ];
}

/**
 * Player 2 is the same Ryu in a slate-blue gi with a black headband, so the two read apart
 * on the black page. Only the gi (light, unsaturated pixels) and the headband (red) change.
 */
function recolour(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const [r, g, b] = [p[i], p[i + 1], p[i + 2]];
    if (r > 110 && r - b < 70) {
      const l = (r + g + b) / 3;
      p[i] = l * 0.5 + 12;
      p[i + 1] = l * 0.58 + 16;
      p[i + 2] = l * 0.72 + 28;
    } else if (r > 150 && g < 90 && b < 90) {
      const l = r / 255;
      p[i] = p[i + 1] = p[i + 2] = 20 + l * 40;
    }
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/** Draws a frame with its anchor at (x, y), scaled by k, mirrored when facing left. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  atlas: Atlas,
  name: string,
  x: number,
  y: number,
  k: number,
  flip = false
) {
  const m = atlas.frames[name];
  if (!m) return;
  const [sx, sy, w, h, ax, ay] = m;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(atlas.image, sx, sy, w, h, -ax * k, -ay * k, w * k, h * k);
  ctx.restore();
}

const VOICES = {
  fight: "/arcade/sf2/round-one-fight.mp3",
  hadouken: "/arcade/sf2/hadouken.mp3",
  shoryuken: "/arcade/sf2/shoryuken.mp3",
  ko: "/arcade/sf2/ko.mp3",
} as const;

export type Voice = keyof typeof VOICES;
export type Hit = "light" | "heavy" | "block" | "whiff" | "thud" | "crumble";

/** Half a second of white noise, the raw material for every synthesized impact. */
export function noiseBuffer(ctx: BaseAudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = buffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buffer;
}

/** An impact: a filtered noise burst over a falling sine thump. */
export function synthHit(ctx: AudioContext, out: AudioNode, noise: AudioBuffer, kind: Hit) {
  const t = ctx.currentTime;
  const spec = {
    light: { f: 1800, q: 0.8, len: 0.08, thump: 180, vol: 0.7 },
    heavy: { f: 900, q: 0.7, len: 0.16, thump: 110, vol: 1 },
    block: { f: 3200, q: 4, len: 0.06, thump: 0, vol: 0.5 },
    whiff: { f: 700, q: 1.5, len: 0.12, thump: 0, vol: 0.25 },
    thud: { f: 300, q: 0.6, len: 0.22, thump: 70, vol: 1 },
    crumble: { f: 2400, q: 0.5, len: 0.25, thump: 0, vol: 0.18 },
  }[kind];

  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(spec.f, t);
  if (kind === "whiff") filter.frequency.exponentialRampToValueAtTime(spec.f * 3, t + spec.len);
  filter.Q.value = spec.q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(spec.vol, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + spec.len);
  src.connect(filter).connect(env).connect(out);
  src.start(t, Math.random() * 0.2, spec.len);

  if (spec.thump) {
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.frequency.setValueAtTime(spec.thump, t);
    osc.frequency.exponentialRampToValueAtTime(spec.thump * 0.4, t + spec.len);
    og.gain.setValueAtTime(spec.vol * 0.8, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + spec.len);
    osc.connect(og).connect(out);
    osc.start(t);
    osc.stop(t + spec.len);
  }
}

const MUTE_KEY = "sf-muted";
const VOLUME = 0.6;

export class Sfx {
  muted = false;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private buffers = new Map<Voice, AudioBuffer>();

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      // storage blocked: sound on
    }
  }

  async load() {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.gain = ctx.createGain();
    this.gain.gain.value = this.muted ? 0 : VOLUME;
    this.gain.connect(ctx.destination);
    this.noise = noiseBuffer(ctx);
    await Promise.all(
      (Object.keys(VOICES) as Voice[]).map(async (name) => {
        try {
          const data = await fetch(VOICES[name]).then((r) => r.arrayBuffer());
          this.buffers.set(name, await ctx.decodeAudioData(data));
        } catch {
          // a missing sample should never stop the fight
        }
      })
    );
  }

  unlock() {
    void this.ctx?.resume();
  }

  voice(name: Voice, volume = 1) {
    const { ctx, gain } = this;
    const buffer = this.buffers.get(name);
    if (!ctx || !gain || !buffer) return;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = volume;
    src.buffer = buffer;
    src.connect(g).connect(gain);
    src.start();
  }

  /** Impacts: a filtered noise burst over a falling sine thump. */
  hit(kind: Hit) {
    if (this.ctx && this.gain && this.noise) synthHit(this.ctx, this.gain, this.noise, kind);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      // ignore
    }
    if (this.gain) this.gain.gain.value = muted ? 0 : VOLUME;
  }

  destroy() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
