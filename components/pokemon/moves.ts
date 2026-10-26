import type { Species } from "./sprites";

// ==========================================
// The roster's numbers: each Pokémon's moves (one per button), its Mega Evolution's moves
// (which take over the same buttons), base stats, types, and the slice of the type chart
// these need. Powers are per hit; for streams (Flamethrower, Hydro Pump, Ice Beam, Heat Wave)
// they're per tick.
// ==========================================

export type Kind =
  | "fire"
  | "water"
  | "ice"
  | "ground"
  | "dragon"
  | "dark"
  | "flying"
  | "normal"
  | "ghost"
  | "poison"
  | "fighting"
  | "psychic"
  | "electric";

/** J, K, L, U, O and I on the keyboard. */
export type Slot = "melee" | "s1" | "s2" | "s3" | "s4" | "burst";

export const SLOTS: Slot[] = ["melee", "s1", "s2", "s3", "s4", "burst"];

export const SLOT_KEY: Record<Slot, string> = { melee: "J", s1: "K", s2: "L", s3: "U", s4: "O", burst: "I" };

export interface Move {
  name: string;
  /** for the HUD's move chips */
  short: string;
  kind: Kind;
  power: number;
  cooldown: number;
}

export const MOVES: Record<Species, Record<Slot, Move>> = {
  charizard: {
    melee: { name: "DRAGON CLAW", short: "CLAW", kind: "dragon", power: 9, cooldown: 0.5 },
    s1: { name: "FLAMETHROWER", short: "FLAME", kind: "fire", power: 4.2, cooldown: 2.4 },
    s2: { name: "FLY", short: "FLY", kind: "flying", power: 20, cooldown: 5.5 },
    s3: { name: "FIRE BLAST", short: "BLAST", kind: "fire", power: 24, cooldown: 4.5 },
    s4: { name: "AIR SLASH", short: "SLASH", kind: "flying", power: 6, cooldown: 3.5 },
    burst: { name: "BLAST BURN", short: "B.BURN", kind: "fire", power: 60, cooldown: 0 },
  },
  blastoise: {
    melee: { name: "BITE", short: "BITE", kind: "dark", power: 13, cooldown: 0.55 },
    s1: { name: "HYDRO PUMP", short: "PUMP", kind: "water", power: 2.3, cooldown: 3 },
    s2: { name: "RAPID SPIN", short: "SPIN", kind: "normal", power: 10, cooldown: 3.6 },
    s3: { name: "ICE BEAM", short: "ICE", kind: "ice", power: 2.2, cooldown: 4.5 },
    s4: { name: "EARTHQUAKE", short: "QUAKE", kind: "ground", power: 22, cooldown: 6 },
    burst: { name: "SURF", short: "SURF", kind: "water", power: 26, cooldown: 0 },
  },
  gengar: {
    melee: { name: "LICK", short: "LICK", kind: "ghost", power: 9, cooldown: 0.5 },
    s1: { name: "SHADOW BALL", short: "S.BALL", kind: "ghost", power: 15, cooldown: 2.2 },
    s2: { name: "PHANTOM FORCE", short: "PHANTOM", kind: "ghost", power: 19, cooldown: 5 },
    s3: { name: "SLUDGE BOMB", short: "SLUDGE", kind: "poison", power: 14, cooldown: 4 },
    s4: { name: "HYPNOSIS", short: "HYPNO", kind: "ghost", power: 0, cooldown: 7.5 },
    burst: { name: "NIGHT SHADE", short: "N.SHADE", kind: "ghost", power: 32, cooldown: 0 },
  },
  mewtwo: {
    melee: { name: "PSYCHO CUT", short: "P.CUT", kind: "psychic", power: 11, cooldown: 0.5 },
    s1: { name: "PSYCHIC", short: "PSYCHIC", kind: "psychic", power: 17, cooldown: 3.2 },
    s2: { name: "TELEPORT", short: "TELEPORT", kind: "psychic", power: 0, cooldown: 2.2 },
    s3: { name: "FUTURE SIGHT", short: "FUTURE", kind: "psychic", power: 22, cooldown: 4 },
    s4: { name: "BARRIER", short: "BARRIER", kind: "psychic", power: 0, cooldown: 6 },
    burst: { name: "PSYSTRIKE", short: "PSYSTRK", kind: "psychic", power: 55, cooldown: 0 },
  },
};

/** After Mega Evolution, the same buttons do these. */
export const MEGA_MOVES: Record<Species, Record<Slot, Move>> = {
  charizard: {
    melee: { name: "DRAGON TAIL", short: "TAIL", kind: "dragon", power: 12, cooldown: 0.6 },
    s1: { name: "HEAT WAVE", short: "HEAT", kind: "fire", power: 3.6, cooldown: 2.6 },
    s2: { name: "FLARE BLITZ", short: "BLITZ", kind: "fire", power: 26, cooldown: 4.5 },
    s3: { name: "DRAGON PULSE", short: "PULSE", kind: "dragon", power: 21, cooldown: 3.5 },
    s4: { name: "DRAGON DANCE", short: "DANCE", kind: "dragon", power: 0, cooldown: 10 },
    burst: { name: "INFERNO OVERDRIVE", short: "INFERNO", kind: "fire", power: 70, cooldown: 0 },
  },
  blastoise: {
    melee: { name: "AQUA TAIL", short: "AQUA", kind: "water", power: 14, cooldown: 0.6 },
    s1: { name: "WATER PULSE", short: "W.PULSE", kind: "water", power: 11, cooldown: 2.6 },
    s2: { name: "DARK PULSE", short: "D.PULSE", kind: "dark", power: 18, cooldown: 4 },
    s3: { name: "AURA SPHERE", short: "AURA", kind: "fighting", power: 17, cooldown: 3 },
    s4: { name: "SHELL SMASH", short: "SMASH", kind: "normal", power: 0, cooldown: 10 },
    burst: { name: "HYDRO VORTEX", short: "VORTEX", kind: "water", power: 64, cooldown: 0 },
  },
  gengar: {
    melee: { name: "SHADOW CLAW", short: "CLAW", kind: "ghost", power: 13, cooldown: 0.55 },
    s1: { name: "SLUDGE WAVE", short: "S.WAVE", kind: "poison", power: 17, cooldown: 3.5 },
    s2: { name: "SHADOW SNEAK", short: "SNEAK", kind: "ghost", power: 15, cooldown: 3 },
    s3: { name: "HEX", short: "HEX", kind: "ghost", power: 14, cooldown: 2.4 },
    s4: { name: "CURSE", short: "CURSE", kind: "ghost", power: 0, cooldown: 12 },
    burst: { name: "NEVER-ENDING NIGHTMARE", short: "N.MARE", kind: "ghost", power: 70, cooldown: 0 },
  },
  mewtwo: {
    melee: { name: "ZEN HEADBUTT", short: "ZEN", kind: "psychic", power: 14, cooldown: 0.7 },
    s1: { name: "PSYSHOCK", short: "PSYSHOCK", kind: "psychic", power: 6, cooldown: 2.4 },
    s2: { name: "SWIFT", short: "SWIFT", kind: "normal", power: 5, cooldown: 2.8 },
    s3: { name: "THUNDERBOLT", short: "T.BOLT", kind: "electric", power: 19, cooldown: 3.2 },
    s4: { name: "RECOVER", short: "RECOVER", kind: "normal", power: 0, cooldown: 14 },
    burst: { name: "SHATTERED PSYCHE", short: "PSYCHE", kind: "psychic", power: 72, cooldown: 0 },
  },
};

export const MEGA_NAME: Record<Species, string> = {
  charizard: "MEGA CHARIZARD X",
  blastoise: "MEGA BLASTOISE",
  gengar: "MEGA GENGAR",
  mewtwo: "MEGA MEWTWO Y",
};

export const STATS: Record<Species, { hp: number; speed: number }> = {
  charizard: { hp: 153, speed: 108 },
  blastoise: { hp: 185, speed: 92 },
  gengar: { hp: 135, speed: 116 },
  mewtwo: { hp: 160, speed: 120 },
};

/** Mega Charizard X turns Fire/Dragon; the others keep their types. */
export const MEGA_TYPES: Record<Species, Kind[]> = {
  charizard: ["fire", "dragon"],
  blastoise: ["water"],
  gengar: ["ghost", "poison"],
  mewtwo: ["psychic"],
};

export const TYPES: Record<Species, Kind[]> = {
  charizard: ["fire", "flying"],
  blastoise: ["water"],
  gengar: ["ghost", "poison"],
  mewtwo: ["psychic"],
};

/** attacker kind → defender type → multiplier (1 when missing) */
const CHART: Partial<Record<Kind, Partial<Record<Kind, number>>>> = {
  fire: { fire: 0.5, water: 0.5, dragon: 0.5 },
  water: { fire: 2, water: 0.5, dragon: 0.5 },
  ice: { flying: 2, fire: 0.5, water: 0.5, dragon: 2 },
  ground: { fire: 2, poison: 2, flying: 0 },
  dark: { ghost: 2, psychic: 2 },
  dragon: { dragon: 2 },
  fighting: { ghost: 0, flying: 0.5, poison: 0.5, psychic: 0.5 },
  ghost: { ghost: 2, psychic: 2 },
  psychic: { poison: 2, psychic: 0.5 },
  electric: { water: 2, flying: 2, dragon: 0.5, electric: 0.5 },
  normal: { ghost: 0 },
  poison: { poison: 0.5, ghost: 0.5 },
};

export function effectiveness(kind: Kind, target: Species, mega = false) {
  return (mega ? MEGA_TYPES : TYPES)[target].reduce((m, t) => m * (CHART[kind]?.[t] ?? 1), 1);
}
