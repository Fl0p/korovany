import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './index'

/**
 * Per-run game state: world-conquest progress and the running score (ADR 0005).
 *
 * The "is this run won/lost / which worlds are conquered?" decisions live in the
 * pure {@link ../game/objective/objectiveMachine}; this slice only holds the live
 * progress. Conquest is tracked **per zone** (`caravansRaidedByZone`) — a world is
 * conquered when its count reaches that world's quota
 * ({@link ../game/world.ZONE_CARAVAN_QUOTAS}). The flat `caravansRaided` total is
 * kept for the score path and is informational only.
 */
export interface GameState {
  /** Enemy soldiers defeated this run. */
  kills: number
  /** Total caravans raided this run across all zones — informational / score path. */
  caravansRaided: number
  /** Caravans raided per zone this run — the conquest progress, keyed by zone id. */
  caravansRaidedByZone: Record<string, number>
  /** Running score shown in the HUD: kills + looted goods. */
  score: number
}

/** Score awarded per enemy soldier defeated. */
export const KILL_SCORE = 10

/** Payload for {@link raidCaravan}: which zone was raided and the haul's loot points. */
export interface RaidCaravanPayload {
  /** Zone the caravan was raided in (the player's current `playerSlice.zoneId`). */
  zoneId: string
  /** Loot points (item count) the haul adds to the score. */
  lootPoints: number
}

const initialState: GameState = {
  kills: 0,
  caravansRaided: 0,
  caravansRaidedByZone: {},
  score: 0,
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    /** An enemy soldier was defeated: bump kills and award kill points. */
    recordKill(state) {
      state.kills += 1
      state.score += KILL_SCORE
    },
    /**
     * A caravan was raided in `zoneId`. Advances that zone's conquest progress
     * (and the flat total) and adds the haul's loot points to the score. Raids
     * beyond a zone's quota still count and still score — pure farming (ADR 0005).
     */
    raidCaravan(state, action: PayloadAction<RaidCaravanPayload>) {
      const { zoneId, lootPoints } = action.payload
      state.caravansRaided += 1
      state.caravansRaidedByZone[zoneId] = (state.caravansRaidedByZone[zoneId] ?? 0) + 1
      state.score += lootPoints
    },
    /**
     * Restore persisted conquest progress from a loaded save (Continue). The flat
     * total is recomputed from the per-zone map so the two stay consistent; score
     * and kills are not persisted and start fresh.
     */
    restoreRunProgress(state, action: PayloadAction<Record<string, number>>) {
      const byZone = { ...action.payload }
      state.caravansRaidedByZone = byZone
      state.caravansRaided = Object.values(byZone).reduce((sum, n) => sum + n, 0)
    },
    /** Reset all run state for a fresh game (New Game / Restart). */
    resetRun() {
      return { kills: 0, caravansRaided: 0, caravansRaidedByZone: {}, score: 0 }
    },
  },
})

export const { recordKill, raidCaravan, restoreRunProgress, resetRun } = gameSlice.actions
export const gameReducer = gameSlice.reducer

// --- Selectors --------------------------------------------------------------

/**
 * Running game score surfaced in the HUD score panel. Fed by `recordKill`
 * (kill points) and `raidCaravan` (loot points) from the objective loop
 * (FLO-363/MPG.1); the HUD score panel was introduced in MPG.6 (FLO-366).
 */
export const selectScore = (state: RootState): number => state.game.score

/** Per-zone conquest progress — feeds the conquest win logic and the objective HUD. */
export const selectCaravansRaidedByZone = (state: RootState): Record<string, number> =>
  state.game.caravansRaidedByZone
