import {
  MeshBuilder,
  NullEngine,
  Scene,
  StandardMaterial,
  TransformNode,
} from '@babylonjs/core'
import { describe, expect, it } from 'vitest'
import {
  FOREST_TREE_FOLIAGE_COLOR,
  applyForestTreeFoliage,
  buildForestTreeField,
  mountForestTreeField,
} from './forestTrees'
import type { LoadedModel } from './modelLoader'

/** A minimal stand-in for a loaded forest-tree GLB: a material-less box under a root. */
function fakePrototype(scene: Scene): LoadedModel {
  const root = new TransformNode('model:forest-tree.glb', scene)
  const trunk = MeshBuilder.CreateBox('trunk', { size: 1 }, scene)
  trunk.parent = root
  // Mirror the shipped GLB: no material at all (it renders white).
  return { root, meshes: [trunk] }
}

describe('applyForestTreeFoliage', () => {
  it('paints the material-less tree a flat matte green (no texture)', () => {
    const scene = new Scene(new NullEngine())
    const proto = fakePrototype(scene)
    const mat = applyForestTreeFoliage(scene, proto.meshes)

    expect(mat).toBeInstanceOf(StandardMaterial)
    expect(mat.diffuseColor.equals(FOREST_TREE_FOLIAGE_COLOR)).toBe(true)
    // Matte v1.2 read: near-zero specular, and crucially NO diffuse texture.
    expect(mat.diffuseTexture).toBeFalsy()
    expect(mat.specularColor.r).toBeLessThan(0.1)

    // The (formerly white) mesh now carries the green material and is non-pickable.
    expect(scene.getMeshByName('trunk')!.material).toBe(mat)
    expect(scene.getMeshByName('trunk')!.isPickable).toBe(false)
    scene.dispose()
  })

  it('reads green, not white', () => {
    // Guard the board's actual complaint: needles must not be white.
    const { r, g, b } = FOREST_TREE_FOLIAGE_COLOR
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
    expect(r + g + b).toBeLessThan(2.5) // nowhere near white (3.0)
  })
})

describe('buildForestTreeField', () => {
  it('thin-instances the greened prototype across the scatter', () => {
    const scene = new Scene(new NullEngine())
    const field = buildForestTreeField(scene, fakePrototype(scene), { count: 20 })

    expect(field.instanceCount).toBe(20)
    // One draw call per geometry submesh regardless of the 20 trees (no perf regression).
    expect(field.drawCalls).toBe(1)
    for (const mesh of field.meshes) {
      expect(mesh.thinInstanceCount).toBe(20)
      expect(mesh.material).toBeInstanceOf(StandardMaterial)
    }
    field.dispose()
    scene.dispose()
  })
})

describe('mountForestTreeField', () => {
  it('fills in the vegetation once the injected loader resolves', async () => {
    const scene = new Scene(new NullEngine())
    let resolveLoad!: (m: LoadedModel) => void
    const loaded = new Promise<LoadedModel>((res) => {
      resolveLoad = res
    })

    const mount = mountForestTreeField(scene, {
      loadTree: () => loaded,
      field: { count: 8 },
    })
    expect(mount.vegetation).toBeNull() // not loaded yet

    resolveLoad(fakePrototype(scene))
    await loaded
    await Promise.resolve() // let the .then() chain settle

    expect(mount.vegetation).not.toBeNull()
    expect(mount.vegetation!.instanceCount).toBe(8)

    mount.dispose()
    expect(() => mount.dispose()).not.toThrow() // idempotent
    scene.dispose()
  })

  it('swallows a failed load and leaves the field empty', async () => {
    const scene = new Scene(new NullEngine())
    const mount = mountForestTreeField(scene, {
      loadTree: () => Promise.reject(new Error('no GLB in headless tests')),
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(mount.vegetation).toBeNull()
    mount.dispose()
    scene.dispose()
  })
})
