import { createSeededRng } from './seededRandom'

/**
 * Functional seeded-RNG helpers (FLO-356).
 *
 * Builds on {@link createSeededRng} (mulberry32) but exposes a leaner
 * functional shape:
 *
 * - `createRng(seed)` → a plain `() => number` in [0, 1) rather than the
 *   full {@link SeededRng} object — handy when you only need raw floats.
 * - `randInt(rng, min, max)` — standalone integer-in-range helper.
 * - `pick(rng, array)` — uniform random pick from a non-empty array.
 *
 * For the full stateful API (`.nextInt`, `.state` snapshot), use
 * {@link createSeededRng} directly.
 */

/** A seeded random number generator function returning floats in [0, 1). */
export type Rng = () => number

/**
 * Create a deterministic PRNG from a 32-bit integer seed.
 * The returned function advances the sequence on every call.
 */
export function createRng(seed: number): Rng {
  const rng = createSeededRng(seed)
  return () => rng.next()
}

/** Random integer in [min, max] inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  if (max < min) [min, max] = [max, min]
  return min + Math.floor(rng() * (max - min + 1))
}

/**
 * Pick a uniformly random element from a non-empty array.
 * Throws if `items` is empty.
 */
export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick: empty array')
  return items[Math.floor(rng() * items.length)]
}
