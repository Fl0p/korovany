import { describe, expect, it } from 'vitest'
import {
  appReducer,
  continueGame,
  dismissOnboardingIntro,
  loseGame,
  returnToMenu,
  startNewGame,
  togglePause,
  winGame,
  type AppState,
} from './appSlice'

const menu: AppState = { phase: 'menu', showOnboardingIntro: false }

describe('appSlice', () => {
  it('boots into the main menu', () => {
    const state = appReducer(undefined, { type: '@@INIT' })
    expect(state.phase).toBe('menu')
    expect(state.showOnboardingIntro).toBe(false)
  })

  it('starts a new game from the menu', () => {
    expect(appReducer(menu, startNewGame()).phase).toBe('playing')
    expect(appReducer(menu, startNewGame()).showOnboardingIntro).toBe(false)
  })

  it('can flag the onboarding intro for a fresh faction-picker run', () => {
    const state = appReducer(menu, startNewGame({ showIntro: true }))
    expect(state.phase).toBe('playing')
    expect(state.showOnboardingIntro).toBe(true)
  })

  it('continues into the game from the menu (resume a save)', () => {
    const withIntro: AppState = { phase: 'menu', showOnboardingIntro: true }
    const state = appReducer(withIntro, continueGame())
    expect(state.phase).toBe('playing')
    expect(state.showOnboardingIntro).toBe(false)
  })

  it('dismisses the onboarding intro overlay', () => {
    const playing: AppState = { phase: 'playing', showOnboardingIntro: true }
    expect(appReducer(playing, dismissOnboardingIntro()).showOnboardingIntro).toBe(false)
  })

  it('toggles pause only between playing and paused', () => {
    expect(appReducer({ phase: 'playing', showOnboardingIntro: false }, togglePause()).phase).toBe(
      'paused',
    )
    expect(appReducer({ phase: 'paused', showOnboardingIntro: false }, togglePause()).phase).toBe(
      'playing',
    )
    expect(appReducer(menu, togglePause()).phase).toBe('menu')
  })

  it('can return to the menu', () => {
    expect(
      appReducer({ phase: 'paused', showOnboardingIntro: true }, returnToMenu()).showOnboardingIntro,
    ).toBe(false)
    expect(appReducer({ phase: 'paused', showOnboardingIntro: false }, returnToMenu()).phase).toBe(
      'menu',
    )
  })

  it('wins only from active play', () => {
    expect(appReducer({ phase: 'playing', showOnboardingIntro: false }, winGame()).phase).toBe(
      'won',
    )
    expect(appReducer({ phase: 'paused', showOnboardingIntro: false }, winGame()).phase).toBe(
      'paused',
    )
    expect(appReducer(menu, winGame()).phase).toBe('menu')
  })

  it('loses only from active play', () => {
    expect(appReducer({ phase: 'playing', showOnboardingIntro: false }, loseGame()).phase).toBe(
      'lost',
    )
    expect(appReducer({ phase: 'paused', showOnboardingIntro: false }, loseGame()).phase).toBe(
      'paused',
    )
    expect(appReducer(menu, loseGame()).phase).toBe('menu')
  })

  it('restarts from a win or loss back into play without the intro', () => {
    expect(appReducer({ phase: 'won', showOnboardingIntro: false }, startNewGame()).phase).toBe(
      'playing',
    )
    expect(
      appReducer({ phase: 'lost', showOnboardingIntro: false }, startNewGame()).showOnboardingIntro,
    ).toBe(false)
  })
})
