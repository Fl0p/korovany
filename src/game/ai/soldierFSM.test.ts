import { describe, expect, it } from 'vitest'
import {
  applyDamageToSoldier,
  createSoldierFSM,
  DEFAULT_SOLDIER_PARAMS,
  stepSoldierFSM,
  type SoldierFSMState,
} from './soldierFSM'

const P = DEFAULT_SOLDIER_PARAMS
const ORIGIN = { x: 0, y: 0, z: 0 }
const FAR_PLAYER = { x: 100, y: 0, z: 0 }   // outside detectionRadius
const CLOSE_PLAYER = { x: 8, y: 0, z: 0 }    // inside detectionRadius, outside attackRadius
const MELEE_PLAYER = { x: 1.0, y: 0, z: 0 }  // inside attackRadius

function step(
  state: SoldierFSMState,
  soldierPos = ORIGIN,
  playerPos = FAR_PLAYER,
  dt = 0.1,
) {
  return stepSoldierFSM(state, soldierPos, playerPos, dt, P, [1, 0])
}

describe('createSoldierFSM', () => {
  it('starts in patrol with full HP', () => {
    const s = createSoldierFSM()
    expect(s.phase).toBe('patrol')
    expect(s.health.current).toBe(P.maxHp)
  })
})

describe('patrol phase', () => {
  it('stays in patrol when player is far', () => {
    const s = createSoldierFSM()
    const { state } = step(s, ORIGIN, FAR_PLAYER)
    expect(state.phase).toBe('patrol')
  })

  it('produces movement in patrol', () => {
    const s = createSoldierFSM()
    const { moveDX, moveDZ } = step(s, ORIGIN, FAR_PLAYER, 1.0)
    expect(Math.abs(moveDX) + Math.abs(moveDZ)).toBeGreaterThan(0)
  })
})

describe('patrol → chase transition', () => {
  it('transitions to chase when player enters detectionRadius', () => {
    const s = createSoldierFSM()
    const { state } = step(s, ORIGIN, CLOSE_PLAYER)
    expect(state.phase).toBe('chase')
  })
})

describe('chase phase', () => {
  it('moves toward the player', () => {
    const s: SoldierFSMState = { ...createSoldierFSM(), phase: 'chase' }
    const { moveDX } = step(s, ORIGIN, CLOSE_PLAYER, 1.0)
    expect(moveDX).toBeGreaterThan(0) // player is at x=8, soldier at x=0 → move right
  })

  it('transitions to attack when in attackRadius', () => {
    const s: SoldierFSMState = { ...createSoldierFSM(), phase: 'chase' }
    const { state } = step(s, ORIGIN, MELEE_PLAYER)
    expect(state.phase).toBe('attack')
  })

  it('reverts to patrol when player escapes detection hysteresis', () => {
    const s: SoldierFSMState = { ...createSoldierFSM(), phase: 'chase' }
    const veryFar = { x: P.detectionRadius * 1.5, y: 0, z: 0 }
    const { state } = step(s, ORIGIN, veryFar)
    expect(state.phase).toBe('patrol')
  })
})

describe('attack phase', () => {
  it('attacks when cooldown is 0', () => {
    const s: SoldierFSMState = { ...createSoldierFSM(), phase: 'attack', attackCooldown: 0 }
    const { attacked } = step(s, ORIGIN, MELEE_PLAYER)
    expect(attacked).toBe(true)
  })

  it('does not attack while cooldown is active', () => {
    const s: SoldierFSMState = { ...createSoldierFSM(), phase: 'attack', attackCooldown: 1.0 }
    const { attacked } = step(s, ORIGIN, MELEE_PLAYER)
    expect(attacked).toBe(false)
  })

  it('resets cooldown after attacking', () => {
    const s: SoldierFSMState = { ...createSoldierFSM(), phase: 'attack', attackCooldown: 0 }
    const { state } = step(s, ORIGIN, MELEE_PLAYER)
    expect(state.attackCooldown).toBeCloseTo(P.attackCooldown)
  })

  it('reverts to chase when player moves away', () => {
    const s: SoldierFSMState = { ...createSoldierFSM(), phase: 'attack' }
    const { state } = step(s, ORIGIN, CLOSE_PLAYER) // CLOSE_PLAYER is outside attackRadius
    expect(state.phase).toBe('chase')
  })
})

describe('die on damage', () => {
  it('transitions to dead when HP reaches 0', () => {
    const s = createSoldierFSM()
    const dead = applyDamageToSoldier(s, P.maxHp)
    expect(dead.phase).toBe('dead')
    expect(dead.health.current).toBe(0)
  })

  it('stays dead regardless of player proximity', () => {
    const s = applyDamageToSoldier(createSoldierFSM(), P.maxHp)
    const { state } = step(s, ORIGIN, MELEE_PLAYER)
    expect(state.phase).toBe('dead')
  })

  it('takes no action when dead', () => {
    const s = applyDamageToSoldier(createSoldierFSM(), P.maxHp)
    const { moveDX, moveDZ, attacked } = step(s, ORIGIN, MELEE_PLAYER)
    expect(moveDX).toBe(0)
    expect(moveDZ).toBe(0)
    expect(attacked).toBe(false)
  })
})

describe('applyDamageToSoldier', () => {
  it('reduces HP without killing', () => {
    const s = createSoldierFSM()
    const hit = applyDamageToSoldier(s, 10)
    expect(hit.health.current).toBe(P.maxHp - 10)
    expect(hit.phase).toBe('patrol')
  })
})
