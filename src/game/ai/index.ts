export type { SoldierFSMParams, SoldierFSMState, SoldierPhase, SoldierStepResult } from './soldierFSM'
export {
  applyDamageToSoldier,
  createSoldierFSM,
  DEFAULT_SOLDIER_PARAMS,
  stepSoldierFSM,
} from './soldierFSM'

export type {
  CaravanFSMParams,
  CaravanFSMState,
  CaravanPhase,
  CaravanStepResult,
  Waypoint,
} from './caravanFSM'
export {
  applyDamageToCaravan,
  createCaravanFSM,
  DEFAULT_CARAVAN_PARAMS,
  stepCaravanFSM,
} from './caravanFSM'
