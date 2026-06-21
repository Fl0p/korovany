import { type AbstractMesh, Color3, type Scene, StandardMaterial } from '@babylonjs/core'
import { facetMeshes } from '../game/util'
import {
  createInstancedVegetation,
  generateForestTreePlacements,
  type ForestTreeFieldOptions,
  type InstancedVegetation,
} from '../game/streaming'
import { type LoadedModel, loadModel } from './modelLoader'

/**
 * Forest conifer field (FLO-482).
 *
 * The forest tree GLB (`forest-tree.glb`) ships as a single mesh with **no
 * material and no textures**, so it renders white — which the board flagged as
 * "совсем странно" (just weird). This module loads the GLB once, paints its
 * needles a flat matte green (no textures, v1.2 faceted band), and thin-instances
 * it across a deterministic scatter ({@link generateForestTreePlacements}) with
 * per-tree random size ×1–×3.
 *
 * It supersedes the old streamed single-tree manifest entry, which collapsed all
 * its placements onto one shared cached root (the loader ref-counts one model per
 * asset id) and so only ever showed one tree. Thin-instancing keeps the whole
 * field at one draw call per submesh regardless of count — no perf regression.
 *
 * Mount is **fire-and-forget**, mirroring `survivorAvatar.ts`: the scene factory
 * stays synchronous, the field pops in once the GLB resolves, and a failed fetch
 * (headless tests) is swallowed.
 */

/** Flat matte conifer green for the needle foliage — no textures (FLO-482). */
export const FOREST_TREE_FOLIAGE_COLOR = new Color3(0.13, 0.4, 0.16)

/** Authored size (longest extent, scene units) of a ×1 tree before per-instance scaling. */
export const FOREST_TREE_BASE_SIZE = 4

/**
 * Paint the loaded tree meshes a flat matte green and hard-facet them for the
 * v1.2 low-poly read. The GLB has no material of its own, so this is what stops
 * the trees rendering white. Returns the shared material (disposed with the
 * meshes). Exported for direct unit testing under a headless `NullEngine`.
 */
export function applyForestTreeFoliage(
  scene: Scene,
  meshes: readonly AbstractMesh[],
): StandardMaterial {
  const mat = new StandardMaterial('forestTreeFoliageMat', scene)
  mat.diffuseColor = FOREST_TREE_FOLIAGE_COLOR
  mat.specularColor = new Color3(0.03, 0.03, 0.03) // matte, near-zero specular (v1.2)
  // Facet first (rebuilds geometry to hard edges), then paint so no white shows.
  facetMeshes(meshes)
  for (const mesh of meshes) {
    mesh.material = mat
    mesh.isPickable = false
  }
  return mat
}

/**
 * Green + facet a loaded tree prototype, then thin-instance it across the
 * deterministic forest scatter. Synchronous engine wiring split out from the
 * async load so it is unit-testable with a hand-built prototype under `NullEngine`.
 */
export function buildForestTreeField(
  scene: Scene,
  prototype: LoadedModel,
  options: ForestTreeFieldOptions = {},
): InstancedVegetation {
  applyForestTreeFoliage(scene, prototype.meshes)
  // Centre the prototype so per-placement matrices are pure world transforms.
  prototype.root.position.set(0, 0, 0)
  const placements = generateForestTreePlacements(options)
  return createInstancedVegetation(prototype.root, prototype.meshes, placements)
}

/** A live forest-tree field handle. `vegetation` is `null` until the GLB resolves. */
export interface ForestTreeFieldMount {
  /** The instanced batch, or `null` before the GLB load resolves (or if it failed). */
  readonly vegetation: InstancedVegetation | null
  /** Dispose the instanced field (idempotent); also cancels a still-pending load. */
  dispose(): void
}

export interface MountForestTreeFieldOptions {
  /** GLB loader seam — defaults to the real `forest-tree.glb` fetch. Inject in tests. */
  loadTree?: (scene: Scene) => Promise<LoadedModel>
  /** Scatter tunables forwarded to {@link generateForestTreePlacements}. */
  field?: ForestTreeFieldOptions
}

/**
 * Fire-and-forget: load the forest tree GLB, green it, and thin-instance the
 * scatter into `scene`. Returns immediately with a handle whose `vegetation`
 * fills in once the load resolves. A failed fetch (headless tests) is swallowed,
 * leaving an empty field.
 */
export function mountForestTreeField(
  scene: Scene,
  options: MountForestTreeFieldOptions = {},
): ForestTreeFieldMount {
  const {
    loadTree = (s: Scene) => loadModel(s, '/models/forest-tree.glb', { targetSize: FOREST_TREE_BASE_SIZE }),
    field,
  } = options

  let vegetation: InstancedVegetation | null = null
  let disposed = false

  void loadTree(scene)
    .then((prototype) => {
      if (disposed) {
        // Mount was disposed before the load resolved — drop the orphan prototype.
        for (const mesh of prototype.meshes) mesh.dispose(false, true)
        prototype.root.dispose()
        return
      }
      vegetation = buildForestTreeField(scene, prototype, field)
    })
    .catch(() => {
      /* keep the forest empty if the GLB cannot load (headless tests) */
    })

  return {
    get vegetation() {
      return vegetation
    },
    dispose() {
      if (disposed) return
      disposed = true
      vegetation?.dispose()
    },
  }
}
