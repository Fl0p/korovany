import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  applyDamage,
  createHealth,
  healDamage,
  isAlive as isAliveModel,
  type HealthState,
} from '../game/health'

/**
 * Where a damage event originated. Typed so the funnel can later branch on it
 * (resistances, hit feedback, telemetry) without callers passing magic strings.
 */
export type DamageSource = 'enemy' | 'environment' | 'fall' | 'bleed' | 'debug' | 'unknown'

/** Damage flavour. Room for resistances / immunities later; cosmetic for now. */
export type DamageKind = 'physical' | 'fire' | 'poison' | 'true'

/**
 * The one typed damage event every player-damage path funnels through. Amount is
 * validated **once** at the funnel boundary; internally we trust it (the
 * "trust-the-boundary" lens).
 */
export interface DamageEvent {
  /** HP to remove. Non-finite or non-positive values are coerced to 0 at the funnel. */
  amount: number
  source?: DamageSource
  kind?: DamageKind
  /** Epoch ms the hit landed; defaults to `Date.now()` via the action `prepare`. */
  at?: number
}

export interface HealthStoreState {
  /** Canonical player HP (`current`/`max`); the same shape the save round-trips. */
  player: HealthState
  /** Derived `player.current > 0`, kept in sync by every reducer for cheap reads. */
  isAlive: boolean
  /** Epoch ms of the most recent damage this life, or `null` if undamaged. */
  lastDamageAt: number | null
}

const PLAYER_MAX_HP = 100

const initialState: HealthStoreState = {
  player: createHealth(PLAYER_MAX_HP),
  isAlive: true,
  lastDamageAt: null,
}

/**
 * Single internal damage funnel. Validates the amount once (NaN/∞/≤0 → 0), then
 * clamps HP ≥ 0 via the pure model and refreshes the derived `isAlive` /
 * `lastDamageAt` invariants. Every player-damage reducer routes through here so
 * the death rule lives in exactly one place.
 */
function funnelDamage(state: HealthStoreState, amount: number, at: number): void {
  const safe = Number.isFinite(amount) && amount > 0 ? amount : 0
  state.player = applyDamage(state.player, safe)
  state.isAlive = isAliveModel(state.player)
  if (safe > 0) state.lastDamageAt = at
}

const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {
    /**
     * Typed damage event — the public funnel all player damage flows through.
     * `prepare` stamps `Date.now()` when the caller omits `at` so reducers stay
     * pure (tests can pass an explicit `at` for determinism).
     */
    applyPlayerDamage: {
      reducer(state, action: PayloadAction<Required<DamageEvent>>) {
        funnelDamage(state, action.payload.amount, action.payload.at)
      },
      prepare(event: DamageEvent) {
        return {
          payload: {
            amount: event.amount,
            source: event.source ?? 'unknown',
            kind: event.kind ?? 'physical',
            at: event.at ?? Date.now(),
          } satisfies Required<DamageEvent>,
        }
      },
    },
    /** Numeric convenience (legacy callers / bleed ticks); routes through the funnel. */
    damagePlayer: {
      reducer(state, action: PayloadAction<{ amount: number; at: number }>) {
        funnelDamage(state, action.payload.amount, action.payload.at)
      },
      prepare(amount: number) {
        return { payload: { amount, at: Date.now() } }
      },
    },
    healPlayer(state, action: PayloadAction<number>) {
      state.player = healDamage(state.player, action.payload)
      state.isAlive = isAliveModel(state.player)
    },
    resetPlayerHealth(state) {
      state.player = createHealth(PLAYER_MAX_HP)
      state.isAlive = true
      state.lastDamageAt = null
    },
    /** Overwrite player health from a loaded save (Continue). */
    restorePlayerHealth(state, action: PayloadAction<HealthState>) {
      state.player = { current: action.payload.current, max: action.payload.max }
      state.isAlive = isAliveModel(state.player)
    },
  },
})

export const {
  applyPlayerDamage,
  damagePlayer,
  healPlayer,
  resetPlayerHealth,
  restorePlayerHealth,
} = healthSlice.actions
export const healthReducer = healthSlice.reducer

/** Player HP (`current`/`max`). */
export const selectPlayerHealth = (state: { health: HealthStoreState }): HealthState =>
  state.health.player
/** Whether the player is currently alive (`current > 0`). */
export const selectIsAlive = (state: { health: HealthStoreState }): boolean =>
  state.health.isAlive
/** Epoch ms of the last damage applied this life, or `null`. */
export const selectLastDamageAt = (state: { health: HealthStoreState }): number | null =>
  state.health.lastDamageAt
