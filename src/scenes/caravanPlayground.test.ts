import { NullEngine, Scene } from '@babylonjs/core'
import { describe, expect, it, vi } from 'vitest'
import { createCaravanPlayground } from './caravanPlayground'
import type { LootDrop } from '../game/loot'

// jsdom has no WebGL → inject a headless NullEngine. Asserts the playground
// wires the controller + a wandering caravan + the melee→loot path, and tears
// down cleanly.
function boot(onLooted?: (d: LootDrop) => void) {
  const canvas = document.createElement('canvas')
  return createCaravanPlayground(canvas, {
    createEngine: () => new NullEngine(),
    onLooted,
  })
}

describe('createCaravanPlayground', () => {
  it('boots a scene with the player controller and a caravan', () => {
    const game = boot()
    expect(game.scene).toBeInstanceOf(Scene)
    expect(game.controller.mesh.name).toBe('playerCapsule')
    expect(game.caravan.mesh.name).toBe('caravan')
    expect(game.caravan.phase).toBe('wander')
    game.dispose()
  })

  it('advances the sim: the caravan wanders when stepped', () => {
    const game = boot()
    const before = game.caravan.position
    for (let i = 0; i < 120; i++) game.step(1 / 60)
    const after = game.caravan.position
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0)
    game.dispose()
  })

  it('emits a loot drop when the caravan is defeated', () => {
    const drops: LootDrop[] = []
    const game = boot((d) => drops.push(d))
    // Defeat via the Damageable contract the melee sweep uses.
    game.caravan.takeDamage(1000)
    expect(game.caravan.isDead()).toBe(true)
    expect(drops).toHaveLength(1)
    expect(drops[0].items.length).toBeGreaterThan(0)
    game.dispose()
  })

  it('disposes cleanly and idempotently', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const game = boot()
    game.dispose()
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(() => game.dispose()).not.toThrow()
    remove.mockRestore()
  })
})
