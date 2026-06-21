import {
  type AbstractMesh,
  FreeCamera,
  Mesh,
  MeshBuilder,
  NullEngine,
  Scene,
  Texture,
  Vector3,
} from '@babylonjs/core'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_IMPOSTOR_SWAP_DISTANCE,
  attachTreeImpostor,
  measureLODRender,
} from './treeImpostor'

function boot() {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  return { engine, scene }
}

/** A synthetic "tree": a detailed canopy sphere plus a small trunk box. */
function makeTree(scene: Scene): { meshes: AbstractMesh[]; canopy: Mesh; trunk: Mesh } {
  const canopy = MeshBuilder.CreateSphere('canopy', { segments: 8 }, scene)
  const trunk = MeshBuilder.CreateBox('trunk', { size: 0.5 }, scene)
  canopy.position.set(0, 0, 0)
  trunk.position.set(0, 0, 0)
  return { meshes: [canopy, trunk], canopy, trunk }
}

/**
 * Camera placed `d` units along +Z, looking at the origin where trees sit.
 * `getViewMatrix(true)` forces `globalPosition` to update — Babylon's `getLOD`
 * reads it for the distance test, and the live render loop computes it each frame
 * before evaluating LOD.
 */
function cameraAt(scene: Scene, d: number): FreeCamera {
  const cam = new FreeCamera('cam', new Vector3(0, 0, d), scene)
  cam.setTarget(Vector3.Zero())
  cam.getViewMatrix(true)
  return cam
}

describe('attachTreeImpostor', () => {
  it('builds a Y-billboard impostor plane sized to the model', () => {
    const { scene } = boot()
    const { meshes } = makeTree(scene)

    const impostor = attachTreeImpostor(scene, meshes)

    expect(impostor.plane.billboardMode).toBe(Mesh.BILLBOARDMODE_Y)
    expect(impostor.swapDistance).toBe(DEFAULT_IMPOSTOR_SWAP_DISTANCE)
    // Sphere diameter ≈ 1 → plane is roughly model-sized, not a unit default.
    const { extendSize } = impostor.plane.getBoundingInfo().boundingBox
    expect(extendSize.x * 2).toBeGreaterThan(0.5)
  })

  it('renders the full mesh up close and the impostor far away', () => {
    const { scene } = boot()
    const { meshes, canopy } = makeTree(scene)
    attachTreeImpostor(scene, meshes, { swapDistance: 20 })

    const near = cameraAt(scene, 5)
    const far = cameraAt(scene, 40)

    expect(canopy.getLOD(near)).toBe(canopy) // close → full mesh
    expect(canopy.getLOD(far)?.name).toBe('tree-impostor') // far → billboard
  })

  it('culls sibling meshes at the swap distance (one billboard, no leftover geometry)', () => {
    const { scene } = boot()
    const { meshes, trunk } = makeTree(scene)
    attachTreeImpostor(scene, meshes, { swapDistance: 20 })

    const far = cameraAt(scene, 40)
    // The trunk is the non-primary mesh → culled to null far away.
    expect(trunk.getLOD(far)).toBeNull()
  })

  it('reduces rendered triangles far away vs up close', () => {
    const { scene } = boot()
    const { meshes } = makeTree(scene)
    attachTreeImpostor(scene, meshes, { swapDistance: 20 })

    const nearStats = measureLODRender(meshes, cameraAt(scene, 5))
    const farStats = measureLODRender(meshes, cameraAt(scene, 40))

    expect(farStats.triangles).toBeLessThan(nearStats.triangles)
    // Far away: one billboard plane (2 tris), trunk culled.
    expect(farStats.meshes).toBe(1)
    expect(farStats.triangles).toBe(2)
  })

  it('culls the impostor entirely beyond cullDistance', () => {
    const { scene } = boot()
    const { meshes, canopy } = makeTree(scene)
    attachTreeImpostor(scene, meshes, { swapDistance: 20, cullDistance: 60 })

    expect(canopy.getLOD(cameraAt(scene, 40))?.name).toBe('tree-impostor')
    expect(canopy.getLOD(cameraAt(scene, 80))).toBeNull()
  })

  it('uses an injected texture and does not dispose it on cleanup', () => {
    const { scene } = boot()
    const { meshes } = makeTree(scene)
    const shared = new Texture(null, scene)

    const impostor = attachTreeImpostor(scene, meshes, { texture: shared })
    expect(impostor.plane.material).toBeTruthy()

    impostor.dispose()
    expect(shared.isReady).toBeDefined() // not disposed — still a live texture
    expect(scene.meshes.includes(impostor.plane)).toBe(false)
  })

  it('restores the full mesh LOD after dispose', () => {
    const { scene } = boot()
    const { meshes, canopy } = makeTree(scene)
    const impostor = attachTreeImpostor(scene, meshes, { swapDistance: 20 })

    const far = cameraAt(scene, 40)
    expect(canopy.getLOD(far)?.name).toBe('tree-impostor')

    impostor.dispose()
    expect(canopy.getLOD(far)).toBe(canopy) // LOD levels removed → full mesh again
  })

  it('throws when the model has no geometry meshes', () => {
    const { scene } = boot()
    expect(() => attachTreeImpostor(scene, [])).toThrow(/no geometry meshes/)
  })
})

describe('measureLODRender — dense forest reduction', () => {
  it('cuts triangles ~proportionally to tree count when all are distant', () => {
    const { scene } = boot()
    const trees: AbstractMesh[] = []
    let fullTriangles = 0

    // 200-tree dense forest, every tree impostored.
    for (let i = 0; i < 200; i++) {
      const canopy = MeshBuilder.CreateSphere(`canopy-${i}`, { segments: 8 }, scene)
      const trunk = MeshBuilder.CreateBox(`trunk-${i}`, { size: 0.5 }, scene)
      fullTriangles += canopy.getTotalIndices() / 3 + trunk.getTotalIndices() / 3
      attachTreeImpostor(scene, [canopy, trunk], { swapDistance: 20 })
      trees.push(canopy, trunk)
    }

    const far = cameraAt(scene, 400)
    const stats = measureLODRender(trees, far)

    // All 200 trees → 200 billboards × 2 tris, trunks culled.
    expect(stats.meshes).toBe(200)
    expect(stats.triangles).toBe(400)
    // Order-of-magnitude reduction vs the full forest.
    expect(stats.triangles).toBeLessThan(fullTriangles / 10)
  })
})
