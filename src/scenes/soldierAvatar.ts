import {
  Color3,
  type Mesh,
  MeshBuilder,
  type Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core'

/**
 * Procedural low-poly Empire soldier avatar (FLO-452 — art coherence).
 *
 * The shipped soldier GLB (`empire-soldier.glb`) is a 2794-tri Meshy preview with
 * a smooth, semi-realistic surface — it reads off-spec next to the procedural,
 * hard-faceted player avatar (`buildPlayerAvatar`, FLO-422) that defines the
 * CEO-locked v1.2 low-poly visual language. To make the enemy belong to the same
 * world, the soldier visual is rebuilt here from flat-shaded box primitives, in
 * the SAME construction style as the player so the two figures share a silhouette
 * vocabulary while staying clearly distinct (the soldier shoulders a musket in a
 * stiff "port arms", the player is a braced boxer).
 *
 * It is a two-way door: zero asset cost, pure geometry, and a future rigged
 * soldier GLB can drop back in behind the same `root` + animator contract.
 * Babylon boxes carry per-face (flat) normals, so the silhouette reads
 * hard-faceted with no extra processing — exactly the v1.2 language.
 *
 * The returned `root` is the node the {@link CharacterAnimator} drives (bob /
 * lean / lunge / topple): parent it under the capsule and assign it to the
 * enemy's `animator.node`, identical to the old GLB wiring.
 */
export interface SoldierAvatar {
  /** Visual root — parent under the capsule and feed to the animator. */
  readonly root: TransformNode
  /** Every part mesh (for pickability / disposal bookkeeping). */
  readonly meshes: readonly Mesh[]
  dispose(): void
}

// ─── Palette ─────────────────────────────────────────────────────────────────
// Reuses the established Empire palette (soldierEnemy.ts) so the rebuilt figure
// keeps its readable uniform identity — muted grey-green greatcoat, brown
// leather, grey musket steel — while becoming hard-faceted boxes.
const COAT = new Color3(0.22, 0.34, 0.24) // muted grey-green greatcoat
const TROUSER = new Color3(0.3, 0.3, 0.34) // pale grey breeches (Napoleonic)
const LEATHER = new Color3(0.34, 0.18, 0.09) // boots / belts / musket stock
const METAL = new Color3(0.43, 0.39, 0.32) // musket barrel + fittings
const SKIN = new Color3(0.66, 0.5, 0.42) // muted face
const SHAKO = new Color3(0.12, 0.12, 0.13) // tall dark peaked cap

/** A matte, near-zero-specular material so parts read flat-shaded, not plastic. */
function matte(scene: Scene, name: string, color: Color3): StandardMaterial {
  const mat = new StandardMaterial(name, scene)
  mat.diffuseColor = color
  mat.specularColor = new Color3(0.04, 0.04, 0.04)
  return mat
}

/**
 * Build the Empire soldier avatar. Heights are in metres with the feet at local
 * y=0, so a caller parents `root` at the capsule's foot offset (e.g.
 * `(0, -0.9, 0)` for a 1.8 m capsule). Built facing +Z (Babylon forward),
 * matching the capsule yaw.
 */
export function buildSoldierAvatar(scene: Scene): SoldierAvatar {
  const root = new TransformNode('soldierAvatar', scene)
  const meshes: Mesh[] = []

  const coatMat = matte(scene, 'soldierCoatMat', COAT)
  const trouserMat = matte(scene, 'soldierTrouserMat', TROUSER)
  const leatherMat = matte(scene, 'soldierLeatherMat', LEATHER)
  const metalMat = matte(scene, 'soldierMetalMat', METAL)
  const skinMat = matte(scene, 'soldierSkinMat', SKIN)
  const shakoMat = matte(scene, 'soldierShakoMat', SHAKO)

  const part = (
    name: string,
    size: { w: number; h: number; d: number },
    pos: Vector3,
    mat: StandardMaterial,
    parent: TransformNode,
    rot?: Vector3,
  ): Mesh => {
    const box = MeshBuilder.CreateBox(name, { width: size.w, height: size.h, depth: size.d }, scene)
    box.position = pos
    if (rot) box.rotation = rot
    box.material = mat
    box.isPickable = false
    box.parent = parent
    meshes.push(box)
    return box
  }

  // ── Lower body — straight legs + boots (a drilled "at attention" stance, so the
  //    soldier reads as a disciplined patrol, distinct from the player's brawler).
  part('soldierLegL', { w: 0.17, h: 0.8, d: 0.2 }, new Vector3(0.12, 0.44, 0), trouserMat, root)
  part('soldierLegR', { w: 0.17, h: 0.8, d: 0.2 }, new Vector3(-0.12, 0.44, 0), trouserMat, root)
  part('soldierBootL', { w: 0.19, h: 0.16, d: 0.3 }, new Vector3(0.12, 0.08, 0.06), leatherMat, root)
  part('soldierBootR', { w: 0.19, h: 0.16, d: 0.3 }, new Vector3(-0.12, 0.08, 0.06), leatherMat, root)

  // ── Upper body — greatcoat torso + skirt hem. Held nearly upright (slight tilt)
  //    on a chest node the head/arms/musket ride.
  const chest = new TransformNode('soldierChest', scene)
  chest.parent = root
  chest.position = new Vector3(0, 0.84, 0)
  chest.rotation = new Vector3(0.04, 0, 0)

  part('soldierTorso', { w: 0.46, h: 0.6, d: 0.3 }, new Vector3(0, 0.3, 0), coatMat, chest)
  // Greatcoat skirt — a slightly wider, shorter slab below the torso.
  part('soldierSkirt', { w: 0.5, h: 0.22, d: 0.34 }, new Vector3(0, -0.02, 0), coatMat, chest)
  // White cross-belt over the shoulder — a thin leather slab on the diagonal.
  part(
    'soldierBelt',
    { w: 0.07, h: 0.66, d: 0.04 },
    new Vector3(0, 0.32, 0.17),
    leatherMat,
    chest,
    new Vector3(0, 0, -0.5),
  )

  // ── Head + tall shako (peaked cap), the soldier's signature read.
  part('soldierHead', { w: 0.25, h: 0.26, d: 0.25 }, new Vector3(0, 0.76, 0.02), skinMat, chest)
  part('soldierShako', { w: 0.27, h: 0.24, d: 0.27 }, new Vector3(0, 0.99, 0.0), shakoMat, chest)
  // Front peak/visor of the shako.
  part('soldierPeak', { w: 0.27, h: 0.05, d: 0.1 }, new Vector3(0, 0.89, 0.17), shakoMat, chest)

  // ── Arms in a stiff "port arms": both hands carry the musket diagonally across
  //    the chest (lower-right → upper-left). `sx` mirrors the side (+1 = right).
  const buildArm = (side: 'L' | 'R', sx: number, fz: number): void => {
    part(
      `soldierUpperArm${side}`,
      { w: 0.13, h: 0.36, d: 0.15 },
      new Vector3(sx * 0.3, 0.36, 0.06),
      coatMat,
      chest,
      new Vector3(0, 0, sx * 0.12),
    )
    // Forearm reaches in toward the musket line in front of the chest.
    part(
      `soldierForearm${side}`,
      { w: 0.12, h: 0.32, d: 0.13 },
      new Vector3(sx * 0.18, 0.42, fz),
      coatMat,
      chest,
      new Vector3(-0.5, 0, sx * 0.55),
    )
  }
  buildArm('R', 1, 0.28)
  buildArm('L', -1, 0.34)

  // ── Musket — long steel barrel on a leather/wood stock, carried diagonally
  //    across the torso front (port arms). Built as a child node so the whole
  //    weapon tilts as one piece.
  const musket = new TransformNode('soldierMusket', scene)
  musket.parent = chest
  musket.position = new Vector3(-0.02, 0.44, 0.3)
  musket.rotation = new Vector3(0, 0, 0.7)
  part('soldierMusketBarrel', { w: 0.05, h: 0.92, d: 0.05 }, new Vector3(0, 0.12, 0), metalMat, musket)
  part('soldierMusketStock', { w: 0.08, h: 0.34, d: 0.07 }, new Vector3(0, -0.28, 0), leatherMat, musket)
  // Bayonet tip extends past the muzzle.
  part('soldierBayonet', { w: 0.03, h: 0.22, d: 0.03 }, new Vector3(0, 0.69, 0), metalMat, musket)

  return {
    root,
    meshes,
    dispose: () => {
      root.dispose(false, true)
    },
  }
}
