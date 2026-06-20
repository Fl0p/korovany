import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DamageNumbers, type DamageNumberEntry } from './DamageNumber'
import { emitDamage, onDamage } from '../game/combat/damageEvents'

describe('DamageNumbers component', () => {
  it('renders a damage number entry', () => {
    const entries: DamageNumberEntry[] = [{ id: 1, amount: 25, x: 50, y: 40 }]
    const onExpire = vi.fn()
    render(<DamageNumbers entries={entries} onExpire={onExpire} />)
    expect(screen.getByText('+25')).toBeTruthy()
  })

  it('calls onExpire after 600ms', async () => {
    vi.useFakeTimers()
    const entries: DamageNumberEntry[] = [{ id: 42, amount: 10, x: 50, y: 50 }]
    const onExpire = vi.fn()
    render(<DamageNumbers entries={entries} onExpire={onExpire} />)
    act(() => vi.advanceTimersByTime(600))
    expect(onExpire).toHaveBeenCalledWith(42)
    vi.useRealTimers()
  })

  it('renders nothing with no entries', () => {
    const { container } = render(<DamageNumbers entries={[]} onExpire={vi.fn()} />)
    expect(container.querySelectorAll('.damage-number').length).toBe(0)
  })
})

describe('emitDamage → onDamage bridge', () => {
  it('fires registered listeners with amount + coordinates', () => {
    const received: Array<[number, number, number]> = []
    const unsub = onDamage((amount, x, y) => received.push([amount, x, y]))
    emitDamage(30, 55, 42)
    unsub()
    expect(received).toEqual([[30, 55, 42]])
  })

  it('unsubscribe prevents further calls', () => {
    const fn = vi.fn()
    const unsub = onDamage(fn)
    unsub()
    emitDamage(5, 0, 0)
    expect(fn).not.toHaveBeenCalled()
  })
})
