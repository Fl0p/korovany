import { describe, expect, it, vi } from 'vitest'
import { emitDismember, onDismember } from './damageEvents'

describe('damageEvents — dismember bridge', () => {
  it('delivers the severed limb to subscribers', () => {
    const seen: string[] = []
    const off = onDismember((limb) => seen.push(limb))
    emitDismember('leftHand')
    emitDismember('rightEye')
    off()
    expect(seen).toEqual(['leftHand', 'rightEye'])
  })

  it('stops delivering after unsubscribe', () => {
    const fn = vi.fn()
    const off = onDismember(fn)
    emitDismember('leftLeg')
    off()
    emitDismember('rightLeg')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('leftLeg')
  })

  it('fans out to multiple listeners', () => {
    const a = vi.fn()
    const b = vi.fn()
    const offA = onDismember(a)
    const offB = onDismember(b)
    emitDismember('leftEye')
    offA()
    offB()
    expect(a).toHaveBeenCalledWith('leftEye')
    expect(b).toHaveBeenCalledWith('leftEye')
  })
})
