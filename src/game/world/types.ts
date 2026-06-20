import type { PlayerTransform } from '../save'

/**
 * The faction that owns a world zone. Ids are stable string keys (the save
 * format and UI both reference them); `ownerLabel` on a {@link ZoneDefinition}
 * carries the human-readable name.
 */
export type Faction = 'neutral' | 'empire' | 'forest-elves' | 'villain'

/**
 * Canonical id for each of the four world zones (game-plan §0 table). These are
 * persisted in saves via `playerSlice.zoneId`, so they are forever — never
 * rename one without a save migration.
 */
export type ZoneId = 'human-lands' | 'empire' | 'forest' | 'mountains'

/**
 * Whether a zone has a playable scene yet.
 *
 * - `available` — has a real (or stub) GameScene; fast-travel teleports here.
 * - `locked` — declared so the world map can list all four zones, but not built
 *   yet (E3.1 ships Forest + Human lands). The UI must disable travel to these.
 */
export type ZoneStatus = 'available' | 'locked'

/**
 * Streaming entry point for a zone — the hook E3.2 grows into load/unload on
 * border crossing. E3.1 resolves `sceneKey` to a Babylon scene factory eagerly
 * in the scenes layer (`src/scenes/zoneScenes.ts`) and seeds `manifestId` props.
 */
export interface ZoneStreaming {
  /** Asset-manifest id for this zone's environment props (E3.2 will stream these). */
  manifestId: string
  /** Scene key the scenes layer maps to a GameScene factory. */
  sceneKey: string
}

/** A single world zone the player can travel to (or see as locked). */
export interface ZoneDefinition {
  readonly id: ZoneId
  /** Short title shown in the world map (e.g. "Forest"). */
  readonly displayName: string
  /** Lore name from `docs/guide/world-specs.md` (e.g. "The Emerald Thicket of Lysaen"). */
  readonly loreName: string
  /** Owning faction id. */
  readonly ownerFaction: Faction
  /** Human-readable owner label shown in the world map (e.g. "Forest Elves"). */
  readonly ownerLabel: string
  /** Where the player capsule spawns when fast-travelling here. */
  readonly spawn: PlayerTransform
  readonly status: ZoneStatus
  readonly streaming: ZoneStreaming
}
