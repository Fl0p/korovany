/**
 * Death-emphasis effect: briefly drops the Babylon engine's time-scale to 0.3
 * for `duration` seconds, then ramps back to 1.0 — creating a slow-motion kill
 * punctuation.
 *
 * Uses `engine.timeScale` (Babylon 6+) which affects physics and animations
 * uniformly without touching any game-logic delta-time.
 */

export interface DeathEmphasisParams {
  /** Duration of the slow-motion window, in seconds of *wall-clock* time. */
  duration: number
  /** Time-scale while slowed (0–1). */
  slowScale: number
}

export const DEFAULT_DEATH_EMPHASIS_PARAMS: DeathEmphasisParams = {
  duration: 0.25,
  slowScale: 0.3,
}

export interface TimeScaleable {
  timeScale?: number
}

export class DeathEmphasisManager {
  private timer = 0
  private readonly params: DeathEmphasisParams
  private readonly engine: TimeScaleable

  constructor(engine: TimeScaleable, params: DeathEmphasisParams = DEFAULT_DEATH_EMPHASIS_PARAMS) {
    this.engine = engine
    this.params = params
  }

  /** Trigger a slow-motion burst (re-triggers if one is already active). */
  trigger(): void {
    this.timer = this.params.duration
    if (this.engine.timeScale !== undefined) this.engine.timeScale = this.params.slowScale
  }

  /** Advance by `dt` seconds of *wall-clock* time. Restores timeScale when done. */
  update(dt: number): void {
    if (this.timer <= 0) return
    this.timer = Math.max(0, this.timer - dt)
    if (this.timer <= 0 && this.engine.timeScale !== undefined) {
      this.engine.timeScale = 1
    }
  }

  get isActive(): boolean {
    return this.timer > 0
  }
}
