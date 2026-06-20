import { NullEngine, Scene } from '@babylonjs/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FOREST_TREE_ASSET_ID,
  WOODEN_HUT_ASSET_ID,
  createForestScene,
  seedForestAssets,
} from './forestScene'
import { AssetRegistry } from '../game/streaming'
import {
  applyPlayerTransform,
  readPlayerTransform,
  stageSpawn,
  takeSpawn,
} from '../game/save/playerRuntime'

// jsdom has no WebGL, so inject a headless NullEngine and skip hero/asset GLB
// fetches. Asserts the scene wires the ground, controller, and streaming loader.
function boot() {
  const canvas = document.createElement('canvas')
  return createForestScene(canvas, {
    heroUrl: null,
    createEngine: () => new NullEngine(),
  })
}

describe('seedForestAssets', () => {
  it('registers tree and hut with their canonical ids', () => {
    const registry = new AssetRegistry()
    seedForestAssets(registry)
    const tree = registry.resolve(FOREST_TREE_ASSET_ID)
    const hut = registry.resolve(WOODEN_HUT_ASSET_ID)
    expect(tree.url).toContain('forest-tree.glb')
    expect(hut.url).toContain('wooden-hut.glb')
  })

  it('gives the tree a larger targetSize than the hut', () => {
    const registry = new AssetRegistry()
    seedForestAssets(registry)
    expect(registry.resolve(FOREST_TREE_ASSET_ID).metadata.targetSize).toBeGreaterThan(
      registry.resolve(WOODEN_HUT_ASSET_ID).metadata.targetSize ?? 0,
    )
  })
})

describe('createForestScene', () => {
  it('boots a live scene with an active camera', () => {
    const game = boot()
    expect(game.scene).toBeInstanceOf(Scene)
    expect(game.scene.activeCamera).not.toBeNull()
    game.dispose()
  })

  it('spawns the player capsule and wires the follow camera to it', () => {
    const game = boot()
    expect(game.controller.mesh.name).toBe('playerCapsule')
    expect(game.scene.activeCamera).toBeDefined()
    game.dispose()
  })

  it('creates a pickable ground mesh', () => {
    const game = boot()
    const ground = game.scene.getMeshByName('ground')
    expect(ground).not.toBeNull()
    expect(ground!.isPickable).toBe(true)
    game.dispose()
  })

  it('tears down cleanly and is idempotent', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const game = boot()
    game.dispose()
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(game.scene.isDisposed).toBe(true)
    expect(() => game.dispose()).not.toThrow()
    remove.mockRestore()
  })
})

// Regression guard for FLO-297: the deployed slice autosaved nothing and never
// restored position because the forest scene mounted into `playing` forgot to
// register the player handle with the save bridge (only the `?dev` playground
// did). These assert the integration the E1.5 capstone is responsible for.
describe('createForestScene — save bridge (E1.4/E1.5 integration)', () => {
  beforeEach(() => {
    // Clear any spawn staged by a previous test so each boot is deterministic.
    takeSpawn()
  })

  it('registers the live player so autosave-on-pause has a pose to read', () => {
    expect(readPlayerTransform()).toBeNull()
    const game = boot()
    const pose = readPlayerTransform()
    expect(pose).not.toBeNull()
    expect(pose!.position).toEqual({ x: 0, y: 2, z: 0 })
    game.dispose()
    // A torn-down scene must stop being the save source of truth.
    expect(readPlayerTransform()).toBeNull()
  })

  it('lets Continue teleport the live capsule via applyPlayerTransform', () => {
    const game = boot()
    const target = { position: { x: 5, y: 2, z: -3 }, rotationY: 1 }
    expect(applyPlayerTransform(target)).toBe(true)
    expect(readPlayerTransform()).toEqual(target)
    game.dispose()
  })

  it('boots at a staged Continue spawn instead of the clearing centre', () => {
    const spawn = { position: { x: -8, y: 2, z: 11 }, rotationY: 0.5 }
    stageSpawn(spawn)
    const game = boot()
    expect(readPlayerTransform()).toEqual(spawn)
    game.dispose()
  })
})
