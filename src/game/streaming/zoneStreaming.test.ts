import { NullEngine, Scene, TransformNode, type AbstractMesh } from '@babylonjs/core'
import { describe, expect, it, vi } from 'vitest'
import type { LoadedModel } from '../../scenes/modelLoader'
import { AssetRegistry } from './registry'
import { AssetStreamLoader } from './loader'
import { ZoneStreamingManager, type ZoneManifest } from './zoneStreaming'

function makeLoadedModel(scene: Scene, tag: string): LoadedModel {
  const root = new TransformNode(`root:${tag}`, scene)
  const mesh = {
    parent: root as TransformNode | null,
    dispose: vi.fn(),
  } as unknown as AbstractMesh
  return { root, meshes: [mesh] }
}

/**
 * Boot a real loader over a NullEngine, registering `assetIds`. `loadGlb` mints a
 * fresh model per call so each acquired asset has its own disposable meshes — we
 * assert disposal through the loader's real ref-counting, not a manager stub.
 */
function boot(assetIds: string[]) {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const registry = new AssetRegistry()
  for (const id of assetIds) registry.register(id, { url: `/models/${id}.glb`, metadata: {} })

  const models = new Map<string, LoadedModel>()
  const loadGlb = vi.fn(async (_scene: Scene, url: string) => {
    const id = url.replace('/models/', '').replace('.glb', '')
    const model = makeLoadedModel(scene, id)
    models.set(id, model)
    return model
  })
  const loader = new AssetStreamLoader(scene, registry, loadGlb)
  return { engine, scene, loader, loadGlb, models }
}

const zoneA: ZoneManifest = {
  id: 'a',
  placements: [{ assetId: 'a.tree' }, { assetId: 'a.hut' }],
}
const zoneB: ZoneManifest = {
  id: 'b',
  placements: [{ assetId: 'b.rock' }],
}

describe('ZoneStreamingManager', () => {
  it('loads the entered zone content', async () => {
    const { scene, loader, loadGlb } = boot(['a.tree', 'a.hut', 'b.rock'])
    const mgr = new ZoneStreamingManager(scene, loader)

    await mgr.enterZone(zoneA)

    expect(loadGlb).toHaveBeenCalledTimes(2)
    expect(mgr.currentZoneId).toBe('a')
    expect(mgr.residentInstanceCount).toBe(2)
  })

  it('applies placement transforms to the spawned instance roots', async () => {
    const { scene, loader, models } = boot(['a.tree'])
    const mgr = new ZoneStreamingManager(scene, loader)

    await mgr.enterZone({
      id: 'a',
      placements: [{ assetId: 'a.tree', position: { x: 3, y: 0, z: -5 }, rotationY: 1.5 }],
    })

    const root = models.get('a.tree')!.root
    expect(root.position.x).toBe(3)
    expect(root.position.z).toBe(-5)
    expect(root.rotation.y).toBe(1.5)
  })

  it('disposes the previous zone content when entering a new zone', async () => {
    const { scene, loader, models } = boot(['a.tree', 'a.hut', 'b.rock'])
    const mgr = new ZoneStreamingManager(scene, loader)

    await mgr.enterZone(zoneA)
    await mgr.enterZone(zoneB)

    // Zone A's meshes were disposed (ref-count hit zero on eviction)...
    expect(models.get('a.tree')!.meshes[0].dispose).toHaveBeenCalledTimes(1)
    expect(models.get('a.hut')!.meshes[0].dispose).toHaveBeenCalledTimes(1)
    // ...and only zone B remains resident.
    expect(mgr.residentZoneIds).toEqual(['b'])
    expect(mgr.residentInstanceCount).toBe(1)
    expect(loader.getPhase('a.tree')).toBe('idle')
    expect(loader.getPhase('b.rock')).toBe('loaded')
  })

  it('does not leak across repeated A↔B round-trips (bounded resources)', async () => {
    const { scene, loader, loadGlb } = boot(['a.tree', 'a.hut', 'b.rock'])
    const mgr = new ZoneStreamingManager(scene, loader)
    const baselineMeshes = scene.meshes.length

    for (let i = 0; i < 8; i++) {
      await mgr.enterZone(zoneA)
      await mgr.enterZone(zoneB)
    }

    // Exactly one zone resident, never the sum of every visit.
    expect(mgr.residentZoneIds).toEqual(['b'])
    expect(mgr.residentInstanceCount).toBe(1)
    // Each A and B entry re-fetched from scratch (full dispose between visits) —
    // 8 round-trips × (2 A assets + 1 B asset) = 24 loads, no caching artifacts.
    expect(loadGlb).toHaveBeenCalledTimes(24)
    // Scene mesh count returns to baseline + zone B's single placeholder/model.
    expect(scene.meshes.length).toBeLessThanOrEqual(baselineMeshes + 1)
  })

  it('re-entering the resident zone does not reload it', async () => {
    const { scene, loader, loadGlb } = boot(['a.tree', 'a.hut'])
    const mgr = new ZoneStreamingManager(scene, loader)

    await mgr.enterZone(zoneA)
    await mgr.enterZone(zoneA)

    expect(loadGlb).toHaveBeenCalledTimes(2)
    expect(mgr.residentInstanceCount).toBe(2)
  })

  it('keeps neighbours warm when the budget allows more than one zone', async () => {
    const { scene, loader, models } = boot(['a.tree', 'a.hut', 'b.rock'])
    const mgr = new ZoneStreamingManager(scene, loader, { maxResidentZones: 2 })

    await mgr.enterZone(zoneA)
    await mgr.enterZone(zoneB)

    expect(mgr.residentZoneIds).toEqual(['a', 'b'])
    expect(models.get('a.tree')!.meshes[0].dispose).not.toHaveBeenCalled()
    expect(mgr.residentInstanceCount).toBe(3)
  })

  it('evicts the least-recently-used zone beyond the budget', async () => {
    const { scene, loader, models } = boot(['a.tree', 'a.hut', 'b.rock', 'c.bush'])
    const zoneC: ZoneManifest = { id: 'c', placements: [{ assetId: 'c.bush' }] }
    const mgr = new ZoneStreamingManager(scene, loader, { maxResidentZones: 2 })

    await mgr.enterZone(zoneA)
    await mgr.enterZone(zoneB)
    await mgr.enterZone(zoneC) // evicts A (LRU)

    expect(mgr.residentZoneIds).toEqual(['b', 'c'])
    expect(models.get('a.tree')!.meshes[0].dispose).toHaveBeenCalledTimes(1)
    expect(models.get('b.rock')!.meshes[0].dispose).not.toHaveBeenCalled()
  })

  it('shares ref-counted assets between zones without re-fetching or disposing early', async () => {
    const { scene, loader, loadGlb, models } = boot(['shared.tree'])
    const shared = { assetId: 'shared.tree' }
    const mgr = new ZoneStreamingManager(scene, loader, { maxResidentZones: 2 })

    await mgr.enterZone({ id: 'a', placements: [shared] })
    await mgr.enterZone({ id: 'b', placements: [shared] })

    // Cached after the first load: second zone reuses it.
    expect(loadGlb).toHaveBeenCalledTimes(1)
    // Evict A — B still holds a ref, so the GLB must stay loaded.
    await mgr.enterZone({ id: 'c', placements: [] })
    expect(mgr.residentZoneIds).toEqual(['b', 'c'])
    expect(models.get('shared.tree')!.meshes[0].dispose).not.toHaveBeenCalled()
  })

  it('serialises overlapping travel so an in-flight load cannot leak', async () => {
    const { scene, loader } = boot(['a.tree', 'a.hut', 'b.rock'])
    const mgr = new ZoneStreamingManager(scene, loader)

    // Fire A and B back-to-back without awaiting A.
    const a = mgr.enterZone(zoneA)
    const b = mgr.enterZone(zoneB)
    await Promise.all([a, b])

    expect(mgr.residentZoneIds).toEqual(['b'])
    expect(mgr.residentInstanceCount).toBe(1)
  })

  it('releases everything on dispose', async () => {
    const { scene, loader, models } = boot(['a.tree', 'a.hut'])
    const mgr = new ZoneStreamingManager(scene, loader)

    await mgr.enterZone(zoneA)
    mgr.dispose()

    expect(mgr.residentZoneIds).toEqual([])
    expect(models.get('a.tree')!.meshes[0].dispose).toHaveBeenCalledTimes(1)
    expect(models.get('a.hut')!.meshes[0].dispose).toHaveBeenCalledTimes(1)
  })
})
