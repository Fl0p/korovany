import {
  type AbstractEngine,
  Color3,
  Color4,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  UniversalCamera,
  Vector3,
} from '@babylonjs/core'
import { resizeEngineToDisplay } from '../engine'
import { loadModel, type LoadedModel } from './modelLoader'
import {
  createInstancedVegetation,
  measureVegetationDrawCalls,
  type InstancedVegetation,
  type VegetationDrawCallStats,
  type VegetationPlacement,
} from '../game/streaming/instancedVegetation'

/**
 * Dense-forest thin-instance benchmark (E5.3, FLO-396) — `?dev=vegetation`.
 *
 * Plants a `GRID × GRID` forest of one tree GLB as a single thin-instance batch
 * — every copy of each submesh drawn in one GPU call — and reports the draw-call
 * saving vs. the naive clone-per-tree path to the console and a
 * `window.__korovanyVegetationBench` handle. Fly with **WASD** + mouse (click to
 * capture the pointer).
 *
 * Where this differs from `?dev=impostor`: that bench cuts *triangles* at
 * distance (billboard LOD); this one cuts *draw calls* everywhere by batching.
 */

const GRID = 16 // 16×16 = 256 trees
const SPACING = 6

export interface VegetationBench {
  readonly engine: AbstractEngine
  readonly scene: Scene
  readonly stats: VegetationDrawCallStats | null
  dispose(): void
}

function defaultEngineFactory(canvas: HTMLCanvasElement): Engine {
  return new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true)
}

export interface VegetationBenchOptions {
  createEngine?: (canvas: HTMLCanvasElement) => AbstractEngine
  /** Inject a loader so tests can run without fetching the real GLB. */
  loadTree?: (scene: Scene) => Promise<LoadedModel>
  /** Called once the forest is planted and measured (test seam). */
  onMeasured?: (stats: VegetationDrawCallStats) => void
}

/** A `GRID × GRID` scatter centred on the origin, with a varied yaw per cell. */
function gridPlacements(): VegetationPlacement[] {
  const span = (GRID - 1) * SPACING
  const placements: VegetationPlacement[] = []
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      placements.push({
        position: { x: -span / 2 + i * SPACING, y: 0, z: -span / 2 + j * SPACING },
        rotationY: ((i * 7 + j * 13) % 360) * (Math.PI / 180),
      })
    }
  }
  return placements
}

export function createVegetationBench(
  canvas: HTMLCanvasElement,
  options: VegetationBenchOptions = {},
): VegetationBench {
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

  let vegetation: InstancedVegetation | null = null
  let stats: VegetationDrawCallStats | null = null

  void loadTree(scene)
    .then((tree) => {
      // Centre the prototype at the origin so the placement matrices are pure
      // world transforms (the prototype's own pose is the placement-identity).
      tree.root.position.set(0, 0, 0)
      vegetation = createInstancedVegetation(tree.root, tree.meshes, gridPlacements())
      stats = measureVegetationDrawCalls(vegetation)
      onMeasured?.(stats)
      logStats(stats)
      if (import.meta.env.DEV) {
        ;(globalThis as Record<string, unknown>).__korovanyVegetationBench = stats
      }
    })
    .catch((err: unknown) => {
      console.error('[vegetation-bench] failed to plant forest', err)
    })

  engine.runRenderLoop(() => scene.render())
  const onResize = () => resizeEngineToDisplay(engine, window.devicePixelRatio)
  onResize()
  window.addEventListener('resize', onResize)

  let disposed = false
  const handle: VegetationBench = {
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
      vegetation?.dispose()
      scene.dispose()
      engine.dispose()
    },
  }
  return handle
}

function logStats(s: VegetationDrawCallStats): void {
  console.info(
    `[vegetation-bench] ${s.trees} trees\n` +
      `  naive     : ${s.naiveDrawCalls} draw calls (${s.meshesPerTree}/tree)\n` +
      `  instanced : ${s.instancedDrawCalls} draw calls\n` +
      `  reduction : ${s.drawCallReduction.toFixed(0)}× fewer draw calls`,
  )
}
