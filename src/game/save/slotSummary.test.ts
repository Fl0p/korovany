import { beforeEach, describe, expect, it } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import {
  ALL_SLOT_IDS,
  buildSlotSummaries,
  clearSave,
  formatContinueHint,
  formatSaveSummary,
  listSlots,
  loadLatestRecord,
  loadSlot,
  saveGame,
} from './index'
import { FACTION_IDS } from '../faction'
import { createProgression } from '../progression'

const snapshot = {
  transform: { position: { x: 1, y: 2, z: 3 }, rotationY: 0.5 },
  health: { current: 55, max: 100 },
  zoneId: 'forest',
  inventory: { counts: { gold: 2 }, equippedItemId: null },
  playerFactionId: FACTION_IDS.ForestElves,
  progression: { ...createProgression(), level: 3, xp: 50 },
  caravansRaidedByZone: {},
}

describe('slot CRUD helpers', () => {
  let factory: IDBFactory

  beforeEach(() => {
    factory = new IDBFactory()
  })

  it('lists every occupied slot in ascending order', async () => {
    await saveGame({ ...snapshot, zoneId: 'forest' }, 100, { factory, slot: 2 })
    await saveGame({ ...snapshot, zoneId: 'empire' }, 200, { factory, slot: 0 })

    const records = await listSlots({ factory })
    expect(records.map((r) => r.slot)).toEqual([0, 2])
    expect(records[0].data.zoneId).toBe('empire')
  })

  it('loads one slot independently of latest()', async () => {
    await saveGame({ ...snapshot, zoneId: 'older' }, 100, { factory, slot: 0 })
    await saveGame({ ...snapshot, zoneId: 'newer' }, 200, { factory, slot: 1 })

    expect((await loadSlot(0, { factory }))?.zoneId).toBe('older')
    expect((await loadLatestRecord({ factory }))?.slot).toBe(1)
  })

  it('clears an individual slot without touching others', async () => {
    await saveGame(snapshot, 1, { factory, slot: 0 })
    await saveGame(snapshot, 2, { factory, slot: 1 })
    await clearSave({ factory, slot: 0 })

    const records = await listSlots({ factory })
    expect(records).toHaveLength(1)
    expect(records[0].slot).toBe(1)
  })
})

describe('buildSlotSummaries', () => {
  it('fills the fixed slot grid with empty placeholders', async () => {
    const factory = new IDBFactory()
    await saveGame(snapshot, 500, { factory, slot: 1 })

    const records = await listSlots({ factory })
    const summaries = buildSlotSummaries(records, ALL_SLOT_IDS)

    expect(summaries).toHaveLength(3)
    expect(summaries[0].isEmpty).toBe(true)
    expect(summaries[1].isEmpty).toBe(false)
    expect(summaries[1].isLatest).toBe(true)
    expect(summaries[2].isEmpty).toBe(true)
  })
})

describe('formatSaveSummary', () => {
  it('includes zone, level, HP, faction, and date', async () => {
    const factory = new IDBFactory()
    await saveGame(snapshot, 1_700_000_000_000, { factory, slot: 0 })
    const record = (await listSlots({ factory }))[0]
    const line = formatSaveSummary(record.data)

    expect(line).toContain('Forest')
    expect(line).toContain('Lv 3')
    expect(line).toContain('55/100 HP')
    expect(line).toContain('Forest Elves')
  })

  it('formats a shorter Continue hint', async () => {
    const factory = new IDBFactory()
    await saveGame(snapshot, 1_700_000_000_000, { factory, slot: 0 })
    const record = (await listSlots({ factory }))[0]
    const hint = formatContinueHint(record.data)

    expect(hint).toContain('Forest')
    expect(hint).toContain('Lv 3')
    expect(hint).not.toContain('Forest Elves')
  })
})
