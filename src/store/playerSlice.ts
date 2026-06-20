import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/**
 * Player progress that is *not* owned by Babylon: health and the current zone id.
 *
 * The capsule transform lives in the scene (read via the save `playerRuntime`
 * bridge); these scalars live here so React can render them and the save system
 * can serialise/restore them. There is no health or zone *system* yet (E1.1 is
 * movement + camera only), so this slice is the minimal source of truth the save
 * format needs — sensible defaults today, real systems later.
 */

export interface PlayerState {
  health: number
  zoneId: string
}

/** Starting state for a fresh New Game. */
export const DEFAULT_PLAYER_STATE: PlayerState = { health: 100, zoneId: 'forest' }

const initialState: PlayerState = { ...DEFAULT_PLAYER_STATE }

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    /** Overwrite health + zone from a loaded save (Continue). */
    restorePlayer(_state, action: PayloadAction<PlayerState>) {
      return { health: action.payload.health, zoneId: action.payload.zoneId }
    },
    /** Reset to defaults for a New Game. */
    resetPlayer() {
      return { ...DEFAULT_PLAYER_STATE }
    },
    setHealth(state, action: PayloadAction<number>) {
      state.health = action.payload
    },
    setZone(state, action: PayloadAction<string>) {
      state.zoneId = action.payload
    },
  },
})

export const { restorePlayer, resetPlayer, setHealth, setZone } = playerSlice.actions
export const playerReducer = playerSlice.reducer
