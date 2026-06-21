import { ZONE_ORDER } from './zones'
import type { ZoneId } from './types'

/** The subset of `import.meta.env` the dev-unlock gate reads. Narrowed so the
 *  resolver can be unit-tested with a plain object instead of the real Vite env. */
export interface DevUnlockEnv {
  readonly DEV?: boolean
  readonly VITE_DEV_UNLOCK_ZONES?: string
}

/**
 * Whether the dev-only "unlock every zone" override is active (FLO-469). When on,
 * the world map lets you fast-travel to any registered zone for inspection,
 * bypassing the ADR-0005 sequential conquest gate. Pure scene/zone-routing — it
 * does not touch save data or grant conquest credit.
 *
 * Resolution (first match wins):
 *  - `VITE_DEV_UNLOCK_ZONES=true`  → on  (works in any build, incl. a deployed preview)
 *  - `VITE_DEV_UNLOCK_ZONES=false` → off (lets a dev build exercise the real gate)
 *  - otherwise → on in dev builds (`import.meta.env.DEV`), off in prod builds.
 *
 * Prod builds (`DEV` false, flag unset) are unaffected: the conquest gate stands,
 * so shipped behaviour does not change.
 */
export function isDevZoneUnlockEnabled(env: DevUnlockEnv = import.meta.env): boolean {
  if (env.VITE_DEV_UNLOCK_ZONES === 'true') return true
  if (env.VITE_DEV_UNLOCK_ZONES === 'false') return false
  return Boolean(env.DEV)
}

/** Every registered zone id — the "unlocked" set the App feeds the travel gate
 *  when {@link isDevZoneUnlockEnabled} is on. */
export function allZoneIds(): ZoneId[] {
  return [...ZONE_ORDER]
}
