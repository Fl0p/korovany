/**
 * Camera screen-shake: applies a random positional offset to the camera's
 * target each frame for a configurable duration.
 *
 * Engine-agnostic: receives a setter for the camera offset so it works with any
 * Babylon camera type and stays unit-testable without a real GPU.
 */

export interface ScreenShakeParams {
  /** Duration of the shake in seconds. */
  duration: number
  /** Maximum displacement in each axis (scene units). */
  amplitude: number
}

export const DEFAULT_SHAKE_PARAMS: ScreenShakeParams = {
  duration: 0.15,
  amplitude: 0.12,
}

export class ScreenShakeManager {
  private timer = 0
  private readonly params: ScreenShakeParams

  constructor(params: ScreenShakeParams = DEFAULT_SHAKE_PARAMS) {
    this.params = params
  }

  /** Trigger a new shake (re-triggers if one is already running). */
  trigger(): void {
    this.timer = this.params.duration
  }

  /** Returns true while a shake is active. */
  get isActive(): boolean {
    return this.timer > 0
  }

  /**
   * Advance by `dt` seconds.
   * Returns `[dx, dy]` offset to add to the camera position this frame,
   * or `[0, 0]` when idle.
   */
  update(dt: number): [number, number] {
    if (this.timer <= 0) return [0, 0]
    this.timer = Math.max(0, this.timer - dt)

    // Decay amplitude linearly toward 0 as the shake winds down.
    const progress = this.timer / this.params.duration
    const amp = this.params.amplitude * progress

    const dx = (Math.random() * 2 - 1) * amp
    const dy = (Math.random() * 2 - 1) * amp
    return [dx, dy]
  }
}
