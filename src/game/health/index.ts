export type { HealthState } from './healthModel'
export { applyDamage, createHealth, healDamage, isAlive } from './healthModel'

export type { BleedTick, InjuryState, Limb, LimbStatus } from './injuryModel'
export type { LocomotionMode } from './locomotion'
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
  WHEELCHAIR_SPEED_MULTIPLIER,
  resolveLocomotionMode,
  resolveLocomotionSpeedMultiplier,
} from './locomotion'

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
export type { HealingChestSpec, HealingChestState, HealingChestTick } from './healingChest'
export {
  HEALING_CHEST_AMOUNT,
  HEALING_CHEST_COOLDOWN_SECONDS,
  HEALING_CHEST_RADIUS,
  createHealingChestStates,
  isInsideHealingChest,
  tickHealingChests,
} from './healingChest'
