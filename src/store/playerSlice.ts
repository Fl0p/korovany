import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/**
 * Player progress that is *not* owned by Babylon or another slice: the current
 * zone id.
 *
 * The capsule transform lives in the scene (read via the save `playerRuntime`
 * bridge) and health lives in `healthSlice` (the single health authority). The
 * zone id has no other owner, so it lives here so React can render it and the
 * save system can serialise/restore it. There is no zone *system* yet (E1.1 is
 * movement + camera only), so this slice is the minimal source of truth the save
 * format needs — a sensible default today, a real system later.
 */

export interface PlayerState {
  zoneId: string
}

/** Starting state for a fresh New Game. */
export const DEFAULT_PLAYER_STATE: PlayerState = { zoneId: 'forest' }

const initialState: PlayerState = { ...DEFAULT_PLAYER_STATE }

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    /** Overwrite the zone from a loaded save (Continue). */
    restorePlayer(_state, action: PayloadAction<PlayerState>) {
      return { zoneId: action.payload.zoneId }
    },
    /** Reset to defaults for a New Game. */
    resetPlayer() {
      return { ...DEFAULT_PLAYER_STATE }
    },
    setZone(state, action: PayloadAction<string>) {
      state.zoneId = action.payload
    },
  },
})

export const { restorePlayer, resetPlayer, setZone } = playerSlice.actions
export const playerReducer = playerSlice.reducer
