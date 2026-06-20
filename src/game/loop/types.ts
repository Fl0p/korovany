/**
 * Core types for the fixed-step game loop.
 *
 * Engine-agnostic: nothing here imports Babylon or React, so the loop and its
 * systems run unmodified under jsdom for unit tests.
 */

/**
 * A unit of game logic advanced once per fixed timestep.
 *
 * Systems receive the fixed delta time (`dt`, in seconds) and a shared `world`
 * value. The `world` is whatever the caller threads through the loop (an ECS
 * world, a plain state bag, the Redux store, …) — the loop never inspects it.
 */
export interface System<W = unknown> {
  /** Optional label, useful for debugging and deterministic-ordering tests. */
  readonly name?: string
  /** Advance this system by one fixed step. */
  update(dt: number, world: W): void
}

/** Options accepted when registering a system with the scheduler. */
export interface RegisterOptions {
  /**
   * Explicit ordering key. Systems run in ascending `order`; ties are broken by
   * registration order (stable). Defaults to `0`, so unordered systems keep
   * their insertion order.
   */
  order?: number
}
