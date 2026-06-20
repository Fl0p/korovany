import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DT,
  DEFAULT_MAX_SUB_STEPS,
  FixedStepLoop,
} from './fixedStepLoop'
import type { Clock } from './types'

/** A fake clock whose reading we advance by hand — no `performance.now`. */
function fakeClock(start = 0): Clock & { advance(ms: number): void; set(ms: number): void } {
  let now = start
  const clock = (() => now) as ReturnType<typeof fakeClock>
  clock.advance = (ms: number) => {
    now += ms
  }
  clock.set = (ms: number) => {
    now = ms
  }
  return clock
}

/** A loop whose only system counts the steps it runs, recording each dt. */
function countingLoop(opts: { dt?: number; maxSubSteps?: number; clock?: Clock } = {}) {
  const dts: number[] = []
  const loop = new FixedStepLoop<null>({ world: null, ...opts })
  loop.registerSystem({ name: 'counter', update: (dt) => dts.push(dt) })
  return { loop, dts }
}

describe('FixedStepLoop.advance', () => {
  it('uses defaults of 60 Hz and a 5-step clamp', () => {
    const { loop } = countingLoop()
    expect(loop.dt).toBeCloseTo(DEFAULT_DT)
    expect(loop.maxSubSteps).toBe(DEFAULT_MAX_SUB_STEPS)
  })

  it('runs one step when exactly one dt elapses', () => {
    const { loop, dts } = countingLoop({ dt: 1 / 60 })
    expect(loop.advance(1 / 60)).toBe(1)
    expect(dts).toEqual([1 / 60])
  })

  it('always steps with the fixed dt regardless of the variable frame time', () => {
    const { loop, dts } = countingLoop({ dt: 0.02 })
    loop.advance(0.05) // 2 whole steps + 0.01 remainder
    loop.advance(0.03) // remainder 0.01 + 0.03 = 0.04 → 2 more steps
    expect(dts).toEqual([0.02, 0.02, 0.02, 0.02])
    expect(loop.pending).toBeCloseTo(0)
  })

  it('drains the accumulator across many frames to the correct total step count', () => {
    const { loop, dts } = countingLoop({ dt: 1 / 60 })
    // 100 frames of ~16.7ms each ≈ 1.667s of sim time → 100 steps.
    for (let i = 0; i < 100; i++) loop.advance(1 / 60)
    expect(dts).toHaveLength(100)
  })

  it('carries sub-step remainder between frames', () => {
    const { loop, dts } = countingLoop({ dt: 0.01 })
    expect(loop.advance(0.015)).toBe(1) // 1 step, 0.005 left over
    expect(loop.pending).toBeCloseTo(0.005)
    expect(loop.advance(0.006)).toBe(1) // 0.005 + 0.006 = 0.011 → 1 step
    expect(dts).toHaveLength(2)
  })

  it('clamps catch-up to maxSubSteps on a huge frame gap (spiral-of-death guard)', () => {
    const { loop, dts } = countingLoop({ dt: 0.01, maxSubSteps: 3 })
    // 1s gap would be 100 steps; the clamp caps it at 3.
    expect(loop.advance(1)).toBe(3)
    expect(dts).toHaveLength(3)
    // Backlog is discarded, not deferred — the next frame does not avalanche.
    expect(loop.pending).toBeLessThan(loop.dt)
    expect(loop.advance(0.01)).toBe(1)
  })

  it('ignores negative, zero, and non-finite frame times', () => {
    const { loop, dts } = countingLoop({ dt: 0.01 })
    expect(loop.advance(-5)).toBe(0)
    expect(loop.advance(0)).toBe(0)
    expect(loop.advance(Number.NaN)).toBe(0)
    expect(loop.advance(Number.POSITIVE_INFINITY)).toBe(0)
    expect(dts).toHaveLength(0)
  })

  it('is decoupled from render rate: same elapsed time → same step count', () => {
    // Same 1.0s of elapsed time, delivered as few big frames vs many small ones.
    const fps30 = countingLoop({ dt: 1 / 60 })
    for (let i = 0; i < 30; i++) fps30.loop.advance(1 / 30)

    const fps144 = countingLoop({ dt: 1 / 60 })
    for (let i = 0; i < 144; i++) fps144.loop.advance(1 / 144)

    expect(fps30.dts).toHaveLength(60)
    expect(fps144.dts).toHaveLength(60)
  })

  it('is deterministic: identical frame-time sequences produce identical output', () => {
    const seq = [0.008, 0.05, 0.001, 0.02, 0.033]
    const a = countingLoop({ dt: 1 / 60 })
    const b = countingLoop({ dt: 1 / 60 })
    for (const f of seq) a.loop.advance(f)
    for (const f of seq) b.loop.advance(f)
    expect(a.dts).toEqual(b.dts)
  })

  it('exposes alpha as the fraction of dt accumulated', () => {
    const { loop } = countingLoop({ dt: 0.02 })
    loop.advance(0.005)
    expect(loop.alpha).toBeCloseTo(0.25)
  })

  it('reset() clears the accumulator', () => {
    const { loop } = countingLoop({ dt: 0.02 })
    loop.advance(0.005)
    loop.reset()
    expect(loop.pending).toBe(0)
  })

  it('step() runs exactly one step ignoring the accumulator', () => {
    const { loop, dts } = countingLoop({ dt: 0.02 })
    loop.step()
    expect(dts).toEqual([0.02])
    expect(loop.pending).toBe(0)
  })
})

describe('FixedStepLoop.tick (injected clock)', () => {
  it('runs no steps on the first tick — it only seeds the baseline', () => {
    const clock = fakeClock(1000)
    const { loop, dts } = countingLoop({ dt: 0.01, clock })
    expect(loop.tick()).toBe(0)
    expect(dts).toHaveLength(0)
  })

  it('advances by the clock delta between ticks', () => {
    const clock = fakeClock(0)
    const { loop, dts } = countingLoop({ dt: 0.01, clock })
    loop.tick() // seed at t=0
    clock.advance(25) // 25ms = 0.025s → 2 steps, 0.005 remainder
    expect(loop.tick()).toBe(2)
    clock.advance(6) // 0.005 + 0.006 = 0.011 → 1 step
    expect(loop.tick()).toBe(1)
    expect(dts).toHaveLength(3)
  })

  it('ignores a backwards clock jump', () => {
    const clock = fakeClock(1000)
    const { loop, dts } = countingLoop({ dt: 0.01, clock })
    loop.tick()
    clock.set(500) // clock went backwards
    expect(loop.tick()).toBe(0)
    expect(dts).toHaveLength(0)
  })

  it('reset() re-seeds so a long pause is not replayed as one huge frame', () => {
    const clock = fakeClock(0)
    const { loop, dts } = countingLoop({ dt: 0.01, maxSubSteps: 5, clock })
    loop.tick()
    loop.reset()
    clock.advance(10_000) // 10s pause
    expect(loop.tick()).toBe(0) // first tick after reset only re-seeds
    clock.advance(20) // normal frame resumes
    expect(loop.tick()).toBe(2)
    expect(dts).toHaveLength(2)
  })
})

describe('FixedStepLoop construction', () => {
  it('rejects a non-positive dt', () => {
    expect(() => new FixedStepLoop({ world: null, dt: 0 })).toThrow(/dt must be/)
    expect(() => new FixedStepLoop({ world: null, dt: -1 })).toThrow(/dt must be/)
  })

  it('rejects a non-integer or sub-1 maxSubSteps', () => {
    expect(() => new FixedStepLoop({ world: null, maxSubSteps: 0 })).toThrow(/maxSubSteps/)
    expect(() => new FixedStepLoop({ world: null, maxSubSteps: 2.5 })).toThrow(/maxSubSteps/)
  })

  it('drives registered systems in order through advance()', () => {
    const log: string[] = []
    const loop = new FixedStepLoop<null>({ world: null, dt: 0.01 })
    loop.registerSystem({ name: 'b', order: 2, update: () => log.push('b') })
    loop.registerSystem({ name: 'a', order: 1, update: () => log.push('a') })
    loop.advance(0.01)
    expect(log).toEqual(['a', 'b'])
  })
})
