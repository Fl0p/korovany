export type { AttackPhase, Damageable, MeleeAttackParams, MeleeAttackState, Vec3 } from './meleeAttack'
export {
  createMeleeAttack,
  DEFAULT_MELEE_PARAMS,
  getMeleeHits,
  stepMeleeAttack,
} from './meleeAttack'
export { HitFlashManager, DEFAULT_HIT_FLASH_PARAMS } from './hitFlash'
export type { HitFlashParams } from './hitFlash'
export { DeathEmphasisManager, DEFAULT_DEATH_EMPHASIS_PARAMS } from './deathEmphasis'
export type { DeathEmphasisParams, TimeScaleable } from './deathEmphasis'
export {
  emitDamage,
  emitShake,
  emitKill,
  emitAttack,
  emitDismember,
  onDamage,
  onShake,
  onKill,
  onAttack,
  onDismember,
} from './damageEvents'
export type { DismemberEventListener } from './damageEvents'
export {
  DISMEMBER_BASE_CHANCE,
  DISMEMBER_SEVERITY_WEIGHT,
  DISMEMBER_LOW_HP_WEIGHT,
  severChance,
  shouldSever,
  pickLimb,
  resolveDismember,
} from './dismember'
export type { Hp } from './dismember'
