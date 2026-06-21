import { NullEngine, Scene, type StandardMaterial } from '@babylonjs/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildSoldierAvatar } from './soldierAvatar'

// jsdom has no WebGL, so drive the box primitives through a headless NullEngine.
function makeScene(): Scene {
  return new Scene(new NullEngine())
}

describe('buildSoldierAvatar (FLO-452 — art coherence)', () => {
  let scene: Scene
  beforeEach(() => {
    scene = makeScene()
  })

  const partNamed = (avatar: ReturnType<typeof buildSoldierAvatar>, name: string) =>
    avatar.meshes.find((m) => m.name === name)

  it('returns a placement root and a non-empty set of part meshes', () => {
    const avatar = buildSoldierAvatar(scene)
    expect(avatar.root.name).toBe('soldierAvatar')
    expect(avatar.meshes.length).toBeGreaterThan(8)
    // Core anatomy is present so the silhouette reads as a soldier.
    for (const n of ['soldierHead', 'soldierTorso', 'soldierLegL', 'soldierLegR']) {
      expect(partNamed(avatar, n)).toBeTruthy()
    }
  })

  it('carries a musket and wears a tall peaked shako — the Empire-soldier read', () => {
    const avatar = buildSoldierAvatar(scene)
    const shako = partNamed(avatar, 'soldierShako')!
    const head = partNamed(avatar, 'soldierHead')!
    // The shako sits on top of the head.
    expect(shako.position.y).toBeGreaterThan(head.position.y)
    // The musket parts exist (barrel + stock + bayonet).
    for (const n of ['soldierMusketBarrel', 'soldierMusketStock', 'soldierBayonet']) {
      expect(partNamed(avatar, n)).toBeTruthy()
    }
  })

  it('stands the feet on the ground plane (boots at local y ≈ 0)', () => {
    const avatar = buildSoldierAvatar(scene)
    const bootL = partNamed(avatar, 'soldierBootL')!
    expect(bootL.position.y).toBeLessThan(0.2)
    expect(bootL.position.y).toBeGreaterThanOrEqual(0)
  })

  it('makes every part a matte, non-pickable visual (never a ground-ray target)', () => {
    const avatar = buildSoldierAvatar(scene)
    for (const mesh of avatar.meshes) {
      expect(mesh.isPickable).toBe(false)
      const mat = mesh.material as StandardMaterial
      expect(mat.specularColor.r).toBeLessThan(0.1)
      expect(mat.specularColor.g).toBeLessThan(0.1)
      expect(mat.specularColor.b).toBeLessThan(0.1)
    }
  })

  it('parents every part under the root so it rides the capsule and the animator drives it', () => {
    const avatar = buildSoldierAvatar(scene)
    for (const mesh of avatar.meshes) {
      expect(mesh.isDescendantOf(avatar.root)).toBe(true)
    }
  })

  it('dispose() tears down the whole hierarchy', () => {
    const avatar = buildSoldierAvatar(scene)
    avatar.dispose()
    expect(avatar.root.isDisposed()).toBe(true)
    for (const mesh of avatar.meshes) expect(mesh.isDisposed()).toBe(true)
  })
})
