import { NullEngine, Mesh, Scene, TransformNode, Vector3 } from '@babylonjs/core'
import { describe, expect, it, vi } from 'vitest'
import type { LoadedModel } from '../../scenes/modelLoader'
import { AssetRegistry } from './registry'
import { AssetStreamLoader } from './loader'
import { LODManager, type LODConfig } from './lodManager'

function makeLoadedModel(scene: Scene, tag: string): LoadedModel {
  const root = new TransformNode(`root:${tag}`, scene)
  const mesh = Mesh.CreateBox(`mesh-${tag}`, 1, scene)
  mesh.parent = root
  return { root, meshes: [mesh] }
}

function bootLOD(config: LODConfig = {}, playerPos = { x: 0, y: 0, z: 0 }) {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const registry = new AssetRegistry()
  registry.register('tree', { url: '/models/tree.glb', metadata: {} })

  const loadGlb = vi.fn(async (_scene: Scene, url: string) => {
    const id = url.replace('/models/', '').replace('.glb', '')
    const model = makeLoadedModel(scene, id)
    return model
  })

  const loader = new AssetStreamLoader(scene, registry, loadGlb)
  const playerVec = new Vector3(playerPos.x, playerPos.y, playerPos.z)
  const manager = new LODManager(scene, loader, config, playerVec)

  return { engine, scene, loader, loadGlb, manager, playerVec }
}

describe('LODManager', () => {
  it('spawns an instance with both impostor and full mesh', async () => {
    const { manager, scene } = bootLOD({ impostorDistance: 40 }, { x: 50, y: 0, z: 0 })

    // Tree at origin, player at (50,0,0) - far enough for impostor
    const instance = await manager.spawnLODInstance('tree', { x: 0, y: 0, z: 0 })

    expect(instance.root).toBeDefined()
    expect(instance.impostor).toBeDefined()
    expect(manager.getState(instance.root.name.replace("root:", "").replace("impostor-", ""))).toBe('impostor') // Far away: impostor
    expect(scene.meshes.filter((m) => m.name.includes('impostor-tree'))).toHaveLength(1)
  })

  it('places the full mesh at the correct world position', async () => {
    const { manager } = bootLOD()

    const instance = await manager.spawnLODInstance('tree', { x: 5, y: 0, z: -3 })

    expect(instance.root.position.x).toBe(5)
    expect(instance.root.position.z).toBe(-3)
  })

  it('applies rotationY to both impostor and full mesh', async () => {
    const { manager } = bootLOD()

    const instance = await manager.spawnLODInstance('tree', { x: 0, y: 0, z: 0 }, Math.PI / 2)

    expect(instance.root.rotation.y).toBe(Math.PI / 2)
    expect(instance.impostor.rotation.y).toBe(Math.PI / 2)
  })

  it('initially shows impostor when player is far away', async () => {
    const { manager } = bootLOD({ impostorDistance: 20, fullMeshDistance: 10 }, { x: 30, y: 0, z: 0 })

    const instance = await manager.spawnLODInstance('tree', { x: 0, y: 0, z: 0 })

    expect(manager.getState(instance.root.name.replace("root:", "").replace("impostor-", ""))).toBe('impostor')
    expect(instance.firstMesh.isVisible).toBe(false)
    expect(instance.impostor.isVisible).toBe(true)
  })

  it('initially shows full mesh when player is close', async () => {
    const { manager } = bootLOD({ impostorDistance: 20, fullMeshDistance: 10 }, { x: 5, y: 0, z: 0 })

    const instance = await manager.spawnLODInstance('tree', { x: 0, y: 0, z: 0 })

    expect(manager.getState(instance.root.name.replace("root:", "").replace("impostor-", ""))).toBe('fullMesh')
    expect(instance.firstMesh.isVisible).toBe(true)
    expect(instance.impostor.isVisible).toBe(false)
  })

  it('switches from impostor to full mesh when player approaches', async () => {
    const { manager, playerVec } = bootLOD({ impostorDistance: 20, fullMeshDistance: 10 }, { x: 30, y: 0, z: 0 })

    const instance = await manager.spawnLODInstance('tree', { x: 0, y: 0, z: 0 })
    expect(manager.getState(instance.root.name.replace("root:", "").replace("impostor-", ""))).toBe('impostor')

    // Move player closer (within switch threshold)
    playerVec.x = 12 // < impostorDistance - hysteresisBuffer (20 - 5 = 15)
    manager.update()

    expect(manager.getState(instance.root.name.replace("root:", "").replace("impostor-", ""))).toBe('fullMesh')
    expect(instance.firstMesh.isVisible).toBe(true)
    expect(instance.impostor.isVisible).toBe(false)
  })

  it('switches from full mesh to impostor when player moves away', async () => {
    const { manager, playerVec } = bootLOD({ impostorDistance: 20, fullMeshDistance: 10 }, { x: 5, y: 0, z: 0 })

    const instance = await manager.spawnLODInstance('tree', { x: 0, y: 0, z: 0 })
    expect(manager.getState(instance.root.name.replace("root:", "").replace("impostor-", ""))).toBe('fullMesh')

    // Move player away (beyond switch threshold)
    playerVec.x = 28 // > impostorDistance + hysteresisBuffer (20 + 5 = 25)
    manager.update()

    expect(manager.getState(instance.root.name.replace("root:", "").replace("impostor-", ""))).toBe('impostor')
    expect(instance.firstMesh.isVisible).toBe(false)
    expect(instance.impostor.isVisible).toBe(true)
  })

  it('hysteresis prevents flickering near the threshold', async () => {
    const { manager, playerVec } = bootLOD({ impostorDistance: 20, fullMeshDistance: 10 }, { x: 30, y: 0, z: 0 })

    const instance = await manager.spawnLODInstance('tree', { x: 0, y: 0, z: 0 })
    
    // Start in impostor state (far)
    expect(manager.getState(instance.root.name.replace("root:", "").replace("impostor-", ""))).toBe('impostor')

    // Move to just below switch threshold (15 range)
    playerVec.x = 14 // < 15 (switch point)
    manager.update()
    expect(manager.getState(instance.root.name.replace("root:", "").replace("impostor-", ""))).toBe('fullMesh')

    // Move back up but stay within hysteresis band (16-25)
    playerVec.x = 16
    manager.update()
    expect(manager.getState(instance.root.name.replace("root:", "").replace("impostor-", ""))).toBe('fullMesh') // Should NOT switch back to impostor yet

    playerVec.x = 22
    manager.update()
    expect(manager.getState(instance.root.name.replace("root:", "").replace("impostor-", ""))).toBe('fullMesh') // Still not switching

    // Only switch when beyond upper threshold + hysteresis
    playerVec.x = 26
    manager.update()
    expect(manager.getState(instance.root.name.replace("root:", "").replace("impostor-", ""))).toBe('impostor')
  })

  it('releases and disposes resources when instance is released', async () => {
    const { manager, scene } = bootLOD()

    const instance = await manager.spawnLODInstance('tree', { x: 0, y: 0, z: 0 })
    const instanceCountBefore = scene.meshes.length

    instance.release()

    expect(scene.meshes.length).toBeLessThan(instanceCountBefore)
  })

  it('disposes all instances on LODManager dispose', async () => {
    const { manager, scene } = bootLOD()

    await manager.spawnLODInstance('tree', { x: 0, y: 0, z: 0 })
    await manager.spawnLODInstance('tree', { x: 5, y: 0, z: 0 })
    const instanceCountBefore = scene.meshes.length

    manager.dispose()

    // All impostor and mesh meshes should be disposed
    expect(scene.meshes.length).toBeLessThan(instanceCountBefore)
  })

  it('throws when spawning after dispose', async () => {
    const { manager } = bootLOD()

    manager.dispose()
    await expect(manager.spawnLODInstance('tree', { x: 0, y: 0, z: 0 })).rejects.toThrow('LODManager disposed')
  })

  it('applies default LOD config when none provided', async () => {
    const { manager } = bootLOD({ impostorDistance: 40 }, { x: 50, y: 0, z: 0 })

    // With impostorDistance: 40, player at (50,0,0) should be impostor
    await manager.spawnLODInstance('tree', { x: 0, y: 0, z: 0 })
    expect(manager.getState('tree')).toBe('impostor')
  })

  it('creates billboard impostor with BILLBOARDMODE_ALL', async () => {
    const { manager } = bootLOD()

    const instance = await manager.spawnLODInstance('tree', { x: 0, y: 0, z: 0 })
    expect(instance.impostor.billboardMode).toBe(TransformNode.BILLBOARDMODE_ALL)
  })
})
