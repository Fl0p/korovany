import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OnboardingIntroCard } from './OnboardingIntroCard'

describe('<OnboardingIntroCard />', () => {
  it('surfaces the objective target and core controls', () => {
    render(<OnboardingIntroCard objectiveTarget={3} onDismiss={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Raid the caravans' })).toBeInTheDocument()
    expect(screen.getByText(/caravans to win/i)).toBeInTheDocument()
    expect(screen.getByText('Move')).toBeInTheDocument()
    expect(screen.getByText('Attack')).toBeInTheDocument()
    expect(screen.getByText(/open the world map/i)).toBeInTheDocument()
    expect(screen.getByText(/health reaches zero/i)).toBeInTheDocument()
  })

  it('calls onDismiss when Begin raid is clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<OnboardingIntroCard objectiveTarget={3} onDismiss={onDismiss} />)

    await user.click(screen.getByRole('button', { name: 'Begin raid' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
