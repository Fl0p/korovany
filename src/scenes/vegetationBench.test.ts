import { MeshBuilder, NullEngine, Scene, TransformNode } from '@babylonjs/core'
import { describe, expect, it } from 'vitest'
import { createVegetationBench } from './vegetationBench'
import type { VegetationDrawCallStats } from '../game/streaming/instancedVegetation'
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

describe('createVegetationBench', () => {
  it('plants a dense forest as one batch and measures the draw-call reduction', async () => {
    const canvas = document.createElement('canvas')

    const stats = await new Promise<VegetationDrawCallStats>((resolve) => {
      createVegetationBench(canvas, {
        createEngine: () => new NullEngine(),
        loadTree: (scene) => Promise.resolve(fakeTree(scene)),
        onMeasured: resolve,
      })
    })

    // 16×16 grid of a 2-submesh tree.
    expect(stats.trees).toBe(256)
    expect(stats.meshesPerTree).toBe(2)
    // 256 × 2 = 512 naive draw calls collapse to 2 thin-instance batches.
    expect(stats.naiveDrawCalls).toBe(512)
    expect(stats.instancedDrawCalls).toBe(2)
    expect(stats.drawCallReduction).toBe(256)
  })
})
