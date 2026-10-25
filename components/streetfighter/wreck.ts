import { docBox, glyphOf, textNodes, type Box, type Glyph } from "../doom/page";

// ==========================================
// Page damage for the arcade modes (Street Fighter, Mortal Kombat, Pac-Man): every blow
// lands on the portfolio as well as the opponent, and Pac-Man eats it. Letters are knocked
// off as rubble that piles up on the arena floor, or bitten off and sucked into Pac-Man;
// skill tags burst, image boxes crack and shatter; ice frosts letters over so the
// next hit shatters them, fire burns them down to embers. Like DOOM mode, nothing in the DOM
// is changed: damage is drawn on the game canvas, so exiting restores the page.
// ==========================================

const GRAVITY = 1800;
const MAX_RUBBLE = 1200;
const SOLID_HP = 6;
const BUMP_HP = 2;
const BURN_TIME = 0.7;

type Tint = "ice" | "ember";
const MAX_MORSELS = 500;
const MAX_CRUMBS = 800;

interface Rubble {
  img: HTMLCanvasElement;
  x: number; // centre, document px
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  rest: boolean;
}

/** Something Pac-Man bit off: it pops off the page, then gets sucked into his mouth. */
interface Morsel {
  img: HTMLCanvasElement;
  sx: number; // where it started, centre, document px
  sy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  t: number;
  delay: number;
  dur: number;
  swirl: number;
}

/** A crumb sprayed out by a bite, in the colour of what was bitten. */
interface Crumb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  color: string;
  t: number;
}

interface TextEntry {
  node: Text;
  box: Box;
  /** measured lazily, the first time something hits near this node */
  glyphs?: Glyph[];
}

interface Target {
  el: HTMLElement;
  kind: "skill" | "solid" | "bump";
  box: Box;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const near = (b: Box, x: number, y: number, r: number) =>
  x + r >= b.x && x - r <= b.x + b.w && y + r >= b.y && y - r <= b.y + b.h;

/** A box as it looks on the page, drawn into a canvas, plus whether it holds an image. */
export function snapshotBox(el: HTMLElement, b: Box) {
  const dpr = window.devicePixelRatio || 1;
  const snap = document.createElement("canvas");
  snap.width = Math.ceil(b.w * dpr);
  snap.height = Math.ceil(b.h * dpr);
  const c = snap.getContext("2d")!;
  c.scale(dpr, dpr);
  c.fillStyle = getComputedStyle(el).backgroundColor || "#09090b";
  c.fillRect(0, 0, b.w, b.h);
  const img = el.querySelector("img");
  if (img?.complete && img.naturalWidth) {
    // redraw the image the way CSS shows it: object-fit cover plus its filters
    const ir = img.getBoundingClientRect();
    const scale = Math.max(ir.width / img.naturalWidth, ir.height / img.naturalHeight);
    const sw = ir.width / scale;
    const sh = ir.height / scale;
    c.filter = getComputedStyle(img).filter;
    c.drawImage(
      img,
      (img.naturalWidth - sw) / 2,
      (img.naturalHeight - sh) / 2,
      sw,
      sh,
      ir.left + window.scrollX - b.x,
      ir.top + window.scrollY - b.y,
      ir.width,
      ir.height
    );
    c.filter = "none";
  } else {
    c.strokeStyle = "#a1a1aa";
    c.lineWidth = 1.2;
    c.strokeRect(b.w * 0.25, b.h * 0.25, b.w * 0.5, b.h * 0.5);
  }
  c.strokeStyle = "#3f3f46";
  c.strokeRect(0.5, 0.5, b.w - 1, b.h - 1);
  return { snap, image: !!(img?.complete && img.naturalWidth) };
}

export class PageWreck {
  /** letters knocked off the page so far */
  destroyed = 0;
  private text: TextEntry[] = [];
  private targets: Target[] = [];
  private gone = new WeakMap<Text, Set<number>>();
  private broken = new Set<HTMLElement>();
  private hp = new Map<HTMLElement, number>();
  private holes: Box[] = [];
  private dents: { x: number; y: number; r: number }[] = [];
  private rubble: Rubble[] = [];
  private glyphCache = new Map<string, HTMLCanvasElement>();
  private frozen = new WeakMap<Text, Set<number>>();
  private frost: Box[] = [];
  private burning: { g: Glyph; t: number; fromX: number; fromY: number }[] = [];
  private lit = new WeakMap<Text, Set<number>>();
  private clock = 0;
  private morsels: Morsel[] = [];
  private crumbs: Crumb[] = [];
  private mouth: { x: number; y: number } | null = null;

  constructor(private onShatter: (strength: number) => void) {}

  reset() {
    this.destroyed = 0;
    this.gone = new WeakMap();
    this.broken.clear();
    this.hp.clear();
    this.holes = [];
    this.dents = [];
    this.rubble = [];
    this.frozen = new WeakMap();
    this.frost = [];
    this.burning = [];
    this.lit = new WeakMap();
    this.morsels = [];
    this.crumbs = [];
    this.measure();
  }

  /** Re-read where the text and the breakable boxes are. Call after scrolling or resizing. */
  measure() {
    this.text = textNodes().map((node) => ({
      node,
      box: docBox(node.parentElement!),
    }));
    this.targets = [];
    document
      .querySelectorAll<HTMLElement>('[data-game="skill"], [data-game="solid"], [data-game="bump"]')
      .forEach((el) => {
        if (this.broken.has(el)) return;
        const box = docBox(el);
        if (box.w)
          this.targets.push({
            el,
            kind: el.dataset.game as Target["kind"],
            box,
          });
      });
  }

  /**
   * A blow at (x, y), document px: knocks every letter within `radius` off the page, flying
   * away from (fromX, fromY), and deals `power` to any box it touches. Returns letters hit.
   */
  blast(x: number, y: number, radius: number, power: number, fromX = x, fromY = y + 20, limit = 120) {
    let n = 0;
    for (const t of this.targets) {
      if (this.broken.has(t.el) || !near(t.box, x, y, radius)) continue;
      if (t.kind === "skill") {
        n += this.burst(t, fromX, fromY);
        continue;
      }
      const hp = (this.hp.get(t.el) ?? (t.kind === "solid" ? SOLID_HP : BUMP_HP)) - power;
      this.hp.set(t.el, hp);
      if (hp <= 0) this.shatter(t);
      else if (t.kind === "solid") {
        this.dents.push({
          x: Math.max(t.box.x + 6, Math.min(t.box.x + t.box.w - 6, x)),
          y: Math.max(t.box.y + 6, Math.min(t.box.y + t.box.h - 6, y)),
          r: 3 + power * 1.5,
        });
      }
    }
    return n + this.eachGlyph(x, y, radius, limit - n, (g) => this.knockOff(g, fromX, fromY, 260 + power * 90));
  }

  /** Ice: letters in range frost over, and shatter into ice the next time they're hit. */
  freeze(x: number, y: number, radius: number, limit = 80) {
    return this.eachGlyph(x, y, radius, limit, (g) => {
      const set = this.setOf(this.frozen, g.node);
      if (set.has(g.index)) return false;
      set.add(g.index);
      this.frost.push(g.box);
      return true;
    });
  }

  /** Breaks only the frosted letters in range, e.g. when a frozen fighter is shattered. */
  shatterFrozen(x: number, y: number, radius: number, limit = 400) {
    return this.eachGlyph(x, y, radius, limit, (g) =>
      this.frozen.get(g.node)?.has(g.index) ? this.knockOff(g, x, y, 520) : false
    );
  }

  /** Where Pac-Man's mouth is now (document px): bitten pieces fly there. */
  setMouth(x: number, y: number) {
    this.mouth = { x, y };
  }

  /**
   * Pac-Man: letters within radius that fit in a mouth maxH tall are ripped off the page and
   * sucked in, spraying crumbs. Returns how many went and the area they covered (what he grows by).
   */
  eat(x: number, y: number, radius: number, maxH: number, limit = 200) {
    let area = 0;
    const letters = this.eachGlyph(x, y, radius, limit, (g) => {
      if (g.box.h > maxH) return false;
      this.gulp(g);
      area += g.box.w * g.box.h;
      return true;
    });
    return { letters, area };
  }

  /** Swallows whole skill tags, glyph buttons and image boxes near (x, y) that `fits` allows. */
  eatBoxes(x: number, y: number, radius: number, fits: (b: Box, kind: string) => boolean) {
    const eaten: { kind: string; area: number }[] = [];
    for (const t of this.targets) {
      if (this.broken.has(t.el) || !near(t.box, x, y, radius * 0.5) || !fits(t.box, t.kind)) continue;
      this.broken.add(t.el);
      // a tag goes letter by letter; a box cracks into chunks that get sucked in
      for (const node of textNodes(t.el)) {
        const set = this.setOf(this.gone, node);
        for (let i = 0; i < node.data.length; i++) {
          if (!node.data[i].trim() || set.has(i)) continue;
          const g = t.kind === "skill" ? glyphOf(node, i) : null;
          if (g) this.gulp(g);
          else {
            set.add(i);
            this.destroyed++;
          }
        }
      }
      if (t.kind !== "skill") {
        const { snap, image } = snapshotBox(t.el, t.box);
        this.pieces(snap, [0, 0, snap.width, snap.height], t.box, image ? 5 : 2, image ? 4 : 2, false, true);
      }
      this.holes.push({
        x: t.box.x - 1,
        y: t.box.y - 1,
        w: t.box.w + 2,
        h: t.box.h + 2,
      });
      eaten.push({ kind: t.kind, area: t.box.w * t.box.h });
    }
    return eaten;
  }

  /** Letters still on the page. Measures every text node, so call it once the layout has settled. */
  lettersLeft() {
    let n = 0;
    for (const e of this.text) {
      const gone = this.gone.get(e.node);
      for (const g of this.glyphsOf(e)) if (!gone?.has(g.index)) n++;
    }
    return n;
  }

  /** Fire: letters in range catch, burn for a moment, then crumble into embers. */
  ignite(x: number, y: number, radius: number, limit = 80) {
    return this.eachGlyph(x, y, radius, limit, (g) => {
      const set = this.setOf(this.lit, g.node);
      if (set.has(g.index)) return false;
      set.add(g.index);
      this.burning.push({ g, t: -rand(0, 0.25), fromX: x, fromY: y + 40 });
      return true;
    });
  }

  /** Fighters scuff the debris at their feet: pushed along by vx, sprayed out from cx by spread. */
  kick(cx: number, halfW: number, floor: number, vx: number, spread: number) {
    for (const r of this.rubble) {
      if (!r.rest || Math.abs(r.x - cx) > halfW || Math.abs(r.y + r.h / 2 - floor) > 6) continue;
      r.rest = false;
      r.vx = vx * rand(0.6, 1.4) + Math.sign(r.x - cx) * spread * rand(0.5, 1) + rand(-40, 40);
      r.vy = -(Math.abs(vx) + spread) * rand(0.4, 0.9) - rand(60, 160);
      r.vr = rand(-10, 10);
    }
  }

  /** Debris falls to the arena floor (document px) or the bottom of the page. */
  update(dt: number, floor: number) {
    const docH = document.documentElement.scrollHeight;
    this.clock += dt;
    for (const b of this.burning) {
      b.t += dt;
      if (b.t >= BURN_TIME) this.knockOff(b.g, b.fromX, b.fromY, 120, "ember");
    }
    this.burning = this.burning.filter((b) => b.t < BURN_TIME);
    for (const m of this.morsels) m.t += dt;
    this.morsels = this.morsels.filter((m) => m.t < m.delay + m.dur);
    for (const c of this.crumbs) {
      c.t += dt;
      c.vy += 900 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
    }
    this.crumbs = this.crumbs.filter((c) => c.t < 0.5);
    for (const r of this.rubble) {
      if (r.rest) continue;
      const prevBottom = r.y + r.h / 2;
      r.vy = Math.min(1400, r.vy + GRAVITY * dt);
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.rot += r.vr * dt;
      if (r.vy <= 0) continue;
      const bottom = r.y + r.h / 2;
      const ground = prevBottom <= floor + 1 && bottom >= floor ? floor : bottom >= docH ? docH : null;
      if (ground === null) continue;
      r.y = ground - r.h / 2;
      if (r.vy < 140) {
        r.rest = true;
        r.vy = 0;
        r.rot = Math.round(r.rot / (Math.PI / 2)) * (Math.PI / 2) + rand(-0.3, 0.3);
      } else {
        r.vy *= -0.3;
        r.vx *= 0.5;
        r.vr *= 0.5;
      }
    }
  }

  /** Draws the damage; ctx is already translated to document coordinates. */
  draw(ctx: CanvasRenderingContext2D, top: number, bottom: number) {
    // frost first, so a hole punched where a frozen letter was covers it
    for (const f of this.frost) {
      if (f.y + f.h < top || f.y > bottom) continue;
      ctx.fillStyle = "rgba(165,243,252,0.32)";
      ctx.fillRect(f.x - 0.5, f.y, f.w + 1, f.h);
      ctx.fillStyle = "rgba(240,249,255,0.75)";
      ctx.fillRect(f.x - 0.5, f.y, f.w + 1, 1);
    }
    ctx.fillStyle = "#000";
    for (const h of this.holes) if (h.y + h.h > top && h.y < bottom) ctx.fillRect(h.x, h.y, h.w, h.h);
    for (const d of this.dents) {
      if (d.y < top || d.y > bottom) continue;
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + d.r;
        ctx.moveTo(d.x + Math.cos(a) * d.r, d.y + Math.sin(a) * d.r);
        ctx.lineTo(d.x + Math.cos(a) * d.r * 2.6, d.y + Math.sin(a) * d.r * 2.6);
      }
      ctx.stroke();
    }
    for (const { g, t } of this.burning) {
      if (t < 0 || g.box.y < top || g.box.y > bottom || this.gone.get(g.node)?.has(g.index)) continue;
      const p = t / BURN_TIME;
      const { x, y, w, h } = g.box;
      ctx.fillStyle = `rgba(234,88,12,${0.25 + p * 0.5})`;
      ctx.fillRect(x, y, w, h);
      for (let i = 0; i < 2; i++) {
        const fx = x + w * (0.3 + i * 0.4) + Math.sin(this.clock * 30 + x + i) * 1.5;
        const fh = h * (0.6 + p * 0.8) * (0.7 + 0.3 * Math.sin(this.clock * 40 + i * 2 + y));
        ctx.fillStyle = i ? "rgba(253,224,71,0.85)" : "rgba(249,115,22,0.9)";
        ctx.beginPath();
        ctx.moveTo(fx - w * 0.3, y + h * 0.7);
        ctx.quadraticCurveTo(fx, y + h * 0.7 - fh, fx + w * 0.3, y + h * 0.7);
        ctx.fill();
      }
    }
    for (const r of this.rubble) {
      if (r.y < top || r.y > bottom) continue;
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      ctx.drawImage(r.img, -r.w / 2, -r.h / 2, r.w, r.h);
      ctx.restore();
    }
    for (const c of this.crumbs) {
      ctx.globalAlpha = 1 - c.t / 0.5;
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x - c.s / 2, c.y - c.s / 2, c.s, c.s);
    }
    ctx.globalAlpha = 1;
    const mouth = this.mouth;
    if (!mouth) return;
    for (const m of this.morsels) {
      const p = Math.max(0, Math.min(1, (m.t - m.delay) / m.dur));
      // first it jumps off the page, then accelerates into the mouth, shrinking
      const pop = p < 0.3 ? Math.sin((p / 0.3) * Math.PI) : 0;
      const pull = p < 0.3 ? 0 : ((p - 0.3) / 0.7) ** 2;
      const dx = mouth.x - m.sx;
      const dy = mouth.y - m.sy;
      const d = Math.hypot(dx, dy) || 1;
      const curve = Math.sin(pull * Math.PI) * m.swirl;
      const x = m.sx + dx * pull - (dx / d) * pop * 16 - (dy / d) * curve;
      const y = m.sy + dy * pull - (dy / d) * pop * 16 - 14 * pop + (dx / d) * curve;
      const scale = p < 0.3 ? 1 + (p / 0.3) * 0.6 : 1.6 * (1 - ((p - 0.3) / 0.7) * 0.9);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(m.rot + m.vr * m.t);
      ctx.drawImage(m.img, (-m.w / 2) * scale, (-m.h / 2) * scale, m.w * scale, m.h * scale);
      ctx.restore();
    }
  }

  // ---------- internals ----------

  /** Runs fn on each letter still on the page within radius of (x, y); counts the ones it took. */
  private eachGlyph(x: number, y: number, radius: number, limit: number, fn: (g: Glyph) => boolean) {
    let n = 0;
    for (const e of this.text) {
      if (n >= limit) break;
      if (!near(e.box, x, y, radius)) continue;
      const gone = this.gone.get(e.node);
      for (const g of this.glyphsOf(e)) {
        if (n >= limit) break;
        if (gone?.has(g.index)) continue;
        const dx = g.box.x + g.box.w / 2 - x;
        const dy = g.box.y + g.box.h / 2 - y;
        if (dx * dx + dy * dy <= radius * radius && fn(g)) n++;
      }
    }
    return n;
  }

  private setOf(map: WeakMap<Text, Set<number>>, node: Text) {
    let set = map.get(node);
    if (!set) map.set(node, (set = new Set()));
    return set;
  }

  private glyphsOf(e: TextEntry) {
    if (!e.glyphs) {
      e.glyphs = [];
      for (let i = 0; i < e.node.data.length; i++) {
        const g = glyphOf(e.node, i);
        if (g) e.glyphs.push(g);
      }
    }
    return e.glyphs;
  }

  /** One letter bitten off the page: a hole where it was, the letter on its way into the mouth. */
  private gulp(g: Glyph) {
    this.setOf(this.gone, g.node).add(g.index);
    this.destroyed++;
    this.holes.push({
      x: g.box.x - 0.5,
      y: g.box.y - 0.5,
      w: g.box.w + 1,
      h: g.box.h + 1,
    });
    const cx = g.box.x + g.box.w / 2;
    const cy = g.box.y + g.box.h / 2;
    this.addMorsel({
      img: this.glyphImage(g),
      sx: cx,
      sy: cy,
      w: g.box.w,
      h: g.box.h,
      rot: 0,
      vr: rand(-14, 14),
      t: 0,
      delay: rand(0, 0.05),
      dur: rand(0.32, 0.44),
      swirl: rand(-24, 24),
    });
    for (let i = 0; i < 3; i++) this.crumb(cx, cy, g.color, g.box.h);
  }

  private crumb(x: number, y: number, color: string, size: number) {
    if (this.crumbs.length >= MAX_CRUMBS) this.crumbs.shift();
    const a = rand(0, Math.PI * 2);
    const v = rand(90, 320);
    this.crumbs.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 120,
      s: Math.max(2, size * rand(0.12, 0.26)),
      color,
      t: rand(0, 0.15),
    });
  }

  private addMorsel(m: Morsel) {
    this.morsels.push(m);
    if (this.morsels.length > MAX_MORSELS) this.morsels.shift();
  }

  /** One letter off the page: a black hole where it was, the letter as flying rubble. */
  private knockOff(g: Glyph, fromX: number, fromY: number, force: number, tint?: Tint) {
    const set = this.setOf(this.gone, g.node);
    if (set.has(g.index)) return false;
    // a frosted letter breaks as ice
    if (!tint && this.frozen.get(g.node)?.has(g.index)) tint = "ice";
    set.add(g.index);
    this.destroyed++;
    this.holes.push({
      x: g.box.x - 0.5,
      y: g.box.y - 0.5,
      w: g.box.w + 1,
      h: g.box.h + 1,
    });
    const cx = g.box.x + g.box.w / 2;
    const cy = g.box.y + g.box.h / 2;
    const d = Math.hypot(cx - fromX, cy - fromY) || 1;
    this.addRubble({
      img: this.glyphImage(g, tint),
      x: cx,
      y: cy,
      w: g.box.w,
      h: g.box.h,
      vx: ((cx - fromX) / d) * force + rand(-60, 60),
      vy: -Math.abs(((cy - fromY) / d) * force) * 0.6 - rand(100, 300),
      rot: 0,
      vr: rand(-12, 12),
      rest: false,
    });
    return true;
  }

  private glyphImage(g: Glyph, tint?: Tint) {
    const key = `${g.font}|${g.color}|${g.char}|${tint ?? ""}`;
    let img = this.glyphCache.get(key);
    if (img) return img;
    const dpr = window.devicePixelRatio || 1;
    img = document.createElement("canvas");
    img.width = Math.ceil((g.box.w + 2) * dpr);
    img.height = Math.ceil((g.box.h + 2) * dpr);
    const c = img.getContext("2d")!;
    c.scale(dpr, dpr);
    c.font = g.font;
    c.fillStyle = tint === "ice" ? "#bae6fd" : tint === "ember" ? "#c2410c" : g.color;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(g.char, (g.box.w + 2) / 2, (g.box.h + 2) / 2 + 1);
    this.glyphCache.set(key, img);
    return img;
  }

  /** A skill tag bursts letter by letter. */
  private burst(t: Target, fromX: number, fromY: number) {
    this.broken.add(t.el);
    let n = 0;
    for (const node of textNodes(t.el)) {
      for (let i = 0; i < node.data.length; i++) {
        const g = glyphOf(node, i);
        if (g && this.knockOff(g, fromX, fromY, 420)) n++;
      }
    }
    this.holes.push({
      x: t.box.x - 1,
      y: t.box.y - 1,
      w: t.box.w + 2,
      h: t.box.h + 3,
    });
    return n;
  }

  /** An image box (or a glyph button) shatters into tumbling pieces. */
  private shatter(t: Target) {
    this.broken.add(t.el);
    const { snap, image } = snapshotBox(t.el, t.box);
    const b = t.box;
    this.pieces(snap, [0, 0, snap.width, snap.height], b, image ? 5 : 2, image ? 3 : 2);
    this.holes.push({ x: b.x - 1, y: b.y - 1, w: b.w + 2, h: b.h + 2 });
    this.dents = this.dents.filter((d) => !near(b, d.x, d.y, 0));
    this.onShatter(image ? 9 : 3);
  }

  /**
   * Breaks the src rectangle of an image into cols × rows tumbling pieces, drawn over the
   * document box `to`. Used for shattered image boxes and for a frozen fighter's last moment;
   * with `suck`, the pieces fly into Pac-Man's mouth instead of falling.
   */
  pieces(
    img: CanvasImageSource,
    src: [number, number, number, number],
    to: Box,
    cols: number,
    rows: number,
    flip = false,
    suck = false
  ) {
    const [sx, sy, sw, sh] = src;
    const dpr = window.devicePixelRatio || 1;
    const pw = to.w / cols;
    const ph = to.h / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const piece = document.createElement("canvas");
        piece.width = Math.ceil(pw * dpr);
        piece.height = Math.ceil(ph * dpr);
        const c = piece.getContext("2d")!;
        c.imageSmoothingEnabled = false;
        // a mirrored sprite's left piece comes from the right of the source
        const col = flip ? cols - 1 - i : i;
        if (flip) {
          c.translate(piece.width, 0);
          c.scale(-1, 1);
        }
        c.drawImage(
          img,
          sx + (col * sw) / cols,
          sy + (j * sh) / rows,
          sw / cols,
          sh / rows,
          0,
          0,
          piece.width,
          piece.height
        );
        const cx = to.x + (i + 0.5) * pw;
        const cy = to.y + (j + 0.5) * ph;
        if (suck) {
          this.addMorsel({
            img: piece,
            sx: cx,
            sy: cy,
            w: pw,
            h: ph,
            rot: 0,
            vr: rand(-6, 6),
            t: 0,
            delay: rand(0, 0.18),
            dur: rand(0.4, 0.6),
            swirl: rand(-40, 40),
          });
          for (let k = 0; k < 4; k++) this.crumb(cx, cy, "#a1a1aa", 22);
          continue;
        }
        this.addRubble({
          img: piece,
          x: cx,
          y: cy,
          w: pw,
          h: ph,
          vx: (cx - (to.x + to.w / 2)) * 2.4 + rand(-80, 80),
          vy: -rand(200, 520) + (cy - (to.y + to.h / 2)),
          rot: 0,
          vr: rand(-4, 4),
          rest: false,
        });
      }
    }
  }

  private addRubble(r: Rubble) {
    this.rubble.push(r);
    if (this.rubble.length > MAX_RUBBLE) {
      const i = this.rubble.findIndex((p) => p.rest);
      this.rubble.splice(i >= 0 ? i : 0, 1);
    }
  }
}
