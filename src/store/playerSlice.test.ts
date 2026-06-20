import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PLAYER_STATE,
  playerReducer,
  resetPlayer,
  restorePlayer,
  setHealth,
  setZone,
} from './playerSlice'

describe('playerSlice', () => {
  it('starts at full health in the default zone', () => {
    const state = playerReducer(undefined, { type: '@@INIT' })
    expect(state).toEqual(DEFAULT_PLAYER_STATE)
    expect(state.health).toBe(100)
  })

  it('restores health and zone from a loaded save', () => {
    const state = playerReducer(DEFAULT_PLAYER_STATE, restorePlayer({ health: 37, zoneId: 'cavern' }))
    expect(state).toEqual({ health: 37, zoneId: 'cavern' })
  })

  it('resets back to defaults for a new game', () => {
    const dirty = { health: 5, zoneId: 'cavern' }
    expect(playerReducer(dirty, resetPlayer())).toEqual(DEFAULT_PLAYER_STATE)
  })

  it('updates health and zone individually', () => {
    expect(playerReducer(DEFAULT_PLAYER_STATE, setHealth(42)).health).toBe(42)
    expect(playerReducer(DEFAULT_PLAYER_STATE, setZone('cavern')).zoneId).toBe('cavern')
  })
})
