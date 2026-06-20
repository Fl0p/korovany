/**
 * Fixed-step game loop & system scheduler.
 *
 * Engine-agnostic (no Babylon/React): a render-FPS-independent simulation loop
 * plus a tiny system-registration API. See `docs/guide/game-loop.md`.
 */
export type { System, RegisterOptions } from './types'
export { SystemScheduler } from './scheduler'
export {
  FixedStepLoop,
  DEFAULT_DT,
  DEFAULT_MAX_SUB_STEPS,
  type FixedStepLoopOptions,
} from './fixedStepLoop'
