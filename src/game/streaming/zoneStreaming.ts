import type { Scene } from '@babylonjs/core'
import type { Vec3 } from '../combat'
import type { AssetStreamLoader } from './loader'
import { spawnStreamedInstance, type StreamedInstance } from './streamedInstance'

/**
 * Zone content streaming (E3.2).
 *
 * A zone's environment is a list of placed, streamed assets. The manager loads
 * the current zone's content on entry and **disposes the previous zone's
 * content** on exit so resident memory stays bounded as the player travels.
 *
 * It is a thin lifecycle layer over the FLO-294 {@link AssetStreamLoader}: each
 * placement is a `spawnStreamedInstance` (acquire → ref-count++), and eviction
 * calls `instance.release()` (ref-count-- → dispose at zero). Ref-counting means
 * assets shared between zones are not re-fetched on travel and not disposed while
 * any resident zone still holds them — the loader cache is the single authority
 * on what GLBs live in memory.
 */

/** One placed instance of a registered asset within a zone. */
export interface ZoneAssetPlacement {
  /** Asset id registered in the {@link AssetRegistry}. */
  readonly assetId: string
  /** World position for the instance root; defaults to the scene origin. */
  readonly position?: Vec3
  /** Yaw (radians) applied to the instance root; defaults to 0. */
  readonly rotationY?: number
}

/** The streamable content of a single zone. */
export interface ZoneManifest {
  /** Zone id — matches `playerSlice.zoneId` and the E3.1 zone registry. */
  readonly id: string
  /** Assets to spawn when the zone is resident. */
  readonly placements: readonly ZoneAssetPlacement[]
}

/** Spawner seam — defaults to {@link spawnStreamedInstance}, overridden in tests. */
export type SpawnInstanceFn = (
  loader: AssetStreamLoader,
  scene: Scene,
  assetId: string,
) => Promise<StreamedInstance>

export interface ZoneStreamingOptions {
  /**
   * How many zones may stay resident at once (LRU eviction). Default `1`: only
   * the just-entered zone is kept, so crossing a border disposes the zone left
   * behind. Raise to keep neighbours warm at the cost of memory.
   */
  maxResidentZones?: number
  /** Injectable spawner for tests. */
  spawn?: SpawnInstanceFn
}

interface ResidentZone {
  readonly id: string
  readonly instances: StreamedInstance[]
}

/**
 * Loads/unloads zone content on travel, keeping at most `maxResidentZones`
 * resident. Transitions are serialised: overlapping `enterZone` calls (rapid
 * travel) run in order so an in-flight load can never leak past its eviction.
 */
export class ZoneStreamingManager {
  private readonly maxResidentZones: number
  private readonly spawn: SpawnInstanceFn
  /** Insertion order == LRU order (oldest first). */
  private readonly resident = new Map<string, ResidentZone>()
  private queue: Promise<void> = Promise.resolve()
  private disposed = false

  constructor(
    private readonly scene: Scene,
    private readonly loader: AssetStreamLoader,
    options: ZoneStreamingOptions = {},
  ) {
    this.maxResidentZones = Math.max(1, options.maxResidentZones ?? 1)
    this.spawn = options.spawn ?? spawnStreamedInstance
  }

  /** Id of the most-recently-entered zone, or `null` before the first entry. */
  get currentZoneId(): string | null {
    let last: string | null = null
    for (const id of this.resident.keys()) last = id
    return last
  }

  /** Ids of all zones currently holding loaded content (LRU order). */
  get residentZoneIds(): string[] {
    return [...this.resident.keys()]
  }

  /** Total streamed instances held across all resident zones. */
  get residentInstanceCount(): number {
    let n = 0
    for (const zone of this.resident.values()) n += zone.instances.length
    return n
  }

  /**
   * Enter `manifest`'s zone: load its content, then evict zones beyond the
   * budget (disposing their meshes). Re-entering a resident zone just refreshes
   * its LRU position without reloading. Resolves once the transition settles.
   */
  enterZone(manifest: ZoneManifest): Promise<void> {
    const run = this.queue.then(() => this.transition(manifest))
    // Keep the queue chain alive even if a transition rejects.
    this.queue = run.catch(() => {})
    return run
  }

  private async transition(manifest: ZoneManifest): Promise<void> {
    if (this.disposed) return

    const existing = this.resident.get(manifest.id)
    if (existing) {
      // Already resident — bump to most-recently-used.
      this.resident.delete(manifest.id)
      this.resident.set(manifest.id, existing)
      this.evict()
      return
    }

    const instances = await Promise.all(
      manifest.placements.map(async (placement) => {
        const instance = await this.spawn(this.loader, this.scene, placement.assetId)
        if (placement.position) {
          instance.root.position.set(
            placement.position.x,
            placement.position.y,
            placement.position.z,
          )
        }
        if (placement.rotationY !== undefined) {
          instance.root.rotation.y = placement.rotationY
        }
        return instance
      }),
    )

    // A dispose() (or eviction of this same id) may have landed while we awaited.
    if (this.disposed || this.resident.has(manifest.id)) {
      for (const instance of instances) instance.release()
      return
    }

    this.resident.set(manifest.id, { id: manifest.id, instances })
    this.evict()
  }

  /** Drop least-recently-used zones until within budget. */
  private evict(): void {
    while (this.resident.size > this.maxResidentZones) {
      const oldestId = this.resident.keys().next().value as string
      this.releaseZone(oldestId)
    }
  }

  private releaseZone(id: string): void {
    const zone = this.resident.get(id)
    if (!zone) return
    this.resident.delete(id)
    for (const instance of zone.instances) instance.release()
  }

  /** Release every resident zone. Idempotent. */
  dispose(): void {
    this.disposed = true
    for (const id of [...this.resident.keys()]) this.releaseZone(id)
  }
}
