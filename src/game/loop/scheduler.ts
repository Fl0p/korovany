import type { System } from './types'

interface Entry<W> {
  system: System<W>
  order: number
  /** Monotonic registration sequence — the stable tie-breaker within an order. */
  seq: number
}

/**
 * Holds the ordered set of systems and runs them once per fixed step.
 *
 * Ordering is deterministic: systems run by ascending `order` (default `0`),
 * and ties fall back to registration order. The same set of registrations
 * therefore always produces the same per-tick execution order, regardless of
 * how the host engine schedules rendering.
 */
export class SystemScheduler<W = unknown> {
  private entries: Entry<W>[] = []
  private nextSeq = 0
  private dirty = false

  /**
   * Register a system. The spec is `{ name, order?, update }`. Names must be
   * unique — registering a duplicate name throws, so a wiring bug surfaces
   * immediately rather than running a system twice.
   */
  registerSystem(system: System<W>): void {
    if (this.has(system.name)) {
      throw new Error(`SystemScheduler: a system named "${system.name}" is already registered`)
    }
    this.entries.push({ system, order: system.order ?? 0, seq: this.nextSeq++ })
    this.dirty = true
  }

  /** Remove a system by name. Returns whether one was present. */
  unregister(name: string): boolean {
    const index = this.entries.findIndex((e) => e.system.name === name)
    if (index === -1) return false
    this.entries.splice(index, 1)
    return true
  }

  /** Whether a system with this name is currently registered. */
  has(name: string): boolean {
    return this.entries.some((e) => e.system.name === name)
  }

  /** Remove all systems. */
  clear(): void {
    this.entries = []
  }

  /** Number of registered systems. */
  get size(): number {
    return this.entries.length
  }

  /** Registered systems in run order. */
  systems(): System<W>[] {
    this.sortIfNeeded()
    return this.entries.map((e) => e.system)
  }

  /** Run every system once, in deterministic order, for a single fixed step. */
  run(dt: number, world: W): void {
    this.sortIfNeeded()
    // Snapshot so a system that (un)registers during its own update() does not
    // mutate the array mid-iteration; the change takes effect next tick.
    for (const entry of this.entries.slice()) {
      entry.system.update(dt, world)
    }
  }

  private sortIfNeeded(): void {
    if (!this.dirty) return
    // Sort by (order, seq). `seq` gives a total order so the result is
    // deterministic even where Array.prototype.sort stability is unspecified.
    this.entries.sort((a, b) => a.order - b.order || a.seq - b.seq)
    this.dirty = false
  }
}
