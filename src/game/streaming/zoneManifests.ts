import type { Vec3 } from '../combat'
import type { ZoneAssetPlacement, ZoneManifest } from './zoneStreaming'

/**
 * Per-zone streaming content (E3.2 wiring, FLO-345).
 *
 * A {@link ZoneManifest} is the pure, engine-agnostic description of *what* a
 * zone streams and *where* — the data the {@link ZoneStreamingManager} loads on
 * entry and disposes on exit. Keeping it free of Babylon/React means it can be
 * unit-tested on its own and kept in lockstep with the E3.1 zone registry
 * (`src/game/world/zones.ts`) and the registry seeding in the scene factories.
 *
 * Asset ids here MUST be registered (url + metadata) by the owning scene before
 * a manager enters the zone — see `seedForestAssets` in `scenes/forestScene.ts`.
 * Zones whose environment is still procedural (human-lands landmarks) or that
 * have no scene yet (empire, mountains) declare an empty manifest until a later
 * asset ticket gives them streamed GLBs.
 */

/** Conifer tree scattered through the forest clearing (FLO-299). */
export const FOREST_TREE_ASSET_ID = 'env.forest-tree'
/** Wooden hut placed at the edge of the forest clearing (FLO-299). */
export const WOODEN_HUT_ASSET_ID = 'env.wooden-hut'
/** Healing chest tucked into the forest as visible recovery pickup decor (FLO-473). */
export const FOREST_CHEST_ASSET_ID = 'prop.forest-chest'
/** Static cargo crate used as forest caravan-camp decor (FLO-470). */
export const FOREST_CARGO_CRATE_ASSET_ID = 'prop.forest-cargo-crate'
/** Display wagon prop near the spawn-side raid route (FLO-470). */
export const FOREST_CARAVAN_WAGON_ASSET_ID = 'prop.forest-caravan-wagon'
/** Retired hero GLB reused as static forest elf NPC decor (FLO-470). */
export const FOREST_STATIC_ELF_ASSET_ID = 'npc.forest-static-elf'
/** Ruined watchtower placed in the first forest map as a landmark (FLO-476). */
export const FOREST_WATCHTOWER_ASSET_ID = 'landmark.forest-watchtower'

// Forest conifers are no longer streamed via this manifest (FLO-482). The
// streaming loader ref-counts ONE cached model per asset id, so every
// `FOREST_TREE_ASSET_ID` placement collapsed onto a single shared root and the
// forest only ever showed one (white, material-less) tree. The trees are now a
// greened, thin-instanced ×1–×3 scatter — see `scenes/forestTrees.ts` and
// `generateForestTreePlacements` — drawn in one call per submesh regardless of
// count. `FOREST_TREE_ASSET_ID` stays registered in `seedForestAssets` as the
// canonical asset id (the field loads the same GLB directly).

/** Hut positions: a small settlement at one edge of the clearing. */
const FOREST_HUT_POSITIONS: readonly [number, number][] = [
  [-10, 10],
  [-14, 6],
  [-7, 15],
]

export const FOREST_HEALING_CHEST_PLACEMENTS: readonly ZoneAssetPlacement[] = [
  {
    assetId: FOREST_CHEST_ASSET_ID,
    position: { x: -2.6, y: 0, z: -6.8 },
    rotationY: -0.35,
  },
  {
    assetId: FOREST_CHEST_ASSET_ID,
    position: { x: 4.8, y: 0, z: 4.6 },
    rotationY: 1.2,
  },
  {
    assetId: FOREST_CHEST_ASSET_ID,
    position: { x: -10.2, y: 0, z: 9.7 },
    rotationY: 0.25,
  },
  {
    assetId: FOREST_CHEST_ASSET_ID,
    position: { x: 13.2, y: 0, z: -4.4 },
    rotationY: -1.1,
  },
]

const FOREST_LEFTOVER_PLACEMENTS: readonly ZoneAssetPlacement[] = [
  {
    assetId: FOREST_WATCHTOWER_ASSET_ID,
    position: { x: 12.5, y: 0, z: -13.5 },
    rotationY: -0.55,
  },
  {
    assetId: FOREST_CARAVAN_WAGON_ASSET_ID,
    position: { x: -5.5, y: 0, z: -9 },
    rotationY: Math.PI / 2,
  },
  ...FOREST_HEALING_CHEST_PLACEMENTS,
  {
    assetId: FOREST_CARGO_CRATE_ASSET_ID,
    position: { x: -7.4, y: 0, z: -6.1 },
    rotationY: 0.45,
  },
  {
    assetId: FOREST_STATIC_ELF_ASSET_ID,
    position: { x: 5.5, y: 0, z: 7.5 },
    rotationY: -2.35,
  },
  {
    assetId: FOREST_STATIC_ELF_ASSET_ID,
    position: { x: -6.5, y: 0, z: 8.2 },
    rotationY: 2.25,
  },
]

/** Ground a scatter table at `y = 0`. */
function ground([x, z]: readonly [number, number]): Vec3 {
  return { x, y: 0, z }
}

const FOREST_MANIFEST: ZoneManifest = {
  id: 'forest',
  placements: [
    ...FOREST_HUT_POSITIONS.map((p) => ({ assetId: WOODEN_HUT_ASSET_ID, position: ground(p) })),
    ...FOREST_LEFTOVER_PLACEMENTS,
  ],
}

/**
 * Streamable content keyed by zone id (matches `playerSlice.zoneId` and the E3.1
 * registry). Empty manifests are intentional: the manager still "enters" the
 * zone (so the call site is uniform across travel) but loads nothing.
 */
export const ZONE_MANIFESTS: Readonly<Record<string, ZoneManifest>> = {
  forest: FOREST_MANIFEST,
  'human-lands': { id: 'human-lands', placements: [] },
  empire: { id: 'empire', placements: [] },
  mountains: { id: 'mountains', placements: [] },
}

/**
 * Resolve a zone's manifest. Unknown zones fall back to an empty manifest so a
 * scene can always enter *something* without a special-case — mirrors the
 * forest-fallback safety net in `createZoneScene`.
 */
export function getZoneManifest(zoneId: string): ZoneManifest {
  return ZONE_MANIFESTS[zoneId] ?? { id: zoneId, placements: [] }
}
