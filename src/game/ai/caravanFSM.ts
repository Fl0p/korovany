/**
 * Pure state machine for a wandering caravan (E3.3 — "грабить корованы").
 *
 * Engine-agnostic, mirroring `soldierFSM`: the Babylon wrapper
 * (`src/scenes/caravanEnemy.ts`) drives this each fixed step and applies the
 * returned movement to the mesh. A caravan is a *non-combatant* loot piñata —
 * it follows a looping path and, once the player ambushes it (proximity or a
 * melee hit), panics and flees. It deals no damage; the player defeats it with
 * the existing E2 melee, and on death it rolls a loot table elsewhere.
 */
import { applyDamage, createHealth, isAlive, type HealthState } from '../health'
import type { Vec3 } from '../combat'

export type CaravanPhase = 'wander' | 'flee' | 'dead'

/** A point on the caravan's patrol path (XZ plane). */
export interface Waypoint {
  x: number
  z: number
}

export interface CaravanFSMState {
  phase: CaravanPhase
  health: HealthState
  /** Index of the path waypoint currently being travelled toward. */
  waypointIndex: number
  /** True once the player has triggered the ambush; stays wary until calm. */
  ambushed: boolean
}

export interface CaravanFSMParams {
  maxHp: number
  /** Metres — player inside this while wandering triggers the ambush (flee). */
  ambushRadius: number
  /** Metres — once fleeing, player beyond this calms the caravan to wander. */
  calmRadius: number
  /** m/s travel speed along the path. */
  wanderSpeed: number
  /** m/s panic speed directly away from the player. */
  fleeSpeed: number
  /** Metres — distance at which a waypoint counts as reached. */
  arrivalRadius: number
}

export const DEFAULT_CARAVAN_PARAMS: CaravanFSMParams = {
  maxHp: 80,
  ambushRadius: 6,
  calmRadius: 16,
  wanderSpeed: 1.2,
  fleeSpeed: 2.6,
  arrivalRadius: 0.6,
}

export function createCaravanFSM(
  params: CaravanFSMParams = DEFAULT_CARAVAN_PARAMS,
): CaravanFSMState {
  return {
    phase: 'wander',
    health: createHealth(params.maxHp),
    waypointIndex: 0,
    ambushed: false,
  }
}

function dist2d(ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax
  const dz = bz - az
  return Math.sqrt(dx * dx + dz * dz)
}

export interface CaravanStepResult {
  state: CaravanFSMState
  /** Movement delta this tick (m). */
  moveDX: number
  moveDZ: number
}

/**
 * Advance the caravan state machine by `dt` seconds.
 * `path` is the looping list of waypoints the caravan patrols (XZ). Positions
 * use Y only incidentally — transitions and steering are computed on XZ.
 */
export function stepCaravanFSM(
  state: CaravanFSMState,
  caravanPos: Vec3,
  playerPos: Vec3,
  dt: number,
  params: CaravanFSMParams = DEFAULT_CARAVAN_PARAMS,
  path: readonly Waypoint[] = [],
): CaravanStepResult {
  if (state.phase === 'dead') {
    return { state, moveDX: 0, moveDZ: 0 }
  }

  const d = dist2d(caravanPos.x, caravanPos.z, playerPos.x, playerPos.z)
  let { phase, waypointIndex, ambushed } = state
  let moveDX = 0
  let moveDZ = 0

  // ── Phase transitions ──────────────────────────────────────────────────
  if (phase === 'wander') {
    if (d <= params.ambushRadius) {
      phase = 'flee'
      ambushed = true
    }
  } else if (phase === 'flee') {
    if (d > params.calmRadius) phase = 'wander'
  }

  // ── Phase behaviours ───────────────────────────────────────────────────
  if (phase === 'wander') {
    if (path.length > 0) {
      // Advance the waypoint if we're already on top of the current target.
      let target = path[waypointIndex % path.length]
      if (dist2d(caravanPos.x, caravanPos.z, target.x, target.z) <= params.arrivalRadius) {
        waypointIndex = (waypointIndex + 1) % path.length
        target = path[waypointIndex]
      }
      const dx = target.x - caravanPos.x
      const dz = target.z - caravanPos.z
      const len = Math.sqrt(dx * dx + dz * dz)
      if (len > 0) {
        const stepLen = Math.min(params.wanderSpeed * dt, len)
        moveDX = (dx / len) * stepLen
        moveDZ = (dz / len) * stepLen
      }
    }
  } else if (phase === 'flee') {
    // Run directly away from the player.
    const dx = caravanPos.x - playerPos.x
    const dz = caravanPos.z - playerPos.z
    const len = Math.sqrt(dx * dx + dz * dz)
    if (len > 0) {
      moveDX = (dx / len) * params.fleeSpeed * dt
      moveDZ = (dz / len) * params.fleeSpeed * dt
    }
  }

  return {
    state: { phase, health: state.health, waypointIndex, ambushed },
    moveDX,
    moveDZ,
  }
}

/**
 * Apply incoming melee damage to the caravan. Returns updated state. A hit also
 * panics the caravan into fleeing even if the player is still outside the
 * ambush radius — being struck always triggers the ambush.
 */
export function applyDamageToCaravan(
  state: CaravanFSMState,
  amount: number,
): CaravanFSMState {
  if (state.phase === 'dead') return state
  const health = applyDamage(state.health, amount)
  if (!isAlive(health)) {
    return { ...state, health, phase: 'dead' }
  }
  return { ...state, health, phase: 'flee', ambushed: true }
}
