import { describe, expect, it } from 'vitest'
import { isSaveData, migrate, parseSaveData } from './schema'
import { SAVE_VERSION, type SaveData } from './types'
import { createInventory } from '../economy'

const valid: SaveData = {
  version: SAVE_VERSION,
  transform: { position: { x: 0, y: 1, z: 2 }, rotationY: 0.5 },
  health: { current: 80, max: 100 },
  zoneId: 'forest',
  inventory: { counts: { gold: 5 }, equippedItemId: null },
  savedAt: 42,
}

// A v1 save predates the `inventory` field (E3.4 / v2). Used to prove forward
// migration fills an empty inventory rather than dropping the save.
const v1Save = {
  version: 1,
  transform: { position: { x: 3, y: 1, z: -4 }, rotationY: 0 },
  health: { current: 50, max: 100 },
  zoneId: 'forest',
  savedAt: 7,
} as unknown as SaveData

describe('isSaveData', () => {
  it('accepts a well-formed record', () => {
    expect(isSaveData(valid)).toBe(true)
  })

  it.each([
    ['null', null],
    ['a string', 'nope'],
    ['missing transform', { ...valid, transform: undefined }],
    ['missing health', { ...valid, health: undefined }],
    ['bare-number health (pre-structured)', { ...valid, health: 100 }],
    ['health missing max', { ...valid, health: { current: 80 } }],
    ['non-finite position', { ...valid, transform: { position: { x: NaN, y: 0, z: 0 }, rotationY: 0 } }],
    ['missing zoneId', { ...valid, zoneId: undefined }],
    ['missing savedAt', { ...valid, savedAt: undefined }],
  ])('rejects %s', (_label, input) => {
    expect(isSaveData(input)).toBe(false)
  })
})

describe('parseSaveData', () => {
  it('returns the record for valid input', () => {
    expect(parseSaveData(valid)).toEqual(valid)
  })

  it('returns null for invalid input', () => {
    expect(parseSaveData({ garbage: true })).toBeNull()
  })
})

describe('migrate', () => {
  it('passes through a current-version record unchanged', () => {
    expect(migrate(valid)).toBe(valid)
  })

  it('stamps an unknown version up to the current one', () => {
    const old = { ...valid, version: 0 }
    expect(migrate(old).version).toBe(SAVE_VERSION)
  })

  it('migrates a v1 save forward with an empty inventory (v1 → v2)', () => {
    const migrated = migrate(v1Save)
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.inventory).toEqual(createInventory())
    // Pre-existing fields are carried through untouched.
    expect(migrated.transform).toEqual(v1Save.transform)
    expect(migrated.health).toEqual(v1Save.health)
    expect(migrated.zoneId).toBe('forest')
  })

  it('keeps an existing inventory when stamping an old version forward', () => {
    const old = { ...valid, version: 1, inventory: { counts: { blade: 1 }, equippedItemId: 'blade' } }
    expect(migrate(old).inventory).toEqual({ counts: { blade: 1 }, equippedItemId: 'blade' })
  })
})

describe('parseSaveData v1 → v2 round-trip', () => {
  it('loads a pre-inventory save and upgrades it to the current schema', () => {
    const parsed = parseSaveData(v1Save)
    expect(parsed).not.toBeNull()
    expect(parsed?.version).toBe(SAVE_VERSION)
    expect(parsed?.inventory).toEqual(createInventory())
  })
})
