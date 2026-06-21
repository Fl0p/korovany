/**
 * Persisted user settings — key bindings and graphics quality (E6.4, FLO-425).
 *
 * Mirrors the audio bus pattern: a singleton owns canonical state in
 * `localStorage`, exposes subscribe for React surfaces, and pushes binding
 * updates to registered input controllers at runtime.
 */
import { defaultBindings, rebind, type KeyBindings } from '../input/bindings'
import type { InputAction } from '../input/intent'
import {
  SETTINGS_VERSION,
  type GraphicsQuality,
  type PersistedSettings,
} from './types'

export const SETTINGS_STORAGE_KEY = 'korovany-settings'

const INPUT_ACTIONS = Object.keys(defaultBindings) as InputAction[]

const DEFAULT_GRAPHICS_QUALITY: GraphicsQuality = 'high'

export interface SettingsSnapshot {
  keyBindings: KeyBindings
  graphicsQuality: GraphicsQuality
}

export interface SettingsStoreOptions {
  storage?: Storage | null
}

type BindingsListener = (bindings: KeyBindings) => void
type SettingsListener = (snapshot: SettingsSnapshot) => void

function isGraphicsQuality(value: unknown): value is GraphicsQuality {
  return value === 'low' || value === 'high'
}

function normalizeKeyBindings(raw: unknown): KeyBindings {
  const next: Record<InputAction, string> = { ...defaultBindings }
  if (typeof raw !== 'object' || raw === null) return next
  const record = raw as Record<string, unknown>
  for (const action of INPUT_ACTIONS) {
    const code = record[action]
    if (typeof code === 'string') next[action] = code
  }
  return next
}

/** Forward-migrate an older persisted blob onto the current schema. */
export function migrateSettings(raw: unknown): PersistedSettings {
  if (typeof raw !== 'object' || raw === null) {
    return {
      version: SETTINGS_VERSION,
      keyBindings: { ...defaultBindings },
      graphicsQuality: DEFAULT_GRAPHICS_QUALITY,
    }
  }
  const record = raw as Record<string, unknown>
  const version = typeof record.version === 'number' ? record.version : 0
  const keyBindings = normalizeKeyBindings(record.keyBindings)
  const graphicsQuality = isGraphicsQuality(record.graphicsQuality)
    ? record.graphicsQuality
    : DEFAULT_GRAPHICS_QUALITY
  if (version === SETTINGS_VERSION) {
    return { version: SETTINGS_VERSION, keyBindings, graphicsQuality }
  }
  return { version: SETTINGS_VERSION, keyBindings, graphicsQuality }
}

function readSettings(storage: Storage | null): PersistedSettings {
  if (!storage) {
    return migrateSettings(null)
  }
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return migrateSettings(null)
    return migrateSettings(JSON.parse(raw) as unknown)
  } catch {
    return migrateSettings(null)
  }
}

export class SettingsStore {
  private readonly storage: Storage | null
  private keyBindings: KeyBindings
  private graphicsQuality: GraphicsQuality
  private readonly bindingListeners = new Set<BindingsListener>()
  private readonly settingsListeners = new Set<SettingsListener>()

  constructor(options: SettingsStoreOptions = {}) {
    this.storage =
      options.storage !== undefined
        ? options.storage
        : typeof window !== 'undefined'
          ? window.localStorage
          : null
    const loaded = readSettings(this.storage)
    this.keyBindings = loaded.keyBindings
    this.graphicsQuality = loaded.graphicsQuality
  }

  getKeyBindings(): KeyBindings {
    return this.keyBindings
  }

  getGraphicsQuality(): GraphicsQuality {
    return this.graphicsQuality
  }

  getSnapshot(): SettingsSnapshot {
    return { keyBindings: this.keyBindings, graphicsQuality: this.graphicsQuality }
  }

  /** Live input controllers register to receive binding pushes. */
  subscribeBindings(listener: BindingsListener): () => void {
    this.bindingListeners.add(listener)
    return () => this.bindingListeners.delete(listener)
  }

  subscribe(listener: SettingsListener): () => void {
    this.settingsListeners.add(listener)
    return () => this.settingsListeners.delete(listener)
  }

  setKeyBinding(action: InputAction, code: string): void {
    this.keyBindings = rebind(this.keyBindings, action, code)
    this.persist()
    this.notifyBindings()
    this.notifySettings()
  }

  setGraphicsQuality(quality: GraphicsQuality): void {
    if (this.graphicsQuality === quality) return
    this.graphicsQuality = quality
    this.persist()
    this.notifySettings()
  }

  resetKeyBindings(): void {
    this.keyBindings = { ...defaultBindings }
    this.persist()
    this.notifyBindings()
    this.notifySettings()
  }

  resetAll(): void {
    this.keyBindings = { ...defaultBindings }
    this.graphicsQuality = DEFAULT_GRAPHICS_QUALITY
    this.persist()
    this.notifyBindings()
    this.notifySettings()
  }

  private persist(): void {
    if (!this.storage) return
    const payload: PersistedSettings = {
      version: SETTINGS_VERSION,
      keyBindings: this.keyBindings,
      graphicsQuality: this.graphicsQuality,
    }
    try {
      this.storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Quota / private mode — keep in-memory state only.
    }
  }

  private notifyBindings(): void {
    const snapshot = this.keyBindings
    for (const listener of this.bindingListeners) listener(snapshot)
  }

  private notifySettings(): void {
    const snapshot = this.getSnapshot()
    for (const listener of this.settingsListeners) listener(snapshot)
  }
}

/** Shared settings store for the app shell and input adapters. */
export const settingsStore = new SettingsStore()
