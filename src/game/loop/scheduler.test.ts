import { describe, expect, it, vi } from 'vitest'
import { SystemScheduler } from './scheduler'
import type { System } from './types'

/** A system that appends its name to a shared log when it updates. */
function recorder(name: string, log: string[], order?: number): System<unknown> {
  return { name, order, update: () => log.push(name) }
}

describe('SystemScheduler', () => {
  it('runs systems in registration order when no order is given', () => {
    const log: string[] = []
    const s = new SystemScheduler()
    s.registerSystem(recorder('a', log))
    s.registerSystem(recorder('b', log))
    s.registerSystem(recorder('c', log))

    s.run(1 / 60, null)

    expect(log).toEqual(['a', 'b', 'c'])
  })

  it('runs systems by ascending order, ties broken by registration order', () => {
    const log: string[] = []
    const s = new SystemScheduler()
    // Register out of order to prove `order` — not insertion — wins.
    s.registerSystem(recorder('render', log, 100))
    s.registerSystem(recorder('input', log, -10))
    s.registerSystem(recorder('physicsA', log, 0))
    s.registerSystem(recorder('physicsB', log, 0)) // tie with physicsA → after it

    s.run(1 / 60, null)

    expect(log).toEqual(['input', 'physicsA', 'physicsB', 'render'])
  })

  it('is deterministic: repeated runs keep the same order', () => {
    const log: string[] = []
    const s = new SystemScheduler()
    s.registerSystem(recorder('late', log, 5))
    s.registerSystem(recorder('early', log, 1))

    s.run(1 / 60, null)
    s.run(1 / 60, null)

    expect(log).toEqual(['early', 'late', 'early', 'late'])
  })

  it('passes dt and the world through to each system', () => {
    const update = vi.fn()
    const world = { hp: 10 }
    const s = new SystemScheduler<typeof world>()
    s.registerSystem({ name: 'probe', update })

    s.run(0.016, world)

    expect(update).toHaveBeenCalledWith(0.016, world)
  })

  it('rejects a duplicate system name', () => {
    const s = new SystemScheduler()
    s.registerSystem(recorder('dup', []))
    expect(() => s.registerSystem(recorder('dup', []))).toThrow(/already registered/)
  })

  it('unregisters by name and reports presence', () => {
    const log: string[] = []
    const s = new SystemScheduler()
    s.registerSystem(recorder('keep', log))
    s.registerSystem(recorder('drop', log))

    expect(s.unregister('drop')).toBe(true)
    expect(s.unregister('missing')).toBe(false)
    expect(s.has('drop')).toBe(false)
    expect(s.size).toBe(1)

    s.run(1 / 60, null)
    expect(log).toEqual(['keep'])
  })

  it('snapshots the system set so updates during a run take effect next tick', () => {
    const log: string[] = []
    const s = new SystemScheduler()
    s.registerSystem({
      name: 'spawner',
      update: () => {
        log.push('spawner')
        // Registering mid-run must not run the new system this same tick.
        if (!s.has('spawned')) s.registerSystem(recorder('spawned', log))
      },
    })

    s.run(1 / 60, null)
    expect(log).toEqual(['spawner']) // 'spawned' did not run this tick
    s.run(1 / 60, null)
    expect(log).toEqual(['spawner', 'spawner', 'spawned'])
  })

  it('exposes systems() in run order', () => {
    const s = new SystemScheduler()
    s.registerSystem(recorder('b', [], 2))
    s.registerSystem(recorder('a', [], 1))
    expect(s.systems().map((sys) => sys.name)).toEqual(['a', 'b'])
  })
})
