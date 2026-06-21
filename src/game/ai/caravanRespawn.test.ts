import { describe, expect, it } from 'vitest'
import { CARAVAN_RESPAWN_MS, getAnchorsToRearm } from './caravanRespawn'

describe('getAnchorsToRearm', () => {
  it('does not re-arm an anchor that was never defeated', () => {
    const anchors = [{ defeatedAt: null }, { defeatedAt: null }]
    expect(getAnchorsToRearm(999_999, anchors)).toEqual([])
  })

  it('does not re-arm an anchor whose cooldown has not elapsed', () => {
    const anchors = [{ defeatedAt: 1000 }]
    const now = 1000 + CARAVAN_RESPAWN_MS - 1
    expect(getAnchorsToRearm(now, anchors)).toEqual([])
  })

  it('re-arms an anchor exactly at the cooldown boundary', () => {
    const anchors = [{ defeatedAt: 1000 }]
    const now = 1000 + CARAVAN_RESPAWN_MS
    expect(getAnchorsToRearm(now, anchors)).toEqual([0])
  })

  it('re-arms only the elapsed anchors, leaves others alone', () => {
    const now = 100_000
    const anchors = [
      { defeatedAt: 1000 },      // elapsed
      { defeatedAt: null },       // never defeated
      { defeatedAt: now - 10 },   // too recent
      { defeatedAt: 2000 },       // elapsed
    ]
    expect(getAnchorsToRearm(now, anchors)).toEqual([0, 3])
  })

  it('respects a custom cooldown override', () => {
    const anchors = [{ defeatedAt: 0 }]
    expect(getAnchorsToRearm(5_000, anchors, 10_000)).toEqual([])
    expect(getAnchorsToRearm(10_000, anchors, 10_000)).toEqual([0])
  })
})
