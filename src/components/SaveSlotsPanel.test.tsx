import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildSlotSummaries } from '../game/save'
import { ALL_SLOT_IDS } from '../game/save/types'
import { FACTION_IDS } from '../game/faction'
import { createProgression } from '../game/progression'
import { createSaveData } from '../game/save'
import { SaveSlotsPanel } from './SaveSlotsPanel'

const snapshot = {
  transform: { position: { x: 0, y: 1, z: 0 }, rotationY: 0 },
  health: { current: 80, max: 100 },
  zoneId: 'forest',
  inventory: { counts: {}, equippedItemId: null },
  playerFactionId: FACTION_IDS.ForestElves,
  progression: createProgression(),
}

describe('<SaveSlotsPanel />', () => {
  it('lists empty slots with new-game affordances', () => {
    const slots = buildSlotSummaries([], ALL_SLOT_IDS)
    render(
      <SaveSlotsPanel
        slots={slots}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onNewGame={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Save slots' })).toBeInTheDocument()
    expect(screen.getByText(/No saves yet/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /New game in slot/i })).toHaveLength(3)
  })

  it('shows load/delete for occupied slots and marks the latest', () => {
    const data = createSaveData(snapshot, 1_700_000_000_000)
    const slots = buildSlotSummaries([{ slot: 1, data }], ALL_SLOT_IDS)
    render(
      <SaveSlotsPanel
        slots={slots}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onNewGame={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByText('Latest')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Load' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete slot 2' })).toBeInTheDocument()
    expect(screen.getByText(/Forest/)).toBeInTheDocument()
  })

  it('fires slot actions', async () => {
    const user = userEvent.setup()
    const onLoad = vi.fn()
    const onDelete = vi.fn()
    const onNewGame = vi.fn()
    const onBack = vi.fn()
    const data = createSaveData(snapshot, 1)
    const slots = buildSlotSummaries([{ slot: 0, data }], ALL_SLOT_IDS)

    render(
      <SaveSlotsPanel
        slots={slots}
        onLoad={onLoad}
        onDelete={onDelete}
        onNewGame={onNewGame}
        onBack={onBack}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Load' }))
    await user.click(screen.getByRole('button', { name: 'Delete slot 1' }))
    await user.click(screen.getByRole('button', { name: 'New game in slot 2' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(onLoad).toHaveBeenCalledWith(0)
    expect(onDelete).toHaveBeenCalledWith(0)
    expect(onNewGame).toHaveBeenCalledWith(1)
    expect(onBack).toHaveBeenCalled()
  })
})
