/**
 * Core types for the fixed-step game loop & system scheduler.
 *
 * Engine-agnostic on purpose: nothing here imports Babylon or React, so the
 * loop and its systems run unmodified under jsdom for unit tests.
 */

/**
 * A unit of game logic advanced once per fixed timestep.
 *
 * `update` receives the fixed delta time (`dt`, in seconds — always the loop's
 * configured step, never the variable render frame time) and the shared `world`
 * value the caller threads through the loop. The loop never inspects `world`;
 * it is whatever context the game needs (a state bag, an ECS world later, …).
 */
export interface System<W = unknown> {
  /** Stable identifier, used for ordering ties, debugging and `unregister`. */
  readonly name: string
  /**
   * Explicit ordering key. Systems run in ascending `order`; ties break by
   * registration order (stable). Defaults to `0`, so unordered systems keep
   * their insertion order.
   */
  readonly order?: number
  /** Advance this system by one fixed step. */
  update(dt: number, world: W): void
}

/**
 * A monotonic time source in milliseconds, shaped like `performance.now`.
 * Injectable so tests drive the loop with a fake clock instead of wall time.
 */
export type Clock = () => number
