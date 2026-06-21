import { describe, expect, it } from 'vitest'
import { createInventory, equipItem } from '../economy/inventory'
import { addItem } from '../economy/inventory'
import { WHEELCHAIR_ITEM_ID } from '../economy/items'
import {
  CRAWL_SPEED_MULTIPLIER,
  createInjuryState,
  fitProsthetic,
  severLimb,
} from './injuryModel'
import {
  WHEELCHAIR_SPEED_MULTIPLIER,
  resolveLocomotionMode,
  resolveLocomotionSpeedMultiplier,
} from './locomotion'

describe('resolveLocomotionMode', () => {
  it('is normal while both legs are intact', () => {
    expect(resolveLocomotionMode(createInjuryState(), createInventory())).toBe('normal')
  })

  it('defaults to crawl when a leg is severed', () => {
    const injury = severLimb(createInjuryState(), 'leftLeg')
    expect(resolveLocomotionMode(injury, createInventory())).toBe('crawl')
  })

  it('upgrades to wheelchair when the item is equipped', () => {
    const injury = severLimb(createInjuryState(), 'rightLeg')
    let inventory = addItem(createInventory(), WHEELCHAIR_ITEM_ID, 1)
    inventory = equipItem(inventory, WHEELCHAIR_ITEM_ID)
    expect(resolveLocomotionMode(injury, inventory)).toBe('wheelchair')
  })

  it('returns to normal after a leg prosthetic clears the severed slot', () => {
    const injury = fitProsthetic(severLimb(createInjuryState(), 'leftLeg'), 'leftLeg')
    const inventory = equipItem(addItem(createInventory(), WHEELCHAIR_ITEM_ID, 1), WHEELCHAIR_ITEM_ID)
    expect(resolveLocomotionMode(injury, inventory)).toBe('normal')
  })
})

describe('resolveLocomotionSpeedMultiplier', () => {
  it('maps each mode to the canonical multiplier', () => {
    const injury = severLimb(createInjuryState(), 'leftLeg')
    expect(resolveLocomotionSpeedMultiplier(injury, createInventory())).toBe(CRAWL_SPEED_MULTIPLIER)

    let inventory = equipItem(addItem(createInventory(), WHEELCHAIR_ITEM_ID, 1), WHEELCHAIR_ITEM_ID)
    expect(resolveLocomotionSpeedMultiplier(injury, inventory)).toBe(WHEELCHAIR_SPEED_MULTIPLIER)

    const healed = fitProsthetic(injury, 'leftLeg')
    expect(resolveLocomotionSpeedMultiplier(healed, inventory)).toBe(1)
  })

  it('keeps wheelchair slower than a normal gait but faster than crawl', () => {
    expect(WHEELCHAIR_SPEED_MULTIPLIER).toBeGreaterThan(CRAWL_SPEED_MULTIPLIER)
    expect(WHEELCHAIR_SPEED_MULTIPLIER).toBeLessThan(1)
  })
})
