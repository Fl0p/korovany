import { createSlice } from '@reduxjs/toolkit'

export type AppPhase = 'menu' | 'playing' | 'paused' | 'dead'

export interface AppState {
  phase: AppPhase
}

const initialState: AppState = { phase: 'menu' }

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    startNewGame(state) {
      state.phase = 'playing'
    },
    continueGame(state) {
      // Resume a loaded save: the player-state restore (health/zone + staged
      // spawn transform) happens alongside this in the UI layer.
      state.phase = 'playing'
    },
    togglePause(state) {
      if (state.phase === 'playing') {
        state.phase = 'paused'
      } else if (state.phase === 'paused') {
        state.phase = 'playing'
      }
    },
    /**
     * Player HP reached 0 — enter the `dead` state. Only reachable from live
     * play (`playing`/`paused`); ignored otherwise so a stray dispatch can't
     * kill the menu. Input/movement are gated off while `dead` (see GameCanvas).
     */
    playerDied(state) {
      if (state.phase === 'playing' || state.phase === 'paused') {
        state.phase = 'dead'
      }
    },
    /** Respawn from the death screen back into live play (HP/transform reset by the UI layer). */
    respawn(state) {
      if (state.phase === 'dead') {
        state.phase = 'playing'
      }
    },
    returnToMenu(state) {
      state.phase = 'menu'
    },
  },
})

export const { continueGame, playerDied, respawn, returnToMenu, startNewGame, togglePause } =
  appSlice.actions
export const appReducer = appSlice.reducer
