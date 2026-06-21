import {
  type AbstractMesh,
  Matrix,
  Mesh,
  Quaternion,
  type TransformNode,
  Vector3,
} from '@babylonjs/core'

/**
 * Instanced vegetation — thin-instances for dense forest (E5.3, FLO-396).
 *
 * Scattering a forest by cloning a tree GLB once per position gives one *draw
 * call per mesh per tree*: a 256-tree forest of a 2-submesh tree is 512 draw
 * calls, and draw-call submission (not triangle count) is the CPU bottleneck on
 * mid hardware. Babylon **thin instances** collapse that: every copy of one
 * source mesh is packed into a single per-instance matrix buffer and drawn in
 * **one** GPU draw call, no matter how many copies. A 256-tree forest of that
 * same tree becomes 2 draw calls — one per submesh — independent of count.
 *
 * Where this sits relative to the impostor layer (E5.1/E5.2): impostors cut
 * *triangles* far away (full mesh → billboard); thin-instancing cuts *draw
 * calls* everywhere by batching. They attack different costs. Babylon resolves
 * LOD per-mesh, while a thin-instance batch shares one mesh, so the two don't
 * compose for free — per-instance impostor LOD over a thin-instance batch is a
 * later concern (E5.4 perf budget; the natural shape is distance-bucketed
 * batches: a near full-geometry batch and a far billboard batch). This module
 * is the batching primitive on its own.
 *
 * ## Matrix composition (why submeshes are re-homed to identity)
 *
 * At render time Babylon composes a thin instance as
 * `finalWorld = meshWorldMatrix × instanceBuffer`. A tree GLB is a hierarchy
 * (trunk + canopy submeshes under a transform root), so each submesh carries a
 * non-trivial world matrix — its pose relative to the root. If we left those in
 * place, every instance would be offset by the *source* tree's world matrix on
 * top of its placement. So we capture each submesh's pose **relative to the
 * root** (`protoLocal`), re-home the submesh to an identity world matrix, and
 * bake `protoLocal · placement` into the per-instance buffer. With the mesh
 * world identity, `finalWorld = instanceBuffer` is exactly the placed submesh.
 */

/** One placed copy of the whole vegetation prototype. */
export interface VegetationPlacement {
  /** World position of the tree's root. */
  readonly position: { x: number; y: number; z: number }
  /** Yaw (radians) about the vertical axis. Default 0. */
  readonly rotationY?: number
  /** Uniform scale. Default 1. */
  readonly scale?: number
}

export interface InstancedVegetationOptions {
  /**
   * Keep the per-instance matrix buffer static (not re-uploaded each frame).
   * Forest scatter is fixed once placed, so this defaults to `true` for the
   * cheapest GPU path. Set `false` only if you intend to mutate placements.
   */
  staticBuffer?: boolean
}

export interface InstancedVegetation {
  /** The source submeshes, now each carrying the shared thin-instance buffer. */
  readonly meshes: readonly Mesh[]
  /** How many copies were placed (== `placements.length`). */
  readonly instanceCount: number
  /**
   * Draw calls the whole scatter now costs: one per geometry submesh, regardless
   * of `instanceCount`. The naive (clone-per-tree) cost would be
   * `drawCalls × instanceCount`.
   */
  readonly drawCalls: number
  /** Remove the thin instances and dispose the source meshes. */
  dispose: () => void
}

/** Geometry-bearing meshes only — skip the GLB's empty transform roots. */
function geometryMeshes(meshes: readonly AbstractMesh[]): Mesh[] {
  return meshes.filter(
    (m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0,
  )
}

/** World matrix for a single placement (scale → yaw → translate). */
function placementMatrix(p: VegetationPlacement): Matrix {
  const scale = p.scale ?? 1
  return Matrix.Compose(
    new Vector3(scale, scale, scale),
    Quaternion.RotationAxis(Vector3.Up(), p.rotationY ?? 0),
    new Vector3(p.position.x, p.position.y, p.position.z),
  )
}

/**
 * Re-home a submesh so its world matrix is the identity: detach from any parent
 * and clear its local transform. The geometry stays in mesh-local space; its
 * former root-relative pose is folded into the per-instance buffer instead.
 */
function rehomeToIdentity(mesh: Mesh): void {
  mesh.setParent(null)
  mesh.position = Vector3.Zero()
  mesh.rotationQuaternion = Quaternion.Identity()
  mesh.rotation = Vector3.Zero()
  mesh.scaling = Vector3.One()
  mesh.computeWorldMatrix(true)
}

/**
 * Thin-instance a vegetation prototype across many placements.
 *
 * The prototype's current world transforms (root + submeshes) define the pose
 * each placement reproduces. After this call the source submeshes ARE the
 * instanced batch — they render once per placement in a single draw call each —
 * and the (now-empty) `root` transform node is disposed.
 *
 * @param root       The prototype's transform root (e.g. `LoadedModel.root`).
 * @param modelMeshes The prototype's meshes (e.g. `LoadedModel.meshes`).
 * @param placements One entry per copy to scatter into the scene.
 * @param options    Buffer staticness.
 */
export function createInstancedVegetation(
  root: TransformNode,
  modelMeshes: readonly AbstractMesh[],
  placements: readonly VegetationPlacement[],
  options: InstancedVegetationOptions = {},
): InstancedVegetation {
  const { staticBuffer = true } = options

  const sources = geometryMeshes(modelMeshes)
  if (sources.length === 0) {
    throw new Error(
      'createInstancedVegetation: prototype has no geometry meshes to instance',
    )
  }
  if (placements.length === 0) {
    throw new Error('createInstancedVegetation: at least one placement is required')
  }

  // Capture each submesh's pose relative to the prototype root BEFORE re-homing.
  // `protoLocal = submeshWorld · rootWorld⁻¹` is the transform that, applied
  // inside a placement, reconstructs the submesh within that placed tree.
  const rootInverse = root.computeWorldMatrix(true).clone().invert()
  const protoLocals = sources.map((m) =>
    m.computeWorldMatrix(true).multiply(rootInverse),
  )

  const placementMatrices = placements.map(placementMatrix)

  sources.forEach((mesh, i) => {
    rehomeToIdentity(mesh)
    const protoLocal = protoLocals[i]
    const buffer = new Float32Array(placementMatrices.length * 16)
    placementMatrices.forEach((place, k) => {
      // finalWorld = identity × buffer = protoLocal placed by `place`.
      protoLocal.multiply(place).copyToArray(buffer, k * 16)
    })
    mesh.thinInstanceSetBuffer('matrix', buffer, 16, staticBuffer)
    // Frustum culling for the batch needs the full scattered extent, not the
    // single-prototype bounds the mesh would otherwise report.
    mesh.thinInstanceRefreshBoundingInfo(true)
  })

  // The transform root is now empty (all geometry detached); drop it so it does
  // not linger in the scene graph.
  root.dispose()

  let disposed = false
  return {
    meshes: sources,
    instanceCount: placements.length,
    drawCalls: sources.length,
    dispose() {
      if (disposed) return
      disposed = true
      for (const m of sources) m.dispose()
    },
  }
}

export interface VegetationDrawCallStats {
  /** Trees scattered. */
  trees: number
  /** Geometry submeshes per tree. */
  meshesPerTree: number
  /** Draw calls if each tree were a separate cloned mesh set. */
  naiveDrawCalls: number
  /** Draw calls with thin-instancing (one per submesh). */
  instancedDrawCalls: number
  /** `naiveDrawCalls / instancedDrawCalls`. */
  drawCallReduction: number
}

/**
 * Report the draw-call saving of thin-instancing a vegetation batch. Pure
 * arithmetic over the instanced handle — deterministic under `NullEngine`, which
 * is how the vegetation benchmark proves the reduction without a GL context.
 */
export function measureVegetationDrawCalls(
  vegetation: InstancedVegetation,
): VegetationDrawCallStats {
  const meshesPerTree = vegetation.drawCalls
  const trees = vegetation.instanceCount
  const naiveDrawCalls = meshesPerTree * trees
  const instancedDrawCalls = meshesPerTree
  return {
    trees,
    meshesPerTree,
    naiveDrawCalls,
    instancedDrawCalls,
    drawCallReduction: instancedDrawCalls > 0 ? naiveDrawCalls / instancedDrawCalls : 0,
  }
}
