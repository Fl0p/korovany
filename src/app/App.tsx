import { GameCanvas } from '../scenes/GameCanvas'

/**
 * App shell: a full-viewport stage holding the 3D canvas with a minimal HUD
 * title overlaid on top. The game canvas *is* the app now — the hello-world
 * chrome (copy + Redux score probe) is gone. The Redux store stays wired in
 * `main.tsx` for later phases (HUD, score, menus) even though this shell does
 * not read it yet.
 *
 * See `src/styles/global.css` for the no-scroll, full-page reset and the
 * `.app-shell` / `.hud` layering.
 */
export function App() {
  return (
    <div className="app-shell">
      <GameCanvas />
      <div className="hud">
        <h1>Korovany</h1>
      </div>
    </div>
  )
}
