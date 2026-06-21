/**
 * Injury & dismemberment model — pure functions, no Babylon, no Redux.
 *
 * Tracks per-limb/organ status and derives the three canonical outcomes from
 * the brief (`docs/plan/game-plan.md` §0):
 *   - lose a hand → bleeding wound that drains HP until treated (bleed-out).
 *   - lose an eye → half-screen blackout.
 *   - lose a leg → crawl / reduced-speed locomotion.
 *
 * Bleed damage is funnelled into the health system via the `injury` Redux slice
 * (`tickInjuries`), so an untreated wound can bring the player to 0 HP and
 * trigger the existing death → menu transition.
 */

export type LimbStatus = 'intact' | 'severed'

export type Limb =
  | 'leftHand'
  | 'rightHand'
  | 'leftEye'
  | 'rightEye'
  | 'leftLeg'
  | 'rightLeg'

export interface InjuryState {
  leftHand: LimbStatus
  rightHand: LimbStatus
  leftEye: LimbStatus
  rightEye: LimbStatus
  leftLeg: LimbStatus
  rightLeg: LimbStatus
  /** True while an untreated bleeding wound (a severed hand) is draining HP. */
  bleeding: boolean
  /** Seconds accumulated toward the next bleed damage tick. */
  bleedElapsed: number
}

export const LIMBS: readonly Limb[] = [
  'leftHand',
  'rightHand',
  'leftEye',
  'rightEye',
  'leftLeg',
  'rightLeg',
]

const HANDS: readonly Limb[] = ['leftHand', 'rightHand']
const EYES: readonly Limb[] = ['leftEye', 'rightEye']
const LEGS: readonly Limb[] = ['leftLeg', 'rightLeg']

/** How often an untreated bleed deals damage. */
export const BLEED_INTERVAL_SECONDS = 1
/** HP lost per bleed interval. */
export const BLEED_DAMAGE_PER_INTERVAL = 3
/** Fraction of normal speed while crawling (a leg is lost). */
export const CRAWL_SPEED_MULTIPLIER = 0.35

export function createInjuryState(): InjuryState {
  return {
    leftHand: 'intact',
    rightHand: 'intact',
    leftEye: 'intact',
    rightEye: 'intact',
    leftLeg: 'intact',
    rightLeg: 'intact',
    bleeding: false,
    bleedElapsed: 0,
  }
}

/** Sever a limb. Losing a hand opens a bleeding wound. Idempotent. */
export function severLimb(state: InjuryState, limb: Limb): InjuryState {
  if (state[limb] === 'severed') return state
  const next: InjuryState = { ...state, [limb]: 'severed' }
  if (HANDS.includes(limb)) next.bleeding = true
  return next
}

/**
 * Fit a prosthetic / patch: restore a slot to `intact`. For an eye this clears
 * the half-screen blackout. Does not stop bleeding — use `treatBleeding`.
 */
export function fitProsthetic(state: InjuryState, limb: Limb): InjuryState {
  if (state[limb] === 'intact') return state
  return { ...state, [limb]: 'intact' }
}

/** Stop a bleeding wound (bandage / healing item). */
export function treatBleeding(state: InjuryState): InjuryState {
  if (!state.bleeding) return state
  return { ...state, bleeding: false, bleedElapsed: 0 }
}

export interface BleedTick {
  state: InjuryState
  /** HP damage to apply to the health system this tick (0 when not bleeding). */
  damage: number
}

/**
 * Advance bleed timers by `deltaSeconds`, accumulating whole-interval damage.
 * Pure: returns the next injury state plus the damage to funnel into health.
 */
export function tickBleed(state: InjuryState, deltaSeconds: number): BleedTick {
  if (!state.bleeding || deltaSeconds <= 0) {
    return { state, damage: 0 }
  }
  let elapsed = state.bleedElapsed + deltaSeconds
  let damage = 0
  while (elapsed >= BLEED_INTERVAL_SECONDS) {
    elapsed -= BLEED_INTERVAL_SECONDS
    damage += BLEED_DAMAGE_PER_INTERVAL
  }
  return { state: { ...state, bleedElapsed: elapsed }, damage }
}

// --- Derived outcomes -------------------------------------------------------

export function isBleeding(state: InjuryState): boolean {
  return state.bleeding
}

/** Half-screen blackout outcome: at least one eye is lost. */
export function hasHalfScreenBlackout(state: InjuryState): boolean {
  return EYES.some((eye) => state[eye] === 'severed')
}

/** Number of eyes lost (0–2). Two = full blackout territory. */
export function blindedEyeCount(state: InjuryState): number {
  return EYES.filter((eye) => state[eye] === 'severed').length
}

/** Crawl outcome: at least one leg is lost → reduced-speed locomotion. */
export function isCrawling(state: InjuryState): boolean {
  return LEGS.some((leg) => state[leg] === 'severed')
}

/** Locomotion speed multiplier from leg injuries (1 = normal, crawl otherwise). */
export function locomotionSpeedMultiplier(state: InjuryState): number {
  return isCrawling(state) ? CRAWL_SPEED_MULTIPLIER : 1
}

export function severedLimbs(state: InjuryState): Limb[] {
  return LIMBS.filter((limb) => state[limb] === 'severed')
}
