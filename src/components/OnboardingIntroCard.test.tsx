import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OnboardingIntroCard } from './OnboardingIntroCard'

const defaultProps = { worldCount: 2, firstZoneName: 'Forest', firstZoneQuota: 3 }

describe('<OnboardingIntroCard />', () => {
  it('surfaces the conquest objective and core controls', () => {
    render(<OnboardingIntroCard {...defaultProps} onDismiss={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Conquer the worlds' })).toBeInTheDocument()
    expect(screen.getByText(/conquer all 2 worlds/i)).toBeInTheDocument()
    expect(screen.getByText('Move')).toBeInTheDocument()
    expect(screen.getByText('Attack')).toBeInTheDocument()
    expect(screen.getByText(/open the world map/i)).toBeInTheDocument()
    expect(screen.getByText(/health reaches zero/i)).toBeInTheDocument()
  })

  it('calls onDismiss when Begin raid is clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<OnboardingIntroCard {...defaultProps} onDismiss={onDismiss} />)

    await user.click(screen.getByRole('button', { name: 'Begin raid' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
