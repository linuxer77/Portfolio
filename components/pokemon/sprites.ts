// ==========================================
// Pokémon sprites: the Pokémon Mystery Dungeon sheets from the PMD SpriteCollab (see
// public/pokemon/SOURCES.txt). They're drawn for a camera looking down at the ground, which is
// exactly this mode's view. Each animation is one sheet: a row per facing, in PMD's order
// (down, down-right, right, up-right, up, up-left, left, down-left), a column per frame, with
// frame durations in 1/60 s ticks; the timings are in anims.json, made from each AnimData.xml.
// ==========================================

export type Species = "charizard" | "blastoise" | "gengar" | "mewtwo";

/** Facing, as a sheet row: 0 down, 1 down-right, 2 right … 7 down-left. */
export type Dir = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Anim {
  w: number;
  h: number;
  dirs: number;
  durations: number[];
  hitFrame?: number;
  sheet: string;
  img: HTMLImageElement;
  /** total length, s */
  length: number;
}

export interface Mon {
  species: Species;
  anims: Record<string, Anim>;
  portrait: HTMLImageElement;
  /** how far below a frame's centre the feet are, sprite px */
  feet: number;
}

const image = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Loads a Pokémon's sheets; `form` picks another folder, e.g. "charizard-mega". */
export async function loadMon(species: Species, form: string = species): Promise<Mon> {
  const base = `/pokemon/${form}`;
  const data = (await fetch(`${base}/anims.json`).then((r) => r.json())) as {
    anims: Record<string, Omit<Anim, "img" | "length">>;
  };
  const sheets = new Map<string, Promise<HTMLImageElement>>();
  const anims: Record<string, Anim> = {};
  await Promise.all(
    Object.entries(data.anims).map(async ([name, a]) => {
      if (!sheets.has(a.sheet)) sheets.set(a.sheet, image(`${base}/${a.sheet}.png`));
      const img = await sheets.get(a.sheet)!;
      anims[name] = { ...a, img, length: a.durations.reduce((s, d) => s + d, 0) / 60 };
    })
  );
  const portrait = await image(`${base}/portrait.png`);
  return { species, anims, portrait, feet: feetOf(anims.Idle) };
}

/** Where the feet are in the idle frame facing down: the lowest solid row. */
function feetOf(a: Anim) {
  const c = document.createElement("canvas");
  c.width = a.w;
  c.height = a.h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(a.img, 0, 0, a.w, a.h, 0, 0, a.w, a.h);
  const { data } = ctx.getImageData(0, 0, a.w, a.h);
  for (let y = a.h - 1; y >= 0; y--) {
    for (let x = 0; x < a.w; x++) if (data[(y * a.w + x) * 4 + 3] > 0) return y - a.h / 2 - 1;
  }
  return 0;
}

/** The frame showing t seconds into an animation; it loops, or holds its last frame. */
export function frameAt(a: Anim, t: number, loop = true) {
  let ticks = Math.max(0, t * 60);
  const total = a.length * 60;
  if (loop) ticks %= total;
  else if (ticks >= total) return a.durations.length - 1;
  for (let i = 0; i < a.durations.length; i++) {
    ticks -= a.durations[i];
    if (ticks < 0) return i;
  }
  return a.durations.length - 1;
}

/** Seconds into an animation at which a frame starts (for hit frames). */
export function timeOfFrame(a: Anim, frame: number) {
  return a.durations.slice(0, frame).reduce((s, d) => s + d, 0) / 60;
}

const DIRS: Dir[] = [2, 1, 0, 7, 6, 5, 4, 3];

/** The nearest of the eight facings for a direction on screen. */
export function dirOf(dx: number, dy: number): Dir {
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return DIRS[(octant + 8) % 8];
}

/** The screen angle a facing points along. */
export function angleOf(d: Dir) {
  return (DIRS.indexOf(d) * Math.PI) / 4;
}

const silhouettes = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

/** A sheet in one flat colour: white as a Pokémon comes out of its ball, red as it goes back. */
function silhouette(img: HTMLImageElement, colour: string) {
  let byColour = silhouettes.get(img);
  if (!byColour) silhouettes.set(img, (byColour = new Map()));
  let c = byColour.get(colour);
  if (!c) {
    c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, c.width, c.height);
    byColour.set(colour, c);
  }
  return c;
}

export interface DrawOpts {
  /** 0–1: how much of a flat colour to lay over the sprite */
  tint?: number;
  tintColour?: string;
  alpha?: number;
  /** extra scale on top of k, e.g. growing out of a ball */
  grow?: number;
}

/**
 * Draws a frame with the feet at (x, y), k screen px per sprite px. Sheets with a single row
 * (Sleep) face the same way whatever dir says.
 */
export function drawMon(
  ctx: CanvasRenderingContext2D,
  mon: Mon,
  anim: string,
  dir: Dir,
  frame: number,
  x: number,
  y: number,
  k: number,
  opts: DrawOpts = {}
) {
  const a = mon.anims[anim] ?? mon.anims.Idle;
  const row = a.dirs > 1 ? dir : 0;
  const s = k * (opts.grow ?? 1);
  const dw = a.w * s;
  const dh = a.h * s;
  const dx = x - dw / 2;
  const dy = y - mon.feet * s - dh / 2;
  const sx = frame * a.w;
  const sy = row * a.h;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = opts.alpha ?? 1;
  const tint = opts.tint ?? 0;
  if (tint < 1) ctx.drawImage(a.img, sx, sy, a.w, a.h, dx, dy, dw, dh);
  if (tint > 0) {
    ctx.globalAlpha = (opts.alpha ?? 1) * tint;
    ctx.drawImage(silhouette(a.img, opts.tintColour ?? "#fff"), sx, sy, a.w, a.h, dx, dy, dw, dh);
  }
  ctx.restore();
}
