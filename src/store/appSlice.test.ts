import { describe, expect, it } from 'vitest'
import {
  appReducer,
  continueGame,
  playerDied,
  respawn,
  returnToMenu,
  startNewGame,
  togglePause,
  type AppState,
} from './appSlice'

describe('appSlice', () => {
  it('boots into the main menu', () => {
    const state = appReducer(undefined, { type: '@@INIT' })
    expect(state.phase).toBe('menu')
  })

  it('starts a new game from the menu', () => {
    const state: AppState = { phase: 'menu' }
    expect(appReducer(state, startNewGame()).phase).toBe('playing')
  })

  it('continues into the game from the menu (resume a save)', () => {
    const state: AppState = { phase: 'menu' }
    expect(appReducer(state, continueGame()).phase).toBe('playing')
  })

  it('toggles pause only between playing and paused', () => {
    expect(appReducer({ phase: 'playing' }, togglePause()).phase).toBe('paused')
    expect(appReducer({ phase: 'paused' }, togglePause()).phase).toBe('playing')
    expect(appReducer({ phase: 'menu' }, togglePause()).phase).toBe('menu')
  })

  it('can return to the menu', () => {
    expect(appReducer({ phase: 'paused' }, returnToMenu()).phase).toBe('menu')
  })

  it('enters the dead state from live play, but not from the menu', () => {
    expect(appReducer({ phase: 'playing' }, playerDied()).phase).toBe('dead')
    expect(appReducer({ phase: 'paused' }, playerDied()).phase).toBe('dead')
    expect(appReducer({ phase: 'menu' }, playerDied()).phase).toBe('menu')
  })

  it('respawn returns from dead to playing, and is a no-op otherwise', () => {
    expect(appReducer({ phase: 'dead' }, respawn()).phase).toBe('playing')
    expect(appReducer({ phase: 'menu' }, respawn()).phase).toBe('menu')
  })

  it('pause is ignored while dead', () => {
    expect(appReducer({ phase: 'dead' }, togglePause()).phase).toBe('dead')
  })
})
