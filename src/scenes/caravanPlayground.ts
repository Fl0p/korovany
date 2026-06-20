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
import {
  createMeleeAttack,
  getMeleeHits,
  stepMeleeAttack,
  type Vec3,
} from '../game/combat'
import { CharacterController } from '../game/controller'
import { createInputController, type Intent } from '../game/input'
import { FixedStepLoop } from '../game/loop'
import type { LootDrop } from '../game/loot'
import { CaravanEnemy } from './caravanEnemy'

/**
 * Minimal dev/test scene for the caravan loot loop (E3.3 — "грабить корованы").
 *
 * It wires the gameplay spine — input → fixed-step loop → capsule controller →
 * follow camera → E2 melee — over a flat ground with one wandering caravan, so
 * the ambush-and-defeat loop can be browser-verified in isolation (the live
 * forest/zone wiring is E3.1/E3.5). Walk up to the caravan (it flees), strike it
 * with **F** until it's defeated; on death it rolls its loot table and the drop
 * is logged + exposed on the debug handle (the reward event the E3.4 inventory
 * will consume).
 *
 * Controls: **WASD** move, **Shift** sprint, **Space** jump, **F** attack, mouse
 * look (click the canvas to capture the pointer).
 */
const MELEE_DAMAGE = 25

export interface CaravanPlaygroundOptions {
  /** Engine factory — inject a headless `NullEngine` in tests. */
  createEngine?: (canvas: HTMLCanvasElement) => AbstractEngine
  /** Fired when the caravan is defeated; defaults to a console log + window stash. */
  onLooted?: (drop: LootDrop) => void
}

export interface CaravanPlayground {
  readonly engine: AbstractEngine
  readonly scene: Scene
  readonly controller: CharacterController
  readonly caravan: CaravanEnemy
  /** Advance one simulation+render frame. Shared by the render loop and tests. */
  step(dt: number): void
  dispose(): void
}

function defaultEngineFactory(canvas: HTMLCanvasElement): Engine {
  return new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true)
}

export function createCaravanPlayground(
  canvas: HTMLCanvasElement,
  options: CaravanPlaygroundOptions = {},
): CaravanPlayground {
  const { createEngine = defaultEngineFactory } = options

  const engine = createEngine(canvas)
  const scene = new Scene(engine)
  new HemisphericLight('light', new Vector3(0, 1, 0), scene)

  const ground = MeshBuilder.CreateGround('ground', { width: 80, height: 80 }, scene)
  const groundMat = new StandardMaterial('groundMat', scene)
  groundMat.diffuseColor = new Color3(0.25, 0.35, 0.22)
  ground.material = groundMat
  ground.isPickable = true

  // Input: sampled once per render frame and held for the loop's sub-steps.
  const input = createInputController(canvas)
  let frameIntent: Intent = input.sample()

  const controller = new CharacterController({
    scene,
    getIntent: () => frameIntent,
    spawn: new Vector3(0, 5, 0),
  })
  const capsuleMat = new StandardMaterial('capsuleMat', scene)
  capsuleMat.diffuseColor = new Color3(0.3, 0.5, 0.8)
  controller.mesh.material = capsuleMat

  const rig = new ThirdPersonCamera({ scene, target: controller.mesh })
  rig.activate()
  controller.camera = rig.camera

  const onLooted =
    options.onLooted ??
    ((drop: LootDrop) => {
      const summary = drop.items.map((s) => `${s.qty}× ${s.label}`).join(', ') || '(empty)'
      console.info(`[caravan] looted: ${summary}`)
      if (import.meta.env.DEV) {
        ;(globalThis as Record<string, unknown>).__korovanyCaravanLoot = drop
      }
    })

  const caravan = new CaravanEnemy(scene, {
    spawn: new Vector3(12, 1, 0),
    getPlayerPos: () => controller.mesh.position,
    onLooted,
  })

  // Player melee state (edge-triggered on intent.attack), mirroring forestScene.
  let meleeState = createMeleeAttack()
  let prevAttack = false

  const loop = new FixedStepLoop({ world: undefined, dt: 1 / 60 })
  loop.scheduler.register(controller)
  loop.scheduler.register(caravan)

  const frame = (dt: number) => {
    frameIntent = input.sample()

    const attackPressed = frameIntent.attack && !prevAttack
    prevAttack = frameIntent.attack
    meleeState = stepMeleeAttack(meleeState, attackPressed, dt)

    if (meleeState.hitWindowOpen && !caravan.isDead()) {
      const playerPos = controller.mesh.position as unknown as Vec3
      const forward = controller.mesh.forward as unknown as Vec3
      const hits = getMeleeHits(meleeState, playerPos, forward, [caravan])
      hits.forEach((h) => h.takeDamage(MELEE_DAMAGE))
    }

    loop.advance(dt)
    rig.update(frameIntent.lookDX, frameIntent.lookDY)
    scene.render()
  }

  engine.runRenderLoop(() => frame(engine.getDeltaTime() / 1000))

  const onResize = () => resizeEngineToDisplay(engine, window.devicePixelRatio)
  onResize()
  window.addEventListener('resize', onResize)

  let disposed = false
  const handle: CaravanPlayground = {
    engine,
    scene,
    controller,
    caravan,
    step: frame,
    dispose() {
      if (disposed) return
      disposed = true
      window.removeEventListener('resize', onResize)
      input.dispose()
      engine.stopRenderLoop()
      caravan.dispose()
      scene.dispose()
      engine.dispose()
    },
  }

  if (import.meta.env.DEV) {
    ;(globalThis as Record<string, unknown>).__korovanyCaravanPlayground = handle
  }

  return handle
}
