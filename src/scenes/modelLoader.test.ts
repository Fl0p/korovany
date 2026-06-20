import { describe, expect, it } from 'vitest'
import { MeshBuilder, NullEngine, Scene, Vector3 } from '@babylonjs/core'
import { fitScale, normalizeImportedMeshes, recenterOffset } from './modelLoader'

describe('fitScale', () => {
  it('scales the largest extent up to targetSize', () => {
    // 4 x 1 x 1 box -> longest extent 4 -> scale 2/4 = 0.5 for targetSize 2
    const scale = fitScale(new Vector3(-2, 0, 0), new Vector3(2, 1, 1), 2)
    expect(scale).toBeCloseTo(0.5)
  })

  it('scales a small model up', () => {
    // 0.5 longest extent -> scale 2/0.5 = 4
    const scale = fitScale(new Vector3(0, 0, 0), new Vector3(0.5, 0.2, 0.1), 2)
    expect(scale).toBeCloseTo(4)
  })

  it('returns 1 for a degenerate (zero-size) bounding box', () => {
    const scale = fitScale(Vector3.Zero(), Vector3.Zero(), 2)
    expect(scale).toBe(1)
  })
})

describe('recenterOffset', () => {
  it('grounds the model on y=0 and centers x/z', () => {
    // box from (2,4,6)..(4,8,10), scale 1 -> center x=3,z=8, min.y=4
    const offset = recenterOffset(new Vector3(2, 4, 6), new Vector3(4, 8, 10), 1, true)
    expect(offset.x).toBeCloseTo(-3)
    expect(offset.z).toBeCloseTo(-8)
    expect(offset.y).toBeCloseTo(-4) // lifts min.y to 0
  })

  it('centers on the origin when groundIt is false', () => {
    const offset = recenterOffset(new Vector3(2, 4, 6), new Vector3(4, 8, 10), 1, false)
    expect(offset.x).toBeCloseTo(-3)
    expect(offset.y).toBeCloseTo(-6) // center of y (4..8)
    expect(offset.z).toBeCloseTo(-8)
  })

  it('applies the scale factor to the offset', () => {
    // same box, scale 0.5 -> offsets halved
    const offset = recenterOffset(new Vector3(2, 4, 6), new Vector3(4, 8, 10), 0.5, true)
    expect(offset.x).toBeCloseTo(-1.5)
    expect(offset.y).toBeCloseTo(-2)
    expect(offset.z).toBeCloseTo(-4)
  })
})

describe('normalizeImportedMeshes', () => {
  it('keeps the returned root as a clean placement node', () => {
    const engine = new NullEngine()
    const scene = new Scene(engine)
    const mesh = MeshBuilder.CreateBox('off-origin-model', { size: 2 }, scene)
    mesh.position = new Vector3(4, 5, -3)

    const model = normalizeImportedMeshes(scene, 'off-origin.glb', [mesh], {
      targetSize: 2,
      groundIt: true,
      yaw: Math.PI / 4,
    })

    expect(model.root.position.x).toBeCloseTo(0)
    expect(model.root.position.y).toBeCloseTo(0)
    expect(model.root.position.z).toBeCloseTo(0)
    expect(model.root.scaling.x).toBeCloseTo(1)
    expect(model.root.scaling.y).toBeCloseTo(1)
    expect(model.root.scaling.z).toBeCloseTo(1)
    expect(model.root.rotation.y).toBeCloseTo(Math.PI / 4)

    const groundedAtOrigin = model.root.getHierarchyBoundingVectors(true)
    expect(groundedAtOrigin.min.y).toBeCloseTo(0)

    model.root.position = new Vector3(7, 0, 9)
    model.root.computeWorldMatrix(true)
    const groundedAfterPlacement = model.root.getHierarchyBoundingVectors(true)
    expect(groundedAfterPlacement.min.y).toBeCloseTo(0)

    scene.dispose()
    engine.dispose()
  })
})
