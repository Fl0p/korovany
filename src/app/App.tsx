import { useCallback, useEffect, useRef, useState } from 'react'
import { GameCanvas } from '../scenes/GameCanvas'
import { hasSave, loadLatest, saveGame } from '../game/save'
import {
  applyPlayerTransform,
  readPlayerTransform,
  stageSpawn,
} from '../game/save/playerRuntime'
import type { PlayerTransform } from '../game/save/types'
import {
  applyPlayerDamage,
  continueGame,
  playerDied,
  resetInjuries,
  resetPlayer,
  resetPlayerHealth,
  respawn,
  restorePlayer,
  restorePlayerHealth,
  returnToMenu,
  selectIsBleeding,
  selectIsStreamingLoading,
  startNewGame,
  tickInjuries,
  togglePause,
  useAppDispatch,
  useAppSelector,
} from '../store'

/** Default safe spawn — matches the forest scene's controller spawn `(0, 2, 0)`. */
const SAFE_SPAWN: PlayerTransform = { position: { x: 0, y: 2, z: 0 }, rotationY: 0 }

/** Dev-only debug-damage key and the HP it deals per press / default console call. */
const DEBUG_DAMAGE_KEY = 'KeyK'
const DEBUG_DAMAGE_AMOUNT = 10

/**
 * App shell: a full-viewport stage holding the 3D canvas with React overlays
 * above it. The app state machine owns coarse flow while Babylon remains
 * isolated behind GameCanvas.
 *
 * It also owns the save/load wiring (E1.4): autosave whenever the game enters
 * `paused`, and a **Continue** button that restores the latest save. The live
 * capsule transform crosses the React↔Babylon boundary only through the save
 * `playerRuntime` bridge — never a direct mesh reference. Health is sourced from
 * the canonical `healthSlice`; the zone id from `playerSlice`.
 *
 * See `src/styles/global.css` for the no-scroll, full-page reset and the
 * `.app-shell` / overlay layering.
 */
export function App() {
  const dispatch = useAppDispatch()
  const phase = useAppSelector((state) => state.app.phase)
  const health = useAppSelector((state) => state.health.player)
  const zoneId = useAppSelector((state) => state.player.zoneId)
  const isLoadingAssets = useAppSelector(selectIsStreamingLoading)
  const isBleeding = useAppSelector(selectIsBleeding)
  const menuPrimaryActionRef = useRef<HTMLButtonElement>(null)
  const pausePrimaryActionRef = useRef<HTMLButtonElement>(null)
  const deathPrimaryActionRef = useRef<HTMLButtonElement>(null)

  const [hasSaveSlot, setHasSaveSlot] = useState(false)

  // Enter the death state when HP hits 0 during live play. HP/injuries are NOT
  // reset here — the death screen shows the wipe and respawn does the reset.
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'paused') return
    if (health.current > 0) return
    dispatch(playerDied())
  }, [health.current, phase, dispatch])

  // Bleed-out: while a wound is untreated and the game is live, drain HP each
  // second. tickInjuries funnels the damage into the health system, so an
  // untreated bleed reaches 0 HP and triggers the death state above.
  useEffect(() => {
    if (phase !== 'playing') return
    if (!isBleeding) return
    const id = window.setInterval(() => dispatch(tickInjuries(1)), 1000)
    return () => window.clearInterval(id)
  }, [isBleeding, phase, dispatch])

  // Latest player scalars, read at autosave time without re-arming the pause
  // effect every time health/zone change.
  const snapshotRef = useRef({ health, zoneId })
  snapshotRef.current = { health, zoneId }

  // Probe whether a save exists so the Continue button can render enabled/empty.
  useEffect(() => {
    let active = true
    void hasSave()
      .then((exists) => {
        if (active) setHasSaveSlot(exists)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (phase === 'menu') menuPrimaryActionRef.current?.focus()
    else if (phase === 'paused') pausePrimaryActionRef.current?.focus()
    else if (phase === 'dead') deathPrimaryActionRef.current?.focus()
  }, [phase])

  // Debug damage affordance (dev builds only): press K to take a chunk of damage,
  // or call `window.korovanyDamage(n)` from the console. Lets later combat
  // tickets drive the health pipeline before melee/enemies exist. All routed
  // through the typed `applyPlayerDamage` funnel with a `debug` source.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const hurt = (amount = DEBUG_DAMAGE_AMOUNT) =>
      dispatch(applyPlayerDamage({ amount, source: 'debug', kind: 'true' }))
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== DEBUG_DAMAGE_KEY) return
      hurt()
    }
    window.addEventListener('keydown', onKeyDown)
    ;(window as unknown as { korovanyDamage?: (n?: number) => void }).korovanyDamage = hurt
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      delete (window as unknown as { korovanyDamage?: (n?: number) => void }).korovanyDamage
    }
  }, [dispatch])

  // Autosave on the transition into `paused`. The transform comes from the live
  // scene via the bridge; health from `healthSlice`, zone from `playerSlice`. No
  // scene mounted → skip.
  useEffect(() => {
    if (phase !== 'paused') return
    const transform = readPlayerTransform()
    if (!transform) return
    const { health: hp, zoneId: zone } = snapshotRef.current
    void saveGame({ transform, health: hp, zoneId: zone }, Date.now())
      .then(() => setHasSaveSlot(true))
      .catch(() => {})
  }, [phase])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Escape') return
      event.preventDefault()
      dispatch(togglePause())
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatch])

  const onNewGame = useCallback(() => {
    dispatch(resetPlayer())
    dispatch(resetPlayerHealth())
    dispatch(startNewGame())
  }, [dispatch])

  const onContinue = useCallback(async () => {
    const data = await loadLatest()
    if (!data) return
    // Stage for a scene that boots later; teleport the one already running.
    stageSpawn(data.transform)
    applyPlayerTransform(data.transform)
    dispatch(restorePlayerHealth(data.health))
    dispatch(restorePlayer({ zoneId: data.zoneId }))
    dispatch(continueGame())
  }, [dispatch])

  // Respawn from the death screen: refill HP, clear injuries, and return the
  // live capsule to the safe spawn before re-entering play.
  const onRespawn = useCallback(() => {
    dispatch(resetPlayerHealth())
    dispatch(resetInjuries())
    stageSpawn(SAFE_SPAWN)
    applyPlayerTransform(SAFE_SPAWN)
    dispatch(respawn())
  }, [dispatch])

  return (
    <div className="app-shell">
      <GameCanvas />
      {isLoadingAssets ? <p className="hud-loading">Loading…</p> : null}
      {phase !== 'menu' ? (
        <div className="hud">
          <h1>Korovany</h1>
          <div
            className="hud-health"
            role="group"
            aria-label={`Player health: ${health.current} of ${health.max} hit points`}
          >
            <span className="hud-health-label">HP</span>
            <span className="hud-health-bar" aria-hidden="true">
              <span
                className="hud-health-fill"
                style={{ width: `${Math.max(0, (health.current / health.max) * 100)}%` }}
              />
            </span>
            <span className="hud-health-value">
              {health.current}/{health.max}
            </span>
          </div>
        </div>
      ) : null}
      {phase === 'menu' ? (
        <main className="menu-overlay" aria-labelledby="main-menu-title">
          <div className="menu-panel">
            <p className="menu-kicker">Forest vertical slice</p>
            <h1 id="main-menu-title">Korovany</h1>
            <div className="menu-actions" aria-label="Main menu actions">
              <button
                ref={menuPrimaryActionRef}
                type="button"
                className="primary-action"
                onClick={onNewGame}
              >
                New Game
              </button>
              <button
                type="button"
                onClick={() => void onContinue()}
                disabled={!hasSaveSlot}
                aria-disabled={!hasSaveSlot}
              >
                Continue
              </button>
            </div>
            {!hasSaveSlot ? (
              <p className="menu-hint">No saved game yet — start a new game.</p>
            ) : null}
          </div>
        </main>
      ) : null}
      {phase === 'paused' ? (
        <div
          className="pause-overlay"
          role="dialog"
          aria-labelledby="pause-title"
          aria-modal="true"
        >
          <div className="pause-panel">
            <h2 id="pause-title">Paused</h2>
            <div className="menu-actions" aria-label="Pause actions">
              <button
                ref={pausePrimaryActionRef}
                type="button"
                className="primary-action"
                onClick={() => dispatch(togglePause())}
              >
                Resume
              </button>
              <button type="button" onClick={() => dispatch(returnToMenu())}>
                Quit to Main Menu
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {phase === 'dead' ? (
        <div
          className="death-overlay"
          role="dialog"
          aria-labelledby="death-title"
          aria-modal="true"
        >
          <div className="death-panel">
            <h2 id="death-title">You Died</h2>
            <p className="death-hint">The forest claims another soul.</p>
            <div className="menu-actions" aria-label="Death actions">
              <button
                ref={deathPrimaryActionRef}
                type="button"
                className="primary-action"
                onClick={onRespawn}
              >
                Respawn
              </button>
              <button type="button" onClick={() => dispatch(returnToMenu())}>
                Quit to Main Menu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
