import { describe, expect, it } from 'vitest'
import { SystemScheduler } from './scheduler'
import type { System } from './types'

/** A system that appends its label to the world (a shared log) when updated. */
function recorder(label: string): System<string[]> {
  return { name: label, update: (_dt, world) => world.push(label) }
}

describe('SystemScheduler', () => {
  it('runs systems in registration order by default', () => {
    const log: string[] = []
    const scheduler = new SystemScheduler<string[]>()
    scheduler.register(recorder('a'))
    scheduler.register(recorder('b'))
    scheduler.register(recorder('c'))

    scheduler.run(1 / 60, log)

    expect(log).toEqual(['a', 'b', 'c'])
  })

  it('orders by explicit order, breaking ties by registration order', () => {
    const log: string[] = []
    const scheduler = new SystemScheduler<string[]>()
    scheduler.register(recorder('late'), { order: 10 })
    scheduler.register(recorder('early'), { order: -5 })
    scheduler.register(recorder('mid-1')) // order 0
    scheduler.register(recorder('mid-2')) // order 0, registered after mid-1

    scheduler.run(1 / 60, log)

    expect(log).toEqual(['early', 'mid-1', 'mid-2', 'late'])
  })

  it('passes the fixed dt and world to each system', () => {
    const seen: Array<{ dt: number; world: object }> = []
    const world = { tick: 0 }
    const scheduler = new SystemScheduler<typeof world>()
    scheduler.register({ update: (dt, w) => seen.push({ dt, world: w }) })

    scheduler.run(0.5, world)

    expect(seen).toEqual([{ dt: 0.5, world }])
    expect(seen[0].world).toBe(world)
  })

  it('unregisters a system so it stops running', () => {
    const log: string[] = []
    const scheduler = new SystemScheduler<string[]>()
    const a = recorder('a')
    const b = recorder('b')
    scheduler.register(a)
    scheduler.register(b)

    expect(scheduler.unregister(a)).toBe(true)
    expect(scheduler.unregister(a)).toBe(false) // already gone
    scheduler.run(1 / 60, log)

    expect(log).toEqual(['b'])
    expect(scheduler.size).toBe(1)
  })

  it('ignores duplicate registration of the same instance', () => {
    const log: string[] = []
    const scheduler = new SystemScheduler<string[]>()
    const a = recorder('a')
    scheduler.register(a)
    scheduler.register(a)

    scheduler.run(1 / 60, log)

    expect(scheduler.size).toBe(1)
    expect(log).toEqual(['a'])
  })

  it('exposes systems in run order via systems()', () => {
    const log: string[] = []
    const scheduler = new SystemScheduler<string[]>()
    const a = recorder('a')
    const b = recorder('b')
    scheduler.register(b, { order: 1 })
    scheduler.register(a, { order: 0 })

    expect(scheduler.systems()).toEqual([a, b])
    // `log` is unused here but keeps the shared-world type inference identical
    // to the other cases; touch it to satisfy noUnusedLocals.
    expect(log).toEqual([])
  })

  it('does not let a system mutating the registry corrupt the current step', () => {
    const log: string[] = []
    const scheduler = new SystemScheduler<string[]>()
    const late = recorder('late')
    // `first` registers `late` during its own update; `late` must not run until
    // the next step, not mid-iteration.
    scheduler.register({
      name: 'first',
      update: (_dt, world) => {
        world.push('first')
        scheduler.register(late)
      },
    })

    scheduler.run(1 / 60, log)
    expect(log).toEqual(['first'])

    scheduler.run(1 / 60, log)
    expect(log).toEqual(['first', 'first', 'late'])
  })

  it('clears all systems', () => {
    const log: string[] = []
    const scheduler = new SystemScheduler<string[]>()
    scheduler.register(recorder('a'))
    scheduler.clear()

    scheduler.run(1 / 60, log)

    expect(scheduler.size).toBe(0)
    expect(log).toEqual([])
  })
})
