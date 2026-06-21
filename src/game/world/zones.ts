import type { ZoneDefinition, ZoneId } from './types'

/**
 * The four world zones (game-plan §0). Forest and Human lands ship a playable
 * scene in E3.1; Empire (the palace) joins in E8.1 (FLO-427) and Mountains
 * (Black Crown Pass) in E8.2 (FLO-428). All four zones are now `available` with
 * playable scenes.
 *
 * Lore names and faction colour come from `docs/guide/world-specs.md`. Spawns
 * are the capsule pose each zone's scene teleports the player to on arrival.
 */
export const ZONES: Readonly<Record<ZoneId, ZoneDefinition>> = {
  'human-lands': {
    id: 'human-lands',
    displayName: 'Human lands',
    loreName: 'The Salt Road of Velya',
    ownerFaction: 'neutral',
    ownerLabel: 'Neutral',
    spawn: { position: { x: 0, y: 2, z: 0 }, rotationY: 0 },
    status: 'available',
    streaming: { manifestId: 'zone.human-lands', sceneKey: 'human-lands' },
  },
  empire: {
    id: 'empire',
    displayName: 'Empire',
    loreName: 'The Imperial March',
    ownerFaction: 'empire',
    ownerLabel: 'The Emperor',
    spawn: { position: { x: 0, y: 2, z: 0 }, rotationY: 0 },
    status: 'available', // playable palace scene (E8.1 / FLO-427)
    streaming: { manifestId: 'zone.empire', sceneKey: 'empire' },
  },
  forest: {
    id: 'forest',
    displayName: 'Forest',
    loreName: 'The Emerald Thicket of Lysaen',
    ownerFaction: 'forest-elves',
    ownerLabel: 'Forest Elves',
    spawn: { position: { x: 0, y: 2, z: 0 }, rotationY: 0 },
    status: 'available',
    streaming: { manifestId: 'zone.forest', sceneKey: 'forest' },
  },
  mountains: {
    id: 'mountains',
    displayName: 'Mountains',
    loreName: 'Black Crown Pass',
    ownerFaction: 'villain',
    ownerLabel: 'The Villain',
    spawn: { position: { x: 0, y: 2, z: 0 }, rotationY: 0 },
    status: 'available',
    streaming: { manifestId: 'zone.mountains', sceneKey: 'mountains' },
  },
}

/** Declaration order used by the world map (matches game-plan §0 table). */
export const ZONE_ORDER: readonly ZoneId[] = ['human-lands', 'empire', 'forest', 'mountains']

/**
 * Caravans the player must raid in a zone to **conquer** it (ADR 0005). Victory
 * is conquering every `available` zone, so this is the single source of truth the
 * win logic and HUD both read — co-located with {@link ZONES} so a new world ships
 * its quota in the same place as its definition.
 */
export const ZONE_CARAVAN_QUOTAS: Readonly<Record<ZoneId, number>> = {
  forest: 3,
  'human-lands': 5,
  empire: 6,
  mountains: 8,
}

/**
 * Campaign progression order (ADR 0005, "worlds unlock sequentially"). A zone
 * unlocks once the **previous** zone in this order is conquered; the first zone
 * (the New-Game spawn) is always unlocked. Distinct from {@link ZONE_ORDER},
 * which is purely the world-map display order. Locked zones (no scene yet) stay
 * untravelable regardless of where they sit in this sequence.
 */
export const ZONE_CONQUEST_ORDER: readonly ZoneId[] = [
  'forest',
  'human-lands',
  'empire',
  'mountains',
]
