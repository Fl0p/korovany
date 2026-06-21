export type { HealthState } from './healthModel'
export { applyDamage, createHealth, healDamage, isAlive } from './healthModel'

export type { BleedTick, InjuryState, Limb, LimbStatus } from './injuryModel'
export {
  BLEED_DAMAGE_PER_INTERVAL,
  BLEED_INTERVAL_SECONDS,
  CRAWL_SPEED_MULTIPLIER,
  LIMBS,
  blindedEyeCount,
  createInjuryState,
  fitProsthetic,
  hasHalfScreenBlackout,
  isBleeding,
  isCrawling,
  locomotionSpeedMultiplier,
  severLimb,
  severedLimbs,
  tickBleed,
  treatBleeding,
} from './injuryModel'

export {
  DISMEMBER_BASE_CHANCE,
  DISMEMBER_CHANCE_PER_DAMAGE,
  DISMEMBER_DAMAGE_THRESHOLD,
  DISMEMBER_MAX_CHANCE,
  dismemberChance,
  intactLimbs,
  pickLimb,
  resolveDismemberment,
  shouldSever,
} from './dismemberment'
