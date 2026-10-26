import { drawSprite, spriteSize, type Atlas, type Sfx, type SoundName } from "./assets";
import { docBox, glyphAt, glyphOf, glyphsInCircle, inBox, textNodes, throughLayer, type Box, type Glyph } from "./page";
import { Rewind } from "../arcade/rewind";
import { playRewind } from "../arcade/rewindSound";

// ==========================================
// DOOM mode: the portfolio page is the level. You are the viewer: aim with the mouse,
// shoot the page apart, and fight monsters that teleport onto its lines and image boxes.
// Nothing in the page's DOM is changed. Destroyed text and images are covered by black
// "holes" on this canvas and turned into rubble, so exiting restores the page.
// ==========================================

const TIC = 1 / 35; // DOOM's frame timing
const GRAVITY = 1800;
const WEAPON_TOP = 32;
const WEAPON_BOTTOM = 128;
const WEAPON_SPEED = 6 * 35; // DOOM raises and lowers weapons 6 units per tic
const MAX_RUBBLE = 1400;
// a portfolio toy should be forgiving: a quiet start, misses, and fireballs slow enough to shoot down
const GRACE = 4;
const ZOMBIE_ACCURACY = 0.35;
const FIREBALL_SPEED = 300;

type WeaponId = "pistol" | "shotgun" | "chaingun" | "launcher";
type AmmoId = "bullets" | "shells" | "rockets";

interface Frame {
  sprite: string;
  tics: number;
  fire?: boolean;
  refire?: boolean;
  flash?: { sprite: string; tics: number }[];
}

interface WeaponDef {
  slot: number;
  name: string;
  ammo: AmmoId;
  ready: string;
  frames: Frame[];
}

// Firing sequences follow DOOM's weapon states (sprite, duration in tics).
const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol: {
    slot: 2,
    name: "pistol",
    ammo: "bullets",
    ready: "PISGA0",
    frames: [
      { sprite: "PISGA0", tics: 4 },
      { sprite: "PISGB0", tics: 6, fire: true, flash: [{ sprite: "PISFA0", tics: 7 }] },
      { sprite: "PISGC0", tics: 4 },
      { sprite: "PISGB0", tics: 5, refire: true },
    ],
  },
  shotgun: {
    slot: 3,
    name: "shotgun",
    ammo: "shells",
    ready: "SHTGA0",
    frames: [
      { sprite: "SHTGA0", tics: 3 },
      { sprite: "SHTGA0", tics: 7, fire: true, flash: [{ sprite: "SHTFA0", tics: 4 }, { sprite: "SHTFB0", tics: 3 }] },
      { sprite: "SHTGB0", tics: 5 },
      { sprite: "SHTGC0", tics: 5 },
      { sprite: "SHTGD0", tics: 4 },
      { sprite: "SHTGC0", tics: 5 },
      { sprite: "SHTGB0", tics: 5 },
      { sprite: "SHTGA0", tics: 3 },
      { sprite: "SHTGA0", tics: 7, refire: true },
    ],
  },
  chaingun: {
    slot: 4,
    name: "chaingun",
    ammo: "bullets",
    ready: "CHGGA0",
    frames: [
      { sprite: "CHGGA0", tics: 4, fire: true, flash: [{ sprite: "CHGFA0", tics: 5 }] },
      { sprite: "CHGGB0", tics: 4, fire: true, refire: true, flash: [{ sprite: "CHGFB0", tics: 5 }] },
    ],
  },
  launcher: {
    slot: 5,
    name: "rocket launcher",
    ammo: "rockets",
    ready: "MISGA0",
    frames: [
      {
        sprite: "MISGB0",
        tics: 8,
        flash: [
          { sprite: "MISFA0", tics: 3 },
          { sprite: "MISFB0", tics: 4 },
          { sprite: "MISFC0", tics: 4 },
          { sprite: "MISFD0", tics: 4 },
        ],
      },
      { sprite: "MISGB0", tics: 12, fire: true },
      { sprite: "MISGB0", tics: 1, refire: true },
    ],
  },
};

const ORDER: WeaponId[] = ["pistol", "shotgun", "chaingun", "launcher"];
const WHERE: Record<WeaponId, string> = {
  pistol: "",
  shotgun: "Shoot open the 1st experience image.",
  chaingun: "Shoot open the 2nd experience image.",
  launcher: "Shoot open the 3rd experience image.",
};
const MAX_AMMO: Record<AmmoId, number> = { bullets: 200, shells: 50, rockets: 50 };
const SOUND_FOR: Record<WeaponId, SoundName> = { pistol: "pistol", shotgun: "shotgn", chaingun: "pistol", launcher: "rlaunc" };

type MonsterKind = "imp" | "zombie";

const MONSTERS: Record<
  MonsterKind,
  {
    prefix: string;
    hp: number;
    speed: number;
    painChance: number;
    attack: Frame[];
    pain: string;
    death: string[];
    deathTics: number;
    sight: SoundName;
    die: SoundName;
  }
> = {
  imp: {
    prefix: "TROO",
    hp: 60,
    speed: 46,
    painChance: 200 / 256,
    attack: [
      { sprite: "TROOE1", tics: 8 },
      { sprite: "TROOF1", tics: 8 },
      { sprite: "TROOG1", tics: 6, fire: true },
    ],
    pain: "TROOH1",
    death: ["TROOI0", "TROOJ0", "TROOK0", "TROOL0", "TROOM0"],
    deathTics: 8,
    sight: "bgsit1",
    die: "bgdth1",
  },
  zombie: {
    prefix: "POSS",
    hp: 20,
    speed: 40,
    painChance: 200 / 256,
    attack: [
      { sprite: "POSSE1", tics: 10 },
      { sprite: "POSSF1", tics: 8, fire: true },
      { sprite: "POSSE1", tics: 8 },
    ],
    pain: "POSSG1",
    death: ["POSSH0", "POSSI0", "POSSJ0", "POSSK0", "POSSL0"],
    deathTics: 5,
    sight: "posit1",
    die: "podth1",
  },
};

type PickupKind =
  | "clip"
  | "shells"
  | "rocket"
  | "stimpack"
  | "medikit"
  | "armor"
  | "bonus"
  | "shotgun"
  | "chaingun"
  | "launcher";

const PICKUPS: Record<PickupKind, { sprite: string; message: string }> = {
  clip: { sprite: "CLIPA0", message: "Picked up a clip." },
  shells: { sprite: "SHELA0", message: "Picked up 4 shotgun shells." },
  rocket: { sprite: "ROCKA0", message: "Picked up a rocket." },
  stimpack: { sprite: "STIMA0", message: "Picked up a stimpack." },
  medikit: { sprite: "MEDIA0", message: "Picked up a medikit." },
  armor: { sprite: "ARM1A0", message: "Picked up the armor." },
  bonus: { sprite: "BON1A0", message: "Picked up an armor bonus." },
  shotgun: { sprite: "SHOTA0", message: "You got the shotgun!" },
  chaingun: { sprite: "MGUNA0", message: "You got the chaingun!" },
  launcher: { sprite: "LAUNA0", message: "You got the rocket launcher!" },
};

// What each image box drops when shot apart, in page order: weapons first.
const BOX_DROPS: PickupKind[] = ["shotgun", "chaingun", "launcher", "medikit", "rocket", "armor", "medikit", "rocket"];

export interface DoomStats {
  kills: number;
  totalKills: number;
  items: number;
  totalItems: number;
  secrets: number;
  totalSecrets: number;
  time: number;
}

export type DoomEnd = { type: "win" | "dead"; stats: DoomStats };

interface Plat extends Box {
  el: HTMLElement;
  kind: string;
}

interface Monster {
  kind: MonsterKind;
  x: number; // centre, document px
  y: number; // feet
  dir: 1 | -1;
  minX: number;
  maxX: number;
  host: HTMLElement;
  hp: number;
  state: "spawn" | "walk" | "attack" | "pain" | "dead";
  frame: number;
  t: number;
  cooldown: number;
  stride: number;
}

interface Rubble {
  img: HTMLCanvasElement;
  x: number; // centre
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  rest: boolean;
  /** where it came from on the page, for the rewind on exit */
  home?: Box;
}

interface Effect {
  frames: string[];
  tics: number;
  x: number;
  y: number;
  t: number;
  scale: number;
}

interface Missile {
  x: number;
  y: number;
  tx: number;
  ty: number;
  scale: number;
}

interface Fireball {
  x: number;
  y: number;
  scale: number;
  t: number;
}

interface Pickup {
  kind: PickupKind;
  x: number;
  y: number; // feet
  vy: number;
  taken: boolean;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class DoomGame {
  private ctx: CanvasRenderingContext2D;
  /** Pixel scale for the HUD and weapon (status bar is 320 × 32 art pixels). */
  private hud = 2;
  /** Pixel scale for monsters, items and effects on the page. */
  private world = 2;
  private plats: Plat[] = [];
  private platsT = 0;
  private headerBottom = 0;
  private docH = 0;

  private health = 100;
  private armor = 0;
  private ammo: Record<AmmoId, number> = { bullets: 50, shells: 0, rockets: 0 };
  private owned = new Set<WeaponId>(["pistol"]);
  private weapon: WeaponId = "pistol";
  private pending: WeaponId | null = null;
  private weaponY = WEAPON_BOTTOM;
  private frame = -1; // -1 = ready
  private frameT = 0;
  private flash: { sprite: string; tics: number }[] = [];
  private flashT = 0;
  private bob = 0;
  private bobAngle = 0;
  private god = false;
  private dead = false;
  private done = false;

  private mouse = { x: 0, y: 0, speed: 0, inside: false };
  private trigger = false;
  /** A press is remembered until the gun can fire, so a quick tap still shoots. */
  private pressed = false;
  private refire = false;
  private cheat = "";

  private monsters: Monster[] = [];
  private spawners: { el: HTMLElement; count: number; fired: boolean }[] = [];
  private missiles: Missile[] = [];
  private fireballs: Fireball[] = [];
  private effects: Effect[] = [];
  private pickups: Pickup[] = [];
  private rubble: Rubble[] = [];
  /** rubble no longer drawn (pushed out by newer pieces), kept so it can fly home on exit */
  private parked: Rubble[] = [];
  private homecoming = new Rewind();
  private leaving = false;
  private holes: Box[] = [];
  private decals: { box: HTMLElement; x: number; y: number }[] = [];
  private boxes = new Map<HTMLElement, number>(); // hit points left per image box / glyph button
  private broken = new Set<HTMLElement>();
  private destroyed = new WeakMap<Text, Set<number>>();
  private glyphCache = new Map<string, HTMLCanvasElement>();
  private foundSecrets = new Set<HTMLElement>();
  private messages: { text: string; t: number }[] = [];
  private face = { sprite: "STFST00", t: 0, look: 0, lookT: 0 };
  private redFlash = 0;
  private bonusFlash = 0;
  private stats: DoomStats = { kills: 0, totalKills: 0, items: 0, totalItems: 0, secrets: 0, totalSecrets: 0, time: 0 };
  private clock = 0;
  private running = false;
  private raf = 0;
  private last = 0;
  private boxOrder: HTMLElement[] = [];
  private endTimer = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private atlas: Atlas,
    private sfx: Sfx,
    private onEnd: (e: DoomEnd) => void,
    private onShake: (strength: number) => void
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    this.reset();
  }

  // ---------- public API ----------

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  /** Leaving: the monsters and the gun go, and every piece of the page flies back home. */
  exit(done: () => void) {
    if (this.leaving) return;
    this.leaving = true;
    this.trigger = false;
    window.clearTimeout(this.endTimer);
    const strays = [...this.rubble, ...this.parked]
      .filter((r) => r.home)
      .map((r) => ({ img: r.img, home: r.home!, x: r.x, y: r.y, rot: r.rot }));
    if (!strays.length && !this.holes.length) return done();
    playRewind(this.sfx.muted);
    this.rubble = [];
    this.parked = [];
    this.homecoming.start(strays, () => {
      this.holes = [];
      this.decals = [];
      done();
    });
  }

  stop() {
    window.clearTimeout(this.endTimer);
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  restart() {
    this.stop();
    window.scrollTo({ top: 0, behavior: "instant" });
    this.reset();
    this.start();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.hud = Math.max(1, Math.min(4, Math.floor((w / 320) * 0.45)));
    this.world = w >= 1024 ? 2 : 1.5;
  }

  pointer(x: number, y: number) {
    const dx = x - this.mouse.x;
    const dy = y - this.mouse.y;
    this.mouse.speed = Math.min(2000, this.mouse.speed + Math.hypot(dx, dy) * 12);
    this.mouse.x = x;
    this.mouse.y = y;
    this.mouse.inside = true;
  }

  setTrigger(down: boolean) {
    this.trigger = down;
    if (down) {
      this.pressed = true;
      this.sfx.unlock();
    }
  }

  key(key: string, code: string) {
    // read the physical key so number row and numpad work on any keyboard layout; 1 = pistol (no fist here)
    const digit = /^(?:Digit|Numpad)([1-5])$/.exec(code)?.[1];
    if (digit) {
      const slot = Math.max(2, Number(digit));
      const w = ORDER.find((id) => WEAPONS[id].slot === slot)!;
      if (this.owned.has(w)) this.select(w);
      else this.message(`No ${WEAPONS[w].name} yet. ${WHERE[w]}`);
      return;
    }

    // DOOM cheats, typed during play
    if (key.length !== 1) return;
    this.cheat = (this.cheat + key.toLowerCase()).slice(-6);
    if (this.cheat.endsWith("iddqd")) {
      this.god = !this.god;
      if (this.god) this.health = 100;
      this.message(this.god ? "Degreelessness mode on" : "Degreelessness mode off");
    } else if (this.cheat.endsWith("idkfa") || this.cheat.endsWith("idfa")) {
      ORDER.forEach((w) => this.owned.add(w));
      this.ammo = { ...MAX_AMMO };
      this.armor = 200;
      this.message(this.cheat.endsWith("idkfa") ? "Very happy ammo added" : "Ammo (no keys) added");
    }
  }

  // ---------- setup ----------

  private reset() {
    window.clearTimeout(this.endTimer);
    this.health = 100;
    this.armor = 0;
    this.ammo = { bullets: 50, shells: 0, rockets: 0 };
    this.owned = new Set(["pistol"]);
    this.weapon = "pistol";
    this.pending = null;
    this.weaponY = WEAPON_BOTTOM;
    this.frame = -1;
    this.flash = [];
    this.god = false;
    this.dead = false;
    this.done = false;
    this.monsters = [];
    this.missiles = [];
    this.fireballs = [];
    this.effects = [];
    this.pickups = [];
    this.rubble = [];
    this.parked = [];
    this.holes = [];
    this.decals = [];
    this.boxes.clear();
    this.broken.clear();
    this.destroyed = new WeakMap();
    this.foundSecrets.clear();
    this.messages = [];
    this.redFlash = 0;
    this.bonusFlash = 0;
    this.clock = 0;
    this.measure();
    this.boxOrder = [...document.querySelectorAll<HTMLElement>('[data-game="solid"]')];

    // monsters teleport in as each dotted line comes into view; deeper sections get more
    const floors = this.plats.filter((p) => p.kind === "floor");
    this.spawners = floors.map((f, i) => ({ el: f.el, count: i === 0 ? 1 : i % 3 === 0 ? 2 : 1, fired: false }));
    this.stats = {
      kills: 0,
      totalKills: this.spawners.reduce((n, s) => n + s.count, 0),
      items: 0,
      totalItems: 0,
      secrets: 0,
      totalSecrets: document.querySelectorAll("[data-doom-secret]").length,
      time: 0,
    };
    this.message("Shoot the page. Guns hide in the images. Keys 2-5 switch.");
  }

  /** Re-read platform positions: dotted lines, headings, image boxes. */
  private measure() {
    this.headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    this.docH = document.documentElement.scrollHeight;
    this.plats = [];
    document.querySelectorAll<HTMLElement>('[data-game="floor"], [data-game="ledge"], [data-game="solid"]').forEach((el) => {
      if (this.broken.has(el)) return;
      const b = docBox(el);
      if (b.w) this.plats.push({ ...b, el, kind: el.dataset.game ?? "" });
    });
  }

  // ---------- loop ----------

  private tick = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    this.render();
    if (this.running) this.raf = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    if (this.leaving) {
      this.homecoming.update(dt);
      return;
    }
    this.clock += dt;
    if (!this.dead && !this.done) this.stats.time += dt;
    if ((this.platsT -= dt) <= 0) {
      this.measure();
      this.platsT = 0.5;
    }
    this.mouse.speed *= Math.pow(0.02, dt);
    this.redFlash = Math.max(0, this.redFlash - dt * 1.5);
    this.bonusFlash = Math.max(0, this.bonusFlash - dt * 2);
    this.messages = this.messages.filter((m) => (m.t += dt) < 4);

    this.updateWeapon(dt);
    this.updateSpawners();
    this.updateMonsters(dt);
    this.updateMissiles(dt);
    this.updateFireballs(dt);
    this.updatePickups(dt);
    this.updateRubble(dt);
    this.updateFace(dt);
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < e.frames.length * e.tics * TIC);

    if (!this.done && !this.dead && this.spawners.every((s) => s.fired) && this.stats.kills >= this.stats.totalKills) {
      this.done = true;
      this.message("Portfolio cleared!");
      this.endTimer = window.setTimeout(() => this.finish("win"), 1500);
    }
  }

  private finish(type: DoomEnd["type"]) {
    this.trigger = false;
    this.onEnd({ type, stats: { ...this.stats } });
  }

  // ---------- weapon ----------

  private select(w: WeaponId) {
    if (w !== this.weapon && !this.dead) this.pending = w;
  }

  private hasAmmo(w: WeaponId) {
    return this.ammo[WEAPONS[w].ammo] > 0;
  }

  private bestWeapon(): WeaponId | null {
    for (const w of ["chaingun", "shotgun", "pistol", "launcher"] as WeaponId[]) {
      if (this.owned.has(w) && this.hasAmmo(w)) return w;
    }
    return null;
  }

  private updateWeapon(dt: number) {
    const def = WEAPONS[this.weapon];

    if (this.dead) {
      this.weaponY = Math.min(WEAPON_BOTTOM, this.weaponY + WEAPON_SPEED * dt);
      return;
    }
    // lower the current weapon, swap, raise the new one (only between shots)
    if (this.pending && this.frame < 0) {
      this.weaponY += WEAPON_SPEED * dt;
      if (this.weaponY >= WEAPON_BOTTOM) {
        this.weaponY = WEAPON_BOTTOM;
        this.weapon = this.pending;
        this.pending = null;
      }
      return;
    }
    if (this.weaponY > WEAPON_TOP) {
      this.weaponY = Math.max(WEAPON_TOP, this.weaponY - WEAPON_SPEED * dt);
      return;
    }

    if (this.flash.length) {
      this.flashT += dt;
      if (this.flashT >= this.flash[0].tics * TIC) {
        this.flashT = 0;
        this.flash.shift();
      }
    }

    if (this.frame < 0) {
      // ready: bob with mouse movement, fire on trigger
      this.bob = Math.min(10, this.mouse.speed / 120);
      this.bobAngle += dt * 7;
      if ((this.trigger || this.pressed) && !this.done) this.beginFire();
      this.pressed = false;
      return;
    }

    this.frameT += dt;
    while (this.frame >= 0 && this.frameT >= def.frames[this.frame].tics * TIC) {
      this.frameT -= def.frames[this.frame].tics * TIC;
      const f = def.frames[this.frame];
      if (f.refire) {
        if (this.trigger && this.hasAmmo(this.weapon) && !this.done) {
          this.refire = true;
          this.enterFrame(0);
        } else {
          this.frame = -1;
          this.refire = false;
          if (!this.hasAmmo(this.weapon)) {
            const best = this.bestWeapon();
            if (best) this.select(best);
          }
        }
      } else {
        this.enterFrame(this.frame + 1);
      }
    }
  }

  private beginFire() {
    if (!this.hasAmmo(this.weapon)) {
      const best = this.bestWeapon();
      if (best) this.select(best);
      else {
        this.sfx.play("noway", 0.6);
        this.trigger = false;
        this.message("Out of ammo. Shoot the skill tags for more.");
      }
      return;
    }
    this.refire = false;
    this.frameT = 0;
    this.enterFrame(0);
  }

  private enterFrame(i: number) {
    const f = WEAPONS[this.weapon].frames[i];
    this.frame = i;
    if (f.flash) {
      this.flash = [...f.flash];
      this.flashT = 0;
    }
    if (f.fire) this.fire();
  }

  private fire() {
    const def = WEAPONS[this.weapon];
    if (this.ammo[def.ammo] <= 0) return;
    this.ammo[def.ammo]--;
    this.sfx.play(SOUND_FOR[this.weapon], 0.7);
    const { x, y } = this.mouse;
    const damage = () => 5 * (1 + Math.floor(Math.random() * 3));

    if (this.weapon === "launcher") {
      const muzzle = this.muzzle();
      this.missiles.push({ x: muzzle.x, y: muzzle.y, tx: x + window.scrollX, ty: y + window.scrollY, scale: 1.6 });
    } else if (this.weapon === "shotgun") {
      for (let i = 0; i < 7; i++) this.hitscan(x + rand(-46, 46), y + rand(-16, 16), damage());
    } else {
      const spread = this.weapon === "chaingun" ? 14 : this.refire ? 10 : 0;
      this.hitscan(x + rand(-spread, spread), y + rand(-spread / 2, spread / 2), damage());
    }
  }

  /** Where shots leave the gun, in document coordinates. */
  private muzzle() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return { x: vw / 2 + window.scrollX, y: vh - 32 * this.hud - 60 * this.hud + window.scrollY };
  }

  // ---------- hits ----------

  private monsterBox(m: Monster): Box {
    const name = this.monsterSprite(m);
    const s = spriteSize(this.atlas, name);
    const k = this.world;
    return { x: m.x - s.left * k, y: m.y - s.top * k, w: s.w * k, h: s.h * k };
  }

  /** An instant bullet at a viewport point: monsters first, then fireballs, then the page. */
  private hitscan(vx: number, vy: number, damage: number) {
    if (vy < this.headerBottom || vy > window.innerHeight - 32 * this.hud) return;
    const x = vx + window.scrollX;
    const y = vy + window.scrollY;
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      if (m.state === "dead" || m.state === "spawn" || !inBox(this.monsterBox(m), x, y)) continue;
      this.effect(["BLUDC0", "BLUDB0", "BLUDA0"], 8, x, y);
      this.damageMonster(m, damage);
      return;
    }
    for (const f of this.fireballs) {
      if (Math.hypot(f.x - x, f.y - y) < 10 * this.world * f.scale) {
        this.explodeFireball(f, false);
        return;
      }
    }
    this.effect(["PUFFA0", "PUFFB0", "PUFFC0", "PUFFD0"], 4, x, y);
    this.hitPage(vx, vy, 1);
  }

  private hitPage(vx: number, vy: number, power: number) {
    const el = throughLayer(this.canvas, () => document.elementFromPoint(vx, vy)) as HTMLElement | null;
    if (!el || el.closest("header, [data-doom]")) return;
    const x = vx + window.scrollX;
    const y = vy + window.scrollY;

    const secret = el.closest<HTMLElement>("[data-doom-secret]");
    if (secret && !this.foundSecrets.has(secret)) {
      this.foundSecrets.add(secret);
      this.stats.secrets++;
      this.health = Math.min(200, this.health + 50);
      this.bonusFlash = 0.6;
      this.message("A secret is revealed! +50 health");
      this.sfx.play("getpow");
    }

    const box = el.closest<HTMLElement>('[data-game="solid"], [data-game="bump"]');
    if (box && !this.broken.has(box)) {
      if (box.dataset.game === "solid") this.decals.push({ box, x, y });
      const hp = (this.boxes.get(box) ?? (box.dataset.game === "solid" ? 7 : 3)) - power;
      this.boxes.set(box, hp);
      if (hp <= 0) this.shatter(box);
      return;
    }
    const tag = el.closest<HTMLElement>('[data-game="skill"]');
    if (tag && !this.broken.has(tag)) {
      this.explodeElement(tag, x, y);
      return;
    }
    const g = throughLayer(this.canvas, () => glyphAt(vx, vy));
    if (g) this.destroyGlyph(g, x, y, 260);
  }

  private isDestroyed(g: Glyph) {
    return this.destroyed.get(g.node)?.has(g.index) ?? false;
  }

  /** Knocks one letter off the page: a black hole where it was, the letter as flying rubble. */
  private destroyGlyph(g: Glyph, fromX: number, fromY: number, force: number) {
    if (this.isDestroyed(g)) return;
    let set = this.destroyed.get(g.node);
    if (!set) this.destroyed.set(g.node, (set = new Set()));
    set.add(g.index);
    this.holes.push({ x: g.box.x - 0.5, y: g.box.y - 0.5, w: g.box.w + 1, h: g.box.h + 1 });
    const cx = g.box.x + g.box.w / 2;
    const cy = g.box.y + g.box.h / 2;
    const d = Math.hypot(cx - fromX, cy - fromY) || 1;
    this.addRubble({
      img: this.glyphImage(g),
      x: cx,
      y: cy,
      w: g.box.w,
      h: g.box.h,
      vx: ((cx - fromX) / d) * force + rand(-60, 60),
      vy: -Math.abs(((cy - fromY) / d) * force) - rand(120, 320),
      rot: 0,
      vr: rand(-12, 12),
      rest: false,
      home: g.box,
    });
  }

  private glyphImage(g: Glyph) {
    const key = `${g.font}|${g.color}|${g.char}`;
    let img = this.glyphCache.get(key);
    if (img) return img;
    const dpr = window.devicePixelRatio || 1;
    img = document.createElement("canvas");
    img.width = Math.ceil((g.box.w + 2) * dpr);
    img.height = Math.ceil((g.box.h + 2) * dpr);
    const c = img.getContext("2d")!;
    c.scale(dpr, dpr);
    c.font = g.font;
    c.fillStyle = g.color;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(g.char, (g.box.w + 2) / 2, (g.box.h + 2) / 2 + 1);
    this.glyphCache.set(key, img);
    return img;
  }

  /** A skill tag blows apart letter by letter, and may drop ammo or health. */
  private explodeElement(el: HTMLElement, x: number, y: number) {
    this.broken.add(el);
    for (const node of textNodes(el)) {
      for (let i = 0; i < node.data.length; i++) {
        const g = glyphOf(node, i);
        if (g) this.destroyGlyph(g, x, y + 10, 380);
      }
    }
    const b = docBox(el);
    this.holes.push({ x: b.x - 1, y: b.y - 1, w: b.w + 2, h: b.h + 3 });
    if (Math.random() < 0.45) {
      const options: PickupKind[] = ["clip", "clip", "stimpack"];
      if (this.owned.has("shotgun")) options.push("shells", "shells");
      if (this.owned.has("launcher")) options.push("rocket");
      this.drop(options[Math.floor(Math.random() * options.length)], b.x + b.w / 2, b.y + b.h);
    }
  }

  /** An image box (or a wireframe glyph) shatters into rubble and drops what it was hiding. */
  private shatter(el: HTMLElement) {
    this.broken.add(el);
    const b = docBox(el);
    const snap = document.createElement("canvas");
    const dpr = window.devicePixelRatio || 1;
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
      // a glyph button: rasterize its wireframe in light grey
      c.strokeStyle = "#a1a1aa";
      c.lineWidth = 1.2;
      c.strokeRect(b.w * 0.25, b.h * 0.25, b.w * 0.5, b.h * 0.5);
    }
    c.strokeStyle = "#3f3f46";
    c.strokeRect(0.5, 0.5, b.w - 1, b.h - 1);

    const cols = img ? 5 : 2;
    const rows = img ? 3 : 2;
    const pw = b.w / cols;
    const ph = b.h / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const piece = document.createElement("canvas");
        piece.width = Math.ceil(pw * dpr);
        piece.height = Math.ceil(ph * dpr);
        piece.getContext("2d")!.drawImage(snap, i * pw * dpr, j * ph * dpr, pw * dpr, ph * dpr, 0, 0, pw * dpr, ph * dpr);
        const cx = b.x + (i + 0.5) * pw;
        const cy = b.y + (j + 0.5) * ph;
        this.addRubble({
          img: piece,
          x: cx,
          y: cy,
          w: pw,
          h: ph,
          vx: (cx - (b.x + b.w / 2)) * 2.4 + rand(-80, 80),
          vy: -rand(200, 520) + (cy - (b.y + b.h / 2)),
          rot: 0,
          vr: rand(-4, 4),
          rest: false,
          home: { x: b.x + i * pw, y: b.y + j * ph, w: pw, h: ph },
        });
      }
    }
    this.holes.push({ x: b.x - 1, y: b.y - 1, w: b.w + 2, h: b.h + 2 });
    this.decals = this.decals.filter((d) => d.box !== el);
    this.sfx.play("barexp", 0.5);
    this.onShake(img ? 8 : 3);

    const index = this.boxOrder.indexOf(el);
    const drop = img ? BOX_DROPS[index] ?? "medikit" : "bonus";
    this.drop(drop, b.x + b.w / 2, b.y + b.h / 2);
    this.measure();
  }

  private addRubble(r: Rubble) {
    this.rubble.push(r);
    if (this.rubble.length > MAX_RUBBLE) {
      const i = this.rubble.findIndex((p) => p.rest);
      const [old] = this.rubble.splice(i >= 0 ? i : 0, 1);
      if (old.home) this.parked.push(old);
    }
  }

  private effect(frames: string[], tics: number, x: number, y: number, scale = this.world) {
    this.effects.push({ frames, tics, x, y, t: 0, scale });
  }

  // ---------- monsters ----------

  private monsterSprite(m: Monster) {
    const def = MONSTERS[m.kind];
    if (m.state === "dead") return def.death[Math.min(def.death.length - 1, Math.floor(m.t / (def.deathTics * TIC)))];
    if (m.state === "pain") return def.pain;
    if (m.state === "attack") return def.attack[m.frame].sprite;
    return `${def.prefix}${"ABCD"[Math.floor(m.stride / 14) % 4]}1`;
  }

  private updateSpawners() {
    const top = window.scrollY + window.innerHeight * 0.2;
    const bottom = window.scrollY + window.innerHeight * 0.85;
    this.spawners.forEach((s, i) => {
      if (s.fired) return;
      const floor = this.plats.find((p) => p.el === s.el);
      if (!floor || floor.y < top || floor.y > bottom) return;
      s.fired = true;
      for (let n = 0; n < s.count; n++) {
        // sometimes on an image box just above the line, otherwise on the line itself
        const boxes = this.plats.filter((p) => p.kind === "solid" && p.y < floor.y && p.y > floor.y - 700);
        const host = boxes.length && Math.random() < 0.35 ? boxes[Math.floor(Math.random() * boxes.length)] : floor;
        const margin = 40;
        const kind: MonsterKind = i > 1 && (i + n) % 2 === 0 ? "imp" : "zombie";
        const x = rand(host.x + margin, host.x + host.w - margin);
        this.monsters.push({
          kind,
          x,
          y: host.y,
          dir: Math.random() < 0.5 ? 1 : -1,
          minX: host.x + margin,
          maxX: host.x + host.w - margin,
          host: host.el,
          hp: MONSTERS[kind].hp,
          state: "spawn",
          frame: 0,
          t: 0,
          cooldown: rand(3, 5.5),
          stride: 0,
        });
        this.effect(["TFOGA0", "TFOGB0", "TFOGC0", "TFOGD0", "TFOGE0", "TFOGF0", "TFOGG0", "TFOGH0", "TFOGI0", "TFOGJ0"], 4, x, host.y);
      }
      this.sfx.play("telept", 0.6);
    });
  }

  private updateMonsters(dt: number) {
    const viewTop = window.scrollY;
    const viewBottom = viewTop + window.innerHeight;
    for (const m of this.monsters) {
      m.t += dt;
      const def = MONSTERS[m.kind];
      // stay glued to the platform the monster stands on as the layout settles;
      // if it was shot out from under them, fall to the next one below
      const host = this.plats.find((p) => p.el === m.host);
      if (host) {
        m.y = host.y;
      } else {
        const prev = m.y;
        m.y = Math.min(this.docH, m.y + 500 * dt);
        const land = this.plats.find((p) => p.y >= prev && p.y <= m.y && m.x >= p.x && m.x <= p.x + p.w);
        if (land) {
          m.host = land.el;
          m.y = land.y;
          m.minX = land.x + 40;
          m.maxX = land.x + land.w - 40;
        }
      }

      if (m.state === "spawn") {
        if (m.t > 0.35) {
          m.state = "walk";
          this.sfx.play(def.sight, 0.6);
        }
      } else if (m.state === "walk") {
        m.x += m.dir * def.speed * dt;
        m.stride += def.speed * dt;
        if (m.x < m.minX || m.x > m.maxX) {
          m.dir = m.x < m.minX ? 1 : -1;
          m.x = Math.max(m.minX, Math.min(m.maxX, m.x));
        }
        const onScreen = m.y > viewTop + this.headerBottom && m.y - 60 < viewBottom;
        if ((m.cooldown -= dt) <= 0 && onScreen && this.clock > GRACE && !this.dead && !this.done) {
          m.state = "attack";
          m.frame = 0;
          m.t = 0;
        }
      } else if (m.state === "attack") {
        const f = def.attack[m.frame];
        if (m.t >= f.tics * TIC) {
          m.t = 0;
          m.frame++;
          if (m.frame >= def.attack.length) {
            m.state = "walk";
            m.cooldown = rand(3, 6);
          } else if (def.attack[m.frame].fire) {
            this.monsterAttack(m);
          }
        }
      } else if (m.state === "pain") {
        if (m.t > 0.18) {
          m.state = "walk";
          m.t = 0;
        }
      }
    }
  }

  private monsterAttack(m: Monster) {
    if (m.kind === "imp") {
      const b = this.monsterBox(m);
      this.fireballs.push({ x: m.x, y: b.y + b.h * 0.35, scale: 1, t: 0 });
      this.sfx.play("firsht", 0.6);
    } else {
      this.sfx.play("pistol", 0.5);
      if (Math.random() < ZOMBIE_ACCURACY) this.hurt(3 * (1 + Math.floor(Math.random() * 3)));
    }
  }

  private damageMonster(m: Monster, damage: number) {
    const def = MONSTERS[m.kind];
    m.hp -= damage;
    if (m.hp <= 0) {
      m.state = "dead";
      m.t = 0;
      this.stats.kills++;
      this.sfx.play(def.die, 0.7);
      if (m.kind === "zombie") this.drop("clip", m.x, m.y);
    } else if (Math.random() < def.painChance) {
      m.state = "pain";
      m.t = 0;
      this.sfx.play("popain", 0.5);
    }
  }

  // ---------- projectiles ----------

  private updateMissiles(dt: number) {
    for (const r of this.missiles) {
      const dx = r.tx - r.x;
      const dy = r.ty - r.y;
      const d = Math.hypot(dx, dy);
      const step = 1300 * dt;
      r.scale = Math.max(0.7, r.scale - dt * 2);
      const hit = this.monsters.find((m) => m.state !== "dead" && m.state !== "spawn" && inBox(this.monsterBox(m), r.x, r.y));
      if (d <= step || hit) {
        this.explode(hit ? r.x : r.tx, hit ? r.y : r.ty);
        r.scale = 0;
      } else {
        r.x += (dx / d) * step;
        r.y += (dy / d) * step;
      }
    }
    this.missiles = this.missiles.filter((r) => r.scale > 0);
  }

  /** Rocket blast: hurts monsters, knocks every letter in range off the page, cracks boxes. */
  private explode(x: number, y: number) {
    const radius = 110;
    this.effect(["MISLB0", "MISLC0", "MISLD0"], 6, x, y + 20, this.world * 1.4);
    this.sfx.play("barexp", 0.8);
    this.onShake(10);
    for (const m of this.monsters) {
      if (m.state === "dead" || m.state === "spawn") continue;
      const d = Math.hypot(m.x - x, m.y - 30 - y);
      if (d < radius * 1.3) this.damageMonster(m, Math.round(140 * (1 - d / (radius * 1.3))));
    }
    for (const g of glyphsInCircle(x, y, radius, 260)) this.destroyGlyph(g, x, y, 700);
    const vx = x - window.scrollX;
    const vy = y - window.scrollY;
    for (const el of document.querySelectorAll<HTMLElement>('[data-game="skill"], [data-game="solid"], [data-game="bump"]')) {
      if (this.broken.has(el)) continue;
      const r = el.getBoundingClientRect();
      const nx = Math.max(r.left, Math.min(vx, r.right));
      const ny = Math.max(r.top, Math.min(vy, r.bottom));
      if (Math.hypot(nx - vx, ny - vy) > radius) continue;
      if (el.dataset.game === "skill") this.explodeElement(el, x, y);
      else {
        const hp = (this.boxes.get(el) ?? (el.dataset.game === "solid" ? 7 : 3)) - 4;
        this.boxes.set(el, hp);
        if (hp <= 0) this.shatter(el);
      }
    }
  }

  private updateFireballs(dt: number) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (const f of this.fireballs) {
      f.t += dt;
      // fly out of the page toward the viewer: the bottom centre of the screen, growing as it comes
      const tx = vw / 2 + window.scrollX;
      const ty = vh - 32 * this.hud - 20 + window.scrollY;
      const dx = tx - f.x;
      const dy = ty - f.y;
      const d = Math.hypot(dx, dy);
      const step = FIREBALL_SPEED * dt;
      f.scale = Math.min(3.2, f.scale + dt * 1.2);
      if (d <= step) {
        this.explodeFireball(f, true);
      } else {
        f.x += (dx / d) * step;
        f.y += (dy / d) * step;
      }
    }
    this.fireballs = this.fireballs.filter((f) => f.t >= 0);
  }

  private explodeFireball(f: Fireball, hitPlayer: boolean) {
    this.effect(["BAL1C0", "BAL1D0", "BAL1E0"], 6, f.x, f.y + 10 * f.scale, this.world * f.scale);
    this.sfx.play("firxpl", 0.6);
    if (hitPlayer) this.hurt(3 * (1 + Math.floor(Math.random() * 5)));
    f.t = -1;
  }

  private hurt(damage: number) {
    if (this.dead || this.done || this.god) return;
    if (this.armor > 0) {
      const saved = Math.min(this.armor, Math.floor(damage / 3));
      this.armor -= saved;
      damage -= saved;
    }
    this.health = Math.max(0, this.health - damage);
    this.redFlash = Math.min(0.8, this.redFlash + damage / 40);
    this.face.sprite = `STFOUCH${this.painTier()}`;
    this.face.t = 0.6;
    this.onShake(Math.min(12, damage / 2));
    if (this.health <= 0) {
      this.dead = true;
      this.sfx.play("pldeth");
      this.message("You died. Press R to restart.");
      this.endTimer = window.setTimeout(() => this.finish("dead"), 1800);
    } else {
      this.sfx.play("plpain", 0.7);
    }
  }

  // ---------- items ----------

  private drop(kind: PickupKind, x: number, y: number) {
    this.pickups.push({ kind, x, y, vy: -160, taken: false });
    this.stats.totalItems++;
  }

  private updatePickups(dt: number) {
    const mx = this.mouse.x + window.scrollX;
    const my = this.mouse.y + window.scrollY;
    for (const p of this.pickups) {
      // fall to the next line or box below
      const prev = p.y;
      p.vy = Math.min(900, p.vy + GRAVITY * dt);
      p.y += p.vy * dt;
      const land = this.plats.find((pl) => prev <= pl.y && p.y >= pl.y && p.x >= pl.x && p.x <= pl.x + pl.w);
      if (land && p.vy > 0) {
        p.y = land.y;
        p.vy = 0;
      }
      p.y = Math.min(p.y, this.docH);

      // collect by pointing the crosshair at it
      const s = spriteSize(this.atlas, PICKUPS[p.kind].sprite);
      const box = { x: p.x - s.left * this.world - 14, y: p.y - s.top * this.world - 14, w: s.w * this.world + 28, h: s.h * this.world + 28 };
      if (this.mouse.inside && !this.dead && inBox(box, mx, my)) this.collect(p);
    }
    this.pickups = this.pickups.filter((p) => !p.taken);
  }

  private collect(p: Pickup) {
    const weapon = p.kind === "shotgun" || p.kind === "chaingun" || p.kind === "launcher";
    switch (p.kind) {
      case "clip":
        this.give("bullets", 10);
        break;
      case "shells":
        this.give("shells", 4);
        break;
      case "rocket":
        this.give("rockets", 1);
        break;
      case "stimpack":
        this.health = Math.min(100, this.health + 10);
        break;
      case "medikit":
        this.health = Math.min(100, this.health + 25);
        break;
      case "armor":
        this.armor = Math.max(this.armor, 100);
        break;
      case "bonus":
        this.armor = Math.min(200, this.armor + 5);
        break;
      case "shotgun":
        this.give("shells", 8);
        break;
      case "chaingun":
        this.give("bullets", 20);
        break;
      case "launcher":
        this.give("rockets", 2);
        break;
    }
    if (weapon) {
      const id = p.kind as WeaponId;
      this.owned.add(id);
      this.select(id);
      this.face.sprite = `STFEVL${this.painTier()}`;
      this.face.t = 1.2;
    }
    this.message(PICKUPS[p.kind].message);
    this.sfx.play(weapon ? "wpnup" : "itemup", 0.7);
    this.bonusFlash = 0.3;
    this.stats.items++;
    p.taken = true;
  }

  private give(ammo: AmmoId, n: number) {
    this.ammo[ammo] = Math.min(MAX_AMMO[ammo], this.ammo[ammo] + n);
  }

  // ---------- rubble ----------

  private updateRubble(dt: number) {
    for (const r of this.rubble) {
      if (r.rest) continue;
      const prevBottom = r.y + r.h / 2;
      r.vy = Math.min(1400, r.vy + GRAVITY * dt);
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.rot += r.vr * dt;
      if (r.vy <= 0) continue;
      const bottom = r.y + r.h / 2;
      const land = this.plats.find((p) => prevBottom <= p.y + 1 && bottom >= p.y && r.x >= p.x && r.x <= p.x + p.w);
      const floorY = land ? land.y : bottom >= this.docH ? this.docH : null;
      if (floorY === null) continue;
      r.y = floorY - r.h / 2;
      if (r.vy < 140) {
        r.rest = true;
        r.vy = 0;
      } else {
        r.vy *= -0.25;
        r.vx *= 0.55;
        r.vr *= 0.5;
      }
    }
  }

  // ---------- HUD ----------

  private painTier() {
    return Math.min(4, Math.floor(((100 - Math.min(100, this.health)) * 5) / 101));
  }

  private updateFace(dt: number) {
    if (this.face.t > 0) {
      this.face.t -= dt;
      return;
    }
    if ((this.face.lookT -= dt) <= 0) {
      this.face.look = Math.floor(Math.random() * 3);
      this.face.lookT = rand(0.8, 2);
    }
    this.face.sprite = this.dead
      ? "STFDEAD0"
      : this.god
        ? "STFGOD0"
        : `STFST${this.painTier()}${this.face.look}`;
  }

  private message(text: string) {
    this.messages = [{ text: text.toUpperCase(), t: 0 }];
  }

  // ---------- rendering ----------

  private render() {
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const k = this.world;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    ctx.imageSmoothingEnabled = false;

    // world layer, in document coordinates, clipped below the sticky header
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.headerBottom, vw, vh - this.headerBottom);
    ctx.clip();
    ctx.translate(-window.scrollX, -window.scrollY);
    const top = window.scrollY - 200;
    const bottom = window.scrollY + vh + 200;

    ctx.fillStyle = "#000";
    for (const h of this.holes) if (h.y + h.h > top && h.y < bottom) ctx.fillRect(h.x, h.y, h.w, h.h);

    // bullet holes in image boxes (they fade out during the rewind)
    ctx.globalAlpha = this.homecoming.fade;
    for (const d of this.decals) {
      if (d.y < top || d.y > bottom) continue;
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.beginPath();
      ctx.arc(d.x, d.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 4.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (this.leaving) {
      // on the way out only the page is left, knitting itself back together
      this.homecoming.draw(ctx);
      ctx.restore();
      return;
    }

    for (const r of this.rubble) {
      if (r.y < top || r.y > bottom) continue;
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      ctx.drawImage(r.img, -r.w / 2, -r.h / 2, r.w, r.h);
      ctx.restore();
    }

    const bonus = Math.floor(this.clock * 6) % 4;
    for (const p of this.pickups) {
      const sprite = p.kind === "bonus" ? `BON1${"ABCD"[bonus]}0` : PICKUPS[p.kind].sprite;
      drawSprite(ctx, this.atlas, sprite, p.x, p.y, k);
    }

    for (const m of this.monsters) {
      if (m.state === "spawn" && m.t < 0.2) continue;
      drawSprite(ctx, this.atlas, this.monsterSprite(m), m.x, m.y, k, m.state === "walk" && m.dir < 0);
    }

    for (const f of this.fireballs) {
      drawSprite(ctx, this.atlas, `BAL1${Math.floor(this.clock * 12) % 2 ? "B" : "A"}0`, f.x, f.y, k * f.scale);
    }
    for (const r of this.missiles) drawSprite(ctx, this.atlas, "MISLA1", r.x, r.y, k * r.scale);
    for (const e of this.effects) {
      const i = Math.min(e.frames.length - 1, Math.floor(e.t / (e.tics * TIC)));
      drawSprite(ctx, this.atlas, e.frames[i], e.x, e.y, e.scale);
    }
    ctx.restore();

    // screen flashes: red when hurt, gold on pickups, dark red when dead
    if (this.redFlash > 0 || this.dead) {
      ctx.fillStyle = `rgba(200,0,0,${this.dead ? 0.35 : this.redFlash * 0.5})`;
      ctx.fillRect(0, 0, vw, vh);
    }
    if (this.bonusFlash > 0) {
      ctx.fillStyle = `rgba(215,186,69,${this.bonusFlash * 0.25})`;
      ctx.fillRect(0, 0, vw, vh);
    }

    this.drawWeapon(vw, vh);
    this.drawStatusBar(vw, vh);
    this.drawMessages();
  }

  private drawWeapon(vw: number, vh: number) {
    const { ctx } = this;
    const s = this.hud;
    // DOOM's 320×168 view sits above the status bar; the gun drifts a little toward the crosshair
    const viewX = (vw - 320 * s) / 2 + (this.mouse.x - vw / 2) * 0.08;
    const viewBottom = vh - 32 * s;
    const viewY = viewBottom - 168 * s;
    const ready = this.frame < 0;
    const sx = 1 + (ready ? this.bob * Math.cos(this.bobAngle) : 0);
    const sy = this.weaponY + (ready ? Math.abs(this.bob * Math.sin(this.bobAngle)) : 0);
    const def = WEAPONS[this.weapon];
    const sprite = this.frame < 0 ? def.ready : def.frames[this.frame].sprite;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, vw, viewBottom);
    ctx.clip();
    const at = (name: string) => {
      const m = this.atlas.sprites[name];
      if (!m) return;
      const [ax, ay, w, h, left, top] = m;
      ctx.drawImage(this.atlas.image, ax, ay, w, h, viewX + (sx - left) * s, viewY + (sy - top - 16) * s, w * s, h * s);
    };
    at(sprite);
    if (this.flash.length && !this.dead) at(this.flash[0].sprite);
    ctx.restore();
  }

  private drawStatusBar(vw: number, vh: number) {
    const { ctx } = this;
    const s = this.hud;
    const x0 = Math.round((vw - 320 * s) / 2);
    const y0 = vh - 32 * s;
    const patch = (name: string, x: number, y: number) => drawSprite(ctx, this.atlas, name, x0 + x * s, y0 + y * s, s);
    // DOOM draws numbers right-aligned to x
    const num = (value: number, right: number, y: number, font: string, digitW: number) => {
      let x = right;
      const text = String(Math.max(0, Math.floor(value)));
      for (let i = text.length - 1; i >= 0; i--) {
        x -= digitW;
        patch(`${font}${text[i]}`, x, y);
      }
    };

    patch("STBAR", 0, 0);
    patch("STARMS", 104, 0);
    num(this.ammo[WEAPONS[this.weapon].ammo], 44, 3, "STTNUM", 14);
    num(this.health, 90, 3, "STTNUM", 14);
    patch("STTPRCNT", 90, 3);
    num(this.armor, 221, 3, "STTNUM", 14);
    patch("STTPRCNT", 221, 3);
    ORDER.forEach((w, i) => {
      const slot = WEAPONS[w].slot;
      const font = this.owned.has(w) ? "STYSNUM" : "STGNUM";
      patch(`${font}${slot}`, 111 + ((slot - 2) % 3) * 12, 4 + Math.floor((slot - 2) / 3) * 10);
    });
    patch(this.face.sprite, 143, 0);
    // ammo table: current / max for bullets, shells, rockets
    num(this.ammo.bullets, 288, 5, "STYSNUM", 4);
    num(MAX_AMMO.bullets, 314, 5, "STYSNUM", 4);
    num(this.ammo.shells, 288, 11, "STYSNUM", 4);
    num(MAX_AMMO.shells, 314, 11, "STYSNUM", 4);
    num(this.ammo.rockets, 288, 17, "STYSNUM", 4);
    num(MAX_AMMO.rockets, 314, 17, "STYSNUM", 4);
  }

  private drawMessages() {
    const { ctx } = this;
    const s = this.hud;
    const msg = this.messages[0];
    if (!msg) return;
    let x = 12;
    const y = this.headerBottom + 12;
    for (const ch of msg.text) {
      const code = ch.charCodeAt(0);
      if (code < 33 || code > 95) {
        x += 4 * s;
        continue;
      }
      const name = `STCFN${String(code).padStart(3, "0")}`;
      drawSprite(ctx, this.atlas, name, x, y, s);
      x += (spriteSize(this.atlas, name).w + 1) * s;
    }
  }
}
