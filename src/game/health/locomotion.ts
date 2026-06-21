/**
 * Leg-loss locomotion modes (E6.1.5) — pure resolution of injury + inventory
 * into crawl / wheelchair / normal gait. Extends the injury-only multiplier
 * seam so `CharacterController.getSpeedMultiplier` stays the single wire.
 */

import type { InventoryState } from '../economy/inventory'
import { WHEELCHAIR_ITEM_ID } from '../economy/items'
import {
  CRAWL_SPEED_MULTIPLIER,
  type InjuryState,
  isCrawling,
  locomotionSpeedMultiplier as injuryOnlyMultiplier,
} from './injuryModel'

export type LocomotionMode = 'normal' | 'crawl' | 'wheelchair'

/** Fraction of normal speed while rolling in a fitted wheelchair. */
export const WHEELCHAIR_SPEED_MULTIPLIER = 0.6

function hasWheelchairEquipped(inventory: InventoryState): boolean {
  return (
    inventory.equippedItemId === WHEELCHAIR_ITEM_ID &&
    (inventory.counts[WHEELCHAIR_ITEM_ID] ?? 0) > 0
  )
}

/** Active locomotion mode from leg injuries and carried mobility gear. */
export function resolveLocomotionMode(
  injury: InjuryState,
  inventory: InventoryState,
): LocomotionMode {
  if (!isCrawling(injury)) return 'normal'
  if (hasWheelchairEquipped(inventory)) return 'wheelchair'
  return 'crawl'
}

/**
 * Horizontal speed multiplier for the capsule controller (1 = full gait).
 * Leg prosthetics clear crawl via `fitProsthetic`; a fitted wheelchair upgrades
 * crawl to the faster impaired roll without restoring a normal walk.
 */
export function resolveLocomotionSpeedMultiplier(
  injury: InjuryState,
  inventory: InventoryState,
): number {
  switch (resolveLocomotionMode(injury, inventory)) {
    case 'normal':
      return 1
    case 'crawl':
      return CRAWL_SPEED_MULTIPLIER
    case 'wheelchair':
      return WHEELCHAIR_SPEED_MULTIPLIER
  }
}

/** Injury-only multiplier — kept for unit tests that do not model inventory. */
export { injuryOnlyMultiplier as locomotionSpeedMultiplierFromInjury }
