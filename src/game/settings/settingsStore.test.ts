import { beforeEach, describe, expect, it } from 'vitest'
import { defaultBindings } from '../input/bindings'
import { SETTINGS_STORAGE_KEY, SettingsStore, migrateSettings } from './settingsStore'

describe('migrateSettings', () => {
  it('fills defaults for missing fields', () => {
    const migrated = migrateSettings({ version: 0 })
    expect(migrated.version).toBe(1)
    expect(migrated.keyBindings).toEqual(defaultBindings)
    expect(migrated.graphicsQuality).toBe('high')
  })

  it('preserves valid persisted bindings and quality', () => {
    const migrated = migrateSettings({
      version: 1,
      keyBindings: { ...defaultBindings, jump: 'KeyJ' },
      graphicsQuality: 'low',
    })
    expect(migrated.keyBindings.jump).toBe('KeyJ')
    expect(migrated.graphicsQuality).toBe('low')
  })
})

describe('SettingsStore', () => {
  let storage: Storage
  let store: SettingsStore

  beforeEach(() => {
    storage = localStorage
    storage.clear()
    store = new SettingsStore({ storage })
  })

  it('rebinds an action and persists to storage', () => {
    store.setKeyBinding('jump', 'KeyJ')
    expect(store.getKeyBindings().jump).toBe('KeyJ')

    const reloaded = new SettingsStore({ storage })
    expect(reloaded.getKeyBindings().jump).toBe('KeyJ')
  })

  it('clears conflicting bindings when rebinding', () => {
    store.setKeyBinding('sprint', 'KeyW')
    expect(store.getKeyBindings().sprint).toBe('KeyW')
    expect(store.getKeyBindings().moveForward).toBe('')
  })

  it('resets key bindings to defaults', () => {
    store.setKeyBinding('attack', 'KeyG')
    store.resetKeyBindings()
    expect(store.getKeyBindings()).toEqual(defaultBindings)
  })

  it('persists graphics quality across reload', () => {
    store.setGraphicsQuality('low')
    const reloaded = new SettingsStore({ storage })
    expect(reloaded.getGraphicsQuality()).toBe('low')
    const raw = storage.getItem(SETTINGS_STORAGE_KEY)
    expect(raw).toContain('"graphicsQuality":"low"')
  })

  it('notifies binding subscribers on rebind', () => {
    const seen: string[] = []
    store.subscribeBindings((b) => seen.push(b.jump))
    store.setKeyBinding('jump', 'KeyJ')
    expect(seen.at(-1)).toBe('KeyJ')
  })
})
