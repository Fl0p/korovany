import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type AppPhase = 'menu' | 'playing' | 'paused' | 'won' | 'lost'

export interface AppState {
  phase: AppPhase
  /** MPG.2: show the onboarding intro overlay on the first fresh run entry. */
  showOnboardingIntro: boolean
}

const initialState: AppState = { phase: 'menu', showOnboardingIntro: false }

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    startNewGame(state, action: PayloadAction<{ showIntro?: boolean } | undefined>) {
      state.phase = 'playing'
      state.showOnboardingIntro = Boolean(action.payload?.showIntro)
    },
    continueGame(state) {
      // Resume a loaded save: the player-state restore (health/zone + staged
      // spawn transform) happens alongside this in the UI layer.
      state.phase = 'playing'
      state.showOnboardingIntro = false
    },
    dismissOnboardingIntro(state) {
      state.showOnboardingIntro = false
    },
    togglePause(state) {
      if (state.phase === 'playing') {
        state.phase = 'paused'
      } else if (state.phase === 'paused') {
        state.phase = 'playing'
      }
    },
    returnToMenu(state) {
      state.phase = 'menu'
      state.showOnboardingIntro = false
    },
    /** The win objective was met (MPG.1): freeze the run on the victory screen. */
    winGame(state) {
      if (state.phase === 'playing') {
        state.phase = 'won'
      }
    },
    /** The player died (MPG.1): freeze the run on the defeat screen. */
    loseGame(state) {
      if (state.phase === 'playing') {
        state.phase = 'lost'
      }
    },
  },
})

export const {
  continueGame,
  dismissOnboardingIntro,
  loseGame,
  returnToMenu,
  startNewGame,
  togglePause,
  winGame,
} = appSlice.actions
export const appReducer = appSlice.reducer
