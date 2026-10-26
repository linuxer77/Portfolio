import type { Species } from "./sprites";

// ==========================================
// The roster's numbers: each Pokémon's moves (one per button), base stats, types, and the
// slice of the type chart these three need. Powers are per hit; for streams (Flamethrower,
// Hydro Pump, Ice Beam) they're per tick.
// ==========================================

export type Kind = "fire" | "water" | "ice" | "ground" | "dragon" | "dark" | "flying" | "normal" | "ghost" | "poison";

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
};

export const STATS: Record<Species, { hp: number; speed: number }> = {
  charizard: { hp: 153, speed: 108 },
  blastoise: { hp: 185, speed: 92 },
  gengar: { hp: 135, speed: 116 },
};

export const TYPES: Record<Species, Kind[]> = {
  charizard: ["fire", "flying"],
  blastoise: ["water"],
  gengar: ["ghost", "poison"],
};

/** attacker kind → defender type → multiplier (1 when missing) */
const CHART: Partial<Record<Kind, Partial<Record<Kind, number>>>> = {
  fire: { fire: 0.5, water: 0.5 },
  water: { fire: 2, water: 0.5 },
  ice: { flying: 2, fire: 0.5, water: 0.5 },
  ground: { fire: 2, poison: 2, flying: 0 },
  dark: { ghost: 2 },
  ghost: { ghost: 2 },
  normal: { ghost: 0 },
  poison: { poison: 0.5, ghost: 0.5 },
};

export function effectiveness(kind: Kind, target: Species) {
  return TYPES[target].reduce((m, t) => m * (CHART[kind]?.[t] ?? 1), 1);
}
