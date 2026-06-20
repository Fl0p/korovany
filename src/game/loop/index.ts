/**
 * Fixed-step game loop & system scheduler.
 *
 * Engine-agnostic (no Babylon/React): a render-FPS-independent simulation loop
 * plus a tiny system-registration API. See the "Game loop & system scheduler"
 * section in `docs/guide/architecture.md` for the `update(dt, world)` contract,
 * ordering rules, and fixed-dt semantics.
 */
export type { System, Clock } from './types'
export { SystemScheduler } from './scheduler'
export {
  FixedStepLoop,
  DEFAULT_DT,
  DEFAULT_MAX_SUB_STEPS,
  type FixedStepLoopOptions,
} from './fixedStepLoop'
