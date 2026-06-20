import { describe, expect, it } from 'vitest'
import {
  applyPlayerDamage,
  damagePlayer,
  healPlayer,
  healthReducer,
  resetPlayerHealth,
  restorePlayerHealth,
  selectIsAlive,
  selectLastDamageAt,
  selectPlayerHealth,
} from './healthSlice'

describe('healthSlice', () => {
  it('boots with full player health (100)', () => {
    const state = healthReducer(undefined, { type: '@@INIT' })
    expect(state.player.current).toBe(100)
    expect(state.player.max).toBe(100)
  })

  it('damagePlayer reduces current HP', () => {
    const s0 = healthReducer(undefined, { type: '@@INIT' })
    const s1 = healthReducer(s0, damagePlayer(30))
    expect(s1.player.current).toBe(70)
  })

  it('damagePlayer clamps at 0', () => {
    const s0 = healthReducer(undefined, { type: '@@INIT' })
    const s1 = healthReducer(s0, damagePlayer(9999))
    expect(s1.player.current).toBe(0)
  })

  it('healPlayer restores HP', () => {
    const s0 = healthReducer(undefined, { type: '@@INIT' })
    const s1 = healthReducer(s0, damagePlayer(50))
    const s2 = healthReducer(s1, healPlayer(20))
    expect(s2.player.current).toBe(70)
  })

  it('healPlayer clamps at max', () => {
    const s0 = healthReducer(undefined, { type: '@@INIT' })
    const s1 = healthReducer(s0, healPlayer(50))
    expect(s1.player.current).toBe(100)
  })

  it('resetPlayerHealth restores full HP', () => {
    const s0 = healthReducer(undefined, { type: '@@INIT' })
    const s1 = healthReducer(s0, damagePlayer(80))
    const s2 = healthReducer(s1, resetPlayerHealth())
    expect(s2.player.current).toBe(100)
  })

  it('restorePlayerHealth overwrites current + max from a loaded save', () => {
    const s0 = healthReducer(undefined, { type: '@@INIT' })
    const s1 = healthReducer(s0, restorePlayerHealth({ current: 37, max: 120 }))
    expect(s1.player).toEqual({ current: 37, max: 120 })
  })

  describe('damage funnel (applyPlayerDamage)', () => {
    it('boots alive with no recorded damage', () => {
      const state = healthReducer(undefined, { type: '@@INIT' })
      expect(state.isAlive).toBe(true)
      expect(state.lastDamageAt).toBeNull()
    })

    it('clamps HP at 0 and flips isAlive=false at death', () => {
      const s0 = healthReducer(undefined, { type: '@@INIT' })
      const s1 = healthReducer(s0, applyPlayerDamage({ amount: 9999, source: 'enemy', at: 5 }))
      expect(s1.player.current).toBe(0)
      expect(s1.isAlive).toBe(false)
    })

    it('records lastDamageAt from the event timestamp', () => {
      const s0 = healthReducer(undefined, { type: '@@INIT' })
      const s1 = healthReducer(s0, applyPlayerDamage({ amount: 10, at: 1234 }))
      expect(s1.lastDamageAt).toBe(1234)
      expect(s1.player.current).toBe(90)
    })

    it('validates amount once: non-finite / negative coerce to 0 and never record damage', () => {
      const s0 = healthReducer(undefined, { type: '@@INIT' })
      const sNaN = healthReducer(s0, applyPlayerDamage({ amount: Number.NaN, at: 1 }))
      const sNeg = healthReducer(sNaN, applyPlayerDamage({ amount: -50, at: 2 }))
      expect(sNeg.player.current).toBe(100)
      expect(sNeg.lastDamageAt).toBeNull()
      expect(sNeg.isAlive).toBe(true)
    })

    it('damagePlayer routes through the same funnel (isAlive maintained)', () => {
      const s0 = healthReducer(undefined, { type: '@@INIT' })
      const s1 = healthReducer(s0, damagePlayer(100))
      expect(s1.isAlive).toBe(false)
    })

    it('healPlayer above 0 brings the player back alive', () => {
      const s0 = healthReducer(undefined, { type: '@@INIT' })
      const dead = healthReducer(s0, damagePlayer(100))
      const revived = healthReducer(dead, healPlayer(10))
      expect(revived.isAlive).toBe(true)
    })

    it('resetPlayerHealth clears death + damage timestamp', () => {
      const s0 = healthReducer(undefined, { type: '@@INIT' })
      const dead = healthReducer(s0, applyPlayerDamage({ amount: 200, at: 9 }))
      const reset = healthReducer(dead, resetPlayerHealth())
      expect(reset.isAlive).toBe(true)
      expect(reset.lastDamageAt).toBeNull()
    })
  })

  describe('selectors', () => {
    const wrap = (health: ReturnType<typeof healthReducer>) => ({ health })

    it('expose HP, isAlive and lastDamageAt', () => {
      const s0 = healthReducer(undefined, { type: '@@INIT' })
      const s1 = healthReducer(s0, applyPlayerDamage({ amount: 100, at: 7 }))
      expect(selectPlayerHealth(wrap(s1))).toEqual({ current: 0, max: 100 })
      expect(selectIsAlive(wrap(s1))).toBe(false)
      expect(selectLastDamageAt(wrap(s1))).toBe(7)
    })
  })
})
