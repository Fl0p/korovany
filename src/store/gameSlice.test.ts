import { describe, expect, it } from 'vitest'
import {
  gameReducer,
  KILL_SCORE,
  raidCaravan,
  recordKill,
  resetRun,
  restoreRunProgress,
  type GameState,
} from './gameSlice'

const freshRun = (): GameState => gameReducer(undefined, { type: '@@INIT' })

describe('gameSlice', () => {
  it('starts a run with zero progress and an empty per-zone conquest map', () => {
    const state = freshRun()
    expect(state.kills).toBe(0)
    expect(state.caravansRaided).toBe(0)
    expect(state.caravansRaidedByZone).toEqual({})
    expect(state.score).toBe(0)
  })

  it('records a kill and awards kill points', () => {
    const state = gameReducer(freshRun(), recordKill())
    expect(state.kills).toBe(1)
    expect(state.score).toBe(KILL_SCORE)
  })

  it('credits a raid to its zone, bumps the flat total, and scores the haul', () => {
    let state = gameReducer(freshRun(), raidCaravan({ zoneId: 'forest', lootPoints: 7 }))
    expect(state.caravansRaided).toBe(1)
    expect(state.caravansRaidedByZone).toEqual({ forest: 1 })
    expect(state.score).toBe(7)
    state = gameReducer(state, raidCaravan({ zoneId: 'forest', lootPoints: 3 }))
    expect(state.caravansRaided).toBe(2)
    expect(state.caravansRaidedByZone).toEqual({ forest: 2 })
    expect(state.score).toBe(10)
  })

  it('tracks conquest progress per zone independently', () => {
    let state = gameReducer(freshRun(), raidCaravan({ zoneId: 'forest', lootPoints: 1 }))
    state = gameReducer(state, raidCaravan({ zoneId: 'human-lands', lootPoints: 1 }))
    state = gameReducer(state, raidCaravan({ zoneId: 'human-lands', lootPoints: 1 }))
    expect(state.caravansRaided).toBe(3)
    expect(state.caravansRaidedByZone).toEqual({ forest: 1, 'human-lands': 2 })
  })

  it('accumulates kills and raids into one score', () => {
    let state = gameReducer(freshRun(), recordKill())
    state = gameReducer(state, raidCaravan({ zoneId: 'forest', lootPoints: 5 }))
    expect(state.score).toBe(KILL_SCORE + 5)
  })

  it('restores persisted conquest progress and recomputes the flat total', () => {
    const state = gameReducer(freshRun(), restoreRunProgress({ forest: 3, 'human-lands': 2 }))
    expect(state.caravansRaidedByZone).toEqual({ forest: 3, 'human-lands': 2 })
    expect(state.caravansRaided).toBe(5)
  })

  it('resets all run state for a fresh game', () => {
    const dirty: GameState = {
      kills: 4,
      caravansRaided: 2,
      caravansRaidedByZone: { forest: 2 },
      score: 99,
    }
    expect(gameReducer(dirty, resetRun())).toEqual(freshRun())
  })
})
