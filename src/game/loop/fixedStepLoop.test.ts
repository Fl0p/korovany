import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DT,
  DEFAULT_MAX_SUB_STEPS,
  FixedStepLoop,
} from './fixedStepLoop'
import { SystemScheduler } from './scheduler'
import type { System } from './types'

interface CountWorld {
  steps: number
  dts: number[]
}

/** A system that counts steps and records the dt it was handed. */
function counter(): System<CountWorld> {
  return {
    update: (dt, world) => {
      world.steps++
      world.dts.push(dt)
    },
  }
}

function makeLoop(opts: { dt?: number; maxSubSteps?: number } = {}) {
  const world: CountWorld = { steps: 0, dts: [] }
  const loop = new FixedStepLoop<CountWorld>({ world, ...opts })
  loop.scheduler.register(counter())
  return { loop, world }
}

describe('FixedStepLoop', () => {
  it('defaults to a 1/60 timestep and a 5-step clamp', () => {
    const { loop } = makeLoop()
    expect(loop.dt).toBeCloseTo(DEFAULT_DT)
    expect(loop.dt).toBeCloseTo(1 / 60)
    expect(loop.maxSubSteps).toBe(DEFAULT_MAX_SUB_STEPS)
  })

  it('runs every step with the fixed dt regardless of frame cadence', () => {
    const dt = 1 / 60
    // High clamp so catch-up is never throttled — this test isolates
    // cadence-independence, not the spiral-of-death guard.
    const { loop, world } = makeLoop({ dt, maxSubSteps: 1000 })

    // The same elapsed time delivered as wildly uneven frames must produce the
    // same step count as one combined frame — the loop tracks accumulated time,
    // not frame boundaries.
    const frames = [0.004, 0.05, 0.001, 0.2, 0.008, 0.137, 0.6]
    const total = frames.reduce((a, b) => a + b, 0)
    for (const f of frames) loop.advance(f)

    const reference = makeLoop({ dt, maxSubSteps: 1000 })
    reference.loop.advance(total)

    expect(world.steps).toBe(reference.world.steps)
    // Every system call saw exactly the fixed dt, never the frame time.
    expect(world.dts.every((d) => d === dt)).toBe(true)
  })

  it('produces the same step count for steady vs bursty frames', () => {
    const steady = makeLoop({ maxSubSteps: 1000 })
    for (let i = 0; i < 100; i++) steady.loop.advance(1 / 60)

    const bursty = makeLoop({ maxSubSteps: 1000 })
    // Same total elapsed time, delivered in 10 big chunks.
    for (let i = 0; i < 10; i++) bursty.loop.advance(10 / 60)

    expect(bursty.world.steps).toBe(steady.world.steps)
    expect(steady.world.steps).toBe(100)
  })

  it('accumulates sub-step time across frames', () => {
    const dt = 1 / 60
    const { loop, world } = makeLoop({ dt })

    loop.advance(dt * 0.5)
    expect(world.steps).toBe(0) // not enough yet
    loop.advance(dt * 0.5)
    expect(world.steps).toBe(1) // two halves make one step
  })

  it('clamps catch-up under a long stall to avoid a spiral of death', () => {
    const maxSubSteps = 5
    const { loop, world } = makeLoop({ maxSubSteps })

    // A 10-second stall would be 600 steps unclamped.
    const ran = loop.advance(10)

    expect(ran).toBe(maxSubSteps)
    expect(world.steps).toBe(maxSubSteps)
  })

  it('does not let backlog leak into the next frame after a clamp', () => {
    const { loop, world } = makeLoop({ maxSubSteps: 5 })

    loop.advance(10) // hits the clamp, discards whole-step debt
    expect(world.steps).toBe(5)

    // Next frame with no elapsed time must run nothing — the backlog is gone.
    const ran = loop.advance(0)
    expect(ran).toBe(0)
    expect(world.steps).toBe(5)
  })

  it('reports an interpolation alpha in [0, 1)', () => {
    const dt = 1 / 60
    const { loop } = makeLoop({ dt })

    loop.advance(dt * 0.25)
    expect(loop.alpha).toBeCloseTo(0.25)
    expect(loop.pending).toBeCloseTo(dt * 0.25)

    loop.advance(dt * 0.5)
    expect(loop.alpha).toBeCloseTo(0.75)
  })

  it('ignores negative and non-finite frame times', () => {
    const { loop, world } = makeLoop()

    expect(loop.advance(-1)).toBe(0)
    expect(loop.advance(Number.NaN)).toBe(0)
    expect(loop.advance(Number.POSITIVE_INFINITY)).toBe(0)
    expect(world.steps).toBe(0)
    expect(loop.pending).toBe(0)
  })

  it('step() runs a single fixed step ignoring the accumulator', () => {
    const dt = 1 / 60
    const { loop, world } = makeLoop({ dt })

    loop.advance(dt * 0.4) // accumulate but do not trigger a step
    expect(world.steps).toBe(0)

    loop.step()
    expect(world.steps).toBe(1)
    expect(world.dts.at(-1)).toBe(dt)
    expect(loop.pending).toBeCloseTo(dt * 0.4) // accumulator untouched
  })

  it('reset() discards accumulated time', () => {
    const dt = 1 / 60
    const { loop } = makeLoop({ dt })
    loop.advance(dt * 0.9)
    loop.reset()
    expect(loop.pending).toBe(0)
  })

  it('accepts an external scheduler', () => {
    const world: CountWorld = { steps: 0, dts: [] }
    const scheduler = new SystemScheduler<CountWorld>()
    scheduler.register(counter())
    const loop = new FixedStepLoop<CountWorld>({ world, scheduler })

    expect(loop.scheduler).toBe(scheduler)
    loop.advance(1 / 60)
    expect(world.steps).toBe(1)
  })

  it('rejects an invalid dt or maxSubSteps', () => {
    const world: CountWorld = { steps: 0, dts: [] }
    expect(() => new FixedStepLoop({ world, dt: 0 })).toThrow(RangeError)
    expect(() => new FixedStepLoop({ world, dt: -1 })).toThrow(RangeError)
    expect(() => new FixedStepLoop({ world, maxSubSteps: 0 })).toThrow(RangeError)
    expect(() => new FixedStepLoop({ world, maxSubSteps: 1.5 })).toThrow(RangeError)
  })
})
