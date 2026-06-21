import {
  type AbstractEngine,
  Color3,
  Color4,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  type Texture,
  UniversalCamera,
  Vector3,
} from '@babylonjs/core'
import { resizeEngineToDisplay } from '../engine'
import { loadModel, type LoadedModel } from './modelLoader'
import {
  attachTreeImpostor,
  measureLODRender,
  type TreeImpostor,
} from '../game/streaming/treeImpostor'

/**
 * Dense-forest impostor benchmark (E5.1, FLO-394) — `?dev=impostor`.
 *
 * Plants a grid of `GRID × GRID` forest trees and attaches a billboard impostor
 * LOD to each, then reports the rendered-triangle cost up close (all full GLB
 * meshes) vs. from the far benchmark camera (all impostors) to the console and a
 * `window.__korovanyImpostorBench` handle. Fly with **WASD** + mouse (click to
 * capture the pointer); the trees near you stay full-detail while distant ones
 * collapse to billboards.
 *
 * One side snapshot is baked from the first loaded tree and shared across every
 * instance, so the whole forest costs a single render-to-texture at boot.
 */

const GRID = 16 // 16×16 = 256 trees
const SPACING = 6
const SWAP_DISTANCE = 35

export interface ImpostorBenchStats {
  trees: number
  /** Triangles rendered with every tree at full GLB detail. */
  fullMeshTriangles: number
  /** Triangles rendered from the far benchmark camera (all impostors). */
  impostorTriangles: number
  /** Meshes rendered up close vs. from the far benchmark camera. */
  fullMeshDrawn: number
  impostorDrawn: number
  /** `fullMeshTriangles / impostorTriangles`. */
  triangleReduction: number
}

export interface ImpostorBench {
  readonly engine: AbstractEngine
  readonly scene: Scene
  readonly stats: ImpostorBenchStats | null
  dispose(): void
}

function defaultEngineFactory(canvas: HTMLCanvasElement): Engine {
  return new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true)
}

export interface ImpostorBenchOptions {
  createEngine?: (canvas: HTMLCanvasElement) => AbstractEngine
  /** Inject a loader so tests can run without fetching the real GLB. */
  loadTree?: (scene: Scene) => Promise<LoadedModel>
  /** Called once the forest is planted and measured (test seam). */
  onMeasured?: (stats: ImpostorBenchStats) => void
}

export function createImpostorBench(
  canvas: HTMLCanvasElement,
  options: ImpostorBenchOptions = {},
): ImpostorBench {
  const {
    createEngine = defaultEngineFactory,
    loadTree = (scene) => loadModel(scene, '/models/forest-tree.glb', { targetSize: 4 }),
    onMeasured,
  } = options

  const engine = createEngine(canvas)
  const scene = new Scene(engine)
  scene.clearColor = new Color4(0.5, 0.7, 0.9, 1)
  new HemisphericLight('light', new Vector3(0, 1, 0), scene)

  const ground = MeshBuilder.CreateGround(
    'ground',
    { width: GRID * SPACING + 20, height: GRID * SPACING + 20 },
    scene,
  )
  const groundMat = new StandardMaterial('groundMat', scene)
  groundMat.diffuseColor = new Color3(0.2, 0.38, 0.15)
  ground.material = groundMat

  const span = (GRID - 1) * SPACING
  const camera = new UniversalCamera('benchCam', new Vector3(0, 4, -span), scene)
  camera.setTarget(new Vector3(0, 2, 0))
  camera.attachControl(canvas, true)
  camera.keysUp = [87] // W
  camera.keysDown = [83] // S
  camera.keysLeft = [65] // A
  camera.keysRight = [68] // D
  camera.speed = 1.2

  const impostors: TreeImpostor[] = []
  const trees: LoadedModel[] = []
  let stats: ImpostorBenchStats | null = null

  void loadTree(scene)
    .then((source) => {
      // Clone the grid from the *pristine* source first — cloning after the
      // source gets its LOD levels would copy the source's impostor plane into
      // every clone. The source occupies grid cell (0,0).
      source.root.position.set(-span / 2, 0, -span / 2)
      trees.push(source)
      for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
          if (i === 0 && j === 0) continue
          const clone = cloneTree(source)
          if (!clone) continue
          clone.root.position.set(-span / 2 + i * SPACING, 0, -span / 2 + j * SPACING)
          clone.root.rotation.y = (i * 7 + j * 13) % 360
          trees.push(clone)
        }
      }

      // Bake one side snapshot from the source and share it across the grid, so
      // the whole forest costs a single render-to-texture.
      const sourceImpostor = attachTreeImpostor(scene, source.meshes, {
        swapDistance: SWAP_DISTANCE,
      })
      const sharedTexture =
        (sourceImpostor.plane.material as StandardMaterial | null)?.diffuseTexture ?? null
      impostors.push(sourceImpostor)
      for (const clone of trees.slice(1)) {
        impostors.push(
          attachTreeImpostor(scene, clone.meshes, {
            swapDistance: SWAP_DISTANCE,
            texture: sharedTexture as Texture | null,
          }),
        )
      }

      stats = measureForest(trees, scene)
      onMeasured?.(stats)
      logStats(stats)
      if (import.meta.env.DEV) {
        ;(globalThis as Record<string, unknown>).__korovanyImpostorBench = stats
      }
    })
    .catch((err: unknown) => {
      console.error('[impostor-bench] failed to plant forest', err)
    })

  engine.runRenderLoop(() => scene.render())
  const onResize = () => resizeEngineToDisplay(engine, window.devicePixelRatio)
  onResize()
  window.addEventListener('resize', onResize)

  let disposed = false
  const handle: ImpostorBench = {
    engine,
    scene,
    get stats() {
      return stats
    },
    dispose() {
      if (disposed) return
      disposed = true
      window.removeEventListener('resize', onResize)
      engine.stopRenderLoop()
      for (const imp of impostors) imp.dispose()
      scene.dispose()
      engine.dispose()
    },
  }
  return handle
}

/** Clone a loaded tree (root + geometry) into a fresh placement node. */
function cloneTree(source: LoadedModel): LoadedModel | null {
  const root = source.root.clone(`${source.root.name}:clone`, null)
  if (!root) return null
  const meshes = root.getChildMeshes(false)
  return { root, meshes }
}

/**
 * Compare the forest's full-detail cost against its cost from the far benchmark
 * camera. The baseline is the true all-detail triangle count (every tree's GLB
 * geometry); the impostor figure resolves each tree through its LOD chain at a
 * distance where all have collapsed to billboards.
 */
function measureForest(trees: readonly LoadedModel[], scene: Scene): ImpostorBenchStats {
  const sources = trees.flatMap((t) => t.meshes.filter((m) => m.getTotalVertices() > 0))

  const fullMeshTriangles = sources.reduce((sum, m) => sum + m.getTotalIndices() / 3, 0)

  const far = new UniversalCamera('measureFar', new Vector3(0, 50, GRID * SPACING * 4), scene)
  far.setTarget(Vector3.Zero())
  far.getViewMatrix(true)
  const farStats = measureLODRender(sources, far)
  far.dispose()

  return {
    trees: trees.length,
    fullMeshTriangles,
    impostorTriangles: farStats.triangles,
    fullMeshDrawn: sources.length,
    impostorDrawn: farStats.meshes,
    triangleReduction: farStats.triangles > 0 ? fullMeshTriangles / farStats.triangles : 0,
  }
}

function logStats(s: ImpostorBenchStats): void {
  console.info(
    `[impostor-bench] ${s.trees} trees\n` +
      `  full mesh : ${s.fullMeshDrawn} meshes, ${s.fullMeshTriangles} tris\n` +
      `  impostor  : ${s.impostorDrawn} meshes, ${s.impostorTriangles} tris\n` +
      `  reduction : ${s.triangleReduction.toFixed(1)}× fewer triangles at distance`,
  )
}
