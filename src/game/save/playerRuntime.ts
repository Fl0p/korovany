import type { PlayerTransform } from './types'

/**
 * Bridge between the React/UI layer (which decides *when* to save and load) and
 * the Babylon scene (which owns the *live* player transform).
 *
 * The UI never reaches into Babylon directly. The active scene registers a
 * {@link PlayerHandle} on boot; the UI then:
 *
 * - **Autosaves** (on pause) by calling {@link readPlayerTransform} to grab the
 *   live capsule pose, and
 * - **Continues** by calling {@link applyPlayerTransform} to teleport the live
 *   player to a loaded save's pose.
 *
 * For the case where a scene has not booted yet (e.g. a future scene mounted
 * after Continue), the pose is also staged with {@link stageSpawn} and consumed
 * at boot via {@link takeSpawn}. Together these cover "scene already running" and
 * "scene boots later".
 *
 * Health and zone id travel through the Redux `player` slice, not this bridge —
 * only the Babylon-owned transform needs it.
 */

/** What the active scene exposes to the save system. */
export interface PlayerHandle {
  /** Read the live capsule pose. */
  read(): PlayerTransform
  /** Teleport the live capsule to a pose (resetting fall velocity). */
  write(transform: PlayerTransform): void
}

let handle: PlayerHandle | null = null

/**
 * Register the active scene's player handle. Returns an unregister function;
 * call it on scene dispose so a torn-down scene never lingers as the source of
 * truth.
 */
export function registerPlayer(playerHandle: PlayerHandle): () => void {
  handle = playerHandle
  return () => {
    if (handle === playerHandle) handle = null
  }
}

/** The live player transform, or `null` when no player scene is mounted. */
export function readPlayerTransform(): PlayerTransform | null {
  return handle ? handle.read() : null
}

/**
 * Teleport the live player to `transform`. Returns `true` if a scene was mounted
 * to receive it, `false` otherwise (caller should rely on {@link stageSpawn}).
 */
export function applyPlayerTransform(transform: PlayerTransform): boolean {
  if (!handle) return false
  handle.write(transform)
  return true
}

let pendingSpawn: PlayerTransform | null = null

/** Stage a spawn transform for the next scene boot (used by Continue). */
export function stageSpawn(transform: PlayerTransform): void {
  pendingSpawn = transform
}

/**
 * Consume the staged spawn, clearing it. Returns `null` when nothing was staged
 * (a fresh New Game), in which case the scene uses its own default spawn.
 */
export function takeSpawn(): PlayerTransform | null {
  const spawn = pendingSpawn
  pendingSpawn = null
  return spawn
}
