/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Dev-only override (FLO-469): unlock every registered zone for inspection.
   * `'true'` forces it on (even in a built preview), `'false'` forces it off
   * (so a dev build can exercise the real conquest gate). Unset → on in dev
   * builds, off in prod. See `src/game/world/devUnlock.ts`.
   */
  readonly VITE_DEV_UNLOCK_ZONES?: string
}
