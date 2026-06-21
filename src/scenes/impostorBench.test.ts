import { MeshBuilder, NullEngine, Scene, TransformNode } from '@babylonjs/core'
import { describe, expect, it } from 'vitest'
import { createImpostorBench, type ImpostorBenchStats } from './impostorBench'
import type { LoadedModel } from './modelLoader'

/** A synthetic tree model (canopy sphere + trunk box under one root). */
function fakeTree(scene: Scene): LoadedModel {
  const root = new TransformNode('tree', scene)
  const canopy = MeshBuilder.CreateSphere('canopy', { segments: 8 }, scene)
  const trunk = MeshBuilder.CreateBox('trunk', { size: 0.5 }, scene)
  canopy.parent = root
  trunk.parent = root
  return { root, meshes: [canopy, trunk] }
}

describe('createImpostorBench', () => {
  // Planting 256 NullEngine trees is genuinely heavy (~4–6s); give it headroom
  // so the run does not flake against vitest's 5s default under parallel load.
  it('plants a dense forest and measures a large triangle reduction', { timeout: 30000 }, async () => {
    const canvas = document.createElement('canvas')

    const stats = await new Promise<ImpostorBenchStats>((resolve) => {
      createImpostorBench(canvas, {
        createEngine: () => new NullEngine(),
        loadTree: (scene) => Promise.resolve(fakeTree(scene)),
        onMeasured: resolve,
      })
    })

    // 16×16 grid.
    expect(stats.trees).toBe(256)
    // Every distant tree collapses to one 2-tri billboard.
    expect(stats.impostorDrawn).toBe(256)
    expect(stats.impostorTriangles).toBe(512)
    // The full-detail baseline is far heavier; impostors cut it by >10×.
    expect(stats.fullMeshTriangles).toBeGreaterThan(stats.impostorTriangles * 10)
    expect(stats.triangleReduction).toBeGreaterThan(10)
  })
})
