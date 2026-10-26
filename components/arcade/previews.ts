import type { ArcadeGame } from "@/lib/arcade";
import { Disk } from "../blackhole/disk";
import { drawSprite, loadAtlas, type Atlas as DoomAtlas } from "../doom/assets";
import { drawFrame, loadAtlases, type Atlas } from "../streetfighter/assets";

// ==========================================
// The arcade cards' live previews: a few seconds of each game, looping, drawn small with the
// game's own art (Ryu and Scorpion from their atlases, DOOM's imp, the black hole's real disk).
// Each preview loads what it needs the first time it's drawn and shows a blank card until then.
// ==========================================

export interface Preview {
  draw(ctx: CanvasRenderingContext2D, dt: number, w: number, h: number, font: string): void;
}

const LINES = [
  "HARSHIT GUPTA",
  "BACKEND DEVELOPER",
  "Patched critical TOCTOU race conditions",
  "and unauthenticated booking exploits.",
  "Architected thread-safe RS256 JWT caching",
  "in Go for SuperCoins integration.",
];

/** A few faint lines of the portfolio, as the backdrop every preview plays over. */
function pageText(ctx: CanvasRenderingContext2D, w: number, h: number, font: string, alpha = 0.35) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#a1a1aa";
  ctx.font = `9px ${font}`;
  ctx.textBaseline = "top";
  LINES.forEach((line, i) => ctx.fillText(line, 12, 14 + i * 14));
  ctx.restore();
  ctx.fillStyle = "#3f3f46";
  for (let x = 0; x < w; x += 4) ctx.fillRect(x, h - 22, 1.5, 1.5);
}

/** Loads something once, on first use; until then the preview shows its backdrop. */
function lazy<T>(load: () => Promise<T>) {
  let value: T | null = null;
  let started = false;
  return () => {
    if (!started) {
      started = true;
      load()
        .then((v) => (value = v))
        .catch(() => {});
    }
    return value;
  };
}

function blackHole(): Preview {
  const disk = new Disk(260);
  return {
    draw(ctx, dt, w, h, font) {
      pageText(ctx, w, h, font, 0.2);
      disk.update(dt, 1);
      const x = w * 0.58;
      const y = h * 0.52;
      const r = Math.min(w, h) * 0.085;
      disk.drawHaze(ctx, x, y, r, 0);
      disk.drawBody(ctx, x, y, r, false, 0);
      disk.drawHalf(ctx, x, y, r, false, 0);
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      disk.drawPhotonRing(ctx, x, y, r, 0);
      disk.drawLens(ctx, x, y, r, 0);
      disk.drawBody(ctx, x, y, r, true, 0);
      disk.drawHalf(ctx, x, y, r, true, 0);
      disk.drawLens(ctx, x, y, r, 0);
      disk.drawJets(ctx, x, y, r * 2.4, 0);
    },
  };
}

function life(): Preview {
  const W = 96;
  const H = 54;
  let cur = new Uint8Array(W * H);
  let next = new Uint8Array(W * H);
  const age = new Uint8Array(W * H);
  let acc = 0;
  let clock = 0;
  const seed = () => {
    cur.fill(0);
    age.fill(0);
    // rows of "text" in the middle of the board, like a paragraph about to come alive
    for (let row = 0; row < 5; row++) {
      const y0 = 12 + row * 6;
      for (let y = y0; y < y0 + 3; y++)
        for (let x = 8; x < W - 8 - row * 5; x++) cur[y * W + x] = Math.random() < 0.55 ? 1 : 0;
    }
    clock = 0;
  };
  seed();
  return {
    draw(ctx, dt, w, h) {
      acc += dt * 9;
      clock += dt;
      if (clock > 14) seed();
      while (acc >= 1) {
        acc -= 1;
        next.fill(0);
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const i = y * W + x;
            const n =
              cur[i - W - 1] +
              cur[i - W] +
              cur[i - W + 1] +
              cur[i - 1] +
              cur[i + 1] +
              cur[i + W - 1] +
              cur[i + W] +
              cur[i + W + 1];
            if (n === 3 || (n === 2 && cur[i])) {
              next[i] = 1;
              age[i] = cur[i] ? Math.min(255, age[i] + 1) : 0;
            }
          }
        }
        [cur, next] = [next, cur];
      }
      const cw = w / W;
      const ch = h / H;
      for (let i = 0; i < W * H; i++) {
        if (!cur[i]) continue;
        const a = age[i];
        ctx.fillStyle = a < 4 ? "#67e8f9" : a < 14 ? "#c4b5fd" : a < 40 ? "#f472b6" : "#fbbf24";
        ctx.fillRect((i % W) * cw, Math.floor(i / W) * ch, cw - 0.5, ch - 0.5);
      }
    },
  };
}

function fight(): Preview {
  const atlases = lazy(loadAtlases);
  let t = 0;
  return {
    draw(ctx, dt, w, h, font) {
      t += dt;
      pageText(ctx, w, h, font);
      const a = atlases();
      if (!a) return;
      const floor = h - 22;
      const k = (h * 0.5) / 94;
      const c = t % 4;
      const p1 = w * 0.28;
      const p2 = w * 0.74;
      // Ryu throws a Hadouken; it knocks the other Ryu back a step
      const p1Frame =
        c > 1 && c < 1.8
          ? `hadouken${Math.min(3, Math.floor((c - 1) * 8))}`
          : `idle${[0, 1, 2, 3, 2, 1][Math.floor(t * 7) % 6]}`;
      drawFrame(ctx, a[0], p1Frame, p1, floor, k);
      const hit = c > 2.35 && c < 2.8;
      drawFrame(
        ctx,
        a[1],
        hit ? `hit${c < 2.5 ? 0 : 1}` : `idle${[0, 1, 2, 3, 2, 1][Math.floor(t * 7 + 3) % 6]}`,
        p2 - (hit ? 6 : 0),
        floor,
        k,
        true
      );
      if (c > 1.45 && c < 2.35) {
        const fx = p1 + 50 * k + ((c - 1.45) / 0.9) * (p2 - p1 - 80 * k);
        drawFrame(ctx, a[0], `fireball${Math.floor(t * 12) % 4}`, fx, floor - 42 * k, k);
      }
    },
  };
}

function kombat(): Preview {
  const load = async (id: string): Promise<Atlas> => {
    const [meta, image] = await Promise.all([
      fetch(`/mk3/${id}.json`).then((r) => r.json() as Promise<Pick<Atlas, "frames" | "anims">>),
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = `/mk3/${id}.png`;
      }),
    ]);
    return { image, ...meta };
  };
  const atlases = lazy(() => Promise.all([load("scorpion"), load("subzero")]));
  let t = 0;
  return {
    draw(ctx, dt, w, h, font) {
      t += dt;
      pageText(ctx, w, h, font);
      const a = atlases();
      if (!a) return;
      const floor = h - 22;
      const k = (h * 0.62) / 129;
      const c = t % 5;
      const sx = w * 0.26;
      // GET OVER HERE: the spear flies, sticks, and drags Sub-Zero in
      const out = c > 1 && c < 1.6;
      const pull = c >= 1.6 && c < 2.2;
      const stunned = c >= 2.2 && c < 4.2;
      const zx = pull ? w * 0.76 - ((c - 1.6) / 0.6) * (w * 0.76 - sx - 60 * k) : stunned ? sx + 60 * k : w * 0.76;
      const scorpionFrame =
        c > 0.7 && c < 1
          ? `spear${Math.floor((c - 0.7) * 10)}`
          : out
            ? "spear3"
            : pull
              ? "spear6"
              : `stance${Math.floor(t * 8) % 9}`;
      drawFrame(ctx, a[0], scorpionFrame, sx, floor, k);
      drawFrame(
        ctx,
        a[1],
        stunned ? `dizzy${Math.floor(t * 8) % 8}` : `stance${Math.floor(t * 8 + 4) % 9}`,
        zx,
        floor,
        k,
        true
      );
      if (out || pull) {
        const handX = sx + 56 * k;
        const handY = floor - 106 * k;
        const tip = out ? handX + ((c - 1) / 0.6) * (zx - handX - 18 * k) : zx - 18 * k;
        ctx.strokeStyle = "#a8a29e";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        for (let i = 1; i <= 16; i++) {
          const p = i / 16;
          ctx.lineTo(handX + (tip - handX) * p, handY + Math.sin(p * 18 + t * 20) * (out ? 2 : 0));
        }
        ctx.stroke();
        ctx.fillStyle = "#e7e5e4";
        ctx.beginPath();
        ctx.moveTo(tip + 6, handY);
        ctx.lineTo(tip - 2, handY - 3);
        ctx.lineTo(tip - 2, handY + 3);
        ctx.fill();
      }
    },
  };
}

function doom(): Preview {
  const atlas = lazy(loadAtlas);
  let t = 0;
  return {
    draw(ctx, dt, w, h, font) {
      t += dt;
      pageText(ctx, w, h, font);
      const a: DoomAtlas | null = atlas();
      if (!a) return;
      const floor = h - 22;
      const c = t % 4;
      // an imp patrols a line of text until the pistol drops it
      const x = w * 0.25 + Math.sin(Math.min(c, 2.2) * 1.6) * w * 0.22;
      const imp =
        c < 2.2
          ? `TROO${"ABCD"[Math.floor(t * 6) % 4]}1`
          : c < 2.4
            ? "TROOH1"
            : `TROO${"IJKLM"[Math.min(4, Math.floor((c - 2.4) * 8))]}0`;
      if (c < 3.6) drawSprite(ctx, a, imp, x, floor, 1);
      // the pistol, bottom centre (weapon sprites carry screen offsets, so they're placed by hand)
      const firing = c > 2.1 && c < 2.3;
      const gun = a.sprites[firing ? "PISGB0" : "PISGA0"];
      const flash = a.sprites.PISFA0;
      if (gun) {
        const [gx, gy, gw, gh] = gun;
        const left = w * 0.62 - gw / 2;
        if (firing && flash) {
          const [fx, fy, fw, fh] = flash;
          ctx.drawImage(a.image, fx, fy, fw, fh, w * 0.62 - fw / 2, h - gh - fh + 4, fw, fh);
        }
        ctx.drawImage(a.image, gx, gy, gw, gh, left, h - gh, gw, gh);
      }
    },
  };
}

export function makePreviews(): Record<ArcadeGame, Preview> {
  return {
    blackhole: blackHole(),
    life: life(),
    kombat: kombat(),
    fight: fight(),
    doom: doom(),
  };
}
