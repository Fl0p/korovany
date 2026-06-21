import { describe, expect, it } from 'vitest'
import {
  HEALING_CHEST_AMOUNT,
  HEALING_CHEST_COOLDOWN_SECONDS,
  HEALING_CHEST_RADIUS,
  createHealingChestStates,
  isInsideHealingChest,
  tickHealingChests,
  type HealingChestSpec,
} from './healingChest'

const chest: HealingChestSpec = {
  id: 'test-chest',
  position: { x: 2, y: 0, z: -4 },
}

describe('healing chests', () => {
  it('detects a player inside the ground-plane healing radius', () => {
    expect(isInsideHealingChest({ x: 2, y: 9, z: -4 }, chest)).toBe(true)
    expect(isInsideHealingChest({ x: 2 + HEALING_CHEST_RADIUS + 0.01, y: 0, z: -4 }, chest)).toBe(false)
  })

  it('heals immediately on contact, then waits for the cooldown', () => {
    const states = createHealingChestStates([chest])
    const first = tickHealingChests([chest], states, { x: 2, y: 0, z: -4 }, 0)
    expect(first.healAmount).toBe(HEALING_CHEST_AMOUNT)
    expect(first.activeChestIds).toEqual(['test-chest'])

    const cooling = tickHealingChests([chest], first.states, { x: 2, y: 0, z: -4 }, 0.1)
    expect(cooling.healAmount).toBe(0)

    const ready = tickHealingChests(
      [chest],
      cooling.states,
      { x: 2, y: 0, z: -4 },
      HEALING_CHEST_COOLDOWN_SECONDS,
    )
    expect(ready.healAmount).toBe(HEALING_CHEST_AMOUNT)
  })

  it('can stack separate ready chests when their radii overlap', () => {
    const specs: readonly HealingChestSpec[] = [
      chest,
      { id: 'second', position: { x: 2.5, y: 0, z: -4 }, healAmount: 7 },
    ]
    const tick = tickHealingChests(specs, createHealingChestStates(specs), { x: 2.2, y: 0, z: -4 }, 0)
    expect(tick.healAmount).toBe(HEALING_CHEST_AMOUNT + 7)
    expect(tick.activeChestIds).toEqual(['test-chest', 'second'])
  })
})
