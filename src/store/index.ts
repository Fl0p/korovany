import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { appReducer } from './appSlice'
import { gameReducer } from './gameSlice'
import { healthReducer } from './healthSlice'
import { injuryReducer } from './injurySlice'
import { playerReducer } from './playerSlice'
import { streamingReducer } from './streamingSlice'

export const store = configureStore({
  reducer: {
    app: appReducer,
    game: gameReducer,
    health: healthReducer,
    injury: injuryReducer,
    player: playerReducer,
    streaming: streamingReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

export { continueGame, playerDied, respawn, returnToMenu, startNewGame, togglePause } from './appSlice'
export type { AppPhase, AppState } from './appSlice'
export { addScore, resetScore } from './gameSlice'
export type { GameState } from './gameSlice'
export {
  applyPlayerDamage,
  damagePlayer,
  healPlayer,
  resetPlayerHealth,
  restorePlayerHealth,
  selectIsAlive,
  selectLastDamageAt,
  selectPlayerHealth,
} from './healthSlice'
export type { DamageEvent, DamageKind, DamageSource, HealthStoreState } from './healthSlice'
export {
  advanceBleed,
  fitPlayerProsthetic,
  resetInjuries,
  selectHasHalfScreenBlackout,
  selectInjury,
  selectIsBleeding,
  selectIsCrawling,
  selectLocomotionSpeedMultiplier,
  severPlayerLimb,
  tickInjuries,
  treatPlayerBleeding,
} from './injurySlice'
export { restorePlayer, resetPlayer, setZone, DEFAULT_PLAYER_STATE } from './playerSlice'
export type { PlayerState } from './playerSlice'
export { setAssetPhase, selectIsStreamingLoading, selectStreamingPhases } from './streamingSlice'
export type { StreamingState } from './streamingSlice'
