import { describe, expect, it } from 'vitest'
import {
  applyDamageToCaravan,
  createCaravanFSM,
  DEFAULT_CARAVAN_PARAMS,
  stepCaravanFSM,
  type CaravanFSMState,
  type Waypoint,
} from './caravanFSM'

const P = DEFAULT_CARAVAN_PARAMS
const ORIGIN = { x: 0, y: 0, z: 0 }
const FAR_PLAYER = { x: 100, y: 0, z: 0 } // well outside ambushRadius
const NEAR_PLAYER = { x: 3, y: 0, z: 0 } // inside ambushRadius (6)

const PATH: Waypoint[] = [
  { x: 0, z: 0 },
  { x: 10, z: 0 },
  { x: 10, z: 10 },
  { x: 0, z: 10 },
]

describe('createCaravanFSM', () => {
  it('starts wandering at full HP on the first waypoint', () => {
    const s = createCaravanFSM()
    expect(s.phase).toBe('wander')
    expect(s.health.current).toBe(P.maxHp)
    expect(s.waypointIndex).toBe(0)
    expect(s.ambushed).toBe(false)
  })
})

describe('wander — path following', () => {
  it('moves toward the current waypoint', () => {
    const s = createCaravanFSM()
    // At origin (== waypoint 0), so it advances to waypoint 1 at (10,0) and moves +x.
    const { moveDX, moveDZ } = stepCaravanFSM(s, ORIGIN, FAR_PLAYER, 1.0, P, PATH)
    expect(moveDX).toBeGreaterThan(0)
    expect(Math.abs(moveDZ)).toBeLessThan(1e-9)
  })

  it('does not overshoot the target in a single big step', () => {
    const s = createCaravanFSM()
    // dt huge: step is clamped to wanderSpeed*dt but never past the waypoint.
    const { moveDX } = stepCaravanFSM(s, { x: 9.9, y: 0, z: 0 }, FAR_PLAYER, 100, P, PATH)
    expect(moveDX).toBeLessThanOrEqual(0.1 + 1e-9)
  })

  it('advances the waypoint index on arrival and loops the path', () => {
    let s: CaravanFSMState = { ...createCaravanFSM(), waypointIndex: PATH.length - 1 }
    // Sitting on the last waypoint → index wraps back to 0.
    const last = PATH[PATH.length - 1]
    const res = stepCaravanFSM(s, { x: last.x, y: 0, z: last.z }, FAR_PLAYER, 0.1, P, PATH)
    s = res.state
    expect(s.waypointIndex).toBe(0)
  })

  it('stands still when given an empty path', () => {
    const s = createCaravanFSM()
    const { moveDX, moveDZ } = stepCaravanFSM(s, ORIGIN, FAR_PLAYER, 1.0, P, [])
    expect(moveDX).toBe(0)
    expect(moveDZ).toBe(0)
  })
})

describe('ambush trigger', () => {
  it('flees when the player enters the ambush radius', () => {
    const s = createCaravanFSM()
    const { state } = stepCaravanFSM(s, ORIGIN, NEAR_PLAYER, 0.1, P, PATH)
    expect(state.phase).toBe('flee')
    expect(state.ambushed).toBe(true)
  })

  it('stays wandering while the player is far', () => {
    const s = createCaravanFSM()
    const { state } = stepCaravanFSM(s, ORIGIN, FAR_PLAYER, 0.1, P, PATH)
    expect(state.phase).toBe('wander')
    expect(state.ambushed).toBe(false)
  })

  it('flees directly away from the player once ambushed', () => {
    const s: CaravanFSMState = { ...createCaravanFSM(), phase: 'flee', ambushed: true }
    // Player at +x → caravan should move -x (away).
    const { moveDX } = stepCaravanFSM(s, ORIGIN, NEAR_PLAYER, 1.0, P, PATH)
    expect(moveDX).toBeLessThan(0)
  })

  it('calms back to wandering when the player retreats past calmRadius', () => {
    const s: CaravanFSMState = { ...createCaravanFSM(), phase: 'flee', ambushed: true }
    const { state } = stepCaravanFSM(s, ORIGIN, FAR_PLAYER, 0.1, P, PATH)
    expect(state.phase).toBe('wander')
  })
})

describe('applyDamageToCaravan', () => {
  it('reduces HP and forces the caravan to flee even from range', () => {
    const s = createCaravanFSM()
    const hit = applyDamageToCaravan(s, 10)
    expect(hit.health.current).toBe(P.maxHp - 10)
    expect(hit.phase).toBe('flee')
    expect(hit.ambushed).toBe(true)
  })

  it('transitions to dead when HP reaches zero', () => {
    const s = createCaravanFSM()
    const dead = applyDamageToCaravan(s, P.maxHp)
    expect(dead.phase).toBe('dead')
    expect(dead.health.current).toBe(0)
  })

  it('is a no-op once dead', () => {
    const s = applyDamageToCaravan(createCaravanFSM(), P.maxHp)
    const again = applyDamageToCaravan(s, 50)
    expect(again).toBe(s)
  })

  it('does not mutate the input state', () => {
    const s = createCaravanFSM()
    applyDamageToCaravan(s, 10)
    expect(s.health.current).toBe(P.maxHp)
    expect(s.phase).toBe('wander')
  })
})

describe('dead caravan', () => {
  it('produces no movement', () => {
    const dead = applyDamageToCaravan(createCaravanFSM(), P.maxHp)
    const { moveDX, moveDZ } = stepCaravanFSM(dead, ORIGIN, NEAR_PLAYER, 1.0, P, PATH)
    expect(moveDX).toBe(0)
    expect(moveDZ).toBe(0)
  })
})
