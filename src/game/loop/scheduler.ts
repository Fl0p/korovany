import type { RegisterOptions, System } from './types'

interface Entry<W> {
  system: System<W>
  order: number
  /** Monotonic registration sequence, used as a stable tie-breaker. */
  seq: number
}

/**
 * Holds the ordered set of systems and runs them for one fixed step.
 *
 * Ordering is deterministic: systems run by ascending `order` (default `0`),
 * and ties fall back to registration order. This keeps a frame's mutations
 * reproducible regardless of how the underlying engine schedules rendering.
 */
export class SystemScheduler<W = unknown> {
  private entries: Entry<W>[] = []
  private nextSeq = 0
  private dirty = false

  /** Register a system. Re-registering the same instance is a no-op. */
  register(system: System<W>, options: RegisterOptions = {}): void {
    if (this.has(system)) return
    this.entries.push({ system, order: options.order ?? 0, seq: this.nextSeq++ })
    this.dirty = true
  }

  /** Remove a previously registered system. Returns whether it was present. */
  unregister(system: System<W>): boolean {
    const index = this.entries.findIndex((e) => e.system === system)
    if (index === -1) return false
    this.entries.splice(index, 1)
    return true
  }

  /** Whether a system instance is currently registered. */
  has(system: System<W>): boolean {
    return this.entries.some((e) => e.system === system)
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
    // Snapshot so a system that registers/unregisters during update() does not
    // alter iteration mid-step.
    const entries = this.entries.slice()
    for (const entry of entries) {
      entry.system.update(dt, world)
    }
  }

  private sortIfNeeded(): void {
    if (!this.dirty) return
    // Stable sort by (order, seq) — seq guarantees a total order so the result
    // is deterministic even where Array.prototype.sort stability is unclear.
    this.entries.sort((a, b) => a.order - b.order || a.seq - b.seq)
    this.dirty = false
  }
}
