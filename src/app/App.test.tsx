import { configureStore } from '@reduxjs/toolkit'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IDBFactory } from 'fake-indexeddb'
import { Provider } from 'react-redux'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadLatest, saveGame } from '../game/save'
import { registerPlayer } from '../game/save/playerRuntime'
import type { AssetLoadPhase } from '../game/streaming/types'
import { appReducer, type AppPhase } from '../store/appSlice'
import { gameReducer } from '../store/gameSlice'
import { DEFAULT_PLAYER_STATE, playerReducer, type PlayerState } from '../store/playerSlice'
import { streamingReducer } from '../store/streamingSlice'
import { App } from './App'

// Babylon.js needs a real WebGL context, which jsdom does not provide.
// Stub the canvas so the App can render in tests without a GPU. The engine
// bootstrap itself is covered by src/engine/index.test.ts.
vi.mock('../scenes/GameCanvas', () => ({
  GameCanvas: () => <div data-testid="game-canvas" />,
}))

function renderApp(
  initialPhase: AppPhase = 'menu',
  streamingPhases: Record<string, AssetLoadPhase> = {},
  player: PlayerState = DEFAULT_PLAYER_STATE,
) {
  const store = configureStore({
    reducer: {
      app: appReducer,
      game: gameReducer,
      player: playerReducer,
      streaming: streamingReducer,
    },
    preloadedState: {
      app: { phase: initialPhase },
      game: { score: 0 },
      player,
      streaming: { phases: streamingPhases },
    },
  })

  return render(
    <Provider store={store}>
      <App />
    </Provider>,
  )
}

describe('<App />', () => {
  it('renders the menu over the stubbed canvas by default', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: 'Korovany', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument()
    expect(screen.getByTestId('game-canvas')).toBeInTheDocument()
  })

  it('disables Continue and shows the empty-state hint when no save exists', () => {
    // jsdom has no IndexedDB, so the save probe fails closed → no save.
    renderApp()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    expect(screen.getByText(/No saved game yet/)).toBeInTheDocument()
  })

  it('drops the hello-world chrome — no score probe button', () => {
    renderApp()
    expect(screen.queryByRole('button', { name: '+1' })).not.toBeInTheDocument()
  })

  it('hides the menu when starting a new game', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'New Game' }))

    expect(screen.queryByRole('button', { name: 'New Game' })).not.toBeInTheDocument()
    expect(screen.queryByText('Paused')).not.toBeInTheDocument()
    expect(screen.getByTestId('game-canvas')).toBeInTheDocument()
  })

  it('shows and hides the pause overlay with Escape while playing', async () => {
    const user = userEvent.setup()
    renderApp('playing')

    await user.keyboard('{Escape}')
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quit to Main Menu' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('heading', { name: 'Paused' })).not.toBeInTheDocument()
  })

  it('returns to menu via the Quit button in the pause overlay', async () => {
    const user = userEvent.setup()
    renderApp('paused')

    await user.click(screen.getByRole('button', { name: 'Quit to Main Menu' }))

    expect(screen.queryByRole('heading', { name: 'Paused' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument()
  })

  it('does not pause from the main menu when Escape is pressed', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('heading', { name: 'Paused' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument()
  })

  it('shows a loading hint while assets are streaming', () => {
    renderApp('menu', { 'hero.player-default': 'loading' })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
})

describe('<App /> save/load (fake-indexeddb)', () => {
  beforeEach(() => {
    ;(globalThis as { indexedDB?: IDBFactory }).indexedDB = new IDBFactory()
  })

  afterEach(() => {
    delete (globalThis as { indexedDB?: IDBFactory }).indexedDB
  })

  it('autosaves the live player transform on pause', async () => {
    const unregister = registerPlayer({
      read: () => ({ position: { x: 4, y: 1, z: -2 }, rotationY: 1.25 }),
      write: vi.fn(),
    })
    try {
      const user = userEvent.setup()
      renderApp('playing', {}, { health: 60, zoneId: 'forest' })

      await user.keyboard('{Escape}') // playing → paused triggers autosave

      await waitFor(async () => {
        const saved = await loadLatest()
        expect(saved).not.toBeNull()
        expect(saved?.health).toBe(60)
        expect(saved?.transform.position).toEqual({ x: 4, y: 1, z: -2 })
      })
    } finally {
      unregister()
    }
  })

  it('enables Continue when a save exists and resumes into the game', async () => {
    await saveGame(
      { transform: { position: { x: 7, y: 1, z: 7 }, rotationY: 0 }, health: 50, zoneId: 'forest' },
      123,
    )

    const write = vi.fn()
    const unregister = registerPlayer({
      read: () => ({ position: { x: 0, y: 0, z: 0 }, rotationY: 0 }),
      write,
    })
    try {
      const user = userEvent.setup()
      renderApp()

      const cont = await screen.findByRole('button', { name: 'Continue' })
      await waitFor(() => expect(cont).toBeEnabled())

      await user.click(cont)

      // Resumed into play: the menu is gone and the live player was teleported.
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'New Game' })).not.toBeInTheDocument(),
      )
      expect(write).toHaveBeenCalledWith({ position: { x: 7, y: 1, z: 7 }, rotationY: 0 })
    } finally {
      unregister()
    }
  })
})
