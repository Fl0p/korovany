import { describe, expect, it } from 'vitest'
import {
  conqueredZoneIds,
  evaluateOutcome,
  isZoneConquered,
  unlockedZoneIds,
} from './objectiveMachine'

// A representative two-world campaign (the shippable forest + human-lands set).
const QUOTAS = { forest: 3, 'human-lands': 5, empire: 6, mountains: 8 }
const AVAILABLE = ['forest', 'human-lands']
const ORDER = ['forest', 'human-lands', 'empire', 'mountains']

describe('isZoneConquered', () => {
  it('is conquered exactly when the raided count reaches the quota', () => {
    expect(isZoneConquered('forest', { forest: 2 }, QUOTAS)).toBe(false)
    expect(isZoneConquered('forest', { forest: 3 }, QUOTAS)).toBe(true)
    expect(isZoneConquered('forest', { forest: 4 }, QUOTAS)).toBe(true)
  })

  it('treats a missing count as zero', () => {
    expect(isZoneConquered('forest', {}, QUOTAS)).toBe(false)
  })

  it('a zone with no quota can never be conquered', () => {
    expect(isZoneConquered('nowhere', { nowhere: 99 }, QUOTAS)).toBe(false)
  })
})

describe('conqueredZoneIds', () => {
  it('lists only the zones whose count meets their quota', () => {
    expect(conqueredZoneIds({ forest: 3, 'human-lands': 1 }, QUOTAS)).toEqual(['forest'])
    expect(conqueredZoneIds({ forest: 3, 'human-lands': 5 }, QUOTAS)).toEqual([
      'forest',
      'human-lands',
    ])
  })

  it('is empty for a fresh run', () => {
    expect(conqueredZoneIds({}, QUOTAS)).toEqual([])
  })
})

describe('unlockedZoneIds (sequential unlock)', () => {
  it('unlocks only the first zone on a fresh run', () => {
    expect(unlockedZoneIds(ORDER, {}, QUOTAS)).toEqual(['forest'])
  })

  it('unlocks the next zone once the prior is conquered', () => {
    expect(unlockedZoneIds(ORDER, { forest: 3 }, QUOTAS)).toEqual(['forest', 'human-lands'])
  })

  it('unlocks the whole prefix as conquest chains forward', () => {
    expect(unlockedZoneIds(ORDER, { forest: 3, 'human-lands': 5 }, QUOTAS)).toEqual([
      'forest',
      'human-lands',
      'empire',
    ])
  })

  it('stops at the first un-conquered zone even if a later one is over quota', () => {
    // human-lands not conquered → empire stays locked despite its count.
    expect(unlockedZoneIds(ORDER, { forest: 3, empire: 6 }, QUOTAS)).toEqual([
      'forest',
      'human-lands',
    ])
  })
})

describe('evaluateOutcome (win/lose state machine)', () => {
  it('stays playing while no available world is conquered and the player is alive', () => {
    expect(
      evaluateOutcome({
        raidedByZone: {},
        quotas: QUOTAS,
        availableZoneIds: AVAILABLE,
        playerDead: false,
      }),
    ).toBe('playing')
  })

  it('stays playing when only some available worlds are conquered (partial)', () => {
    expect(
      evaluateOutcome({
        raidedByZone: { forest: 3, 'human-lands': 2 },
        quotas: QUOTAS,
        availableZoneIds: AVAILABLE,
        playerDead: false,
      }),
    ).toBe('playing')
  })

  it('does not win on raiding one zone past a flat 3 — conquest is per zone', () => {
    // 3 caravans in forest conquers forest but NOT human-lands → not a win.
    expect(
      evaluateOutcome({
        raidedByZone: { forest: 3 },
        quotas: QUOTAS,
        availableZoneIds: AVAILABLE,
        playerDead: false,
      }),
    ).toBe('playing')
  })

  it('wins when every available world is conquered', () => {
    expect(
      evaluateOutcome({
        raidedByZone: { forest: 3, 'human-lands': 5 },
        quotas: QUOTAS,
        availableZoneIds: AVAILABLE,
        playerDead: false,
      }),
    ).toBe('won')
  })

  it('ignores conquest of unavailable worlds (no early win, no requirement)', () => {
    // empire is over quota but not available → it neither blocks nor grants a win.
    expect(
      evaluateOutcome({
        raidedByZone: { forest: 3, 'human-lands': 5, empire: 6 },
        quotas: QUOTAS,
        availableZoneIds: AVAILABLE,
        playerDead: false,
      }),
    ).toBe('won')
  })

  it('loses when the player is dead, objective incomplete', () => {
    expect(
      evaluateOutcome({
        raidedByZone: { forest: 1 },
        quotas: QUOTAS,
        availableZoneIds: AVAILABLE,
        playerDead: true,
      }),
    ).toBe('lost')
  })

  it('death takes priority over a completed conquest', () => {
    expect(
      evaluateOutcome({
        raidedByZone: { forest: 3, 'human-lands': 5 },
        quotas: QUOTAS,
        availableZoneIds: AVAILABLE,
        playerDead: true,
      }),
    ).toBe('lost')
  })

  it('cannot win with an empty available set (nothing to conquer)', () => {
    expect(
      evaluateOutcome({
        raidedByZone: {},
        quotas: QUOTAS,
        availableZoneIds: [],
        playerDead: false,
      }),
    ).toBe('playing')
  })
})
