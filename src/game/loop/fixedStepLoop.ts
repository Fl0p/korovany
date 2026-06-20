import { SystemScheduler } from './scheduler'
import type { Clock, System } from './types'

/** Default fixed timestep: 60 simulation steps per second. */
export const DEFAULT_DT = 1 / 60
/** Default cap on simulation steps consumed in a single catch-up. */
export const DEFAULT_MAX_SUB_STEPS = 5
const STEP_EPSILON = 1e-12

/** Real `performance.now` when present, else a 0 stub (the loop will no-op). */
const defaultClock: Clock = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : 0

export interface FixedStepLoopOptions<W> {
  /** Shared world value passed to every system on every step. */
  world: W
  /** Fixed timestep in seconds. Defaults to {@link DEFAULT_DT} (1/60). */
  dt?: number
  /**
   * Maximum simulation steps consumed per frame. Bounds catch-up work so a
   * long stall (debugger pause, backgrounded tab, GC hitch) cannot trigger a
   * spiral of death where each frame falls further behind and never recovers.
   * Defaults to {@link DEFAULT_MAX_SUB_STEPS}.
   */
  maxSubSteps?: number
  /**
   * Time source in milliseconds for {@link tick}. Injectable so tests drive the
   * loop deterministically without `performance.now`. Defaults to
   * `performance.now`.
   */
  clock?: Clock
  /** Scheduler to run each step. A fresh one is created when omitted. */
  scheduler?: SystemScheduler<W>
}

/**
 * Fixed-timestep update loop decoupled from render FPS.
 *
 * The simulation always advances in constant `dt` increments no matter how
 * fast or jittery the render frames arrive. Two entry points feed it time:
 *
 * - {@link advance} — the pure core: you pass the elapsed seconds explicitly.
 *   Deterministic and clock-free, so unit tests can replay an exact frame-time
 *   sequence and assert the resulting step count and ordering.
 * - {@link tick} — reads the injected clock, computes the delta since the last
 *   tick itself, and forwards it to {@link advance}. This is what the render
 *   loop calls each frame.
 *
 * Elapsed time is accumulated and drained one `dt` at a time, catching up
 * across multiple steps after a long frame, with `maxSubSteps` capping the
 * catch-up so the loop stays stable instead of spiralling.
 */
export class FixedStepLoop<W = unknown> {
  readonly dt: number
  readonly maxSubSteps: number
  readonly scheduler: SystemScheduler<W>
  private readonly world: W
  private readonly clock: Clock
  private accumulator = 0
  /** Clock reading (ms) at the previous {@link tick}, or null before the first. */
  private lastNow: number | null = null

  constructor(options: FixedStepLoopOptions<W>) {
    this.world = options.world
    this.dt = options.dt ?? DEFAULT_DT
    if (!(this.dt > 0)) {
      throw new RangeError(`FixedStepLoop: dt must be > 0, got ${this.dt}`)
    }
    this.maxSubSteps = options.maxSubSteps ?? DEFAULT_MAX_SUB_STEPS
    if (!Number.isInteger(this.maxSubSteps) || this.maxSubSteps < 1) {
      throw new RangeError(
        `FixedStepLoop: maxSubSteps must be a positive integer, got ${this.maxSubSteps}`,
      )
    }
    this.clock = options.clock ?? defaultClock
    this.scheduler = options.scheduler ?? new SystemScheduler<W>()
  }

  /** Register a system to run each fixed step. See {@link SystemScheduler.registerSystem}. */
  registerSystem(system: System<W>): void {
    this.scheduler.registerSystem(system)
  }

  /** Time carried toward the next fixed step, in seconds (`0 <= pending < dt`). */
  get pending(): number {
    return this.accumulator
  }

  /**
   * Interpolation factor in `[0, 1)` — the fraction of `dt` already
   * accumulated. Renderers can use it to interpolate between the previous and
   * current simulation state for smooth visuals between fixed steps.
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
    while (this.accumulator + STEP_EPSILON >= this.dt && steps < this.maxSubSteps) {
      this.scheduler.run(this.dt, this.world)
      this.accumulator -= this.dt
      steps++
    }

    // Spiral-of-death guard: if we stopped on the `maxSubSteps` clamp with a
    // backlog still queued, discard it entirely. After a catastrophic stall the
    // leftover time is meaningless, and keeping it would let the accumulator
    // grow unbounded and avalanche on later frames.
    if (this.accumulator >= this.dt) {
      this.accumulator = 0
    } else if (Math.abs(this.accumulator) < STEP_EPSILON) {
      // Snap tiny floating-point residue (e.g. after draining an exact multiple
      // of `dt`) back to zero so it cannot accrete into a spurious extra step.
      this.accumulator = 0
    }

    return steps
  }

  /**
   * Read the injected clock, compute the elapsed time since the previous tick,
   * and {@link advance} the simulation by it. Returns the number of fixed steps
   * run. The first tick only seeds the clock baseline and runs no steps.
   *
   * Call this once per render frame to drive the loop from real time.
   */
  tick(): number {
    const now = this.clock()
    if (this.lastNow === null) {
      this.lastNow = now
      return 0
    }
    const elapsedSeconds = (now - this.lastNow) / 1000
    this.lastNow = now
    return this.advance(elapsedSeconds)
  }

  /** Run exactly one fixed step immediately, ignoring the accumulator. */
  step(): void {
    this.scheduler.run(this.dt, this.world)
  }

  /**
   * Discard accumulated time and forget the clock baseline (e.g. after a scene
   * reset or a long pause) so the next {@link tick} re-seeds instead of
   * replaying the gap as one huge frame.
   */
  reset(): void {
    this.accumulator = 0
    this.lastNow = null
  }
}
