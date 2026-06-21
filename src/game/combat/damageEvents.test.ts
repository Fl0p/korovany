import { describe, expect, it, vi } from 'vitest'
import { emitDismember, onDismember } from './damageEvents'
import type { Limb } from '../health/injuryModel'

describe('dismember event bridge (E6.1.2)', () => {
  it('delivers the severed limb to subscribers', () => {
    const seen: Limb[] = []
    const off = onDismember((limb) => seen.push(limb))
    emitDismember('leftHand')
    emitDismember('rightLeg')
    off()
    expect(seen).toEqual(['leftHand', 'rightLeg'])
  })

  it('stops delivering after unsubscribe', () => {
    const fn = vi.fn()
    const off = onDismember(fn)
    off()
    emitDismember('leftEye')
    expect(fn).not.toHaveBeenCalled()
  })

  it('fans out to every subscriber', () => {
    const a = vi.fn()
    const b = vi.fn()
    const offA = onDismember(a)
    const offB = onDismember(b)
    emitDismember('rightHand')
    offA()
    offB()
    expect(a).toHaveBeenCalledWith('rightHand')
    expect(b).toHaveBeenCalledWith('rightHand')
  })
})
