// ==========================================
// Stack Runner sprites: original pixel art, painted once into offscreen canvases.
// Palette keys: "." transparent, 0 black, 1–4 dark to light greys (matches the site's zinc scale).
// ==========================================

const PAL: Record<string, string> = {
  "0": "#000000",
  "1": "#27272a",
  "2": "#52525b",
  "3": "#a1a1aa",
  "4": "#fafafa",
};

type Img = HTMLCanvasElement;

export interface Sprites {
  /** [facing right, facing left] */
  hero: Record<"idle" | "run1" | "run2" | "jump", [Img, Img]>;
  /** walk a, walk b, squashed */
  bug: [Img, Img, Img];
  coffee: Img;
}

function blank(w: number, h: number): [Img, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function paint(rows: string[], flip = false): Img {
  const w = rows[0].length;
  const [c, ctx] = blank(w, rows.length);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      ctx.fillStyle = PAL[ch];
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    })
  );
  return c;
}

// Hero: a developer in a hoodie, 12×16, facing right.
const HEAD = [
  "...222222...",
  "..22222222..",
  "..22333333..",
  "..23333033..",
  "..23333333..",
  "...333333...",
];
const TORSO = [
  "..44444444..",
  ".4444444444.",
  ".4444444444.",
  ".3444444443.",
  "..44444444..",
];
const JUMP_TORSO = [
  "3.44444444.3",
  "344444444443",
  ".4444444444.",
  "..44444444..",
  "..44444444..",
];
const LEGS = {
  idle: ["..22222222..", "..222..222..", "..222..222..", "..333..333..", ".3333..3333."],
  run1: ["..22222222..", ".2222..2222.", "222......222", "33........33", "............"],
  run2: ["..22222222..", "...222222...", "....2222....", "....3333....", "...33333...."],
  jump: ["..22222222..", "..222..222..", ".222....222.", ".33......33.", "............"],
};

// Bug: the enemy, 16×12.
const BUG = [
  "...2........2...",
  "....2......2....",
  ".....333333.....",
  "....33333333....",
  "...3344334433...",
  "...3304330433...",
  "..333333333333..",
  ".33322333322333.",
  ".33333333333333.",
  "..333333333333..",
];
const BUG_LEGS = [
  ["..2..2....2..2..", ".2..2......2..2."],
  ["...2..2..2..2...", "...2..2..2..2..."],
];
const BUG_SQUASHED = [
  ...Array(8).fill("................"),
  "..333333333333..",
  ".34433333334433.",
  ".33333333333333.",
  "..2.2.2..2.2.2..",
];

// Coffee: the power-up, 12×11.
const COFFEE = [
  "..4..4......",
  "...4..4.....",
  "..4..4......",
  "3333333333..",
  "3444444443..",
  "344444444333",
  "3444444443.3",
  "3444444443.3",
  "344444444333",
  "3444444443..",
  ".33333333...",
];

export function loadSprites(): Sprites {
  const hero = (legs: string[], torso = TORSO): [Img, Img] => {
    const rows = [...HEAD, ...torso, ...legs];
    return [paint(rows), paint(rows, true)];
  };

  return {
    hero: {
      idle: hero(LEGS.idle),
      run1: hero(LEGS.run1),
      run2: hero(LEGS.run2),
      jump: hero(LEGS.jump, JUMP_TORSO),
    },
    bug: [paint([...BUG, ...BUG_LEGS[0]]), paint([...BUG, ...BUG_LEGS[1]]), paint(BUG_SQUASHED)],
    coffee: paint(COFFEE),
  };
}
