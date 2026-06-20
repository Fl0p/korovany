import { NullEngine, Scene } from '@babylonjs/core'
import { describe, expect, it, vi } from 'vitest'
import { createControllerPlayground } from './controllerPlayground'

// jsdom has no WebGL, so inject a headless NullEngine and skip the hero GLB
// (which would try to fetch). Asserts the playground wires a scene with the
// controller capsule + follow camera and tears everything down cleanly.
function boot() {
  const canvas = document.createElement('canvas')
  return createControllerPlayground(canvas, {
    heroUrl: null,
    createEngine: () => new NullEngine(),
  })
}

describe('createControllerPlayground', () => {
  it('boots a scene with the capsule controller and an active follow camera', () => {
    const game = boot()
    expect(game.scene).toBeInstanceOf(Scene)
    expect(game.controller.mesh.name).toBe('playerCapsule')
    expect(game.scene.activeCamera).toBe(game.camera.camera)
    game.dispose()
  })

  it('spawns the capsule above the ground and locks the camera onto it', () => {
    const game = boot()
    expect(game.controller.mesh.position.y).toBe(5)
    expect(game.camera.camera.lockedTarget).toBe(game.controller.mesh)
    game.dispose()
  })

  it('removes its resize listener on dispose and is idempotent', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const game = boot()
    game.dispose()
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(() => game.dispose()).not.toThrow()
    remove.mockRestore()
  })
})
