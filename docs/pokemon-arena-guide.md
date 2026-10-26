# Building Pokémon Arena: a guide for models

This guide explains how Pokémon Arena was built, from A to Z. It is written for other language models (and the people driving them) who want to build something similar: a live, top-down battle drawn over a real web page, where the page itself gets wrecked and every move, and especially every finale, feels big.

Read it in order the first time. Sections 6 to 9 are the part people usually mean by "how do you make the animations look like that"; they are the core of it. Everything else is the plumbing those animations stand on.

The code lives in `components/pokemon/` (about 10,000 lines). Page damage is shared with the other fighting modes in `components/streetfighter/wreck.ts`.

---

## 1. What it is, and the rules it never breaks

The portfolio has a terminal; typing `pokemon` opens the arena. The camera looks straight down on the live page, and two Pokémon fight on top of it, 1 v 1 or 3 v 3, you against a CPU or two CPUs. Every move lands on the page: letters are knocked off, burned, frozen, washed away, cratered. On exit, every piece of the page flies home.

These constraints shaped everything:

1. **Never touch the DOM.** The page is never modified. A canvas covers the viewport (`position: fixed`, `z-index` 46, `pointer-events: none`), and all damage is drawn on that canvas: a letter "knocked off" is a picture of that letter, moved, with a patch drawn over its home. This makes the rewind possible and keeps the real site safe.
2. **Everything rewinds.** Every change records where it came from. Exit plays it backwards.
3. **Pixel-honest.** The sprites are pixel art, so every effect is drawn on the same pixel grid: no anti-aliasing, no blur, no gradients. Section 6 explains how this works.
4. **Fixed timestep.** The game runs at exactly 60 steps per second regardless of frame rate. Every timing in the code is in seconds of game time, which makes behaviour reproducible and testable with a fake clock.
5. **Load only what's needed.** Sprites for a Pokémon are fetched the first time it's picked.

---

## 2. Files and architecture

| File | What it holds |
|---|---|
| `PokemonMode.tsx` | The React shell: loads sprites, lays the canvas over the page, pick screens (1 v 1 / 3 v 3, you vs CPU / CPU vs CPU), keyboard and touch input, the end screen. No game logic. |
| `game.ts` | `BattleGame`: the whole battle. State, the fixed-step loop, every move, collisions, finales, the CPU, all rendering. |
| `moves.ts` | Data only: each Pokémon's moves (`name`, `short`, `kind`, `power`, `cooldown`) for its normal and Mega form, base stats, types, the type chart, Mega names. |
| `sprites.ts` | Loads sprite sheets and their `anims.json`, picks frames, draws a Pokémon facing one of 8 directions, makes tinted silhouettes. |
| `pixels.ts` | `PixelLayer` (the low-res effect canvas) and the colour palettes. |
| `sound.ts` | Every sound, synthesized with WebAudio. No audio files. |
| `../streetfighter/wreck.ts` | `PageWreck`: everything that happens to the page, and the rewind. |
| `public/pokemon/<form>/` | One folder per form (`charizard`, `charizard-mega`, …): sheets, `anims.json`, `portrait.png`. Credits in `SOURCES.txt`. |

`BattleGame` is one big class on purpose. Moves need to reach into everything (the foe, the page, particles, sound, the screen), and passing that around between many small modules costs more than it saves. Inside, it is organized into clearly commented sections: setup, loop, fighters, moves, streams, casts, collisions, finales, Mega Evolution, each special Pokémon, the CPU, rendering.

The shell talks to the game through a small surface: `start(team, foes, watch)`, `key(code, down)`, `press(slot)`, `exit(done)`, and callbacks `onEnd`, `onMega`, `onSwitch`.

---

## 3. Sprites

### Source

All sprites come from **PMD SpriteCollab** (github.com/PMDCollab/SpriteCollab), the community archive of Pokémon Mystery Dungeon sprites. They're ideal:

- Top-down three-quarter view, which matches a camera looking down on the page.
- 8 directions per animation.
- Many animations per Pokémon (`Idle`, `Walk`, `Attack`, `Shoot`, `Charge`, `Hurt`, `Sleep`, `Swing`, `Rotate`, `Hop`, and often more, such as `Emit` or `Swell`).
- Alternate forms (Mega, Primal) live under form numbers, e.g. `0006/0001` is Mega Charizard.
- Each form has an `AnimData.xml` giving frame size and per-frame durations.

Ask before downloading anything, keep the credits file up to date, and note the licences (some sheets are CC BY-NC).

### Converting

A small script turns a SpriteCollab folder into what the game loads: a PNG per animation and one `anims.json`.

```python
# pmd.py <src> <dst> <name>
root = ET.parse(os.path.join(src, "AnimData.xml")).getroot()
for n, a in raw.items():
    if a.find("CopyOf") is not None: continue
    w, h = int(a.findtext("FrameWidth")), int(a.findtext("FrameHeight"))
    im = Image.open(os.path.join(src, f"{n}-Anim.png"))
    d = {"w": w, "h": h, "dirs": im.height // h,
         "durations": [int(x.text) for x in a.find("Durations")]}
    for k in ("HitFrame", "RushFrame", "ReturnFrame"):      # the frame where the blow lands, etc.
        if a.findtext(k) is not None: d[k[0].lower() + k[1:]] = int(a.findtext(k))
    anims[n] = d
# CopyOf animations reuse another's entry
```

Facts you must get right:

- **Directions** are the rows of a sheet, in this order: down, down-right, right, up-right, up, up-left, left, down-left. `dirOf(dx, dy)` maps a vector to a row.
- **Durations** are in 1/60 s ticks. `frameAt(anim, t, loop)` turns seconds into a frame index.
- **The feet anchor.** Frames have empty margins, so the game computes, from the `Idle` frame's alpha, how far below the frame centre the feet are. Every Pokémon is drawn so its feet sit exactly on its `(x, y)`. Without this, sprites float or sink.
- **Size normalization.** Legendaries have huge frames. `scaleOf(Idle)` returns `42 / bodySize` for anything larger than 40 px, so a Groudon doesn't fill the screen.
- **Missing animations.** Not every form has every sheet. Look up animations through a `Proxy` that falls back to `Idle`, so a missing sheet never crashes a frame.

### When a form doesn't exist

Mega Blastoise had no usable sheet, so `scripts/mega-blastoise.py` paints the Mega's shell cannon onto the normal Blastoise sheets, frame by frame and direction by direction, anchored to the shell. If you do this, render a contact sheet of every direction and check it with your own eyes: the first attempt drew the cannon floating above the head.

### Loading

The four original Pokémon load with the arena. Legendaries (heavier sheets) load the first time they're picked: `need(species)` caches one promise per species, and `play()` awaits every species in both teams before `start()`.

---

## 4. The game loop and state

```ts
private frame = (now: number) => {
  const dt = Math.max(0, Math.min(0.1, (now - this.last) / 1000));
  this.last = now;
  this.acc += dt;
  while (this.acc >= TICK) {     // TICK = 1/60
    this.acc -= TICK;
    this.step(TICK);
  }
  this.render();
  this.raf = requestAnimationFrame(this.frame);
};
```

`step` updates, in order: the page wreck, balls, fighters, body collisions, shots, move-on-move collisions, bursts, zones, waves, the finale, the legendaries' systems (weather, skyfalls, spikes), particles, and short-lived things (bolts, geysers, swipes, flashes). **Hitstop** is a frame counter (`this.freeze`) that skips steps after a big hit; it is the cheapest way to make a blow feel heavy.

### Each fighter is a state machine

A `Fighter` has a `state` and a timer `t` that resets on every state change. States include `free`, `melee`, `stream`, `cast`, `fly`, `dive`, `spin`, `stomp`, `charge`, `dash`, `buff`, `psy`, `blink`, `zen`, `legend`, `ult`, `evolve`, `dodge`, `hurt`, `faint`, `recall`, `gone`.

A move is a script over `f.t`:

```ts
case "ORIGIN PULSE":
  if (at(0.22)) {                       // once, 0.22 s in
    for (let i = -2; i <= 2; i++) this.shots.push(this.makeShot(f, "laser", 540, 0.7, f.aimAngle + i * 0.22));
    this.sound.iceBeam(0.4);
    this.onShake(5);
  }
  done = f.t >= 0.55;
  break;
```

`at(t)` fires once using an `f.fired` flag. Lunges, beams, sky strikes, spikes and buffs are shared templates (`lunge()`, `legendBeam()`, `rain()`, `spikeLine()`), so a new move is usually a few lines choosing a template, timing, look and page damage.

**The lesson behind the beam bug:** any flag that drawing depends on (`f.beam`, a held target, a tint) must be cleared however the move ends, not only on its normal ending. Moves end early when the user is hit, when a Burst starts, or when it faints. Either clear flags centrally each step (`if (f.state !== "legend") f.beam = null`), or have the draw code check the state too. Do both.

### The CPU

A CPU fighter thinks every so often (`ai.think`). It chases or keeps a preferred range per Pokémon, strafes, dodges what's coming, and picks moves by range, cooldown, type effectiveness and a little randomness. Each Pokémon (and Mega) has its own `cpu…Move` picker so it plays to its kit. In CPU-vs-CPU mode both sides are CPUs: the same code, and the best way to test.

---

## 5. The combat model

- **Damage:** `power × mult × DAMAGE × effectiveness × rand(0.85, 1) × crit`, then modifiers: weather, Mega ×1.15, boosts, guards. `DAMAGE` is a single global knob for fight length.
- **Types:** a chart in `moves.ts`. Bursts cap effectiveness at 1.5×, so a type matchup can't turn a finale into an instant KO.
- **The Burst meter** fills from damage dealt (×1.3) and taken (×0.9). A full meter unlocks the Pokémon's finale.
- **Mega Evolution / Primal Reversion:** press E below 40% HP, once per Pokémon. It swaps in a new sprite set and a new moveset on the same keys, and a new Burst.
- **Weather:** Groudon brings sun, Kyogre rain, and their Primal forms the extreme versions, which cancel the opposing type outright. Rayquaza's Air Lock suppresses all weather while it's out.
- **Statuses:** burn, poison, paralysis, sleep, freeze, plus confusion, curse, being held, and regeneration.
- **Balance rule for finales:** a finale's hits are fractions of its power, and **the fractions add up to about 1.0** (e.g. 4 × 0.12 + 0.5). That keeps every finale equally strong however many beats it has. Mewtwo's first finales broke this rule and one-shot everything; capping the Burst's effectiveness and re-summing the fractions fixed it.
- **3 v 3:** a team is an ordered list. When a Pokémon faints, its trainer recalls it and the next one comes out where its side starts (`sendNext`). The team's stats carry over; each Pokémon gets its own Mega. Party balls under the HUD show who's left.

---

## 6. Rendering: draw everything on the pixel grid

This is the most important visual decision. The Pokémon are pixel art scaled up by `k` (screen px per sprite px). If effects are drawn with smooth vector shapes, glows and alpha gradients on top of that, it looks like two different games. So:

**Effects are drawn into a tiny canvas** whose pixels are the sprites' pixels (`p = round(k)` screen px each), then scaled up with smoothing off. That's `PixelLayer`:

```ts
g.begin(vw, vh, p, scrollX, scrollY);   // clear; one layer pixel = p screen px
g.disc(x, y, r, colour, sy)             // filled ellipse (sy squashes it for perspective)
g.ring(x, y, r, colour, sy, thick, gaps, seed)   // ring; gaps breaks it into dashes
g.line(x0, y0, x1, y1, colour, width)   // width in layer pixels
g.dot(x, y, colour, size)
g.dither(x, y, w, h, colour, phase)     // checkerboard fill
g.ditherDisc(x, y, r, colour, sy, phase)
g.rect(...)
g.alpha = 0.5                           // used sparingly
g.blit(ctx)                             // scale up onto the main canvas, no smoothing
```

All helpers take **document coordinates**, so effects stick to the page as it scrolls.

The rules that make it look like pixel art:

1. **Palettes, not gradients.** Each element is a ramp of 4–6 colours, brightest first: `FIRE`, `WATER`, `ICE`, `GHOST`, `DRAGON`, `EARTH`, `MAGMA`, `JADE`, `HYPER`, `SOLAR`, `ZEN`, … Shading means stepping along the ramp.
2. **Dithering, not transparency.** Translucent water, shadow or mist is a checkerboard of one colour (`ditherDisc`). Alternate `phase` by frame to make it shimmer.
3. **Layer from dark and wide to bright and thin.** Almost every bright effect is the same shape drawn 3–5 times, each narrower and lighter. A beam: dark rim, mid, light, white core. A rock shard: light half and dark half (lit from the left). This one trick does most of the work.
4. **Flicker with `hash()`, never `Math.random()` in draw code.** `hash(i + Math.floor(t * 20))` gives a pattern that holds still for 1/20 s and then changes, so sparkles and jitter look deliberate, not noisy. Draw code must be a pure function of state and time.
5. **Thin perspective.** A circle on the ground is squashed (`sy` 0.6–0.8). Heights subtract from y (`y - z`).

### Layer order (per frame)

1. The wrecked page (`wreck.draw`).
2. The **ground** pixel layer: puddles, zones, cracks, sigils, the maelstrom, skyfall shadows, anything lying on the page.
3. A full-screen **tint** while a finale runs (fire red, deep blue, psychic violet…). Then special underlays such as Primal Kyogre's giant shadow.
4. **Fighters**, sorted by y so the nearer one is drawn in front, with afterimage trails.
5. The **air** pixel layer: particles, shots, beams, bursts, sky strikes, auras, the finales' overlays.
6. Screen flash, weather tint and label, HUD, message box, cut-in banner.

Putting a thing in the right layer matters as much as how it's drawn: a whirlpool is ground, a breach of water is air.

---

## 7. The page: damage and the rewind

`PageWreck` (shared with the side-on fighting modes, here in `topDown` mode) knows where every text node, letter, skill tag and image sits. Its verbs, in document coordinates:

| Call | What happens |
|---|---|
| `knock(x, y, r, fromX, fromY, force, limit)` | Letters in the circle fly off away from `from` as rubble |
| `blast(x, y, r, power, fromX, fromY, limit)` | Heavier: breaks solid boxes and images too |
| `wash(x, y, r, dirX, dirY, power, limit)` | Letters slide along a direction (water) |
| `ignite(x, y, r, limit)` | Letters burn to embers |
| `freeze(x, y, r, limit)` / `shatterFrozen` | Frost over; the next hit shatters |
| `dissolve(x, y, r, limit)` | Letters melt away |
| `crater(x, y, r)` | A scorched dent drawn on the page |
| `scuff(...)` | Rubble kicked by a fighter walking through it |

Rules of thumb:

- **Call wreck functions on a timer** (`wreckT -= dt; if (wreckT <= 0) { wreckT = 0.04; … }`), not every step. It's cheaper, and the bursts read better.
- **Damage follows the visual.** If a ring sweeps out, damage a ring at the same radius. If a beam extends, damage along it. If water rises, wash at the water's edge. The page is the canvas the move is "painted" on, so moves should leave their own signature on it: fire burns, ice frosts, water washes, rock craters, psychic force lifts and throws.
- **Full-page finales** sweep a radius from `0` to `farthest(x, y)` (the distance to the furthest corner of the screen) over ~0.5–0.7 s.
- **The real page's colour** can be shifted with a CSS filter on the page root for the most extreme finales (Shattered Psyche's hue rotation, Gengar's inversion). Always clear it on exit and on KO.

---

## 8. How to make a move look good

Every good move here is built from the same five beats. When one feels weak, one of these is usually missing.

1. **Anticipation.** A wind-up before the release: power gathering at the mouth (an orb that grows, lines converging into it), a ring tightening round the body, a glowing warning on the ground where something will land. Even 0.1–0.3 s makes the release land harder. Show the player where danger is coming (skyfall shadows grow before the meteor arrives; Earth Power's ground cracks and glows first).
2. **Release.** The sprite plays the right animation (`Shoot` held on its hit frame for a beam, `Attack` for a lunge, `Charge`/`Emit`/`Swell` for a cast). Add a sound, a little shake, and a flash at the source.
3. **Travel.** The effect has a body and texture, not just a shape: pulses running down a beam, sparkles off its edges, a trail behind a projectile, a cloak of colour streaming off a lunging body, speed lines, afterimages.
4. **Impact.** Hitstop, a flash, a starburst of lines, particles thrown outward, screen shake scaled to the hit, page damage, a sound, and a message ("It's super effective!").
5. **Aftermath.** Something lingers and fades: embers, dust settling, a crater, a ring expanding and thinning, steam.

### Patterns you can reuse (all in `game.ts`)

- **Beam:** five layered lines (glow at alpha 0.45, dark, mid, light, white core) plus four bright discs travelling along it (`q = (t * 3 + i / 4) % 1`), `hash`-placed sparkles either side, a muzzle disc, and an impact starburst of 10 short lines. While charging, a growing orb with lines converging on it. Particles of its element are spawned along the beam and sprayed at the end.
- **Lunge cloak:** behind the body, 8 dithered discs shrinking along `-velocity`, each wiggling sideways with `sin(t * 40 + i)`, stepping through the move's palette; a bow shock of dots in an arc ahead; 7 speed lines; the sprite's own afterimages (`trail`, tinted).
- **Crescent slash:** an arc drawn as segments that are thickest in the middle (`sin(i / n · π)`), three times, each a little smaller and fainter: two afterimages and the blade.
- **Rock shards:** stacked horizontal lines narrowing to a tip, the left half in a light colour and the right half dark; a smaller shard or two beside it; a crack ring at the base. Spawn rock particles as it erupts. Glowing magma lines in the cracks make Precipice Blades.
- **Honeycomb shield:** a hex grid clipped to a circle, each cell outlined, with a highlight band sweeping across.
- **Runes:** a ring with gaps and a turning hexagram (two triangles), squashed for perspective, fading in before the strike lands.
- **Spiral / maelstrom:** a logarithmic spiral, `a = arm/N·2π + log(r) · 1.7 − spin`, drawn as connected line segments over a dithered deep-water disc, with `spin` accelerating over time.
- **Cracks and fissures:** random-walk polylines from a centre outward, each segment drawn dark-wide then bright-thin, with flicker.
- **Shattering glass:** spokes from the screen centre and rings between them, the points jittered with `hash`. To shatter, push every point outward in proportion to its radius and add gravity.
- **A giant silhouette:** draw the Pokémon's own sprite five times its size, fully tinted to near-black at high alpha, with a coloured copy slightly larger behind it as a rim light. It reads instantly as "something enormous under the surface".

### Particles

One array, one struct (`kind, x, y, z, vx, vy, vz, life, r`). Kinds are `flame`, `spark`, `drop`, `foam`, `smoke`, `rock`, `ice`, `wisp`, `bubble`, `zap`, `steam`, `psy`. Give them height (`z`, `vz` with gravity) so drops arc up and fall back, and draw them with the same palettes. Spawn generously at impacts (20–80) and sparingly every frame (1–3).

---

## 9. Finales (Bursts): making the last move feel like the last move

The bar the user set: a final attack must cover the whole screen, shake it, and do something nobody expects. Here is the recipe that met it.

### Structure

1. **Cut-in (0.95 s).** The battle freezes. A slanted banner sweeps across with speed lines, the Pokémon's portrait blown up in pixels, and the move's name.
2. **The finale (2.2–3.4 s)** is a script over `fin.t` in beats, like a short film:
   - **Setup (0–0.5 s):** change the world. Tint the screen, change the weather, draw a sigil, take the user off-screen.
   - **Build (0.5–1.7 s):** something grows or closes in, and the foe gets caught. Hit it several times for small fractions.
   - **Climax (~1.7–2.6 s):** one enormous moment. A breach, an eruption, a crash. Flash the screen, shake hard, crater the page, deal the biggest fraction.
   - **Aftermath (to the end):** the effect sweeps the whole screen, damaging the entire visible page, then fades.
3. **Escape.** If the foe isn't reachable at the moment it should be caught (underground, invulnerable, outside the area), say so ("…escaped the sigil!") and skip its hits. Finales are spectacular, not unavoidable.

Use `fin.x`, `fin.y`, `fin.hit`, `fin.hits`, `fin.next`, `fin.sweep`, `fin.wreckT` and `fin.hands` (a list of points) as the script's memory. Drawing reads the same fields, so the update and the drawing never disagree.

### Make each finale a different idea

The fastest way to make finales feel samey is to reuse one shape (a flood, a ring). Each one here is built on its own image:

| Burst | Idea | Beats |
|---|---|---|
| Hurricane (Rayquaza) | A tornado crosses the page | Funnel chases the foe; caught and spun (4 small hits); thrown out |
| Delta Stream (Mega Rayquaza) | A ribbon of wind draws across the whole screen | Rayquaza leaves the screen; a jade ribbon traces a Lissajous curve, shredding the page; it dives out of the sky; the page is blown away |
| Eruption (Groudon) | The ground splits open | Glowing cracks race to every edge; volcanic bombs rain everywhere, three aimed at the foe; scales with Groudon's HP |
| Tectonic Rage (Primal Groudon) | An Ω burned into the page | The Ω is drawn stroke by stroke around the foe; inside it caves in to magma; three rings of rock blades close in; the sigil erupts in a magma pillar that throws the foe skyward; fissures run to every edge and the page burns |
| Water Spout (Kyogre) | Water up, water down | A column into the sky; water bombs fall all over the screen; scales with HP |
| Primordial Sea (Primal Kyogre) | Something vast beneath the surface | Kyogre dives in; its shadow, five times its size, circles beneath a screen-wide maelstrom that drags the page and foe inward; it breaches under the foe and throws it up; the sea crashes out in a ring to every edge |
| Psystrike (Mewtwo) | Waves of mind, then spears | Psychic rings roll out; the foe is held in the air; 22 spears of force form around it and converge |
| Shattered Psyche (Mega Mewtwo Y) | The screen is glass | The real page's colours cycle; the screen cracks in a spider web; the foe is slammed into the page three times while tethered; the last slam bursts the glass outward |

When a user says a finale "looks like another one", don't tweak it; replace its central idea.

---

## 10. Moves that collide

Projectiles have a `MASS`. When two from opposite sides meet, the lighter one is destroyed (equal masses destroy each other), with a clash flash and sound. Beams push against each other (`beamClash`). Streams are stopped by what they hit (`f.reach`). Without this, moves pass through each other and the fight feels like two people playing alone.

---

## 11. Sound

Everything is synthesized from two building blocks in `sound.ts`:

- `tone(freq, to, dur, wave, gain, delay)`: an oscillator gliding from one pitch to another, with a short attack and decay.
- `hiss(dur, filterType, from, to, gain, delay, q)`: filtered noise, sweeping.

```ts
rockCrack() {
  this.hiss(0.18, "bandpass", 1400, 500, 0.3, 0, 1.5);
  this.tone(160, 70, 0.2, "square", 0.12);
}
teleport() {
  this.tone(1800, 300, 0.12, "sine", 0.1);
  this.tone(300, 1800, 0.12, "sine", 0.08, 0.12);
}
```

Layer a few of these for anything big (a boom is a low sine drop plus low-passed noise). Audio unlocks inside the first user gesture. Mute is saved per visitor.

---

## 12. The shell (React)

- Load the client-only code with `next/dynamic` (`ssr: false`) and render it through `createPortal` into `document.body`.
- The canvas ignores the pointer. An invisible full-screen div swallows clicks during battle, so links on the page can't be followed mid-fight.
- Wheel and touch scrolling are blocked during battle, but not in the menus.
- Touch: a thumb pad and buttons. The move buttons show the current Pokémon's moves, and swap when it Mega Evolves or when the next team member comes out.
- Pick flow: choose 1 v 1 or 3 v 3 and you vs CPU or CPU vs CPU, then your team, then the rival's (or random). Number keys pick, Backspace undoes, Enter rematches.

---

## 13. Testing: watch it, don't just compile it

Type checks and lint catch typos, not ugly animation. Every change here was verified by **looking at frames**:

1. Run the dev server. Drive the page with `playwright-core` and a **fake clock** (`page.clock.install()`, then `page.clock.runFor(ms)`), so game time advances deterministically and fast, independent of how slow the headless renderer is.
2. Use **CPU vs CPU** so no input is needed.
3. Add **temporary test hooks** read from `localStorage` (for example, fill the Burst meter quickly, or allow Mega Evolution at once) so the moments you need to see happen within seconds. Mark every hook line with a comment such as `// LEGTEST` and delete them all before committing (`grep` for the marker).
4. Take a screenshot every 150–250 ms of game time, then build a **contact sheet** with ImageMagick (`montage … -tile 10x -geometry 288x180+2+2`). Look at it. Then crop and zoom the interesting frames.
5. Read `pageerror` and console errors from the run.
6. Keep runs **few and short**. One or two clips per change is usually enough. Long batches of simulated battles waste time.

What contact sheets catch that nothing else does:

- effects too faint to read
- layers drawn in the wrong order
- an effect stuck to a body after its move ended
- every finale looking the same
- a sprite floating above its spot
- the page being unstyled because the dev server broke

### Dev server gotcha

Next's dev cache (`.next`) can corrupt during long sessions with many hot reloads: pages return 500, or the CSS 404s and the page renders unstyled. If frames suddenly look like raw HTML, stop the server, `rm -rf .next`, and start again before trusting any result.

---

## 14. Working method (for a model doing this)

- **Plan the move in words first:** its beats, its colours, what it does to the page, how much damage each beat deals. Then write it.
- **Patch with anchors.** Large edits to a long file were applied by small Python scripts that replace exact, unique snippets and `assert` each one matched once. If an anchor doesn't match, stop and re-read; don't guess. Formatters reflow code, so re-read after formatting before anchoring on it again.
- **After every change:** `prettier`, then `tsc --noEmit`, then `next lint`, then look at frames.
- **Match the codebase's voice.** Short doc comments that say what a thing *is* ("A beam that grows from the user along its aim…"), comments on the non-obvious, consistent names.
- **Data in data files.** Names, power, cooldowns, stats and types live in `moves.ts`, so balance changes don't touch the logic.
- **Balance with arithmetic, then confirm with a short simulation.** Sum the finale fractions; compare damage per second across kits.
- **Fallbacks everywhere** a sheet or state might be missing: the anims `Proxy`, guards on draw paths, clearing flags on every exit path.
- **Listen to the feedback literally.** "Weak" means the impact beats are missing. "Looks like another one" means the central idea needs replacing. "Stuck to the body" means a flag outlives its move.

---

## 15. Checklist: adding a new Pokémon

1. Find it (and its Mega) on SpriteCollab; ask before downloading; convert with `pmd.py`; add credits to `SOURCES.txt`.
2. Add it to `Species`; check the feet anchor and scale in a screenshot.
3. In `moves.ts`: moves for both forms, stats, types, Mega name, and any new types in the chart.
4. In `game.ts`: its move scripts (reuse templates first), CPU picker, trail colour, cut-in colours, finale (both forms), and their drawing.
5. In the shell: a roster card (name, types, a one-line pitch); add it to lazy loading.
6. Test with one or two CPU-vs-CPU clips per form, using temporary hooks to reach the finales. Remove the hooks.
7. Format, type-check, lint, commit.
