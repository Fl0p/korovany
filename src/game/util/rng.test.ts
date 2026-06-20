import { describe, expect, it } from 'vitest'
import { createRng, pick, randInt } from './rng'

describe('createRng', () => {
  it('is deterministic — same seed produces identical sequence', () => {
    const a = createRng(42)
    const b = createRng(42)
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b())
    }
  })

  it('different seeds produce different sequences', () => {
    const a = createRng(1)
    const b = createRng(2)
    const va = a()
    const vb = b()
    expect(va).not.toBe(vb)
  })

  it('returns values in [0, 1)', () => {
    const rng = createRng(99)
    for (let i = 0; i < 50; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('emits exact known values for seed 42', () => {
    const rng = createRng(42)
    expect([rng(), rng(), rng(), rng()]).toEqual([
      0.601_103_751_920_163_6,
      0.448_290_558_997_541_67,
      0.852_465_793_490_409_9,
      0.669_734_041_439_369_3,
    ])
  })
})

describe('randInt', () => {
  it('stays within [min, max] inclusive', () => {
    const rng = createRng(7)
    for (let i = 0; i < 200; i++) {
      const v = randInt(rng, 3, 10)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(10)
    }
  })

  it('tolerates swapped min/max', () => {
    const rng = createRng(7)
    const v = randInt(rng, 10, 3)
    expect(v).toBeGreaterThanOrEqual(3)
    expect(v).toBeLessThanOrEqual(10)
  })

  it('returns exactly min when min === max', () => {
    const rng = createRng(0)
    expect(randInt(rng, 5, 5)).toBe(5)
  })
})

describe('pick', () => {
  it('returns an element of the array', () => {
    const items = ['a', 'b', 'c', 'd'] as const
    const rng = createRng(13)
    for (let i = 0; i < 30; i++) {
      expect(items).toContain(pick(rng, items))
    }
  })

  it('throws on an empty array', () => {
    const rng = createRng(0)
    expect(() => pick(rng, [])).toThrow('pick: empty array')
  })

  it('is deterministic — same seed picks same element', () => {
    const items = [10, 20, 30, 40, 50]
    const a = createRng(5)
    const b = createRng(5)
    expect(pick(a, items)).toBe(pick(b, items))
  })
})
