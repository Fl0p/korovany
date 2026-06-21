import { type AbstractMesh, Color3, type Mesh, PBRMaterial, StandardMaterial } from '@babylonjs/core'

/**
 * v1.2 flat low-poly read, applied **in-engine** at GLB-load time.
 *
 * The shipped character GLBs (player survivor, Empire soldier, archer) are
 * smooth-shaded, semi-glossy meshes. The art direction (FLO-440 → FLO-447) is a
 * hard-faceted, matte low-poly look — and the live **player** already gets it via
 * `survivorAvatar.ts`. These helpers are the single source of that treatment so
 * every character (player, enemy, corpse, menu/defeat backdrop hero) reads in the
 * same band — that is the whole point of the art-coherence pass (FLO-452).
 *
 * Faceting only manifests once `convertToFlatShadedMesh()` runs at runtime
 * (precedent: `worldBounds.ts` `applyFacetTint`, `survivorAvatar.ts`), so the
 * visual-truth gate is an in-scene screenshot, never code inspection.
 */

/**
 * Hard-facet every geometry mesh so its silhouette reads flat-shaded, not smooth.
 * Only geometry meshes have vertices; the glTF `__root__` pivot has none and is
 * skipped. Idempotent enough for a one-shot load path.
 */
export function facetMeshes(meshes: readonly AbstractMesh[]): void {
  for (const mesh of meshes) {
    if (mesh.getTotalVertices() > 0) (mesh as Mesh).convertToFlatShadedMesh()
  }
}

/**
 * Tame an imported material to a matte, near-zero-specular read so a glossier GLB
 * material still lands in the v1.2 flat band. Defensive across both material types
 * the glTF loader may emit; leaves bespoke palette materials (set by the caller)
 * for callers that pass already-matte materials.
 */
export function mattenMaterial(mesh: AbstractMesh): void {
  const mat = mesh.material
  if (mat instanceof StandardMaterial) {
    mat.specularColor = new Color3(0.03, 0.03, 0.03)
  } else if (mat instanceof PBRMaterial) {
    mat.metallic = 0
    mat.roughness = 1
    mat.environmentIntensity = 0
  }
}

/** Facet **and** matte a set of meshes — the full v1.2 conform for a raw GLB. */
export function flatShade(meshes: readonly AbstractMesh[]): void {
  facetMeshes(meshes)
  for (const mesh of meshes) mattenMaterial(mesh)
}
