import { describe, expect, it } from 'vitest'
import { isSaveData, migrate, parseSaveData } from './schema'
import { SAVE_VERSION, type SaveData } from './types'

const valid: SaveData = {
  version: SAVE_VERSION,
  transform: { position: { x: 0, y: 1, z: 2 }, rotationY: 0.5 },
  health: { current: 80, max: 100 },
  zoneId: 'forest',
  savedAt: 42,
}

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
})
