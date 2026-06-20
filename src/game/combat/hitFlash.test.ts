import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Color3 } from '@babylonjs/core'

// Hoist the fake before vi.mock so the factory can reference it.
const FakeMaterial = vi.hoisted(() => {
  return class {
    diffuseColor: Color3
    constructor(color: Color3) {
      this.diffuseColor = color.clone()
    }
  }
})

vi.mock('@babylonjs/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@babylonjs/core')>()
  return { ...actual, StandardMaterial: FakeMaterial }
})

import { HitFlashManager } from './hitFlash'

function makeMesh(color = new Color3(0.5, 0.5, 0.5)) {
  const mat = new FakeMaterial(color)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { material: mat } as any
}

describe('HitFlashManager', () => {
  let mgr: HitFlashManager

  beforeEach(() => {
    mgr = new HitFlashManager({ duration: 0.08, flashColor: new Color3(1, 0, 0) })
  })

  it('starts with no active flashes', () => {
    expect(mgr.activeCount).toBe(0)
  })

  it('tints the mesh diffuse color on flash()', () => {
    const mesh = makeMesh(new Color3(0.5, 0.5, 0.5))
    mgr.flash(mesh)
    expect(mgr.activeCount).toBe(1)
    expect(mesh.material.diffuseColor.r).toBeCloseTo(1)
    expect(mesh.material.diffuseColor.g).toBeCloseTo(0)
  })

  it('restores original color after duration', () => {
    const original = new Color3(0.2, 0.4, 0.6)
    const mesh = makeMesh(original)
    mgr.flash(mesh)
    mgr.update(0.09)
    expect(mgr.activeCount).toBe(0)
    expect(mesh.material.diffuseColor.r).toBeCloseTo(0.2)
    expect(mesh.material.diffuseColor.g).toBeCloseTo(0.4)
  })

  it('does not stack duplicate entries for the same mesh', () => {
    const mesh = makeMesh()
    mgr.flash(mesh)
    mgr.flash(mesh)
    expect(mgr.activeCount).toBe(1)
  })

  it('re-triggering resets the timer', () => {
    const mesh = makeMesh()
    mgr.flash(mesh)
    mgr.update(0.06)
    mgr.flash(mesh)
    mgr.update(0.06) // without reset would have expired; with reset still active
    expect(mgr.activeCount).toBe(1)
  })

  it('ignores meshes with no StandardMaterial', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mesh = { material: null } as any
    expect(() => mgr.flash(mesh)).not.toThrow()
    expect(mgr.activeCount).toBe(0)
  })
})
