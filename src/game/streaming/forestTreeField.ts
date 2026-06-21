import { createRng, type Rng } from '../util'
import type { VegetationPlacement } from './instancedVegetation'

/**
 * Deterministic forest-tree scatter (FLO-482).
 *
 * The forest's conifers are a single GLB (`forest-tree.glb`) thin-instanced
 * across the start zone via {@link createInstancedVegetation}. This module owns
 * the *placement data* — a pure, engine-free function that scatters many trees in
 * a ring around the spawn clearing with a per-tree random size and yaw.
 *
 * Why a seeded scatter instead of hand-placed positions: the board asked for
 * "noticeably more trees, random sizes ×1–×3, not a grid" (FLO-482). A seeded
 * PRNG ({@link createRng}, mulberry32) gives an organic, non-grid spread that is
 * still **deterministic** — the same seed always yields the same forest — so the
 * scatter is unit-testable and never flakes (no `Date.now()` seeding).
 *
 * The streamed single-tree manifest entry it replaces collapsed every placement
 * onto one shared cached root (the loader ref-counts one model per asset id), so
 * the old forest really only ever showed one tree. Thin-instancing draws the
 * whole field in one draw call per submesh regardless of count — no perf
 * regression from the higher tree count.
 */

/** Tunables for {@link generateForestTreePlacements}. All distances in scene units. */
export interface ForestTreeFieldOptions {
  /** How many trees to scatter. */
  readonly count?: number
  /** No tree is placed within this radius of the origin (keeps the spawn/combat clearing open). */
  readonly clearingRadius?: number
  /** Outer radius of the scatter ring. */
  readonly outerRadius?: number
  /** Minimum per-tree scale multiplier (×1 = the prototype's authored size). */
  readonly minScale?: number
  /** Maximum per-tree scale multiplier (×3 of the prototype's authored size). */
  readonly maxScale?: number
  /** PRNG seed — fixed for a reproducible forest; never `Date.now()` (flake-free tests). */
  readonly seed?: number
}

/**
 * Number of conifers scattered into the forest start zone. Comfortably more than
 * the 12 hand-placed positions the streamed manifest used to declare, so the
 * zone reads as a thicket (FLO-482 acceptance: "noticeably more trees").
 */
export const FOREST_TREE_FIELD_COUNT = 64

/** Radius kept clear of trees around the player spawn so combat/spawn props stay open. */
export const FOREST_TREE_FIELD_CLEARING_RADIUS = 7

/** Outer edge of the scatter ring — densifies the playable forest around spawn without filling the 600 m world. */
export const FOREST_TREE_FIELD_OUTER_RADIUS = 58

/** Smallest tree = the prototype's authored size (×1). */
export const FOREST_TREE_FIELD_MIN_SCALE = 1

/** Largest tree = ×3 of the prototype's authored size (FLO-482: "random ×1…×3"). */
export const FOREST_TREE_FIELD_MAX_SCALE = 3

/** Fixed seed so the scatter is reproducible across runs, builds, and tests. */
export const FOREST_TREE_FIELD_SEED = 0x0f0_4_82

/** Random float in `[min, max)` drawn from `rng`. */
function randRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min)
}

/**
 * Generate a deterministic scatter of forest trees as {@link VegetationPlacement}s.
 *
 * Each tree gets a uniformly random angle, a radius in
 * `[clearingRadius, outerRadius)` weighted by `sqrt` so density is even across the
 * disc (not bunched near the centre), a random yaw, and a random uniform scale in
 * `[minScale, maxScale)`. Pure + seeded: the same options always produce the same
 * array, so callers (and tests) get a stable forest.
 */
export function generateForestTreePlacements(
  options: ForestTreeFieldOptions = {},
): VegetationPlacement[] {
  const {
    count = FOREST_TREE_FIELD_COUNT,
    clearingRadius = FOREST_TREE_FIELD_CLEARING_RADIUS,
    outerRadius = FOREST_TREE_FIELD_OUTER_RADIUS,
    minScale = FOREST_TREE_FIELD_MIN_SCALE,
    maxScale = FOREST_TREE_FIELD_MAX_SCALE,
    seed = FOREST_TREE_FIELD_SEED,
  } = options

  const rng = createRng(seed)
  const placements: VegetationPlacement[] = []

  for (let i = 0; i < count; i++) {
    const angle = randRange(rng, 0, Math.PI * 2)
    // sqrt-weighted radius → uniform areal density across the annulus (an
    // un-weighted radius clumps trees toward the inner clearing edge).
    const t = rng()
    const radius = Math.sqrt(
      clearingRadius * clearingRadius +
        t * (outerRadius * outerRadius - clearingRadius * clearingRadius),
    )
    placements.push({
      position: {
        x: Math.cos(angle) * radius,
        y: 0,
        z: Math.sin(angle) * radius,
      },
      rotationY: randRange(rng, 0, Math.PI * 2),
      scale: randRange(rng, minScale, maxScale),
    })
  }

  return placements
}
