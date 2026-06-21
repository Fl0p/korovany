import { describe, expect, it } from 'vitest'
import { ZONE_ORDER } from './zones'
import { allZoneIds, isDevZoneUnlockEnabled } from './devUnlock'

describe('isDevZoneUnlockEnabled (FLO-469 dev zone unlock)', () => {
  it('is off in a prod build with the flag unset (shipped behaviour unchanged)', () => {
    expect(isDevZoneUnlockEnabled({ DEV: false })).toBe(false)
  })

  it('is on in a dev build by default', () => {
    expect(isDevZoneUnlockEnabled({ DEV: true })).toBe(true)
  })

  it('honours an explicit opt-in even in a prod build (deployed preview)', () => {
    expect(isDevZoneUnlockEnabled({ DEV: false, VITE_DEV_UNLOCK_ZONES: 'true' })).toBe(true)
  })

  it('honours an explicit opt-out even in a dev build (exercise the real gate)', () => {
    expect(isDevZoneUnlockEnabled({ DEV: true, VITE_DEV_UNLOCK_ZONES: 'false' })).toBe(false)
  })

  it('ignores values other than the exact "true"/"false" strings', () => {
    // Only the canonical strings flip the explicit branches; anything else falls
    // through to the DEV default.
    expect(isDevZoneUnlockEnabled({ DEV: true, VITE_DEV_UNLOCK_ZONES: '1' })).toBe(true)
    expect(isDevZoneUnlockEnabled({ DEV: false, VITE_DEV_UNLOCK_ZONES: 'yes' })).toBe(false)
  })
})

describe('allZoneIds', () => {
  it('returns every registered zone in display order', () => {
    expect(allZoneIds()).toEqual([...ZONE_ORDER])
  })

  it('returns a fresh array (mutating it does not corrupt ZONE_ORDER)', () => {
    const ids = allZoneIds()
    ids.push('atlantis' as never)
    expect(allZoneIds()).toEqual([...ZONE_ORDER])
  })
})
