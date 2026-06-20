import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'

// The game canvas boots Babylon, which needs a real WebGL context jsdom does
// not provide. Stub it so the shell renders without a GPU; the engine bootstrap
// itself is covered by src/engine/index.test.ts.
vi.mock('../scenes/GameCanvas', () => ({
  GameCanvas: () => <div data-testid="game-canvas" />,
}))

describe('<App />', () => {
  it('renders the full-page shell with the HUD title and the canvas', () => {
    const { container } = render(<App />)
    expect(screen.getByRole('heading', { name: 'Korovany' })).toBeInTheDocument()
    expect(screen.getByTestId('game-canvas')).toBeInTheDocument()
    // The shell is the canvas now — no hello-world chrome or score button.
    expect(container.querySelector('.app-shell')).not.toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
