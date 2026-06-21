import { FACTIONS, type FactionId } from '../faction'
import { ZONES } from '../world/zones'
import type { ZoneId } from '../world/types'
import type { SaveData, SlotId } from './types'
import type { SlotRecord } from './db'

/** UI-facing metadata for one save slot (occupied or empty). */
export interface SaveSlotSummary {
  readonly slot: SlotId
  readonly isEmpty: boolean
  readonly savedAt: number | null
  readonly zoneLabel: string | null
  readonly factionLabel: string | null
  readonly level: number | null
  readonly healthLabel: string | null
  /** One-line label for menus (zone · level · HP · date). */
  readonly summaryLine: string | null
  /** True when this slot holds the most recent `savedAt` across all slots. */
  readonly isLatest: boolean
}

function zoneLabel(zoneId: string): string {
  const def = ZONES[zoneId as ZoneId]
  return def?.displayName ?? zoneId
}

function factionLabel(factionId: FactionId): string {
  return FACTIONS[factionId]?.name ?? factionId
}

/** Build a compact one-line summary from persisted save data. */
export function formatSaveSummary(data: SaveData): string {
  const date = new Date(data.savedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const zone = zoneLabel(data.zoneId)
  const faction = factionLabel(data.playerFactionId)
  const level = data.progression.level
  const hp = `${data.health.current}/${data.health.max} HP`
  return `${zone} · Lv ${level} · ${hp} · ${faction} · ${date}`
}

/** Short subtitle for the Continue button (latest save only). */
export function formatContinueHint(data: SaveData): string {
  const zone = zoneLabel(data.zoneId)
  const level = data.progression.level
  const date = new Date(data.savedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return `${zone} · Lv ${level} · ${date}`
}

function summarizeOccupied(
  slot: SlotId,
  data: SaveData,
  isLatest: boolean,
): SaveSlotSummary {
  return {
    slot,
    isEmpty: false,
    savedAt: data.savedAt,
    zoneLabel: zoneLabel(data.zoneId),
    factionLabel: factionLabel(data.playerFactionId),
    level: data.progression.level,
    healthLabel: `${data.health.current}/${data.health.max} HP`,
    summaryLine: formatSaveSummary(data),
    isLatest,
  }
}

function emptySummary(slot: SlotId): SaveSlotSummary {
  return {
    slot,
    isEmpty: true,
    savedAt: null,
    zoneLabel: null,
    factionLabel: null,
    level: null,
    healthLabel: null,
    summaryLine: null,
    isLatest: false,
  }
}

/**
 * Merge stored records with the fixed slot grid so the UI always renders every
 * slot (empty placeholders included).
 */
export function buildSlotSummaries(
  records: readonly SlotRecord[],
  slotIds: readonly SlotId[],
): SaveSlotSummary[] {
  const bySlot = new Map(records.map((r) => [r.slot, r]))
  const latestSavedAt =
    records.length === 0
      ? null
      : records.reduce((max, r) => (r.data.savedAt > max ? r.data.savedAt : max), records[0].data.savedAt)

  return slotIds.map((slot) => {
    const record = bySlot.get(slot)
    if (!record) return emptySummary(slot)
    const isLatest = latestSavedAt !== null && record.data.savedAt === latestSavedAt
    return summarizeOccupied(slot, record.data, isLatest)
  })
}
