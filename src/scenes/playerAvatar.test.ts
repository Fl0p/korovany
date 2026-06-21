import { NullEngine, Scene, type StandardMaterial } from '@babylonjs/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildPlayerAvatar } from './playerAvatar'

// jsdom has no WebGL, so drive the box primitives through a headless NullEngine.
function makeScene(): Scene {
  return new Scene(new NullEngine())
}

describe('buildPlayerAvatar (P7.4 / FLO-422)', () => {
  let scene: Scene
  beforeEach(() => {
    scene = makeScene()
  })

  const partNamed = (avatar: ReturnType<typeof buildPlayerAvatar>, name: string) =>
    avatar.meshes.find((m) => m.name === name)

  it('returns a placement root and a non-empty set of part meshes', () => {
    const avatar = buildPlayerAvatar(scene)
    expect(avatar.root.name).toBe('playerAvatar')
    expect(avatar.meshes.length).toBeGreaterThan(8)
    // Core anatomy is present so the silhouette reads as a person.
    for (const n of ['avatarHead', 'avatarTorso', 'avatarLegL', 'avatarLegR']) {
      expect(partNamed(avatar, n)).toBeTruthy()
    }
  })

  it('poses the fists raised above the torso — the fighter guard read', () => {
    const avatar = buildPlayerAvatar(scene)
    const torso = partNamed(avatar, 'avatarTorso')!
    const fistL = partNamed(avatar, 'avatarFistL')!
    const fistR = partNamed(avatar, 'avatarFistR')!
    // Fists, torso and head all ride the same `chest` node, so their local Y is
    // directly comparable: a guard puts the fists well above the torso centre.
    expect(fistL.position.y).toBeGreaterThan(torso.position.y)
    expect(fistR.position.y).toBeGreaterThan(torso.position.y)
    // Symmetric guard: one fist on each side of the centreline.
    expect(Math.sign(fistL.position.x)).toBe(-Math.sign(fistR.position.x))
  })

  it('stands the feet on the ground plane (lowest part at local y ≈ 0)', () => {
    const avatar = buildPlayerAvatar(scene)
    const bootL = partNamed(avatar, 'avatarBootL')!
    // Boot half-height is 0.08; its centre sits at ~0.08 so the sole is at y≈0,
    // matching the (0, -0.9, 0) capsule-foot offset the caller applies.
    expect(bootL.position.y).toBeLessThan(0.2)
    expect(bootL.position.y).toBeGreaterThanOrEqual(0)
  })

  it('makes every part a matte, non-pickable visual (never a ground-ray target)', () => {
    const avatar = buildPlayerAvatar(scene)
    for (const mesh of avatar.meshes) {
      expect(mesh.isPickable).toBe(false)
      const mat = mesh.material as StandardMaterial
      expect(mat.specularColor.r).toBeLessThan(0.1)
      expect(mat.specularColor.g).toBeLessThan(0.1)
      expect(mat.specularColor.b).toBeLessThan(0.1)
    }
  })

  it('parents every part under the root so it rides the capsule and the animator drives it', () => {
    const avatar = buildPlayerAvatar(scene)
    for (const mesh of avatar.meshes) {
      expect(mesh.isDescendantOf(avatar.root)).toBe(true)
    }
  })

  it('dispose() tears down the whole hierarchy', () => {
    const avatar = buildPlayerAvatar(scene)
    avatar.dispose()
    expect(avatar.root.isDisposed()).toBe(true)
    for (const mesh of avatar.meshes) expect(mesh.isDisposed()).toBe(true)
  })
})
