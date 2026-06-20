import { SAVE_VERSION, type PlayerTransform, type SaveData, type Vec3 } from './types'

/**
 * Validation and forward-migration for the save schema.
 *
 * `parseSaveData` is the only sanctioned way to turn an untrusted blob (read
 * back from IndexedDB) into a {@link SaveData}. It rejects anything malformed and
 * runs older versions through {@link migrate} so callers always receive a record
 * at the current {@link SAVE_VERSION}. Returning `null` (rather than throwing) on
 * bad input keeps the empty-store / corrupt-save paths simple for callers.
 */

function isVec3(value: unknown): value is Vec3 {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.x === 'number' &&
    typeof v.y === 'number' &&
    typeof v.z === 'number' &&
    Number.isFinite(v.x) &&
    Number.isFinite(v.y) &&
    Number.isFinite(v.z)
  )
}

function isTransform(value: unknown): value is PlayerTransform {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  return isVec3(t.position) && typeof t.rotationY === 'number' && Number.isFinite(t.rotationY)
}

/** Structural guard for a record at the current schema version. */
export function isSaveData(value: unknown): value is SaveData {
  if (typeof value !== 'object' || value === null) return false
  const d = value as Record<string, unknown>
  return (
    typeof d.version === 'number' &&
    isTransform(d.transform) &&
    typeof d.health === 'number' &&
    Number.isFinite(d.health) &&
    typeof d.zoneId === 'string' &&
    typeof d.savedAt === 'number'
  )
}

/**
 * Map an older record onto the current schema. Today v1 is the only version, so
 * this is a pass-through; when {@link SAVE_VERSION} is bumped, add a `case` per
 * prior version that fills in / renames-forward the new fields. Never mutate the
 * input — return a fresh record stamped with the current version.
 */
export function migrate(data: SaveData): SaveData {
  if (data.version === SAVE_VERSION) return data
  // Future versions branch here, e.g.:
  //   if (data.version === 1) data = { ...data, newField: default, version: 2 }
  // Unknown/newer versions fall through and are stamped current; fields already
  // validated by isSaveData, so this is safe.
  return { ...data, version: SAVE_VERSION }
}

/**
 * Validate and migrate an untrusted blob into a current-version {@link SaveData},
 * or `null` if it is not a recognisable save (missing fields, wrong types, etc.).
 */
export function parseSaveData(value: unknown): SaveData | null {
  if (!isSaveData(value)) return null
  return migrate(value)
}
