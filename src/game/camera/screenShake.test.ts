import { describe, it, expect } from 'vitest'
import { ScreenShakeManager, DEFAULT_SHAKE_PARAMS } from './screenShake'

describe('ScreenShakeManager', () => {
  it('is inactive before trigger', () => {
    const mgr = new ScreenShakeManager()
    expect(mgr.isActive).toBe(false)
    expect(mgr.update(0.016)).toEqual([0, 0])
  })

  it('returns non-zero offset while active', () => {
    const mgr = new ScreenShakeManager({ duration: 0.15, amplitude: 0.12 })
    mgr.trigger()
    expect(mgr.isActive).toBe(true)
    // At least one axis should be non-zero (random, but amplitude > 0 makes it
    // astronomically unlikely for both to land exactly 0).
    const [dx, dy] = mgr.update(0.01)
    expect(Math.abs(dx) + Math.abs(dy)).toBeGreaterThan(0)
  })

  it('expires after duration and returns [0,0]', () => {
    const params = { duration: 0.1, amplitude: 0.1 }
    const mgr = new ScreenShakeManager(params)
    mgr.trigger()
    mgr.update(0.05)
    expect(mgr.isActive).toBe(true)
    mgr.update(0.05)
    expect(mgr.isActive).toBe(false)
    expect(mgr.update(0.016)).toEqual([0, 0])
  })

  it('re-triggers and resets the timer', () => {
    const params = { duration: 0.1, amplitude: 0.1 }
    const mgr = new ScreenShakeManager(params)
    mgr.trigger()
    mgr.update(0.09) // nearly expired
    mgr.trigger()    // restart
    mgr.update(0.09) // should still be active (timer reset to 0.1)
    expect(mgr.isActive).toBe(true)
  })

  it('uses DEFAULT_SHAKE_PARAMS when none supplied', () => {
    const mgr = new ScreenShakeManager()
    mgr.trigger()
    expect(mgr.isActive).toBe(true)
    // Advance past default duration
    mgr.update(DEFAULT_SHAKE_PARAMS.duration + 0.01)
    expect(mgr.isActive).toBe(false)
  })
})
