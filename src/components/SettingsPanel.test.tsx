import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsPanel } from './SettingsPanel'
import { defaultBindings } from '../game/input/bindings'
import { settingsStore } from '../game/settings'

describe('<SettingsPanel />', () => {
  beforeEach(() => {
    localStorage.clear()
    settingsStore.resetAll()
  })

  it('lists control actions with default keys', () => {
    render(<SettingsPanel onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('Move forward')).toBeInTheDocument()
    expect(screen.getByText('W')).toBeInTheDocument()
  })

  it('rebinds a key when the player presses a new one', async () => {
    render(<SettingsPanel onClose={() => {}} />)
    await userEvent.click(screen.getAllByRole('button', { name: 'Rebind' })[0]!)
    fireEvent.keyDown(window, { code: 'ArrowUp' })
    await waitFor(() => {
      expect(settingsStore.getKeyBindings().moveForward).toBe('ArrowUp')
    })
    expect(screen.getByText('Up')).toBeInTheDocument()
  })

  it('resets bindings to defaults', async () => {
    settingsStore.setKeyBinding('jump', 'KeyJ')
    render(<SettingsPanel onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Reset controls to defaults' }))
    expect(settingsStore.getKeyBindings()).toEqual(defaultBindings)
    expect(screen.getByText('Space')).toBeInTheDocument()
  })

  it('calls onClose from Done', async () => {
    const onClose = vi.fn()
    render(<SettingsPanel onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows an error for reserved keys during rebind', async () => {
    render(<SettingsPanel onClose={() => {}} />)
    await userEvent.click(screen.getAllByRole('button', { name: 'Rebind' })[0]!)
    fireEvent.keyDown(window, { code: 'Escape' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: 'Rebind' })[0]!)
    fireEvent.keyDown(window, { code: 'KeyM' })
    expect(screen.getByRole('alert')).toHaveTextContent(/reserved/)
  })
})
