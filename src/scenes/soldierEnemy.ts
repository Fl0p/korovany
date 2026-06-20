/**
 * Thin Babylon wrapper for the Empire Soldier NPC (E2.3).
 *
 * The pure behaviour is in `src/game/ai/soldierFSM.ts`. This class wires it to
 * a scene mesh + the fixed-step loop's Updatable interface. It also implements
 * Damageable so the player's melee hit sweep can reduce enemy HP.
 */
import {
  type AbstractMesh,
  Color3,
  MeshBuilder,
  type Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core'
import type { Damageable, Vec3 } from '../game/combat'
import {
  applyDamageToSoldier,
  createSoldierFSM,
  DEFAULT_SOLDIER_PARAMS,
  stepSoldierFSM,
  type SoldierFSMParams,
  type SoldierFSMState,
} from '../game/ai'
import type { System } from '../game/loop'

export interface SoldierEnemyOptions {
  spawn: Vector3
  params?: SoldierFSMParams
  /** Supplier for the player's current world position — read each tick. */
  getPlayerPos: () => Vector3
  /** Callback when soldier attacks the player — caller dispatches damagePlayer. */
  onAttackPlayer: (damage: number) => void
}

export class SoldierEnemy implements System, Damageable {
  readonly mesh: AbstractMesh
  private fsm: SoldierFSMState
  private readonly params: SoldierFSMParams
  private readonly getPlayerPos: () => Vector3
  private readonly onAttackPlayer: (dmg: number) => void

  get position(): Vec3 {
    return { x: this.mesh.position.x, y: this.mesh.position.y, z: this.mesh.position.z }
  }

  constructor(scene: Scene, options: SoldierEnemyOptions) {
    this.params = options.params ?? DEFAULT_SOLDIER_PARAMS
    this.getPlayerPos = options.getPlayerPos
    this.onAttackPlayer = options.onAttackPlayer
    this.fsm = createSoldierFSM(this.params)

    this.mesh = MeshBuilder.CreateCapsule(
      'soldier',
      { radius: 0.35, height: 1.8 },
      scene,
    )
    this.mesh.position = options.spawn.clone()
    this.mesh.isPickable = false

    const mat = new StandardMaterial('soldierMat', scene)
    mat.diffuseColor = new Color3(0.6, 0.25, 0.1)
    this.mesh.material = mat
  }

  /** Damageable — called by getMeleeHits callers when the player strikes. */
  takeDamage(amount: number): void {
    this.fsm = applyDamageToSoldier(this.fsm, amount)
    if (this.fsm.phase === 'dead') {
      const mat = this.mesh.material as StandardMaterial | null
      if (mat) mat.diffuseColor = new Color3(0.3, 0.3, 0.3)
    }
  }

  /** System — driven by FixedStepLoop. */
  update(dt: number, _world: unknown): void {
    if (this.fsm.phase === 'dead') return

    const playerPos = this.getPlayerPos()
    const soldierVec3: Vec3 = this.position

    const result = stepSoldierFSM(this.fsm, soldierVec3, playerPos as unknown as Vec3, dt, this.params)
    this.fsm = result.state

    this.mesh.position.x += result.moveDX
    this.mesh.position.z += result.moveDZ

    if (result.attacked) {
      this.onAttackPlayer(this.params.attackDamage)
    }

    // Face the player when chasing or attacking.
    if (this.fsm.phase === 'chase' || this.fsm.phase === 'attack') {
      const dx = playerPos.x - this.mesh.position.x
      const dz = playerPos.z - this.mesh.position.z
      if (Math.abs(dx) + Math.abs(dz) > 0.01) {
        this.mesh.rotation.y = Math.atan2(dx, dz)
      }
    }
  }

  isDead(): boolean {
    return this.fsm.phase === 'dead'
  }

  dispose(): void {
    this.mesh.dispose()
  }
}
