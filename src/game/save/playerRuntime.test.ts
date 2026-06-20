import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyPlayerTransform,
  readPlayerTransform,
  registerPlayer,
  stageSpawn,
  takeSpawn,
} from './playerRuntime'
import type { PlayerTransform } from './types'

const poseA: PlayerTransform = { position: { x: 1, y: 2, z: 3 }, rotationY: 0.5 }
const poseB: PlayerTransform = { position: { x: 9, y: 0, z: -4 }, rotationY: -1 }

afterEach(() => {
  // Drain any staged spawn and detach handles between tests.
  takeSpawn()
})

describe('player handle registration', () => {
  it('reads null when no scene is mounted', () => {
    expect(readPlayerTransform()).toBeNull()
    expect(applyPlayerTransform(poseA)).toBe(false)
  })

  it('reads the registered handle and applies writes to it', () => {
    const write = vi.fn()
    const unregister = registerPlayer({ read: () => poseA, write })

    expect(readPlayerTransform()).toEqual(poseA)
    expect(applyPlayerTransform(poseB)).toBe(true)
    expect(write).toHaveBeenCalledWith(poseB)

    unregister()
    expect(readPlayerTransform()).toBeNull()
  })

  it('unregister is a no-op once a newer handle took over', () => {
    const first = registerPlayer({ read: () => poseA, write: vi.fn() })
    registerPlayer({ read: () => poseB, write: vi.fn() })
    first() // stale unregister must not clear the active handle
    expect(readPlayerTransform()).toEqual(poseB)
  })
})

describe('staged spawn', () => {
  it('takes nothing when nothing is staged', () => {
    expect(takeSpawn()).toBeNull()
  })

  it('returns the staged spawn once, then clears it', () => {
    stageSpawn(poseA)
    expect(takeSpawn()).toEqual(poseA)
    expect(takeSpawn()).toBeNull()
  })
})
