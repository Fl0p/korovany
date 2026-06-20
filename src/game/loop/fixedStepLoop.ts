import { SystemScheduler } from './scheduler'

/** Default fixed timestep: 60 simulation steps per second. */
export const DEFAULT_DT = 1 / 60
/** Default cap on simulation steps consumed in a single `advance()` call. */
export const DEFAULT_MAX_SUB_STEPS = 5

export interface FixedStepLoopOptions<W> {
  /** Shared world value passed to every system. */
  world: W
  /** Fixed timestep in seconds. Defaults to {@link DEFAULT_DT} (1/60). */
  dt?: number
  /**
   * Maximum simulation steps per `advance()` call. Bounds catch-up work so a
   * long stall (debugger pause, backgrounded tab) cannot trigger a
   * spiral-of-death where each frame falls further behind. Defaults to
   * {@link DEFAULT_MAX_SUB_STEPS}.
   */
  maxSubSteps?: number
  /** Scheduler to run each step. A fresh one is created when omitted. */
  scheduler?: SystemScheduler<W>
}

/**
 * Fixed-timestep update loop decoupled from render FPS.
 *
 * Real elapsed time is fed in via {@link advance}; the loop accumulates it and
 * runs the scheduler with a constant `dt`, catching up across multiple steps
 * when a frame ran long. A `maxSubSteps` clamp drops excess backlog so the
 * simulation stays stable after a stall instead of spiralling.
 *
 * The loop owns no clock and no `requestAnimationFrame` — the host (a Babylon
 * scene, a test) decides when and with what elapsed time to call `advance()`,
 * which keeps this module pure and jsdom-testable.
 */
export class FixedStepLoop<W = unknown> {
  readonly dt: number
  readonly maxSubSteps: number
  readonly scheduler: SystemScheduler<W>
  private readonly world: W
  private accumulator = 0

  constructor(options: FixedStepLoopOptions<W>) {
    this.world = options.world
    this.dt = options.dt ?? DEFAULT_DT
    if (!(this.dt > 0)) {
      throw new RangeError(`FixedStepLoop dt must be > 0, got ${this.dt}`)
    }
    this.maxSubSteps = options.maxSubSteps ?? DEFAULT_MAX_SUB_STEPS
    if (!Number.isInteger(this.maxSubSteps) || this.maxSubSteps < 1) {
      throw new RangeError(
        `FixedStepLoop maxSubSteps must be a positive integer, got ${this.maxSubSteps}`,
      )
    }
    this.scheduler = options.scheduler ?? new SystemScheduler<W>()
  }

  /** Time carried over toward the next fixed step, in seconds (`0 <= acc < dt`). */
  get pending(): number {
    return this.accumulator
  }

  /**
   * Interpolation factor in `[0, 1)` for the in-progress step — the fraction of
   * `dt` already accumulated. Renderers can use it to interpolate between the
   * previous and current simulation state for smooth visuals.
   */
  get alpha(): number {
    return this.accumulator / this.dt
  }

  /**
   * Feed real elapsed time (seconds) since the last frame and run as many fixed
   * steps as it covers, up to `maxSubSteps`. Returns the number of steps run.
   *
   * Negative or non-finite `frameTime` is treated as zero (e.g. a clock that
   * jumped backwards), so it never runs steps or corrupts the accumulator.
   */
  advance(frameTime: number): number {
    if (Number.isFinite(frameTime) && frameTime > 0) {
      this.accumulator += frameTime
    }

    let steps = 0
    while (this.accumulator >= this.dt && steps < this.maxSubSteps) {
      this.scheduler.run(this.dt, this.world)
      this.accumulator -= this.dt
      steps++
    }

    // Spiral-of-death guard: if we stopped on the clamp with backlog still
    // queued, discard whole-step debt but keep the sub-step remainder so `alpha`
    // stays meaningful.
    if (this.accumulator >= this.dt) {
      this.accumulator %= this.dt
    }

    return steps
  }

  /** Run exactly one fixed step immediately, ignoring the accumulator. */
  step(): void {
    this.scheduler.run(this.dt, this.world)
  }

  /** Discard any accumulated time (e.g. after a manual scene reset). */
  reset(): void {
    this.accumulator = 0
  }
}
