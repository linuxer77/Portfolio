import { noiseBuffer, synthHit, type Atlas, type Hit } from "../streetfighter/assets";

// ==========================================
// MORTAL KOMBAT mode assets: Scorpion and Classic Sub-Zero from UMK3 (one atlas each, cut
// by scripts/extract-mk3.py into public/mk3), an icy copy of each for when they're frozen,
// the FATALITY banner and Toasty! that ship with the arcade easter eggs, and the arcade's
// own voices and effects in public/mk3/sounds. A missing sound falls back to a synth hit.
// ==========================================

export type { Atlas } from "../streetfighter/assets";
export { drawFrame } from "../streetfighter/assets";

export type FighterId = "scorpion" | "subzero";

export interface Fighters {
  atlas: Record<FighterId, Atlas>;
  /** the same frames, frosted over */
  ice: Record<FighterId, Atlas>;
  fatality: HTMLImageElement[];
  toasty: HTMLImageElement;
}

const image = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

async function loadAtlas(id: FighterId): Promise<Atlas> {
  const [meta, img] = await Promise.all([
    fetch(`/mk3/${id}.json`).then((r) => r.json() as Promise<Pick<Atlas, "frames" | "anims">>),
    image(`/mk3/${id}.png`),
  ]);
  return { image: img, ...meta };
}

/** Frozen fighters turn pale blue, keeping their shading. */
function frosted(atlas: Atlas): Atlas {
  const src = atlas.image as HTMLImageElement;
  const c = document.createElement("canvas");
  c.width = src.naturalWidth;
  c.height = src.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const l = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / 255;
    p[i] = 120 + l * 120;
    p[i + 1] = 190 + l * 65;
    p[i + 2] = 230 + l * 25;
  }
  ctx.putImageData(data, 0, 0);
  return { ...atlas, image: c };
}

export async function loadFighters(): Promise<Fighters> {
  const [scorpion, subzero, toasty, ...fatality] = await Promise.all([
    loadAtlas("scorpion"),
    loadAtlas("subzero"),
    image("/arcade/toasty.png"),
    ...Array.from({ length: 7 }, (_, i) => image(`/arcade/mk/fatality_${i}.png`)),
  ]);
  return {
    atlas: { scorpion, subzero },
    ice: { scorpion: frosted(scorpion), subzero: frosted(subzero) },
    fatality,
    toasty,
  };
}

/**
 * Every sound the fight uses. Each one is public/mk3/sounds/<name>.mp3 when it exists;
 * public/mk3/sounds/index.json lists the ones that do, so nothing is fetched just to 404.
 */
export const SOUNDS = [
  // announcer
  "round1", "round2", "round3", "fight", "finishHim", "fatality", "flawless", "excellent",
  "scorpion", "subzero", "wins", "laugh",
  // the fighters
  "getOverHere", "attack", "hurt", "fall", "die",
  // effects
  "spear", "spearHit", "fire", "teleport", "iceBlast", "frozen", "shatter", "slide", "groundIce",
  // hits
  "punch", "kick", "heavy", "block", "whiff", "land", "uppercut",
] as const;

export type Sound = (typeof SOUNDS)[number];

/** What to synthesize when a hit sound has no sample. */
const FALLBACK: Partial<Record<Sound, Hit>> = {
  punch: "light",
  kick: "light",
  heavy: "heavy",
  uppercut: "heavy",
  block: "block",
  whiff: "whiff",
  land: "thud",
  fall: "thud",
  shatter: "crumble",
};

const MUTE_KEY = "mk-muted";
const VOLUME = 0.6;

export class Sfx {
  muted = false;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private buffers = new Map<Sound, AudioBuffer>();
  private toasty: AudioBuffer | null = null;

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
    const decode = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(url);
      return ctx.decodeAudioData(await res.arrayBuffer());
    };
    const have = await fetch("/mk3/sounds/index.json")
      .then((r) => (r.ok ? (r.json() as Promise<Sound[]>) : []))
      .catch(() => [] as Sound[]);
    await Promise.all([
      ...have.filter((name) => SOUNDS.includes(name)).map(async (name) => {
        try {
          this.buffers.set(name, await decode(`/mk3/sounds/${name}.mp3`));
        } catch {
          // a missing sound should never stop the fight
        }
      }),
      decode("/arcade/toasty.mp3")
        .then((b) => (this.toasty = b))
        .catch(() => {}),
    ]);
    // the MK easter egg's own "Fatality!" stands in until the announcer's is picked
    if (!this.buffers.has("fatality")) {
      await decode("/arcade/mk/fatality.mp3")
        .then((b) => this.buffers.set("fatality", b))
        .catch(() => {});
    }
  }

  unlock() {
    void this.ctx?.resume();
  }

  play(name: Sound | "toasty", volume = 1) {
    const { ctx, gain, noise } = this;
    if (!ctx || !gain) return;
    const sample = name === "toasty" ? this.toasty : this.buffers.get(name);
    if (!sample) {
      const synth = name !== "toasty" && FALLBACK[name];
      if (synth && noise) synthHit(ctx, gain, noise, synth);
      return;
    }
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = volume;
    src.buffer = sample;
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
    if (this.gain) this.gain.gain.value = muted ? 0 : VOLUME;
  }

  destroy() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
