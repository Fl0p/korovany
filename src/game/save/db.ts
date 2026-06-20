import { parseSaveData } from './schema'
import type { SaveData, SlotId } from './types'

/**
 * IndexedDB driver for save slots — a thin promise wrapper over a single object
 * store keyed by slot id.
 *
 * The {@link IDBFactory} is injectable so the whole layer runs under jsdom in
 * tests (pass a `fake-indexeddb` factory) without touching globals. In the
 * browser it defaults to `globalThis.indexedDB`.
 */

const DB_NAME = 'korovany-save'
const DB_VERSION = 1
const STORE = 'slots'

/** A stored record: the slot id plus its (current-version) save payload. */
export interface SlotRecord {
  readonly slot: SlotId
  readonly data: SaveData
}

/** Handle to the open save database. Close it when the app tears down. */
export interface SaveStore {
  /** Write (or overwrite) a slot. */
  put(slot: SlotId, data: SaveData): Promise<void>
  /** Read one slot, or `null` if empty / corrupt. */
  get(slot: SlotId): Promise<SaveData | null>
  /** All valid slots, ascending by slot id. */
  list(): Promise<SlotRecord[]>
  /** The most recently saved slot (max `savedAt`), or `null` if the store is empty. */
  latest(): Promise<SlotRecord | null>
  /** Delete one slot. No-op if it does not exist. */
  delete(slot: SlotId): Promise<void>
  /** Delete every slot. */
  clear(): Promise<void>
  /** Release the underlying connection. */
  close(): void
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function resolveFactory(factory?: IDBFactory): IDBFactory {
  const idb = factory ?? (globalThis as { indexedDB?: IDBFactory }).indexedDB
  if (!idb) {
    throw new Error(
      'IndexedDB is unavailable; pass an IDBFactory (e.g. fake-indexeddb) to openSaveStore().',
    )
  }
  return idb
}

/**
 * Open (creating/upgrading as needed) the save database and return a
 * {@link SaveStore}. Inject `factory` in tests; omit it in the browser.
 */
export function openSaveStore(factory?: IDBFactory, dbName = DB_NAME): Promise<SaveStore> {
  const idb = resolveFactory(factory)
  return new Promise((resolve, reject) => {
    const open = idb.open(dbName, DB_VERSION)
    open.onupgradeneeded = () => {
      const db = open.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'slot' })
      }
    }
    open.onerror = () => reject(open.error)
    open.onsuccess = () => resolve(makeStore(open.result))
  })
}

function makeStore(db: IDBDatabase): SaveStore {
  function tx(mode: IDBTransactionMode): IDBObjectStore {
    return db.transaction(STORE, mode).objectStore(STORE)
  }

  return {
    async put(slot, data) {
      const record: SlotRecord = { slot, data }
      await promisify(tx('readwrite').put(record))
    },
    async get(slot) {
      const record = (await promisify(tx('readonly').get(slot))) as SlotRecord | undefined
      return record ? parseSaveData(record.data) : null
    },
    async list() {
      const records = (await promisify(tx('readonly').getAll())) as SlotRecord[]
      return records
        .map((r) => {
          const data = parseSaveData(r.data)
          return data ? { slot: r.slot, data } : null
        })
        .filter((r): r is SlotRecord => r !== null)
        .sort((a, b) => a.slot - b.slot)
    },
    async latest() {
      const records = await this.list()
      if (records.length === 0) return null
      return records.reduce((newest, r) => (r.data.savedAt > newest.data.savedAt ? r : newest))
    },
    async delete(slot) {
      await promisify(tx('readwrite').delete(slot))
    },
    async clear() {
      await promisify(tx('readwrite').clear())
    },
    close() {
      db.close()
    },
  }
}
