// ==========================================
// The arcade: which games there are, each game's headline record, and the achievements.
// Records and achievements live in the visitor's browser (localStorage), so they're per
// visitor and never leave the device. Unlocking fires an "arcade:unlock" window event,
// which the toast listens for, so games don't need to know about the toast at all.
// ==========================================

export type ArcadeGame = "pokemon" | "blackhole" | "life" | "kombat" | "fight" | "doom";

export interface GameInfo {
  id: ArcadeGame;
  title: string;
  command: string;
  pitch: string;
  players: string;
  /** what its record measures, for the card */
  record: { label: string; better: "max" | "min" | "sum"; time?: boolean };
}

export const GAMES: GameInfo[] = [
  {
    id: "pokemon",
    title: "Pokémon Arena",
    command: "pokemon",
    pitch: "Charizard, Blastoise and Gengar, live and seen from above. Every move tears the page up.",
    players: "1P",
    record: { label: "fastest win", better: "min", time: true },
  },
  {
    id: "blackhole",
    title: "Black Hole",
    command: "blackhole",
    pitch: "Your cursor swallows the page, bending light and time around it. Click for a Big Bang.",
    players: "toy",
    record: { label: "most swallowed", better: "max" },
  },
  {
    id: "life",
    title: "Game of Life",
    command: "life",
    pitch: "Click a paragraph and watch it come alive as Conway's Game of Life.",
    players: "toy",
    record: { label: "longest run", better: "max" },
  },
  {
    id: "kombat",
    title: "Mortal Kombat",
    command: "mk3",
    pitch: "Scorpion vs Sub-Zero on this page. Blood, ice, fire, and fatalities.",
    players: "1–2P",
    record: { label: "fatalities", better: "sum" },
  },
  {
    id: "fight",
    title: "Street Fighter",
    command: "fight",
    pitch: "Ryu vs Ryu. Every hit, fireball and knockdown lands on the page too.",
    players: "1–2P",
    record: { label: "best combo", better: "max" },
  },
  {
    id: "doom",
    title: "DOOM",
    command: "doom",
    pitch: "Shoot the page apart. The guns are hidden inside the images.",
    players: "1P",
    record: { label: "fastest clear", better: "min", time: true },
  },
];

export interface Achievement {
  id: string;
  game: ArcadeGame;
  title: string;
  detail: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "poke-win", game: "pokemon", title: "Champion", detail: "Win a Pokémon battle" },
  { id: "poke-underdog", game: "pokemon", title: "Type Disadvantage", detail: "Beat Blastoise with Charizard" },
  { id: "poke-untouchable", game: "pokemon", title: "Untouchable", detail: "Win with over half your HP left" },
  { id: "poke-haunted", game: "pokemon", title: "Haunted", detail: "Win a battle with Gengar" },
  { id: "hole-bang", game: "blackhole", title: "Big Bang", detail: "Collapse a black hole" },
  { id: "hole-image", game: "blackhole", title: "Spaghettified", detail: "Tear an image apart" },
  { id: "hole-500", game: "blackhole", title: "Event Horizon", detail: "Swallow 500 letters in one hole" },
  { id: "life-awake", game: "life", title: "It's Alive", detail: "Wake the page up" },
  { id: "life-gliders", game: "life", title: "Glider Fleet", detail: "Have 15 gliders on screen at once" },
  { id: "life-1000", game: "life", title: "Long Life", detail: "Run 1,000 generations" },
  { id: "kombat-fatality", game: "kombat", title: "Fatality", detail: "Finish your opponent" },
  { id: "kombat-toasty", game: "kombat", title: "Toasty!", detail: "Catch Dan Forden popping up" },
  { id: "fight-win", game: "fight", title: "You Win", detail: "Beat the CPU" },
  { id: "fight-perfect", game: "fight", title: "Perfect", detail: "Win a round without being hit" },
  { id: "doom-clear", game: "doom", title: "Rip and Tear", detail: "Clear the portfolio" },
  { id: "doom-secret", game: "doom", title: "Secret Finder", detail: "Find one of the page's secrets" },
];

interface Saved {
  records: Partial<Record<ArcadeGame, number>>;
  unlocked: string[];
}

const KEY = "arcade";

function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Saved>;
    return { records: raw.records ?? {}, unlocked: raw.unlocked ?? [] };
  } catch {
    return { records: {}, unlocked: [] };
  }
}

function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage blocked: records just don't stick
  }
}

/** Offers a new result for a game's record; keeps it if it beats (or, for sums, adds to) the old one. */
export function record(game: ArcadeGame, value: number) {
  if (typeof window === "undefined" || !Number.isFinite(value) || value <= 0) return;
  const s = load();
  const { better } = GAMES.find((g) => g.id === game)!.record;
  const old = s.records[game];
  if (better === "sum") s.records[game] = (old ?? 0) + value;
  else if (old === undefined || (better === "max" ? value > old : value < old)) s.records[game] = value;
  else return;
  save(s);
}

export function records() {
  return typeof window === "undefined" ? {} : load().records;
}

export function unlocked() {
  return new Set(typeof window === "undefined" ? [] : load().unlocked);
}

export const UNLOCK_EVENT = "arcade:unlock";

/** Unlocks an achievement once; the first time, the toast shows it. */
export function unlock(id: string) {
  if (typeof window === "undefined") return;
  const s = load();
  if (s.unlocked.includes(id)) return;
  const achievement = ACHIEVEMENTS.find((a) => a.id === id);
  if (!achievement) return;
  s.unlocked.push(id);
  save(s);
  window.dispatchEvent(new CustomEvent<Achievement>(UNLOCK_EVENT, { detail: achievement }));
}
