import {
  type AbstractEngine,
  Color3,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core'
import { resizeEngineToDisplay } from '../engine'
import { ThirdPersonCamera } from '../game/camera'
import { CharacterController } from '../game/controller'
import { createInputController, type Intent } from '../game/input'
import { FixedStepLoop } from '../game/loop'
import {
  AssetRegistry,
  AssetStreamLoader,
  defaultLoadGlb,
  spawnStreamedInstance,
  type StreamedInstance,
} from '../game/streaming'
import { createMeleeAttack, getMeleeHits, stepMeleeAttack } from '../game/combat'
import { SoldierEnemy } from './soldierEnemy'

// ---------------------------------------------------------------------------
// Asset ids — canonical string keys used throughout the streaming system.
// ---------------------------------------------------------------------------

/** Conifer tree placed throughout the clearing (FLO-299). */
export const FOREST_TREE_ASSET_ID = 'env.forest-tree'
/** Wooden hut placed at the edge of the clearing (FLO-299). */
export const WOODEN_HUT_ASSET_ID = 'env.wooden-hut'

/** Seed the forest environment assets into a registry. */
export function seedForestAssets(registry: AssetRegistry): void {
  registry.register(FOREST_TREE_ASSET_ID, {
    url: '/models/forest-tree.glb',
    metadata: { label: 'Forest tree', targetSize: 4 },
  })
  registry.register(WOODEN_HUT_ASSET_ID, {
    url: '/models/wooden-hut.glb',
    metadata: { label: 'Wooden hut', targetSize: 3 },
  })
}

// ---------------------------------------------------------------------------
// Prop placement tables — static scatter pattern for the forest clearing.
// ---------------------------------------------------------------------------

/** Tree positions: (x, z) pairs in scene units. Keeps a 4-unit clearing. */
const TREE_POSITIONS: [number, number][] = [
  [8, 2],
  [-7, 3],
  [5, -9],
  [-9, -5],
  [12, -6],
  [-11, 7],
  [3, 11],
  [-4, -12],
  [9, 9],
  [-13, -2],
  [14, 3],
  [-6, 13],
]

/** Hut positions: a small settlement at one edge of the clearing. */
const HUT_POSITIONS: [number, number][] = [
  [-10, 10],
  [-14, 6],
  [-7, 15],
]

// ---------------------------------------------------------------------------
// ForestScene
// ---------------------------------------------------------------------------

export interface ForestSceneOptions {
  /** Engine factory — inject a headless `NullEngine` in tests. */
  createEngine?: (canvas: HTMLCanvasElement) => AbstractEngine
  /** Hero GLB to mount on the capsule; `null` skips it. */
  heroUrl?: string | null
  /** Called when an enemy hits the player. Caller dispatches damagePlayer. */
  onPlayerDamaged?: (amount: number) => void
}

export interface ForestScene {
  readonly engine: AbstractEngine
  readonly scene: Scene
  readonly controller: CharacterController
  /**
   * Enable/disable simulation. While inactive the scene keeps rendering but
   * skips input sampling, movement, melee and AI — used to freeze the world
   * while the player is dead or the game is paused.
   */
  setActive(active: boolean): void
  dispose(): void
}

const DEFAULT_HERO_URL = '/models/korovany_hero_player-default.glb'

function defaultEngineFactory(canvas: HTMLCanvasElement): Engine {
  return new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true)
}

/**
 * Phase-1 forest zone stub (E1.3). A ground plane with collision, a sparse
 * scatter of streamed tree + hut GLBs, and the full third-person controller rig.
 * The assets stream lazily — placeholder boxes appear immediately and swap to the
 * real GLBs as they load.
 *
 * Wired into the app via `?dev=forest` for browser QA. The full integration
 * (play-state → forest scene) is E1.5.
 */
export function createForestScene(
  canvas: HTMLCanvasElement,
  options: ForestSceneOptions = {},
): ForestScene {
  const { createEngine = defaultEngineFactory, heroUrl = DEFAULT_HERO_URL, onPlayerDamaged } = options

  const engine = createEngine(canvas)
  const scene = new Scene(engine)

  new HemisphericLight('light', new Vector3(0, 1, 0), scene)

  // ------------------------------------------------------------------
  // Ground — a grassy clearing with ray-cast collision.
  // ------------------------------------------------------------------
  const ground = MeshBuilder.CreateGround('ground', { width: 60, height: 60 }, scene)
  const groundMat = new StandardMaterial('groundMat', scene)
  groundMat.diffuseColor = new Color3(0.2, 0.38, 0.15)
  ground.material = groundMat
  ground.isPickable = true

  // ------------------------------------------------------------------
  // Streaming — set up registry with forest props.
  // ------------------------------------------------------------------
  const registry = new AssetRegistry()
  seedForestAssets(registry)
  const loader = new AssetStreamLoader(scene, registry, defaultLoadGlb)

  const spawnedInstances: Promise<StreamedInstance>[] = []

  // Scatter trees.
  for (const [x, z] of TREE_POSITIONS) {
    const promise = spawnStreamedInstance(loader, scene, FOREST_TREE_ASSET_ID).then((inst) => {
      inst.root.position = new Vector3(x, 0, z)
      return inst
    })
    spawnedInstances.push(promise)
  }

  // Place huts.
  for (const [x, z] of HUT_POSITIONS) {
    const promise = spawnStreamedInstance(loader, scene, WOODEN_HUT_ASSET_ID).then((inst) => {
      inst.root.position = new Vector3(x, 0, z)
      return inst
    })
    spawnedInstances.push(promise)
  }

  // ------------------------------------------------------------------
  // Character controller + follow camera.
  // ------------------------------------------------------------------
  const input = createInputController(canvas)
  let frameIntent: Intent = input.sample()

  const controller = new CharacterController({
    scene,
    getIntent: () => frameIntent,
    spawn: new Vector3(0, 2, 0),
  })

  const rig = new ThirdPersonCamera({ scene, target: controller.mesh })
  rig.activate()
  controller.camera = rig.camera

  const capsuleMat = new StandardMaterial('capsuleMat', scene)
  capsuleMat.diffuseColor = new Color3(0.3, 0.5, 0.8)
  controller.mesh.material = capsuleMat
  controller.mesh.isVisible = false

  if (heroUrl) {
    void import('./modelLoader').then(({ loadModel }) =>
      loadModel(scene, heroUrl, { targetSize: 1.8, groundIt: true }).then((hero) => {
        hero.root.parent = controller.mesh
        hero.root.position = new Vector3(0, -0.9, 0)
        for (const mesh of hero.meshes) mesh.isPickable = false
        controller.mesh.isVisible = false
      }),
    )
  }

  // ------------------------------------------------------------------
  // Enemy soldiers — E2.3 fight loop.
  // ------------------------------------------------------------------
  const soldiers: SoldierEnemy[] = [
    new SoldierEnemy(scene, {
      spawn: new Vector3(6, 0.9, 6),
      getPlayerPos: () => controller.mesh.position,
      onAttackPlayer: (dmg) => onPlayerDamaged?.(dmg),
    }),
  ]

  // Melee attack state for the player (edge-triggered on intent.attack).
  let meleeState = createMeleeAttack()
  let prevAttack = false

  const loop = new FixedStepLoop({ world: undefined, dt: 1 / 60 })
  loop.scheduler.register(controller)
  for (const s of soldiers) loop.scheduler.register(s)

  // Simulation gate: when false the world is frozen (no input/movement/AI) but
  // still rendered. Driven by app phase (dead/paused) via {@link setActive}.
  let active = true

  engine.runRenderLoop(() => {
    const dt = engine.getDeltaTime() / 1000

    // Frozen: keep drawing the last frame but advance nothing. Drain look deltas
    // so they don't burst when control resumes.
    if (!active) {
      input.sample()
      rig.update(0, 0)
      scene.render()
      return
    }

    frameIntent = input.sample()

    // Advance the player melee state machine (edge-triggered on F key).
    const attackPressed = frameIntent.attack && !prevAttack
    prevAttack = frameIntent.attack
    meleeState = stepMeleeAttack(meleeState, attackPressed, dt)

    // During the active hit window, check all living soldiers.
    if (meleeState.hitWindowOpen) {
      const playerPos = controller.mesh.position
      const forward = controller.mesh.forward
      const liveSoldiers = soldiers.filter((s) => !s.isDead())
      const hits = getMeleeHits(meleeState, playerPos as unknown as import('../game/combat').Vec3, forward as unknown as import('../game/combat').Vec3, liveSoldiers)
      hits.forEach((h) => h.takeDamage(25))
    }

    loop.advance(dt)
    rig.update(frameIntent.lookDX, frameIntent.lookDY)
    scene.render()
  })

  const onResize = () => resizeEngineToDisplay(engine, window.devicePixelRatio)
  onResize()
  window.addEventListener('resize', onResize)

  let disposed = false
  return {
    engine,
    scene,
    controller,
    setActive(value: boolean) {
      active = value
    },
    dispose() {
      if (disposed) return
      disposed = true
      window.removeEventListener('resize', onResize)
      input.dispose()
      engine.stopRenderLoop()
      void Promise.all(spawnedInstances).then((instances) => {
        for (const inst of instances) inst.release()
      })
      for (const s of soldiers) s.dispose()
      scene.dispose()
      engine.dispose()
    },
  }
}
