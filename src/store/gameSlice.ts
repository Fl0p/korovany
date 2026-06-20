import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './index'

export interface GameState {
  score: number
}

const initialState: GameState = { score: 0 }

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    addScore(state, action: PayloadAction<number>) {
      state.score += action.payload
    },
    resetScore(state) {
      state.score = 0
    },
  },
})

export const { addScore, resetScore } = gameSlice.actions
export const gameReducer = gameSlice.reducer

// --- Selectors --------------------------------------------------------------

/**
 * Running game score — the kill tally surfaced in the HUD score panel (MPG.6).
 * Kills feed it via `addScore` (wired by the objective loop, FLO-363/MPG.1).
 */
export const selectScore = (state: RootState): number => state.game.score
