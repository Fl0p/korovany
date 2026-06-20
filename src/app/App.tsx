import { GameCanvas } from '../scenes/GameCanvas'
import { addScore, useAppDispatch, useAppSelector } from '../store'

/**
 * App shell: a full-viewport stage holding the 3D canvas with a small HUD
 * overlay on top. The HUD is intentionally minimal debug chrome (title + a
 * Redux score probe) — real in-game UI will replace it. The canvas fills the
 * whole page; see `src/styles/global.css` for the no-scroll reset.
 */
export function App() {
  const score = useAppSelector((state) => state.game.score)
  const dispatch = useAppDispatch()

  return (
    <div className="app-shell">
      <GameCanvas />
      <div className="hud">
        <h1>Korovany</h1>
        <p>
          Score (Redux): <strong>{score}</strong>{' '}
          <button onClick={() => dispatch(addScore(1))}>+1</button>
        </p>
      </div>
    </div>
  )
}
