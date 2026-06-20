import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { describe, expect, it, vi } from 'vitest'
import { store } from '../store'
import { App } from './App'

// Babylon.js needs a real WebGL context, which jsdom does not provide.
// Stub the canvas so the App can render in tests without a GPU. The engine
// bootstrap itself is covered by src/engine/index.test.ts.
vi.mock('../scenes/GameCanvas', () => ({
  GameCanvas: () => <div data-testid="game-canvas" />,
}))

function renderApp() {
  return render(
    <Provider store={store}>
      <App />
    </Provider>,
  )
}

describe('<App />', () => {
  it('renders the title and the stubbed canvas', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: 'Korovany' })).toBeInTheDocument()
    expect(screen.getByTestId('game-canvas')).toBeInTheDocument()
  })

  it('increments the Redux score when +1 is clicked', async () => {
    renderApp()
    const user = userEvent.setup()
    const before = store.getState().game.score
    await user.click(screen.getByRole('button', { name: '+1' }))
    expect(store.getState().game.score).toBe(before + 1)
  })
})
