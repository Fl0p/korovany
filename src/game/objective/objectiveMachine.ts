/**
 * The win/lose state machine + conquest derivation (MPG.1, reworked for the
 * world-conquest campaign — ADR 0005).
 *
 * Pure decision functions with no Redux, React, or Babylon dependency so the
 * core game questions — "is this zone conquered?", "which worlds are unlocked?",
 * "is the run still going, won, or lost?" — are exhaustively unit-testable. The
 * App layer feeds live per-zone progress each frame and drives the `appSlice`
 * phase from the result.
 *
 * Death takes priority over victory: a run can only be won while the player is
 * still alive (the moment the objective completes the sim freezes on the win
 * screen, so a post-victory death never reaches here in practice — but the
 * ordering keeps the function total and unambiguous).
 *
 * The win condition is **data-driven**: it reads the set of currently-available
 * zones (passed in by the caller from `ZONES.status`) and their quotas — there is
 * no hardcoded zone count, so it auto-extends to four worlds the moment empire and
 * mountains flip to `available`.
 */
export type RunOutcome = 'playing' | 'won' | 'lost'

/** Caravans raided per zone, keyed by zone id (stored in `gameSlice`). */
export type RaidedByZone = Readonly<Record<string, number>>

/** Caravans required to conquer each zone, keyed by zone id. */
export type ZoneQuotas = Readonly<Record<string, number>>

export interface ConquestProgress {
  /** Caravans raided so far this run, per zone. */
  raidedByZone: RaidedByZone
  /** Caravans required to conquer each zone. */
  quotas: ZoneQuotas
  /** Zone ids that are currently playable (`status === 'available'`). */
  availableZoneIds: readonly string[]
  /** Player HP has reached zero. */
  playerDead: boolean
}

/**
 * A zone is **conquered** when caravans raided in it reach its quota. A zone with
 * no quota (unknown id) can never be conquered.
 */
export function isZoneConquered(
  zoneId: string,
  raidedByZone: RaidedByZone,
  quotas: ZoneQuotas,
): boolean {
  const quota = quotas[zoneId]
  if (typeof quota !== 'number') return false
  return (raidedByZone[zoneId] ?? 0) >= quota
}

/** The set of conquered zone ids drawn from `quotas` (declaration order). */
export function conqueredZoneIds(raidedByZone: RaidedByZone, quotas: ZoneQuotas): string[] {
  return Object.keys(quotas).filter((id) => isZoneConquered(id, raidedByZone, quotas))
}

/**
 * Sequential unlock (ADR 0005): walking `conquestOrder`, the first zone is always
 * unlocked and each subsequent zone unlocks once the **previous** one is
 * conquered. Returns the unlocked prefix — the chain stops at the first
 * un-conquered zone. This is progression gating only; whether a zone has a
 * playable scene (`status`) is a separate concern the caller intersects.
 */
export function unlockedZoneIds(
  conquestOrder: readonly string[],
  raidedByZone: RaidedByZone,
  quotas: ZoneQuotas,
): string[] {
  const unlocked: string[] = []
  for (const zoneId of conquestOrder) {
    unlocked.push(zoneId)
    if (!isZoneConquered(zoneId, raidedByZone, quotas)) break
  }
  return unlocked
}

/**
 * Win = every **available** zone is conquered; lose = the player is dead (checked
 * first). An empty available set cannot win — there is nothing to conquer, so the
 * run stays `playing` (guards a degenerate/misconfigured zone table from declaring
 * an instant victory).
 */
export function evaluateOutcome(progress: ConquestProgress): RunOutcome {
  if (progress.playerDead) return 'lost'
  const { availableZoneIds, raidedByZone, quotas } = progress
  if (
    availableZoneIds.length > 0 &&
    availableZoneIds.every((id) => isZoneConquered(id, raidedByZone, quotas))
  ) {
    return 'won'
  }
  return 'playing'
}
