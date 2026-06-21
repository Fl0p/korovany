import {
  Color3,
  Mesh,
  MeshBuilder,
  NullEngine,
  PBRMaterial,
  Scene,
  StandardMaterial,
  TransformNode,
} from '@babylonjs/core'
import { describe, expect, it, vi } from 'vitest'
import { facetMeshes, flatShade, mattenMaterial } from './flatShade'

// jsdom has no WebGL, so drive the mesh ops through a headless NullEngine.
function makeScene(): Scene {
  return new Scene(new NullEngine())
}

describe('facetMeshes (FLO-452 art coherence)', () => {
  it('facets every geometry mesh exactly once', () => {
    const scene = makeScene()
    const a = MeshBuilder.CreateBox('a', {}, scene)
    const b = MeshBuilder.CreateBox('b', {}, scene)
    const spies = [a, b].map((m) => vi.spyOn(m, 'convertToFlatShadedMesh'))

    facetMeshes([a, b])

    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
  })

  it('skips a geometry-less root pivot (no vertices)', () => {
    const scene = makeScene()
    const pivot = new Mesh('__root__', scene) // no vertex data
    const spy = vi.spyOn(pivot, 'convertToFlatShadedMesh')

    facetMeshes([pivot])

    expect(spy).not.toHaveBeenCalled()
  })
})

describe('mattenMaterial (FLO-452 art coherence)', () => {
  it('drops a StandardMaterial to a near-zero specular read', () => {
    const scene = makeScene()
    const mesh = MeshBuilder.CreateBox('box', {}, scene)
    const mat = new StandardMaterial('m', scene)
    mat.specularColor = new Color3(0.9, 0.9, 0.9)
    mesh.material = mat

    mattenMaterial(mesh)

    expect(mat.specularColor.r).toBeLessThan(0.1)
    expect(mat.specularColor.g).toBeLessThan(0.1)
    expect(mat.specularColor.b).toBeLessThan(0.1)
  })

  it('flattens a glossy PBRMaterial to matte, env-free', () => {
    const scene = makeScene()
    const mesh = MeshBuilder.CreateBox('box', {}, scene)
    const mat = new PBRMaterial('m', scene)
    mat.metallic = 1
    mat.roughness = 0.1
    mat.environmentIntensity = 1
    mesh.material = mat

    mattenMaterial(mesh)

    expect(mat.metallic).toBe(0)
    expect(mat.roughness).toBe(1)
    expect(mat.environmentIntensity).toBe(0)
  })

  it('tolerates a mesh with no material', () => {
    const scene = makeScene()
    const mesh = new TransformNode('pivot', scene) as unknown as Parameters<typeof mattenMaterial>[0]
    expect(() => mattenMaterial(mesh)).not.toThrow()
  })
})

describe('flatShade (facet + matte, FLO-452)', () => {
  it('both facets and mattes every mesh in one pass', () => {
    const scene = makeScene()
    const mesh = MeshBuilder.CreateBox('box', {}, scene)
    const mat = new StandardMaterial('m', scene)
    mat.specularColor = new Color3(0.8, 0.8, 0.8)
    mesh.material = mat
    const facetSpy = vi.spyOn(mesh, 'convertToFlatShadedMesh')

    flatShade([mesh])

    expect(facetSpy).toHaveBeenCalledTimes(1)
    expect((mesh.material as StandardMaterial).specularColor.r).toBeLessThan(0.1)
  })
})
