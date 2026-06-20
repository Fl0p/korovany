import { describe, expect, it } from 'vitest'
import { createSeededRng, seedFromString } from './seededRandom'

describe('createSeededRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createSeededRng(42)
    const b = createSeededRng(42)
    const seqA = [a.next(), a.next(), a.next(), a.next()]
    const seqB = [b.next(), b.next(), b.next(), b.next()]
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = createSeededRng(1)
    const b = createSeededRng(2)
    expect(a.next()).not.toBe(b.next())
  })

  it('returns floats in [0, 1)', () => {
    const rng = createSeededRng(7)
    for (let i = 0; i < 1000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('nextInt stays within the inclusive range', () => {
    const rng = createSeededRng(123)
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextInt(3, 8)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(8)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('nextInt covers both endpoints over many draws', () => {
    const rng = createSeededRng(99)
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) seen.add(rng.nextInt(1, 4))
    expect(seen).toEqual(new Set([1, 2, 3, 4]))
  })

  it('nextInt tolerates a reversed range', () => {
    const rng = createSeededRng(5)
    const v = rng.nextInt(10, 2)
    expect(v).toBeGreaterThanOrEqual(2)
    expect(v).toBeLessThanOrEqual(10)
  })

  it('coerces non-integer / negative seeds deterministically', () => {
    const a = createSeededRng(-1.5)
    const b = createSeededRng(-1.5)
    expect(a.next()).toBe(b.next())
  })

  it('exposes advancing internal state', () => {
    const rng = createSeededRng(1)
    const s0 = rng.state
    rng.next()
    expect(rng.state).not.toBe(s0)
  })
})

describe('seedFromString', () => {
  it('is stable for the same input', () => {
    expect(seedFromString('zone:forest')).toBe(seedFromString('zone:forest'))
  })

  it('differs for different inputs', () => {
    expect(seedFromString('a')).not.toBe(seedFromString('b'))
  })

  it('returns an unsigned 32-bit integer', () => {
    const h = seedFromString('caravan-1')
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThanOrEqual(0xffffffff)
    expect(Number.isInteger(h)).toBe(true)
  })
})
