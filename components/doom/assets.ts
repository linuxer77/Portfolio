// ==========================================
// DOOM mode assets: Freedoom sprites (one atlas) and sounds, extracted by
// scripts/extract-freedoom.py into public/doom. Freedoom is BSD licensed.
// ==========================================

/** [x, y, w, h, leftOffset, topOffset] inside the atlas; offsets are DOOM's own sprite origins. */
type SpriteMeta = [number, number, number, number, number, number];

export interface Atlas {
  image: HTMLImageElement;
  sprites: Record<string, SpriteMeta>;
}

export const SOUNDS = [
  "pistol", "shotgn", "rlaunc", "barexp", "firsht", "firxpl", "plpain", "popain", "itemup", "wpnup",
  "telept", "posit1", "bgsit1", "pldeth", "podth1", "bgdth1", "getpow", "noway", "itmbk",
] as const;

export type SoundName = (typeof SOUNDS)[number];

export async function loadAtlas(): Promise<Atlas> {
  const [sprites, image] = await Promise.all([
    fetch("/doom/sprites.json").then((r) => r.json() as Promise<Record<string, SpriteMeta>>),
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = "/doom/sprites.png";
    }),
  ]);
  return { image, sprites };
}

export function spriteSize(atlas: Atlas, name: string) {
  const m = atlas.sprites[name];
  return m ? { w: m[2], h: m[3], left: m[4], top: m[5] } : { w: 0, h: 0, left: 0, top: 0 };
}

/** Draws a sprite the way DOOM does: (x, y) is its origin, shifted by the sprite's built-in offsets. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  atlas: Atlas,
  name: string,
  x: number,
  y: number,
  scale: number,
  flip = false
) {
  const m = atlas.sprites[name];
  if (!m) return;
  const [sx, sy, w, h, left, top] = m;
  if (flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(atlas.image, sx, sy, w, h, -left * scale, -top * scale, w * scale, h * scale);
    ctx.restore();
  } else {
    ctx.drawImage(atlas.image, sx, sy, w, h, x - left * scale, y - top * scale, w * scale, h * scale);
  }
}

const MUTE_KEY = "doom-muted";

export class Sfx {
  muted = false;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();

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
    this.gain.gain.value = this.muted ? 0 : 0.6;
    this.gain.connect(ctx.destination);
    await Promise.all(
      SOUNDS.map(async (name) => {
        try {
          const data = await fetch(`/doom/sounds/${name}.wav`).then((r) => r.arrayBuffer());
          this.buffers.set(name, await ctx.decodeAudioData(data));
        } catch {
          // a missing sound should never stop the game
        }
      })
    );
  }

  unlock() {
    void this.ctx?.resume();
  }

  play(name: SoundName, volume = 1) {
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

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      // ignore
    }
    if (this.gain) this.gain.gain.value = muted ? 0 : 0.6;
  }

  destroy() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
