import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAYER_STATE, playerReducer, resetPlayer, restorePlayer, setZone } from './playerSlice'

describe('playerSlice', () => {
  it('starts in the default zone', () => {
    const state = playerReducer(undefined, { type: '@@INIT' })
    expect(state).toEqual(DEFAULT_PLAYER_STATE)
    expect(state.zoneId).toBe('forest')
  })

  it('restores the zone from a loaded save', () => {
    const state = playerReducer(DEFAULT_PLAYER_STATE, restorePlayer({ zoneId: 'cavern' }))
    expect(state).toEqual({ zoneId: 'cavern' })
  })

  it('resets back to defaults for a new game', () => {
    const dirty = { zoneId: 'cavern' }
    expect(playerReducer(dirty, resetPlayer())).toEqual(DEFAULT_PLAYER_STATE)
  })

  it('updates the zone', () => {
    expect(playerReducer(DEFAULT_PLAYER_STATE, setZone('cavern')).zoneId).toBe('cavern')
  })
})
