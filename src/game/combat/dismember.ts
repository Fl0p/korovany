/**
 * Combat → dismemberment resolver — pure functions, no Babylon, no Redux.
 *
 * Given a damaging hit on the player, decides (deterministically, for a seeded
 * {@link Rng}) whether the hit severs a limb and, if so, which still-intact
 * slot. The resolver is the single decision edge: roll once here, then the
 * caller dispatches `severPlayerLimb` + emits a `dismemberEvent`. Downstream
 * systems (bleed-out, eye vignette, leg crawl, audio) react to the resulting
 * `injury` state — they never re-roll.
 *
 * The probability curve scales with hit *severity* (fraction of max HP dealt)
 * and how close the hit leaves the player to death (low remaining HP) on top of
 * a small flat base chance. Constants below are the only tuning knobs.
 */

import type { InjuryState, Limb } from '../health/injuryModel'
import { LIMBS } from '../health/injuryModel'
import type { Rng } from '../util/rng'
import { pick } from '../util/rng'

/** Post-damage player hit points, as carried by `healthSlice` (`state.health.player`). */
export interface Hp {
  current: number
  max: number
}

/** Flat sever chance on any damaging hit, before severity / low-HP scaling. */
export const DISMEMBER_BASE_CHANCE = 0.05
/** Weight on hit severity (damage as a fraction of max HP). */
export const DISMEMBER_SEVERITY_WEIGHT = 0.6
/** Weight on how close the hit leaves the player to death (1 − current/max). */
export const DISMEMBER_LOW_HP_WEIGHT = 0.35

/**
 * Probability in [0, 1] that a hit of `amount` damage severs a limb, given the
 * player's post-damage `hp`. Pure — no RNG consumed; {@link shouldSever} rolls
 * against it. A non-positive hit or non-positive max HP can never sever.
 */
export function severChance(amount: number, hp: Hp): number {
  if (amount <= 0 || hp.max <= 0) return 0
  const severity = Math.min(1, amount / hp.max)
  const lowHp = Math.min(1, Math.max(0, 1 - hp.current / hp.max))
  const chance =
    DISMEMBER_BASE_CHANCE +
    DISMEMBER_SEVERITY_WEIGHT * severity +
    DISMEMBER_LOW_HP_WEIGHT * lowHp
  return Math.min(1, chance)
}

/**
 * Roll whether this hit severs a limb. Consumes exactly one `rng()` value, so a
 * given seed yields a reproducible outcome.
 */
export function shouldSever(amount: number, hp: Hp, rng: Rng): boolean {
  return rng() < severChance(amount, hp)
}

/**
 * Pick a uniformly random still-`intact` limb to sever, skipping already-severed
 * slots. Returns `null` when every slot is gone. Consumes one `rng()` value when
 * at least one limb is intact.
 */
export function pickLimb(injury: InjuryState, rng: Rng): Limb | null {
  const intact = LIMBS.filter((limb) => injury[limb] === 'intact')
  if (intact.length === 0) return null
  return pick(rng, intact)
}

/**
 * Resolve a damaging hit into the limb to sever, or `null` for none. Rolls
 * {@link shouldSever}; on a hit, {@link pickLimb} chooses from the intact slots
 * (also `null` if none remain). This is the only place the dismember decision is
 * made — callers trust the result and dispatch without re-checking.
 */
export function resolveDismember(
  amount: number,
  hp: Hp,
  injury: InjuryState,
  rng: Rng,
): Limb | null {
  if (!shouldSever(amount, hp, rng)) return null
  return pickLimb(injury, rng)
}
