import {
  type AbstractMesh,
  Mesh,
  MeshBuilder,
  NullEngine,
  Scene,
  TransformNode,
} from '@babylonjs/core'
import { describe, expect, it } from 'vitest'
import {
  createInstancedVegetation,
  measureVegetationDrawCalls,
} from './instancedVegetation'

function boot() {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  return { engine, scene }
}

/**
 * A synthetic "tree" prototype: a canopy lifted +2 above a trunk, both parented
 * to a root transform node — mirrors a GLB hierarchy where submeshes carry a
 * non-trivial pose relative to the root.
 */
function makeTree(scene: Scene): {
  root: TransformNode
  meshes: AbstractMesh[]
  canopy: Mesh
  trunk: Mesh
} {
  const root = new TransformNode('tree-root', scene)
  const trunk = MeshBuilder.CreateBox('trunk', { size: 1 }, scene)
  const canopy = MeshBuilder.CreateSphere('canopy', { segments: 6 }, scene)
  trunk.position.set(0, 0, 0)
  canopy.position.set(0, 2, 0) // canopy sits 2 units above the trunk
  trunk.setParent(root)
  canopy.setParent(root)
  return { root, meshes: [trunk, canopy], canopy, trunk }
}

describe('createInstancedVegetation', () => {
  it('packs every placement into one thin-instance buffer per submesh', () => {
    const { scene } = boot()
    const { root, meshes } = makeTree(scene)

    const veg = createInstancedVegetation(root, meshes, [
      { position: { x: 0, y: 0, z: 0 } },
      { position: { x: 10, y: 0, z: 0 } },
      { position: { x: 0, y: 0, z: 10 } },
    ])

    expect(veg.instanceCount).toBe(3)
    // Two submeshes → two draw calls regardless of count.
    expect(veg.drawCalls).toBe(2)
    for (const m of veg.meshes) expect(m.thinInstanceCount).toBe(3)
  })

  it('places each instance at its world transform, preserving submesh pose', () => {
    const { scene } = boot()
    const { root, meshes, canopy, trunk } = makeTree(scene)

    createInstancedVegetation(root, meshes, [
      { position: { x: 5, y: 0, z: -3 } },
    ])

    // finalWorld = meshWorld(identity) × buffer, so the buffer carries the
    // placed pose: trunk at the placement, canopy +2 above it.
    const trunkW = trunk.thinInstanceGetWorldMatrices()[0].getTranslation()
    const canopyW = canopy.thinInstanceGetWorldMatrices()[0].getTranslation()
    expect(trunkW.x).toBeCloseTo(5)
    expect(trunkW.y).toBeCloseTo(0)
    expect(trunkW.z).toBeCloseTo(-3)
    expect(canopyW.x).toBeCloseTo(5)
    expect(canopyW.y).toBeCloseTo(2) // canopy's +2 root-relative offset survives
    expect(canopyW.z).toBeCloseTo(-3)
  })

  it('applies yaw so the submesh offset rotates with the placement', () => {
    const { scene } = boot()
    const { root, meshes, canopy } = makeTree(scene)

    // Offset the canopy along +X so a yaw is observable, then rotate 90° about Y.
    canopy.position.set(0, 2, 4)
    createInstancedVegetation(root, meshes, [
      { position: { x: 0, y: 0, z: 0 }, rotationY: Math.PI / 2 },
    ])

    // A +Z offset of 4 rotated 90° about Y lands on +X (≈4), z ≈ 0.
    const canopyW = canopy.thinInstanceGetWorldMatrices()[0].getTranslation()
    expect(canopyW.x).toBeCloseTo(4)
    expect(canopyW.z).toBeCloseTo(0)
    expect(canopyW.y).toBeCloseTo(2)
  })

  it('applies uniform scale to the placement', () => {
    const { scene } = boot()
    const { root, meshes, canopy } = makeTree(scene)

    createInstancedVegetation(root, meshes, [
      { position: { x: 0, y: 0, z: 0 }, scale: 3 },
    ])

    // Canopy +2 offset scaled ×3 → 6 above the placement.
    const canopyW = canopy.thinInstanceGetWorldMatrices()[0].getTranslation()
    expect(canopyW.y).toBeCloseTo(6)
  })

  it('disposes the now-empty transform root', () => {
    const { scene } = boot()
    const { root, meshes } = makeTree(scene)

    createInstancedVegetation(root, meshes, [{ position: { x: 0, y: 0, z: 0 } }])

    expect(root.isDisposed()).toBe(true)
  })

  it('re-homes each submesh to an identity world matrix', () => {
    const { scene } = boot()
    const { root, meshes, canopy } = makeTree(scene)

    createInstancedVegetation(root, meshes, [{ position: { x: 9, y: 0, z: 0 } }])

    // The mesh itself sits at the origin with no parent; the placement lives
    // entirely in the instance buffer.
    expect(canopy.parent).toBeNull()
    const w = canopy.getWorldMatrix().getTranslation()
    expect(w.x).toBeCloseTo(0)
    expect(w.y).toBeCloseTo(0)
    expect(w.z).toBeCloseTo(0)
  })

  it('disposes the instanced meshes', () => {
    const { scene } = boot()
    const { root, meshes } = makeTree(scene)

    const veg = createInstancedVegetation(root, meshes, [
      { position: { x: 0, y: 0, z: 0 } },
    ])
    veg.dispose()

    for (const m of veg.meshes) expect(m.isDisposed()).toBe(true)
  })

  it('throws when the prototype has no geometry', () => {
    const { scene } = boot()
    const root = new TransformNode('empty', scene)
    expect(() => createInstancedVegetation(root, [], [{ position: { x: 0, y: 0, z: 0 } }])).toThrow(
      /no geometry meshes/,
    )
  })

  it('throws when no placements are given', () => {
    const { scene } = boot()
    const { root, meshes } = makeTree(scene)
    expect(() => createInstancedVegetation(root, meshes, [])).toThrow(/at least one placement/)
  })
})

describe('measureVegetationDrawCalls — dense forest reduction', () => {
  it('collapses N trees to one draw call per submesh', () => {
    const { scene } = boot()
    const { root, meshes } = makeTree(scene)

    const placements = Array.from({ length: 256 }, (_, k) => ({
      position: { x: (k % 16) * 6, y: 0, z: Math.floor(k / 16) * 6 },
    }))
    const veg = createInstancedVegetation(root, meshes, placements)
    const stats = measureVegetationDrawCalls(veg)

    expect(stats.trees).toBe(256)
    expect(stats.meshesPerTree).toBe(2)
    // 256 trees × 2 submeshes = 512 naive draw calls → 2 instanced.
    expect(stats.naiveDrawCalls).toBe(512)
    expect(stats.instancedDrawCalls).toBe(2)
    expect(stats.drawCallReduction).toBe(256)
  })
})
