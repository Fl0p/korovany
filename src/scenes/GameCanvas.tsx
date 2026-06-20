import { useEffect, useRef } from 'react'
import { createGameEngine } from '../engine'
import { applyPlayerDamage, useAppDispatch, useAppSelector } from '../store'
import { setAssetPhase } from '../store/streamingSlice'
import { createControllerPlayground } from './controllerPlayground'
import { createForestScene } from './forestScene'

/** Anything mountable on the canvas can be disposed; the forest zone can also be frozen. */
interface MountedScene {
  dispose(): void
  setActive?(active: boolean): void
}

/**
 * Thin React wrapper around the Babylon engine. It owns nothing but the canvas
 * element and the mount/unmount lifecycle.
 *
 * Scene routing:
 * - `?dev=controller` — controller playground (E1.1 QA)
 * - `?dev=forest`     — forest zone standalone (E1.3 QA)
 * - `phase === menu`  — engine smoke scene (hero preview, streaming HUD)
 * - `phase === playing | paused | dead` — forest zone (E1.5 integration)
 *
 * Pause/death do NOT remount the scene — they keep `inGame` true so the
 * ForestScene survives the transition. Only the menu↔in-game boundary causes a
 * scene swap. Simulation is frozen (input/movement/AI) whenever the phase is not
 * `playing`, via the scene's `setActive` (E2.1 death state).
 */
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<MountedScene | null>(null)
  const dispatch = useAppDispatch()
  const phase = useAppSelector((state) => state.app.phase)
  const inGame = phase !== 'menu'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dev = new URLSearchParams(window.location.search).get('dev')
    const game: MountedScene =
      dev === 'controller'
        ? createControllerPlayground(canvas)
        : dev === 'forest'
          ? createForestScene(canvas)
          : inGame
            ? createForestScene(canvas, {
                onPlayerDamaged: (amount) =>
                  dispatch(applyPlayerDamage({ amount, source: 'enemy', kind: 'physical' })),
              })
            : createGameEngine(canvas, {
                onAssetLoadingState: (id, phase) => dispatch(setAssetPhase({ id, phase })),
              })
    sceneRef.current = game
    return () => {
      sceneRef.current = null
      game.dispose()
    }
  }, [inGame, dispatch])

  // Freeze the world unless actively playing (paused or dead → no movement/input).
  useEffect(() => {
    sceneRef.current?.setActive?.(phase === 'playing')
  }, [phase])

  return <canvas ref={canvasRef} className="render-canvas" />
}
