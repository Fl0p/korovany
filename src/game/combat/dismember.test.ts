import { describe, expect, it } from 'vitest'
import { createInjuryState, LIMBS, severLimb, type InjuryState } from '../health/injuryModel'
import { createRng, type Rng } from '../util/rng'
import {
  DISMEMBER_BASE_CHANCE,
  pickLimb,
  resolveDismember,
  severChance,
  shouldSever,
  type Hp,
} from './dismember'

const FULL: Hp = { current: 100, max: 100 }

/** A scripted RNG that yields the given values then repeats the last one. */
function scriptedRng(values: number[]): Rng {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

describe('severChance', () => {
  it('is zero for a non-damaging hit', () => {
    expect(severChance(0, FULL)).toBe(0)
    expect(severChance(-5, FULL)).toBe(0)
  })

  it('is zero when max HP is non-positive', () => {
    expect(severChance(10, { current: 0, max: 0 })).toBe(0)
  })

  it('is at least the base chance on any damaging hit at full HP', () => {
    // Tiny scratch at full HP → only the flat base chance.
    expect(severChance(1, FULL)).toBeCloseTo(DISMEMBER_BASE_CHANCE + 0.6 * 0.01, 5)
  })

  it('rises with hit severity', () => {
    expect(severChance(50, FULL)).toBeGreaterThan(severChance(10, FULL))
  })

  it('rises as remaining HP falls', () => {
    const lowHp: Hp = { current: 10, max: 100 }
    expect(severChance(10, lowHp)).toBeGreaterThan(severChance(10, FULL))
  })

  it('clamps to 1', () => {
    // Max-severity hit that drops the player to 0 HP: 0.05 + 0.6 + 0.35 = 1.0.
    expect(severChance(100, { current: 0, max: 100 })).toBe(1)
  })
})

describe('shouldSever', () => {
  it('severs when the roll lands below the chance', () => {
    expect(shouldSever(50, FULL, () => 0)).toBe(true)
  })

  it('does not sever when the roll lands at or above the chance', () => {
    expect(shouldSever(50, FULL, () => 0.999)).toBe(false)
  })

  it('never severs a non-damaging hit (chance 0)', () => {
    expect(shouldSever(0, FULL, () => 0)).toBe(false)
  })
})

describe('pickLimb', () => {
  it('picks a still-intact limb', () => {
    const limb = pickLimb(createInjuryState(), () => 0)
    expect(LIMBS).toContain(limb)
  })

  it('never picks an already-severed limb', () => {
    // Sever all but rightLeg; any roll must land on rightLeg.
    let injury: InjuryState = createInjuryState()
    for (const l of LIMBS) if (l !== 'rightLeg') injury = severLimb(injury, l)
    for (const roll of [0, 0.25, 0.5, 0.75, 0.99]) {
      expect(pickLimb(injury, () => roll)).toBe('rightLeg')
    }
  })

  it('returns null when every limb is gone', () => {
    let injury: InjuryState = createInjuryState()
    for (const l of LIMBS) injury = severLimb(injury, l)
    expect(pickLimb(injury, () => 0)).toBeNull()
  })
})

describe('resolveDismember', () => {
  it('returns null when the sever roll fails', () => {
    expect(resolveDismember(50, FULL, createInjuryState(), () => 0.999)).toBeNull()
  })

  it('returns a limb when the sever roll succeeds', () => {
    // First roll (sever) low → true; second roll (pick) chooses a slot.
    const limb = resolveDismember(50, FULL, createInjuryState(), scriptedRng([0, 0]))
    expect(LIMBS).toContain(limb)
  })

  it('returns null when a successful roll finds no intact limb left', () => {
    let injury: InjuryState = createInjuryState()
    for (const l of LIMBS) injury = severLimb(injury, l)
    expect(resolveDismember(50, FULL, injury, scriptedRng([0, 0]))).toBeNull()
  })

  it('is deterministic for a given seed', () => {
    const a = resolveDismember(40, { current: 30, max: 100 }, createInjuryState(), createRng(1234))
    const b = resolveDismember(40, { current: 30, max: 100 }, createInjuryState(), createRng(1234))
    expect(a).toBe(b)
  })

  it('different seeds can yield different limbs', () => {
    // Force a sever every time with overkill (chance 1), then vary only the
    // pick stream by seed — proves the RNG actually drives limb selection.
    const overkill: Hp = { current: 0, max: 100 }
    const outcomes = new Set<string | null>()
    for (let seed = 0; seed < 20; seed++) {
      outcomes.add(resolveDismember(100, overkill, createInjuryState(), createRng(seed)))
    }
    expect(outcomes.size).toBeGreaterThan(1)
  })
})
