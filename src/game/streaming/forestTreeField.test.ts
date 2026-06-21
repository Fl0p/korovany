import { describe, expect, it } from 'vitest'
import {
  FOREST_TREE_FIELD_CLEARING_RADIUS,
  FOREST_TREE_FIELD_COUNT,
  FOREST_TREE_FIELD_MAX_SCALE,
  FOREST_TREE_FIELD_MIN_SCALE,
  FOREST_TREE_FIELD_OUTER_RADIUS,
  generateForestTreePlacements,
} from './forestTreeField'

const radius = (p: { position: { x: number; z: number } }) =>
  Math.hypot(p.position.x, p.position.z)

describe('generateForestTreePlacements', () => {
  it('scatters the configured number of trees', () => {
    expect(generateForestTreePlacements()).toHaveLength(FOREST_TREE_FIELD_COUNT)
    expect(generateForestTreePlacements({ count: 30 })).toHaveLength(30)
  })

  it('places noticeably more trees than the 12 the streamed manifest used to', () => {
    // FLO-482 acceptance: "noticeably more trees" than the old hand-placed dozen.
    expect(FOREST_TREE_FIELD_COUNT).toBeGreaterThan(12 * 2)
  })

  it('keeps the spawn clearing clear and stays within the outer ring', () => {
    for (const p of generateForestTreePlacements()) {
      const r = radius(p)
      expect(r).toBeGreaterThanOrEqual(FOREST_TREE_FIELD_CLEARING_RADIUS - 1e-6)
      expect(r).toBeLessThanOrEqual(FOREST_TREE_FIELD_OUTER_RADIUS + 1e-6)
    }
  })

  it('grounds every tree at y = 0', () => {
    for (const p of generateForestTreePlacements()) {
      expect(p.position.y).toBe(0)
    }
  })

  it('gives each tree a random scale inside the ×1…×3 band', () => {
    for (const p of generateForestTreePlacements()) {
      expect(p.scale).toBeGreaterThanOrEqual(FOREST_TREE_FIELD_MIN_SCALE)
      expect(p.scale).toBeLessThan(FOREST_TREE_FIELD_MAX_SCALE)
    }
    expect(FOREST_TREE_FIELD_MIN_SCALE).toBe(1)
    expect(FOREST_TREE_FIELD_MAX_SCALE).toBe(3)
  })

  it('actually varies the sizes (not all the same scale)', () => {
    const scales = generateForestTreePlacements().map((p) => p.scale ?? 1)
    const distinct = new Set(scales.map((s) => s.toFixed(3)))
    // A real spread of sizes, not a single repeated value.
    expect(distinct.size).toBeGreaterThan(10)
    expect(Math.max(...scales) - Math.min(...scales)).toBeGreaterThan(1)
  })

  it('varies yaw so the scatter does not read as a uniform grid', () => {
    const yaws = generateForestTreePlacements().map((p) => p.rotationY ?? 0)
    expect(new Set(yaws.map((y) => y.toFixed(3))).size).toBeGreaterThan(10)
  })

  it('is deterministic: the same seed yields the identical forest (no flake)', () => {
    expect(generateForestTreePlacements()).toEqual(generateForestTreePlacements())
    expect(generateForestTreePlacements({ seed: 7 })).toEqual(
      generateForestTreePlacements({ seed: 7 }),
    )
  })

  it('produces a different forest for a different seed', () => {
    expect(generateForestTreePlacements({ seed: 1 })).not.toEqual(
      generateForestTreePlacements({ seed: 2 }),
    )
  })
})
