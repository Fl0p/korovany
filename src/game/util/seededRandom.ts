/**
 * Deterministic, seedable pseudo-random number generator (mulberry32).
 *
 * Engine-agnostic and dependency-free so it runs unchanged under jsdom. Used
 * where gameplay needs *reproducible* randomness — e.g. caravan loot rolls
 * (E3.3) — so a given seed always yields the same sequence and tests can assert
 * exact outcomes. For non-reproducible randomness, plain `Math.random` is fine.
 *
 * mulberry32 is a tiny, well-distributed 32-bit PRNG. It is NOT cryptographic.
 */

export interface SeededRng {
  /** Next float in [0, 1). */
  next(): number
  /** Next integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number
  /** Current internal state — lets callers snapshot/restore a sequence. */
  readonly state: number
}

/**
 * Create a mulberry32 PRNG from a 32-bit integer seed.
 *
 * The same seed always produces the same stream, so `createSeededRng(42)`
 * called twice yields identical sequences.
 */
export function createSeededRng(seed: number): SeededRng {
  // Coerce to an unsigned 32-bit integer so non-integer / negative seeds are
  // still deterministic.
  let s = seed >>> 0

  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    nextInt(min: number, max: number): number {
      if (max < min) [min, max] = [max, min]
      return min + Math.floor(next() * (max - min + 1))
    },
    get state(): number {
      return s
    },
  }
}

/**
 * Hash an arbitrary string into a 32-bit seed (FNV-1a). Handy for deriving a
 * stable seed from a zone id, caravan id, or run id.
 */
export function seedFromString(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
