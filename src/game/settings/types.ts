import type { KeyBindings } from '../input/bindings'

/** User-facing graphics quality tier — consumed by perf/streaming later. */
export type GraphicsQuality = 'low' | 'high'

/** Versioned blob persisted to `localStorage` (see settingsStore). */
export interface PersistedSettingsV1 {
  readonly version: 1
  readonly keyBindings: KeyBindings
  readonly graphicsQuality: GraphicsQuality
}

export const SETTINGS_VERSION = 1 as const

export type PersistedSettings = PersistedSettingsV1
