/**
 * Pure, engine-agnostic respawn scheduler for caravan anchors.
 *
 * Input: now (ms) + per-anchor last-defeat timestamps.
 * Output: which anchor indices have re-armed and are ready for a fresh caravan.
 *
 * No Babylon imports — fully unit-testable with vitest.
 */

/** Cooldown between a caravan's defeat and a fresh one appearing at the same anchor. */
export const CARAVAN_RESPAWN_MS = 60_000

export interface AnchorRespawnState {
  /** Timestamp (ms) when this anchor's caravan was last defeated, or null if never. */
  defeatedAt: number | null
}

/**
 * Given the current time and the per-anchor defeat history, return the indices
 * of anchors whose cooldown has elapsed and that should spawn a fresh caravan.
 *
 * An anchor re-arms when:
 * 1. It was previously defeated (defeatedAt !== null).
 * 2. The cooldown has elapsed (now - defeatedAt >= CARAVAN_RESPAWN_MS).
 *
 * The caller is responsible for clearing the state (reset defeatedAt to null)
 * after spawning the fresh caravan so this function does not fire again next frame.
 */
export function getAnchorsToRearm(
  now: number,
  anchors: readonly AnchorRespawnState[],
  cooldownMs = CARAVAN_RESPAWN_MS,
): number[] {
  const result: number[] = []
  for (let i = 0; i < anchors.length; i++) {
    const { defeatedAt } = anchors[i]
    if (defeatedAt !== null && now - defeatedAt >= cooldownMs) {
      result.push(i)
    }
  }
  return result
}
